import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from "../layouts/MainLayout.jsx";
import { ROLES } from '../utils/constants'; 
import MiPracticaEstudiante from '../pages/Vinculacion/MiPracticaEstudiante';
import GenerarCodigoDocente from '../pages/Vinculacion/GenerarCodigoDocente.jsx';
import EstudianteDashboard from '../pages/Dashboard/EstudianteDashboard.jsx';
import NuevaActividadEstudiante from '../pages/Actividades/NuevaActividadEstudiante.jsx';

// Vistas temporales para verificar navegación
const Dashboard = () => <div><h2>Panel Principal (Dashboard)</h2></div>;
const Bitacora = () => <div><h2>Bitácora de Actividades</h2></div>;
const Revisiones = () => <div><h2>Revisión de Actividades</h2></div>;
const Documentos = () => <div><h2>Gestión Documental</h2></div>;
const Reportes = () => <div><h2>Generación de Reportes</h2></div>;

const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta pública ruta */}
      <Route path="/login" element={<Login />} />

      {/* Rutas para ESTUDIANTE */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ESTUDIANTE]} />}>
        <Route element={<MainLayout />}>
          <Route path="/estudiante/dashboard" element={<EstudianteDashboard />} />
          <Route path="/estudiante/bitacora" element={<Bitacora />} />
          <Route path="/estudiante/bitacora/nuevo" element={<NuevaActividadEstudiante />} />
          <Route path="/estudiante/documentos" element={<Documentos />} />
          <Route path="/estudiante/vinculacion" element={<MiPracticaEstudiante />} />
        </Route>
      </Route>

      {/* Rutas para DOCENTE / SUPERVISOR */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPERVISOR]} />}>
        <Route element={<MainLayout />}>
          <Route path="/docente/dashboard" element={<Dashboard />} />
          <Route path="/docente/vinculacion" element={<GenerarCodigoDocente />} />
          <Route path="/docente/revisiones" element={<Revisiones />} />
          <Route path="/docente/documentos" element={<Documentos />} />
          <Route path="/docente/reportes" element={<Reportes />} />
        </Route>
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/estudiante/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;