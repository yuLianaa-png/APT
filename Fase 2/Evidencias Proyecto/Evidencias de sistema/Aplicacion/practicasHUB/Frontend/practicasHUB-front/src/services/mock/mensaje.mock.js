/**
 * Mensajes docente-estudiante en el almacén simulado. Mismas reglas que
 * `PracticeMessageService`: solo participan el estudiante de la vinculación y el docente
 * del grupo, el grupo inactivo queda en solo lectura y abrir la conversación marca como
 * leído lo recibido.
 */

import {
  ERRORES, LARGO_MAXIMO_MENSAJE, ROLES, STORAGE_KEYS, TIPO_NOTIFICACION, TIPO_REFERENCIA,
} from '../../utils/constants';
import { evaluarRiesgo } from '../../utils/riesgo';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

/** Usuario de la sesión, igual que en la capa HTTP. */
const usuarioActual = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER)) ?? null;
  } catch {
    return null;
  }
};

const participa = (usuario, vinculacion, grupo) => Boolean(usuario)
  && ((usuario.rol === ROLES.ESTUDIANTE && vinculacion.estudianteId === usuario.id)
    || (usuario.rol === ROLES.DOCENTE && grupo.docenteId === usuario.id));

const vista = (mensaje, usuarioId) => ({
  id: mensaje.id,
  vinculacionId: mensaje.vinculacionId,
  propio: mensaje.remitenteId === usuarioId,
  remitenteRol: mensaje.remitenteRol,
  texto: mensaje.texto,
  enviadoEn: mensaje.enviadoEn,
  leidoEn: mensaje.leidoEn ?? null,
});

/** Mensajes que `lectorId` todavía no lee en una vinculación. */
export const noLeidosPara = (vinculacionId, lectorId) => listar('mensajes')
  .filter((m) => m.vinculacionId === vinculacionId && m.remitenteId !== lectorId && !m.leidoEn).length;

export const conversacion = (vinculacionId) => {
  const usuario = usuarioActual();
  try {
    const mensajes = transaccion((datos) => {
      const vinculacion = exigirExista(
        datos.vinculaciones.find((v) => v.id === vinculacionId),
        'La vinculación no existe.',
      );
      const grupo = datos.grupos.find((g) => g.id === vinculacion.grupoId);
      if (!participa(usuario, vinculacion, grupo)) {
        throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No participas en esta conversación.');
      }
      const suyos = datos.mensajes
        .filter((m) => m.vinculacionId === vinculacionId)
        .sort((a, b) => new Date(a.enviadoEn) - new Date(b.enviadoEn));
      suyos.filter((m) => m.remitenteId !== usuario.id && !m.leidoEn)
        .forEach((m) => { m.leidoEn = ahoraISO(); });
      return suyos;
    });
    return responder(mensajes.map((m) => vista(m, usuario.id)));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

export const enviar = (vinculacionId, texto) => {
  const usuario = usuarioActual();
  try {
    const mensaje = transaccion((datos) => {
      const vinculacion = exigirExista(
        datos.vinculaciones.find((v) => v.id === vinculacionId),
        'La vinculación no existe.',
      );
      const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
      if (!participa(usuario, vinculacion, grupo)) {
        throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No participas en esta conversación.');
      }
      const limpio = String(texto ?? '').trim();
      if (!limpio) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Escribe un mensaje antes de enviarlo.');
      if (limpio.length > LARGO_MAXIMO_MENSAJE) {
        throw new ErrorServicio(ERRORES.NO_AUTORIZADO, `El mensaje no puede superar los ${LARGO_MAXIMO_MENSAJE} caracteres.`);
      }

      const nuevo = {
        id: nuevoId('msj'),
        vinculacionId,
        remitenteId: usuario.id,
        remitenteRol: usuario.rol,
        texto: limpio,
        enviadoEn: ahoraISO(),
        leidoEn: null,
      };
      datos.mensajes.push(nuevo);

      // El aviso no lleva el texto del mensaje.
      const delEstudiante = usuario.rol === ROLES.ESTUDIANTE;
      notificar(datos, {
        destinatarioId: delEstudiante ? grupo.docenteId : vinculacion.estudianteId,
        grupo,
        tipo: TIPO_NOTIFICACION.MENSAJE_RECIBIDO,
        mensaje: `${usuario.nombre ?? (delEstudiante ? 'Un estudiante' : 'Tu docente')} te envió un mensaje.`,
        referencia: { tipo: TIPO_REFERENCIA.CONVERSACION, id: vinculacionId },
      });
      return nuevo;
    });
    return responder(vista(mensaje, usuario.id));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

export const bandejaDelGrupo = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');

  const usuarios = listar('usuarios');
  const jornadas = listar('jornadas');
  const mensajes = listar('mensajes');

  const bandeja = listar('vinculaciones')
    .filter((v) => v.grupoId === grupoId)
    .map((vinculacion) => {
      const suyos = mensajes
        .filter((m) => m.vinculacionId === vinculacion.id)
        .sort((a, b) => new Date(a.enviadoEn) - new Date(b.enviadoEn));
      const ultimo = suyos.at(-1) ?? null;
      return {
        vinculacionId: vinculacion.id,
        estudianteId: vinculacion.estudianteId,
        nombre: usuarios.find((u) => u.id === vinculacion.estudianteId)?.nombre ?? 'Estudiante',
        ultimoMensaje: ultimo ? ultimo.texto.slice(0, 80) : null,
        ultimoEn: ultimo?.enviadoEn ?? null,
        noLeidos: suyos.filter((m) => m.remitenteId !== grupo.docenteId && !m.leidoEn).length,
        nivelRiesgo: evaluarRiesgo({
          grupo,
          vinculacion,
          jornadas: jornadas.filter((j) => j.vinculacionId === vinculacion.id),
          ahora: ahora(),
        }).nivel,
      };
    })
    .sort((a, b) => {
      if ((a.noLeidos > 0) !== (b.noLeidos > 0)) return a.noLeidos > 0 ? -1 : 1;
      return new Date(b.ultimoEn ?? 0) - new Date(a.ultimoEn ?? 0);
    });

  return responder(bandeja);
};

export const mensajeMock = {
  conversacion,
  enviar,
  bandejaDelGrupo,
};
