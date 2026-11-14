/**
 * Cálculo de horas de una jornada.
 *
 * RN-07: horas efectivas = hora de término − hora de inicio − descanso.
 *        El total NUNCA se ingresa a mano.
 * RN-08: el término debe ser posterior al inicio y el descanso no puede dejar una
 *        duración efectiva nula o negativa.
 * RN-15: no existe tope diario universal. Una jornada de 14 h es válida.
 */

import { ERRORES } from './constants';

/** Convierte 'HH:MM' en minutos desde medianoche. Devuelve null si no es válido. */
export const aMinutos = (hora) => {
  if (typeof hora !== 'string') return null;
  const coincidencia = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!coincidencia) return null;

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horas > 23 || minutos > 59) return null;

  return horas * 60 + minutos;
};

/** Convierte minutos desde medianoche en 'HH:MM'. */
export const aHora = (minutos) => {
  const total = Math.max(0, Math.round(minutos));
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * Minutos efectivos de la jornada. Puede ser cero o negativo: quien decide si eso
 * es aceptable es `validarDuracion`, no esta función.
 */
export const minutosEfectivos = (horaInicio, horaTermino, descansoMin = 0) => {
  const inicio = aMinutos(horaInicio);
  const termino = aMinutos(horaTermino);
  if (inicio === null || termino === null) return null;

  const descanso = Number.isFinite(Number(descansoMin)) ? Number(descansoMin) : 0;
  return termino - inicio - descanso;
};

/**
 * Horas efectivas en decimal, redondeadas a dos cifras (RN-07).
 * Devuelve null si los horarios no se pueden interpretar.
 */
export const calcularHoras = (horaInicio, horaTermino, descansoMin = 0) => {
  const minutos = minutosEfectivos(horaInicio, horaTermino, descansoMin);
  if (minutos === null) return null;
  return Math.round((minutos / 60) * 100) / 100;
};

/**
 * Valida los horarios de una jornada (RN-08).
 * No aplica ningún tope de duración: RN-15 dice que no existe máximo diario.
 *
 * @returns {{ valido: boolean, codigo?: string, mensaje?: string }}
 */
export const validarDuracion = (horaInicio, horaTermino, descansoMin = 0) => {
  const inicio = aMinutos(horaInicio);
  const termino = aMinutos(horaTermino);

  if (inicio === null || termino === null) {
    return {
      valido: false,
      codigo: ERRORES.HORARIO_INVALIDO,
      mensaje: 'Indica la hora de inicio y la hora de término en formato HH:MM.',
    };
  }

  if (termino <= inicio) {
    return {
      valido: false,
      codigo: ERRORES.HORARIO_INVALIDO,
      mensaje: 'La hora de término debe ser posterior a la hora de inicio.',
    };
  }

  const descanso = Number(descansoMin);
  if (!Number.isFinite(descanso) || descanso < 0 || !Number.isInteger(descanso)) {
    return {
      valido: false,
      codigo: ERRORES.HORARIO_INVALIDO,
      mensaje: 'El descanso se indica en minutos completos.',
    };
  }

  if (termino - inicio - descanso <= 0) {
    return {
      valido: false,
      codigo: ERRORES.HORARIO_INVALIDO,
      mensaje: 'El descanso no puede dejar la jornada sin duración efectiva.',
    };
  }

  return { valido: true };
};

/** Formatea horas decimales al uso chileno: 7.5 → '7,5'. */
export const formatearHoras = (horas) => {
  if (!Number.isFinite(Number(horas))) return '0';
  const valor = Number(horas);
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(/0$/, '');
  return texto.replace('.', ',');
};

/** Formatea un descanso en minutos de forma legible: 90 → '1 h 30 min'. */
export const formatearDescanso = (descansoMin) => {
  const minutos = Number(descansoMin);
  if (!Number.isFinite(minutos) || minutos <= 0) return 'Sin descanso';
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
};

/**
 * Avance frente a la meta mínima del grupo.
 * RN-06: la meta no es un máximo. Las horas siguen acumulando después de alcanzarla,
 * así que `porcentaje` se tope en 100 solo para la barra, y `restantes` nunca baja de 0,
 * pero `registradas` se devuelve tal cual.
 */
export const avanceMeta = (horasRegistradas, metaMinimaHoras) => {
  const registradas = Math.max(0, Number(horasRegistradas) || 0);
  const meta = Number(metaMinimaHoras) || 0;

  return {
    registradas,
    meta,
    restantes: Math.max(0, Math.round((meta - registradas) * 100) / 100),
    porcentaje: meta > 0 ? Math.min(100, Math.round((registradas / meta) * 1000) / 10) : 0,
    metaAlcanzada: meta > 0 && registradas >= meta,
  };
};
