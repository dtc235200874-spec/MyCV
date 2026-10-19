import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">⚡ ElectroShop</Link>
        <nav className="nav-links">
          <Link to="/">Sản phẩm</Link>
          {user && <Link to="/orders">Đơn hàng</Link>}
          {isAdmin && <Link to="/admin">Quản trị</Link>}
        </nav>
        <div className="nav-right">
          <Link to="/cart" className="cart-link">🛒 Giỏ hàng {count > 0 && <span className="badge">{count}</span>}</Link>
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}