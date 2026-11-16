import { ESTADO_GRUPO, ESTADO_SOLICITUD, NIVEL_RIESGO } from './constants';
import { aFechaISO, formatearFecha } from './fechas';

/**
 * Alertas de riesgo de un estudiante dentro de un grupo.
 *
 * Son las MISMAS reglas que `PracticeRiskService` del backend. Con la API real el nivel
 * llega calculado desde el servidor; esta versión la usa el almacén simulado para que los
 * dos modos se comporten igual. Si se cambia un umbral, hay que cambiarlo en los dos lados.
 */

export const UMBRALES_RIESGO = {
  INACTIVIDAD_ATENCION_DIAS: 4,
  INACTIVIDAD_RIESGO_DIAS: 7,
  // La primera semana no se evalúa el ritmo, para no dar falsas alarmas.
  DIAS_MINIMOS_PARA_RITMO: 7,
  // Proyección bajo el 80 % de la meta: riesgo; bajo el 100 %: atención.
  RITMO_RIESGO_PROPORCION: 0.8,
  SOLICITUD_SIN_RESPUESTA_DIAS: 2,
};

const PESO = { [NIVEL_RIESGO.SIN_ALERTA]: 0, [NIVEL_RIESGO.ATENCION]: 1, [NIVEL_RIESGO.RIESGO]: 2 };

/** Se queda con el nivel más grave. */
const subir = (actual, candidato) => (PESO[candidato] > PESO[actual] ? candidato : actual);

/** Días enteros entre dos fechas 'YYYY-MM-DD'. */
const diasEntre = (desdeISO, hastaISO) =>
  Math.round((new Date(`${hastaISO}T00:00:00`) - new Date(`${desdeISO}T00:00:00`)) / 86_400_000);

/** Fecha de la jornada más reciente, o null si no tiene ninguna. */
export const ultimaJornada = (jornadas = []) =>
  jornadas.map((j) => j.fecha).filter(Boolean).sort().at(-1) ?? null;

/**
 * @param {object} p
 * @param {object} p.grupo    con `estado`, `metaMinimaHoras` y `fechaTermino` (opcional)
 * @param {object} p.vinculacion con `vinculadoEn`
 * @param {object[]} p.jornadas del estudiante en el grupo
 * @param {Date} p.ahora
 * @returns {{ nivel: string, motivos: string[] }}
 */
export const evaluarRiesgo = ({ grupo, vinculacion, jornadas = [], ahora = new Date() }) => {
  const hoy = aFechaISO(ahora);
  const motivos = [];
  let nivel = NIVEL_RIESGO.SIN_ALERTA;

  const horas = jornadas.reduce((total, j) => total + (j.horas ?? 0), 0);
  const meta = Number(grupo.metaMinimaHoras) || 0;
  const metaAlcanzada = meta > 0 && horas >= meta;

  // 1. Inactividad y ritmo: solo con el grupo activo y la meta todavía sin alcanzar.
  if (grupo.estado === ESTADO_GRUPO.ACTIVO && !metaAlcanzada) {
    const ultima = ultimaJornada(jornadas);
    const vinculadoEl = vinculacion?.vinculadoEn ? aFechaISO(vinculacion.vinculadoEn) : hoy;
    const diasInactivo = diasEntre(ultima ?? vinculadoEl, hoy);

    if (diasInactivo >= UMBRALES_RIESGO.INACTIVIDAD_ATENCION_DIAS) {
      nivel = subir(nivel, diasInactivo >= UMBRALES_RIESGO.INACTIVIDAD_RIESGO_DIAS
        ? NIVEL_RIESGO.RIESGO : NIVEL_RIESGO.ATENCION);
      motivos.push(ultima
        ? `Lleva ${diasInactivo} días sin registrar jornadas.`
        : `Se vinculó hace ${diasInactivo} días y aún no registra jornadas.`);
    }

    if (grupo.fechaTermino && meta > 0) {
      if (hoy > grupo.fechaTermino) {
        nivel = subir(nivel, NIVEL_RIESGO.RIESGO);
        motivos.push(`El periodo terminó el ${formatearFecha(grupo.fechaTermino)} sin alcanzar la meta (${Math.round(horas * 10) / 10} de ${meta} h).`);
      } else {
        const diasTranscurridos = diasEntre(vinculadoEl, hoy);
        if (diasTranscurridos >= UMBRALES_RIESGO.DIAS_MINIMOS_PARA_RITMO) {
          const proyectadas = horas + (horas / diasTranscurridos) * diasEntre(hoy, grupo.fechaTermino);
          if (proyectadas < meta) {
            nivel = subir(nivel, proyectadas < meta * UMBRALES_RIESGO.RITMO_RIESGO_PROPORCION
              ? NIVEL_RIESGO.RIESGO : NIVEL_RIESGO.ATENCION);
            motivos.push(`Al ritmo actual llegaría a unas ${Math.round(proyectadas)} de ${meta} h al ${formatearFecha(grupo.fechaTermino)}.`);
          }
        }
      }
    }
  }

  // 2. Solicitudes de corrección que esperan respuesta del docente.
  const diasSolicitud = jornadas
    .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE && j.solicitud.creadaEn)
    .map((j) => diasEntre(aFechaISO(j.solicitud.creadaEn), hoy));
  const masAntigua = diasSolicitud.length ? Math.max(...diasSolicitud) : 0;
  if (masAntigua > UMBRALES_RIESGO.SOLICITUD_SIN_RESPUESTA_DIAS) {
    nivel = subir(nivel, NIVEL_RIESGO.ATENCION);
    motivos.push(`Tiene una solicitud de corrección sin responder hace ${masAntigua} días.`);
  }

  return { nivel, motivos };
};
