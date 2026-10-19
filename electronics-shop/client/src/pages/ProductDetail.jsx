import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data));
  }, [id]);

  if (!product) return <div className="container loading">Đang tải...</div>;

  return (
    <div className="container">
      <div className="detail">
        <img src={product.image} alt={product.name} />
        <div className="detail-info">
          <div className="cat">{product.category_name}</div>
          <h1>{product.name}</h1>
          <div className="price big">{Number(product.price).toLocaleString('vi-VN')} ₫</div>
          <p className="desc">{product.description}</p>
          <div className="stock">Tồn kho: {product.stock}</div>
          <div className="qty-row">
            <input type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            <button className="btn btn-primary" onClick={() => { add(product, qty); navigate('/cart'); }} disabled={product.stock <= 0}>
              Mua ngay
            </button>
            <button className="btn btn-ghost" onClick={() => add(product, qty)} disabled={product.stock <= 0}>
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}