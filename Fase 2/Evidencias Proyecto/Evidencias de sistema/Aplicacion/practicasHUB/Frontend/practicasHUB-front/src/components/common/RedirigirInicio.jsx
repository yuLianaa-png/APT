import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { rutaInicioDe } from '../../routes/rutas';


const RedirigirInicio = () => {
  const { usuario, estaAutenticado } = useAuth();

  if (!estaAutenticado) return <Navigate to="/login" replace />;
  return <Navigate to={rutaInicioDe(usuario.rol)} replace />;
};

export default RedirigirInicio;
