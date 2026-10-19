import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  useEffect(() => { if (user) api.get('/orders/mine').then((r) => setOrders(r.data)).catch(() => {}); }, [user]);
  if (!user) return <div className="container empty-page"><h2>Vui lòng đăng nhập</h2><Link to="/login" className="btn btn-primary">Đăng nhập</Link></div>;

  return (
    <div className="container">
      <h2>Đơn hàng của tôi</h2>
      {orders.length === 0 && <div className="empty">Chưa có đơn hàng.</div>}
      {orders.map((o) => (
        <div className="order-card" key={o.id}>
          <div className="order-header">
            <strong>#{o.id}</strong>
            <span className={`status ${o.status}`}>{o.status}</span>
            <span>{new Date(o.created_at).toLocaleString('vi-VN')}</span>
          </div>
          <div className="order-items">
            {o.items.map((it) => (
              <div key={it.id} className="summary-row">
                <span>{it.product_name} x{it.quantity}</span>
                <span>{Number(it.price * it.quantity).toLocaleString('vi-VN')} ₫</span>
              </div>
            ))}
          </div>
          <div className="order-total">Tổng: {Number(o.total).toLocaleString('vi-VN')} ₫</div>
        </div>
      ))}
    </div>
  );
}