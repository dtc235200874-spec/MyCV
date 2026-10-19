import { useParams, Link } from 'react-router-dom';

export default function OrderSuccess() {
  const { id } = useParams();
  return (
    <div className="container empty-page">
      <h2>✅ Đặt hàng thành công!</h2>
      <p>Mã đơn hàng: <strong>#{id}</strong></p>
      <p>Chúng tôi sẽ liên hệ xác nhận sớm nhất.</p>
      <Link to="/" className="btn btn-primary">Về trang chủ</Link>
    </div>
  );
}