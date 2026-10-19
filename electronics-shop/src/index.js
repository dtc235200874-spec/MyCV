import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';

const app = new Hono();

const jwtSecret = (c) => (c.env && c.env.JWT_SECRET) || 'demo-secret-change-me';

app.use('*', cors());

// ---------- helpers ----------
function db(c) { return c.env.DB; }
function bucket(c) { return c.env.BUCKET; }

async function authMiddleware(c, next) {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'Chưa đăng nhập' }, 401);
  try {
    const payload = await verify(token, jwtSecret(c), 'HS256');
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Token không hợp lệ' }, 401);
  }
}
async function adminMiddleware(c, next) {
  const r = await authMiddleware(c, async () => {});
  // authMiddleware returned response if failed
  if (r) return r;
  if (c.get('user')?.role !== 'admin') return c.json({ error: 'Không có quyền admin' }, 403);
  await next();
}

// ---------- auth ----------
app.post('/api/auth/register', async (c) => {
  const { name, email, password } = await c.req.json();
  if (!name || !email || !password) return c.json({ error: 'Thiếu thông tin' }, 400);
  if (password.length < 6) return c.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, 400);
  const exists = await db(c).prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return c.json({ error: 'Email đã tồn tại' }, 409);
  const hash = bcrypt.hashSync(password, 10);
  const info = await db(c).prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)').bind(name, email, hash).run();
  const user = { id: info.meta.last_row_id, name, email, role: 'customer' };
  const token = await sign(user, jwtSecret(c));
  return c.json({ token, user });
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const row = await db(c).prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return c.json({ error: 'Sai email hoặc mật khẩu' }, 401);
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = await sign(user, jwtSecret(c));
  return c.json({ token, user });
});

app.get('/api/auth/me', async (c) => {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ user: null });
  try {
    const u = await verify(token, jwtSecret(c), 'HS256');
    return c.json({ user: u });
  } catch {
    return c.json({ user: null });
  }
});

// ---------- categories ----------
app.get('/api/categories', async (c) => {
  const { results } = await db(c).prepare('SELECT * FROM categories ORDER BY id').all();
  return c.json(results);
});

app.post('/api/categories', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const { name, slug } = await c.req.json();
  const s = slug || name.toLowerCase().replace(/\s+/g, '-');
  const info = await db(c).prepare('INSERT INTO categories (name, slug) VALUES (?,?)').bind(name, s).run();
  return c.json({ id: info.meta.last_row_id }, 201);
});

app.delete('/api/categories/:id', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  await db(c).prepare('DELETE FROM categories WHERE id=?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---------- products ----------
app.get('/api/products', async (c) => {
  const q = c.req.query('q');
  const category = c.req.query('category');
  const sort = c.req.query('sort');
  const minPrice = c.req.query('minPrice');
  const maxPrice = c.req.query('maxPrice');
  let sql = `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];
  if (q) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (category) { sql += ' AND p.category_id = ?'; params.push(category); }
  if (minPrice) { sql += ' AND p.price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { sql += ' AND p.price <= ?'; params.push(Number(maxPrice)); }
  if (sort === 'price_asc') sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else if (sort === 'name') sql += ' ORDER BY p.name ASC';
  else sql += ' ORDER BY p.id DESC';
  const stmt = db(c).prepare(sql);
  const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return c.json(results);
});

app.get('/api/products/:id', async (c) => {
  const row = await db(c).prepare(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Không tìm thấy sản phẩm' }, 404);
  return c.json(row);
});

app.post('/api/products', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const { name, description, price, stock, image, category_id } = await c.req.json();
  if (!name || price == null) return c.json({ error: 'Thiếu tên hoặc giá' }, 400);
  const info = await db(c).prepare('INSERT INTO products (name, description, price, stock, image, category_id) VALUES (?,?,?,?,?,?)').bind(name, description || '', Number(price), Number(stock || 0), image || '', category_id || null).run();
  return c.json({ id: info.meta.last_row_id }, 201);
});

app.put('/api/products/:id', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const { name, description, price, stock, image, category_id } = await c.req.json();
  await db(c).prepare('UPDATE products SET name=?, description=?, price=?, stock=?, image=?, category_id=? WHERE id=?').bind(name, description || '', Number(price), Number(stock || 0), image || '', category_id || null, c.req.param('id')).run();
  return c.json({ ok: true });
});

app.delete('/api/products/:id', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  await db(c).prepare('DELETE FROM products WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---------- orders ----------
app.post('/api/orders', async (c) => {
  const body = await c.req.json();
  const { customer_name, customer_email, customer_phone, address, items, user_id } = body;
  if (!customer_name || !customer_email || !address || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Thiếu thông tin đơn hàng' }, 400);
  }
  // validate stock
  const prepared = [];
  let total = 0;
  for (const it of items) {
    const p = await db(c).prepare('SELECT * FROM products WHERE id = ?').bind(it.product_id).first();
    if (!p) return c.json({ error: 'Sản phẩm không tồn tại' }, 400);
    if (p.stock < it.quantity) return c.json({ error: `Không đủ tồn kho: ${p.name}` }, 400);
    total += p.price * it.quantity;
    prepared.push({ p, quantity: it.quantity });
  }
  const info = await db(c).prepare('INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, address, total) VALUES (?,?,?,?,?,?)').bind(
    user_id || null, customer_name, customer_email, customer_phone || '', address, total).run();
  const orderId = info.meta.last_row_id;
  const statements = [];
  for (const { p, quantity } of prepared) {
    statements.push(db(c).prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?,?,?,?,?)').bind(orderId, p.id, p.name, quantity, p.price));
    statements.push(db(c).prepare('UPDATE products SET stock = stock - ? WHERE id = ?').bind(quantity, p.id));
  }
  await db(c).batch(statements);
  return c.json({ orderId, total }, 201);
});

app.get('/api/orders/mine', async (c) => {
  const guard = await authMiddleware(c, async () => {});
  if (guard) return guard;
  const user = c.get('user');
  const { results: orders } = await db(c).prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').bind(user.id).all();
  const withItems = [];
  for (const o of orders) {
    const { results: items } = await db(c).prepare('SELECT * FROM order_items WHERE order_id = ?').bind(o.id).all();
    withItems.push({ ...o, items });
  }
  return c.json(withItems);
});

app.get('/api/orders', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const { results: orders } = await db(c).prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const withItems = [];
  for (const o of orders) {
    const { results: items } = await db(c).prepare('SELECT * FROM order_items WHERE order_id = ?').bind(o.id).all();
    withItems.push({ ...o, items });
  }
  return c.json(withItems);
});

app.put('/api/orders/:id/status', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const { status } = await c.req.json();
  await db(c).prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---------- R2 image upload/serve ----------
app.post('/api/upload', async (c) => {
  const guard = await adminMiddleware(c, async () => {});
  if (guard) return guard;
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || typeof file === 'string') return c.json({ error: 'Thiếu file' }, 400);
  const key = `images/${Date.now()}-${file.name}`;
  await bucket(c).put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return c.json({ url: `/api/images/${encodeURIComponent(key)}` });
});

app.get('/api/images/:key{.+}', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));
  const obj = await bucket(c).get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});

// ---------- static assets fallback ----------
app.all('*', async (c) => {
  // try assets
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status !== 404) return res;
  }
  // SPA fallback
  if (c.env.ASSETS) {
    const url = new URL(c.req.url);
    url.pathname = '/index.html';
    const res = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    if (res.status !== 404) return res;
  }
  return c.text('Not found', 404);
});

export default app;