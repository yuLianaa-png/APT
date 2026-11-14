/**
 * Piezas compartidas por los servicios simulados.
 *
 * Todos devuelven promesas y fallan con `{ codigo, mensaje }`, igual que hará la API
 * real, para que las pantallas no cambien al enchufar Spring Boot.
 */

import { ERRORES, ESTADO_GRUPO } from '../../utils/constants';
import { nuevoId } from './db';
import { ahoraISO } from './reloj';

/** Latencia simulada: suficiente para que los estados de carga se vean de verdad. */
const LATENCIA_MS = 120;

/** Resuelve tras una pequeña espera, para ejercitar los estados de carga. */
export const responder = (valor) =>
  new Promise((resolve) => { setTimeout(() => resolve(valor), LATENCIA_MS); });

/** Error del dominio con la misma forma que devolverá el backend. */
export class ErrorServicio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorServicio';
    this.codigo = codigo;
    this.mensaje = mensaje;
  }
}

/** Rechaza tras la latencia simulada. */
export const fallar = (codigo, mensaje) =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new ErrorServicio(codigo, mensaje)), LATENCIA_MS);
  });

/**
 * RN-03 y §8: el modo de solo lectura de un grupo inactivo se valida en el servicio,
 * no solo deshabilitando el botón. Esta función es el equivalente simulado de esa
 * comprobación de backend.
 */
export const exigirGrupoActivo = (grupo) => {
  if (!grupo) {
    throw new ErrorServicio(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');
  }
  if (grupo.estado !== ESTADO_GRUPO.ACTIVO) {
    throw new ErrorServicio(
      ERRORES.GRUPO_INACTIVO,
      'La práctica está inactiva: solo se puede consultar.',
    );
  }
  return grupo;
};

export const exigirExista = (valor, mensaje) => {
  if (!valor) throw new ErrorServicio(ERRORES.NO_ENCONTRADO, mensaje);
  return valor;
};

/**
 * Crea una notificación dentro de las colecciones vivas de una transacción.
 * Toda notificación identifica el grupo de origen (RN-16).
 */
export const notificar = (datos, { destinatarioId, grupo, tipo, mensaje, referencia }) => {
  const notificacion = {
    id: nuevoId('not'),
    destinatarioId,
    grupoId: grupo.id,
    grupoNombre: grupo.nombre,
    grupoCodigo: grupo.codigo,
    tipo,
    mensaje,
    referencia,
    creadaEn: ahoraISO(),
  };
  datos.notificaciones.push(notificacion);
  return notificacion;
};

/** Notifica a todos los estudiantes vinculados a un grupo (§5.21). */
export const notificarAlGrupo = (datos, { grupo, tipo, mensaje, referencia }) =>
  datos.vinculaciones
    .filter((vinculacion) => vinculacion.grupoId === grupo.id)
    .map((vinculacion) => notificar(datos, {
      destinatarioId: vinculacion.estudianteId,
      grupo,
      tipo,
      mensaje,
      referencia,
    }));

/**
 * Código de vinculación. RN-02: lo genera el sistema, el docente nunca lo escribe.
 * Formato legible y fácil de dictar: PRE-AÑO-XXXX sin caracteres ambiguos.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generarCodigo = (codigosExistentes, anio) => {
  const usados = new Set(codigosExistentes);

  for (let intento = 0; intento < 200; intento += 1) {
    let sufijo = '';
    for (let i = 0; i < 4; i += 1) {
      sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    }
    const codigo = `PRA-${anio}-${sufijo}`;
    if (!usados.has(codigo)) return codigo;
  }

  // Inalcanzable en la práctica; si ocurriera, mejor fallar que devolver un duplicado
  // y romper RNF-10.
  throw new ErrorServicio(
    ERRORES.NO_AUTORIZADO,
    'No se pudo generar un código único. Intenta de nuevo.',
  );
};
