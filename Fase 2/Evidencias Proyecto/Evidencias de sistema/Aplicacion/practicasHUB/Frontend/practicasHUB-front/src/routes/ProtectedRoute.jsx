import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { rutaInicioDe } from './rutas';

// Ruta protegida que solo permite el acceso a usuarios autenticados y con rol permitido.

const ProtectedRoute = ({ allowedRoles }) => {
  const { usuario, estaAutenticado } = useAuth();
  const ubicacion = useLocation();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return <Navigate to={rutaInicioDe(usuario.rol)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
