import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { add } = useCart();
  return (
    <div className="card product-card">
      <Link to={`/products/${product.id}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="card-body">
        <div className="cat">{product.category_name}</div>
        <Link to={`/products/${product.id}`} className="title">{product.name}</Link>
        <div className="price">{Number(product.price).toLocaleString('vi-VN')} ₫</div>
        <div className="stock">Còn {product.stock}</div>
        <button className="btn btn-primary full" onClick={() => add(product)} disabled={product.stock <= 0}>
          {product.stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>
    </div>
  );
}