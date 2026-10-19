import { useEffect, useState } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (category) params.category = category;
    if (sort) params.sort = sort;
    const [p, c] = await Promise.all([api.get('/products', { params }), api.get('/categories')]);
    setProducts(p.data);
    setCategories(c.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category, sort]);

  return (
    <div className="container">
      <section className="hero-banner">
        <h1>Khám phá công nghệ mới nhất</h1>
        <p>Điện thoại, laptop, phụ kiện và đồ gia dụng chính hãng - giá tốt.</p>
      </section>
      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="search-form">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm..." />
          <button className="btn btn-primary" type="submit">Tìm</button>
        </form>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>
      {loading ? <div className="loading">Đang tải...</div> : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
          {products.length === 0 && <div className="empty">Không tìm thấy sản phẩm.</div>}
        </div>
      )}
    </div>
  );
}