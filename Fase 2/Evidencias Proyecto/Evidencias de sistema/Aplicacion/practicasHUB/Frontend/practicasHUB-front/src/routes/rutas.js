import { ROLES } from '../utils/constants';

/// Rutas de inicio de cada perfil, para el botón Atrás y la salida del grupo.

export const RUTA_INICIO = {
  [ROLES.ESTUDIANTE]: '/estudiante/dashboard',
  [ROLES.DOCENTE]: '/docente/dashboard',
};

/** Ruta de inicio de un rol. `/login` si el rol no es uno de los dos del MVP. */
export const rutaInicioDe = (rol) => RUTA_INICIO[rol] ?? '/login';
