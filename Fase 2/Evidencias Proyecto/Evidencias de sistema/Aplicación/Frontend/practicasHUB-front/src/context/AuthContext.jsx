import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './authContexto';
import { ROLES, STORAGE_KEYS } from '../utils/constants';

/**
 * Sesión del usuario.
 */

const ROLES_VALIDOS = new Set(Object.values(ROLES));

/** Lee la sesión guardada. Cualquier cosa rara se descarta y se empieza sin sesión. */
const leerSesionGuardada = () => {
  const sinSesion = { usuario: null, token: null };

  let usuarioGuardado;
  let tokenGuardado;
  try {
    usuarioGuardado = window.localStorage.getItem(STORAGE_KEYS.USER);
    tokenGuardado = window.localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    // Almacenamiento bloqueado (ventana privada, cookies desactivadas): sin sesión.
    return sinSesion;
  }

  if (!usuarioGuardado || !tokenGuardado) return sinSesion;

  try {
    const usuario = JSON.parse(usuarioGuardado);
    // Un rol que ya no existe —SUPERVISOR o ADMIN de la versión anterior— invalida la
    // sesión en lugar de dejar a alguien dentro con un perfil sin significado.
    if (!usuario?.id || !ROLES_VALIDOS.has(usuario.rol)) {
      window.localStorage.removeItem(STORAGE_KEYS.USER);
      window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
      return sinSesion;
    }
    return { usuario, token: tokenGuardado };
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.USER);
    window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
    return sinSesion;
  }
};

export const AuthProvider = ({ children }) => {
  const [sesion, setSesion] = useState(leerSesionGuardada);

  const iniciarSesion = useCallback((usuario, token) => {
    setSesion({ usuario, token });
    try {
      window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(usuario));
      window.localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch {
      // Sin almacenamiento la sesión dura lo que la pestaña. Mejor eso que no entrar.
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    setSesion({ usuario: null, token: null });
    try {
      window.localStorage.removeItem(STORAGE_KEYS.USER);
      window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch { /* nada que limpiar */ }
  }, []);

  const valor = useMemo(() => ({
    usuario: sesion.usuario,
    token: sesion.token,
    estaAutenticado: Boolean(sesion.token && sesion.usuario),
    esEstudiante: sesion.usuario?.rol === ROLES.ESTUDIANTE,
    esDocente: sesion.usuario?.rol === ROLES.DOCENTE,
    iniciarSesion,
    cerrarSesion,
  }), [sesion, iniciarSesion, cerrarSesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
