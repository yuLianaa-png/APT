import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "../context/AuthContext";

const ProtectedRoute = () => ({allowedRoles}) => {
    const {user, itsAuthenticated, loading} = useAuth();

    if (loading) {
        return <div>Loading...</div>; // or a spinner
    }

    if (!itsAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.rol)) {
        return <Navigate to={user?.rol === 'ESTUDIANTE' ? '/estudiante' : '/docente'} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;