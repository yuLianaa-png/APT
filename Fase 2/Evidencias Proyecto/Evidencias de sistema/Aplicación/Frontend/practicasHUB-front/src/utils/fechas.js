/**
 * Fechas del dominio.
 *
 * Convención de M-01: la fecha de una jornada es 'YYYY-MM-DD' (día civil, sin zona);
 * todo instante del sistema es ISO 8601 completo.
 *
 * RN-09: la fecha de una jornada es única dentro de la misma práctica. La misma fecha
 *        sí puede usarse en grupos distintos.
 * Decisión A-12: las fechas futuras se permiten. La única validación de fecha que
 *        piden los documentos es la unicidad.
 */

/** Año de un grupo, derivado de su fecha de creación (§5.3). */
export const anioDelGrupo = (creadoEn) => {
  if (!creadoEn) return null;
  const fecha = new Date(creadoEn);
  return Number.isNaN(fecha.getTime()) ? null : fecha.getFullYear();
};

/** 'YYYY-MM-DD' → 'dd/mm/aaaa'. Devuelve '' si no se puede interpretar. */
export const formatearFecha = (fechaISO) => {
  if (typeof fechaISO !== 'string') return '';
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO);
  if (!coincidencia) return '';
  const [, anio, mes, dia] = coincidencia;
  return `${dia}/${mes}/${anio}`;
};

/** Instante ISO → 'dd/mm/aaaa HH:MM'. */
export const formatearInstante = (instanteISO) => {
  if (!instanteISO) return '';
  const fecha = new Date(instanteISO);
  if (Number.isNaN(fecha.getTime())) return '';

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()} ${hh}:${mm}`;
};

/** Día civil de un instante, como 'YYYY-MM-DD'. */
export const aFechaISO = (instante) => {
  const fecha = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(fecha.getTime())) return '';

  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/** true si la cadena es una fecha 'YYYY-MM-DD' que existe en el calendario. */
export const esFechaValida = (fechaISO) => {
  if (typeof fechaISO !== 'string') return false;
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO);
  if (!coincidencia) return false;

  const [, anio, mes, dia] = coincidencia.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio
    && fecha.getMonth() === mes - 1
    && fecha.getDate() === dia;
};

/**
 * RN-09. Comprueba si una fecha ya está usada en la práctica.
 * `jornadas` son las del MISMO grupo; el llamador no debe mezclar grupos.
 * `idExcluido` permite revalidar una jornada que se está editando.
 */
export const fechaRepetida = (fechaISO, jornadas = [], idExcluido = null) =>
  jornadas.some((jornada) => jornada.fecha === fechaISO && jornada.id !== idExcluido);

/**
 * RN-09 aplicada también dentro del mismo formulario: el manual (§4.17) exige que no
 * se puedan enviar dos jornadas con la misma fecha en una sola tanda.
 * Devuelve las fechas duplicadas dentro de la propia lista.
 */
export const fechasDuplicadasEnTanda = (fechas = []) => {
  const vistas = new Set();
  const repetidas = new Set();

  fechas.forEach((fecha) => {
    if (vistas.has(fecha)) repetidas.add(fecha);
    else vistas.add(fecha);
  });

  return [...repetidas];
};

/** Ordena por fecha descendente; empata por instante de creación. */
export const porFechaDescendente = (a, b) => {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  return new Date(b.creadaEn || 0) - new Date(a.creadaEn || 0);
};
