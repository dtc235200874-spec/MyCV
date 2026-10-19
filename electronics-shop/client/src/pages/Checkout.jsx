import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        user_id: user?.id,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      };
      const r = await api.post('/orders', payload);
      clear();
      navigate(`/order-success/${r.data.orderId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Đặt hàng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return <div className="container empty-page"><h2>Giỏ hàng trống</h2></div>;

  return (
    <div className="container">
      <h2>Thanh toán</h2>
      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label>Họ tên<input name="customer_name" value={form.customer_name} onChange={handleChange} required /></label>
          <label>Email<input type="email" name="customer_email" value={form.customer_email} onChange={handleChange} required /></label>
          <label>Số điện thoại<input name="customer_phone" value={form.customer_phone} onChange={handleChange} /></label>
          <label>Địa chỉ giao hàng<textarea name="address" value={form.address} onChange={handleChange} required /></label>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary full" type="submit" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : `Đặt hàng (${Number(total).toLocaleString('vi-VN')} ₫)`}
          </button>
        </form>
        <div className="checkout-summary">
          <h3>Đơn hàng</h3>
          {items.map((i) => (
            <div className="summary-row" key={i.product_id}>
              <span>{i.name} x{i.quantity}</span>
              <span>{Number(i.price * i.quantity).toLocaleString('vi-VN')} ₫</span>
            </div>
          ))}
          <div className="summary-total"><strong>Tổng</strong><strong>{Number(total).toLocaleString('vi-VN')} ₫</strong></div>
        </div>
      </div>
    </div>
  );
}