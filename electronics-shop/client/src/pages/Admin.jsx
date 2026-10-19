import { useEffect, useState } from 'react';
import api from '../api';

export default function Admin() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', image: '', category_id: '' });
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [p, c, o] = await Promise.all([api.get('/products'), api.get('/categories'), api.get('/orders')]);
    setProducts(p.data); setCategories(c.data); setOrders(o.data);
  };
  useEffect(() => { load(); }, []);

  const submitProduct = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock), category_id: form.category_id || null };
    if (editing) await api.put(`/products/${editing}`, payload);
    else await api.post('/products', payload);
    setForm({ name: '', description: '', price: '', stock: '', image: '', category_id: '' });
    setEditing(null);
    load();
  };

  const editProduct = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, image: p.image || '', category_id: p.category_id || '' });
  };

  const deleteProduct = async (id) => {
    if (!confirm('Xóa sản phẩm?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  return (
    <div className="container">
      <h2>Quản trị</h2>
      <div className="tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Sản phẩm</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Đơn hàng</button>
      </div>

      {tab === 'products' && (
        <>
          <form className="admin-form" onSubmit={submitProduct}>
            <h3>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
            <input placeholder="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <textarea placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" placeholder="Giá" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input type="number" placeholder="Tồn kho" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            <input placeholder="URL ảnh" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">-- Danh mục --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editing ? 'Cập nhật' : 'Thêm'}</button>
              {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm({ name: '', description: '', price: '', stock: '', image: '', category_id: '' }); }}>Hủy</button>}
            </div>
          </form>

          <table className="admin-table">
            <thead><tr><th>Ảnh</th><th>Tên</th><th>Giá</th><th>Tồn</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><img src={p.image} alt="" width="40" /></td>
                  <td>{p.name}</td>
                  <td>{Number(p.price).toLocaleString('vi-VN')}</td>
                  <td>{p.stock}</td>
                  <td>
                    <button className="btn btn-ghost small" onClick={() => editProduct(p)}>Sửa</button>
                    <button className="btn btn-danger small" onClick={() => deleteProduct(p.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === 'orders' && (
        <div>
          {orders.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-header">
                <strong>#{o.id}</strong>
                <span>{o.customer_name} - {o.customer_email}</span>
                <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="shipping">shipping</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="order-items">
                {o.items.map((it) => <div key={it.id} className="summary-row"><span>{it.product_name} x{it.quantity}</span><span>{Number(it.price*it.quantity).toLocaleString('vi-VN')}</span></div>)}
              </div>
              <div className="order-total">Tổng: {Number(o.total).toLocaleString('vi-VN')} ₫ — {o.address}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}