import { ROLES } from '../utils/constants';


export const MENU_GENERAL = {
  [ROLES.ESTUDIANTE]: [
    { a: '/estudiante/dashboard', etiqueta: 'Dashboard' },
    { a: '/estudiante/notificaciones', etiqueta: 'Notificaciones' },
  ],
  [ROLES.DOCENTE]: [
    { a: '/docente/dashboard', etiqueta: 'Dashboard' },
    { a: '/docente/notificaciones', etiqueta: 'Notificaciones' },
  ],
};

/** Secciones internas de un grupo*/
const SECCIONES_GRUPO = {
  [ROLES.ESTUDIANTE]: [
    { parte: 'resumen', etiqueta: 'Resumen' },
    { parte: 'mi-practica', etiqueta: 'Mi práctica' },
    { parte: 'jornadas', etiqueta: 'Jornadas' },
    { parte: 'documentos', etiqueta: 'Documentos' },
    { parte: 'notificaciones', etiqueta: 'Notificaciones' },
  ],
  [ROLES.DOCENTE]: [
    { parte: 'resumen', etiqueta: 'Resumen' },
    { parte: 'estudiantes', etiqueta: 'Estudiantes' },
    { parte: 'jornadas', etiqueta: 'Jornadas' },
    { parte: 'documentos', etiqueta: 'Documentos' },
    { parte: 'notificaciones', etiqueta: 'Notificaciones' },
  ],
};

/** Prefijo de las rutas de grupo de cada perfil. */
export const baseDeGrupo = (rol, grupoId) =>
  (rol === ROLES.DOCENTE ? `/docente/grupos/${grupoId}` : `/estudiante/grupos/${grupoId}`);

/** Menú interno del grupo cargado. */
export const menuDeGrupo = (rol, grupoId) =>
  (SECCIONES_GRUPO[rol] ?? []).map((seccion) => ({
    a: `${baseDeGrupo(rol, grupoId)}/${seccion.parte}`,
    etiqueta: seccion.etiqueta,
  }));

/** Texto y destino de la salida del grupo*/
export const salidaDeGrupo = (rol) => (rol === ROLES.DOCENTE
  ? { a: '/docente/dashboard', etiqueta: 'Volver a grupos' }
  : { a: '/estudiante/dashboard', etiqueta: 'Volver a mis prácticas' });
