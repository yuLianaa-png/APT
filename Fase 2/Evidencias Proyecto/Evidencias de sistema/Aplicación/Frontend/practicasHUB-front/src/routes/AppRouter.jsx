import { Navigate, Route, Routes } from 'react-router-dom';

import Login from '../pages/Auth/Login';
import Registro from '../pages/Auth/Registro';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout.jsx';
import LayoutGrupo from '../layouts/LayoutGrupo.jsx';
import RedirigirInicio from '../components/common/RedirigirInicio.jsx';
import { ROLES } from '../utils/constants';

import EstudianteDashboard from '../pages/Dashboard/EstudianteDashboard.jsx';
import DocenteDashboard from '../pages/Dashboard/DocenteDashboard.jsx';
import ResumenEstudiante from '../pages/Grupo/ResumenEstudiante.jsx';
import ResumenDocente from '../pages/Grupo/ResumenDocente.jsx';
import MiPracticaEstudiante from '../pages/Grupo/MiPracticaEstudiante.jsx';
import JornadasEstudiante from '../pages/Jornadas/JornadasEstudiante.jsx';
import RegistrarJornada from '../pages/Jornadas/RegistrarJornada.jsx';
import EditarJornada from '../pages/Jornadas/EditarJornada.jsx';
import ModificarJornada from '../pages/Jornadas/ModificarJornada.jsx';
import EstudiantesGrupoDocente from '../pages/Estudiantes/EstudiantesGrupoDocente.jsx';
import JornadasDocente from '../pages/Jornadas/JornadasDocente.jsx';
import HistorialIndividualDocente from '../pages/Jornadas/HistorialIndividualDocente.jsx';
import NotificacionesGenerales from '../pages/Notificaciones/NotificacionesGenerales.jsx';
import NotificacionesGrupo from '../pages/Notificaciones/NotificacionesGrupo.jsx';
import DocumentosDocente from '../pages/Documentos/DocumentosDocente.jsx';
import DocumentosEstudiante from '../pages/Documentos/DocumentosEstudiante.jsx';
import GaleriaUI from '../pages/_dev/GaleriaUI.jsx';

/**
 * Rutas de PrácticasHub, con la navegación en **dos niveles** de §2.2.
 *
 *   Nivel general      /estudiante/dashboard        /docente/dashboard
 *                      /estudiante/notificaciones   /docente/notificaciones
 *
 *   Dentro de un grupo /estudiante/grupos/:grupoId/…  /docente/grupos/:grupoId/…
 */
const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/registro" element={<Registro />} />

    {/* Galería del sistema de diseño. Solo en desarrollo. */}
    {import.meta.env.DEV && <Route path="/_ui" element={<GaleriaUI />} />}

    {/* ------------------------------------------------------------ Estudiante */}
    <Route element={<ProtectedRoute allowedRoles={[ROLES.ESTUDIANTE]} />}>
      <Route element={<MainLayout />}>
        <Route path="/estudiante/dashboard" element={<EstudianteDashboard />} />
        <Route path="/estudiante/notificaciones" element={<NotificacionesGenerales />} />
      </Route>

      <Route path="/estudiante/grupos/:grupoId" element={<LayoutGrupo />}>
        <Route index element={<Navigate to="resumen" replace />} />
        <Route path="resumen" element={<ResumenEstudiante />} />
        <Route path="mi-practica" element={<MiPracticaEstudiante />} />
        <Route path="jornadas" element={<JornadasEstudiante />} />
        <Route path="jornadas/nueva" element={<RegistrarJornada />} />
        <Route path="jornadas/:jornadaId/editar" element={<EditarJornada />} />
        {/* Corrección de una jornada Observada, autorizada por el docente. */}
        <Route path="jornadas/:jornadaId/modificar" element={<ModificarJornada />} />
        <Route path="documentos" element={<DocumentosEstudiante />} />
        <Route path="notificaciones" element={<NotificacionesGrupo />} />
      </Route>
    </Route>

    {/* --------------------------------------------------------------- Docente */}
    <Route element={<ProtectedRoute allowedRoles={[ROLES.DOCENTE]} />}>
      <Route element={<MainLayout />}>
        <Route path="/docente/dashboard" element={<DocenteDashboard />} />
        <Route path="/docente/notificaciones" element={<NotificacionesGenerales />} />
      </Route>

      <Route path="/docente/grupos/:grupoId" element={<LayoutGrupo />}>
        <Route index element={<Navigate to="resumen" replace />} />
        <Route path="resumen" element={<ResumenDocente />} />
        <Route path="estudiantes" element={<EstudiantesGrupoDocente />} />
        {/* primero los estudiantes; el historial individual cuelga de aquí. */}
        <Route path="jornadas" element={<JornadasDocente />} />
        <Route path="jornadas/:vinculacionId" element={<HistorialIndividualDocente />} />
        <Route path="documentos" element={<DocumentosDocente />} />
        <Route path="notificaciones" element={<NotificacionesGrupo />} />
      </Route>
    </Route>

    {/* Cada perfil a su Dashboard general; sin sesión, al login. */}
    <Route path="*" element={<RedirigirInicio />} />
  </Routes>
);

export default AppRouter;
