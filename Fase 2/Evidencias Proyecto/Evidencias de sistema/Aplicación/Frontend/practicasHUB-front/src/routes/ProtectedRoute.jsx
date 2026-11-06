import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div>Cargando...</div>;
    }

    if (!isAuthenticated && !user?.isDemo) {
        return <Navigate to="/login" replace />;
    }

    if (!user?.isDemo && allowedRoles && !allowedRoles.includes(user?.rol)) {
        const homePath = user?.rol === 'ESTUDIANTE'
            ? '/estudiante/dashboard'
            : '/docente/dashboard';
        return <Navigate to={homePath} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;