import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from "../layouts/MainLayout.jsx";
import { ROLES } from '../utils/constants'; 

// Vistas temporales para verificar navegación
const Dashboard = () => <div><h2>Panel Principal (Dashboard)</h2></div>;
const Vinculacion = () => <div><h2>Módulo de Vinculación</h2></div>;
const Bitacora = () => <div><h2>Bitácora de Actividades</h2></div>;
const Revisiones = () => <div><h2>Revisión de Actividades</h2></div>;
const Documentos = () => <div><h2>Gestión Documental</h2></div>;
const Reportes = () => <div><h2>Generación de Reportes</h2></div>;

const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas para ESTUDIANTE */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ESTUDIANTE]} />}>
        <Route element={<MainLayout />}>
          <Route path="/estudiante/dashboard" element={<Dashboard />} />
          <Route path="/estudiante/vinculacion" element={<Vinculacion />} />
          <Route path="/estudiante/bitacora" element={<Bitacora />} />
          <Route path="/estudiante/documentos" element={<Documentos />} />
        </Route>
      </Route>

      {/* Rutas para DOCENTE / SUPERVISOR */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]} />}>
        <Route element={<MainLayout />}>
          <Route path="/docente/dashboard" element={<Dashboard />} />
          <Route path="/docente/vinculacion" element={<Vinculacion />} />
          <Route path="/docente/revisiones" element={<Revisiones />} />
          <Route path="/docente/documentos" element={<Documentos />} />
          <Route path="/docente/reportes" element={<Reportes />} />
        </Route>
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;