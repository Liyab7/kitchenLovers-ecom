import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from '../components/common/Loader.jsx';

export default function ProtectedRoute({ children, roles }) {
  const user = useSelector((s) => s.auth.user);
  const authStatus = useSelector((s) => s.auth.status);
  const location = useLocation();

  if (authStatus === 'checking') return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  
  return children;
}
