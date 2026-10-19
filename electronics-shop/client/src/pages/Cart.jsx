import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, update, remove, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container empty-page">
        <h2>Giỏ hàng trống</h2>
        <Link to="/" className="btn btn-primary">Tiếp tục mua sắm</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Giỏ hàng</h2>
      <div className="cart-list">
        {items.map((i) => (
          <div className="cart-item" key={i.product_id}>
            <img src={i.image} alt={i.name} />
            <div className="cart-info">
              <div className="title">{i.name}</div>
              <div className="price">{Number(i.price).toLocaleString('vi-VN')} ₫</div>
            </div>
            <input type="number" min="1" value={i.quantity} onChange={(e) => update(i.product_id, Number(e.target.value))} />
            <div className="subtotal">{Number(i.price * i.quantity).toLocaleString('vi-VN')} ₫</div>
            <button className="btn btn-danger" onClick={() => remove(i.product_id)}>Xóa</button>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <strong>Tổng: {Number(total).toLocaleString('vi-VN')} ₫</strong>
        <button className="btn btn-primary" onClick={() => navigate('/checkout')}>Thanh toán</button>
      </div>
    </div>
  );
}