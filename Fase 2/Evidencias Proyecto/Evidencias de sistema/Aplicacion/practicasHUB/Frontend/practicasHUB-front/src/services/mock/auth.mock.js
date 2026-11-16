/**
 * Acceso simulado (§3, RF-01).
 *
 * Aquí NO hay seguridad y no pretende haberla: no valida contraseñas porque no existe
 * backend. BCrypt y JWT (RNF-01, RNF-02) son responsabilidad de Spring Boot; este mock
 * solo decide con qué perfil se entra para poder construir y revisar las pantallas.
 *
 * Es la razón por la que el mock se activa con `VITE_USAR_MOCKS` y nunca debe quedar
 * encendido en un despliegue.
 */

import { ERRORES, ROLES } from '../../utils/constants';
import { validarRegistro } from '../../utils/registro';
import { listar, nuevoId, transaccion } from './db';
import { fallar, responder } from './soporte';

const normalizar = (texto) => String(texto ?? '').trim().toLowerCase();

/**
 * Entra con cualquier contraseña no vacía, si el correo existe en la semilla.
 * Devuelve `{ usuario, token }`, la misma forma que dará la API.
 */
export const login = (correo, password) => {
  if (!normalizar(correo) || !String(password ?? '')) {
    return fallar(ERRORES.NO_AUTORIZADO, 'Ingresa tu correo y tu contraseña.');
  }

  const usuario = listar('usuarios')
    .find((candidato) => normalizar(candidato.correo) === normalizar(correo));

  if (!usuario) {
    return fallar(ERRORES.NO_AUTORIZADO, 'Las credenciales no corresponden a una cuenta registrada.');
  }

  return responder({ usuario, token: `mock.${usuario.id}.${usuario.rol}` });
};

/**
 * Alta de una cuenta (RF-01). Devuelve `{ usuario, token }`, como `login`, para entrar
 * directamente tras registrarse.
 *
 * La contraseña se valida en su forma y se DESCARTA: no se guarda en el almacén, ni en
 * `localStorage`, ni en ningún otro sitio. Este mock no tiene hash y no finge tenerlo; el
 * hash (BCrypt, RNF-01) es responsabilidad del backend.
 *
 * El rechazo por correo repetido no devuelve nada del usuario existente, ni su perfil.
 */
export const registrar = ({ nombre, correo, password, rol } = {}) => {
  const errores = validarRegistro({ nombre, correo, password, rol });
  const primero = Object.values(errores)[0];
  if (primero) return fallar(ERRORES.NO_AUTORIZADO, primero);

  const correoNormalizado = normalizar(correo);
  const repetido = listar('usuarios').some((u) => normalizar(u.correo) === correoNormalizado);
  if (repetido) {
    return fallar(ERRORES.NO_AUTORIZADO, 'Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.');
  }

  const usuario = transaccion((datos) => {
    const nuevo = {
      id: nuevoId(rol === ROLES.DOCENTE ? 'doc' : 'est'),
      nombre: String(nombre).trim().replace(/\s+/g, ' '),
      correo: correoNormalizado,
      rol,
    };
    datos.usuarios.push(nuevo);
    return nuevo;
  });

  return responder({ usuario, token: `mock.${usuario.id}.${usuario.rol}` });
};

/** Perfil a partir del token simulado. */
export const perfil = (token) => {
  const id = String(token ?? '').split('.')[1];
  const usuario = listar('usuarios').find((candidato) => candidato.id === id);

  if (!usuario) return fallar(ERRORES.NO_AUTORIZADO, 'La sesión no es válida.');
  return responder(usuario);
};

/** Cuentas disponibles, para la ayuda de la pantalla de acceso en desarrollo. */
export const cuentasDisponibles = () => responder(listar('usuarios'));

export const authMock = { login, registrar, perfil, cuentasDisponibles };
