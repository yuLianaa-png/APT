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
  // El plan acordado con el docente se revisa cuando lleva una semana completa.
  PLAN_REVISION_DIAS: 7,
};

const PESO = { [NIVEL_RIESGO.SIN_ALERTA]: 0, [NIVEL_RIESGO.ATENCION]: 1, [NIVEL_RIESGO.RIESGO]: 2 };

/** Se queda con el nivel más grave. */
const subir = (actual, candidato) => (PESO[candidato] > PESO[actual] ? candidato : actual);

/** Días enteros entre dos fechas 'YYYY-MM-DD'. */
const diasEntre = (desdeISO, hastaISO) =>
  Math.round((new Date(`${hastaISO}T00:00:00`) - new Date(`${desdeISO}T00:00:00`)) / 86_400_000);

const redondear1 = (valor) => Math.round(valor * 10) / 10;

/** Fecha de la jornada más reciente, o null si no tiene ninguna. */
export const ultimaJornada = (jornadas = []) =>
  jornadas.map((j) => j.fecha).filter(Boolean).sort().at(-1) ?? null;

/**
 * @param {object} p
 * @param {object} p.grupo    con `estado`, `metaMinimaHoras` y `fechaTermino` (opcional)
 * @param {object} p.vinculacion con `vinculadoEn` y, si el docente definió un plan,
 *   `fechaTerminoIndividual`, `compromisoSemanal` y `compromisoDesde`
 * @param {object[]} p.jornadas del estudiante en el grupo
 * @param {Date} p.ahora
 * @returns {{ nivel: string, motivos: string[], nivelEstudiante: string,
 *   motivosEstudiante: string[], ritmoSemanal: number|null, fechaTermino: string|null }}
 */
export const evaluarRiesgo = ({ grupo, vinculacion, jornadas = [], ahora = new Date() }) => {
  const hoy = aFechaISO(ahora);
  const motivos = [];
  let nivel = NIVEL_RIESGO.SIN_ALERTA;

  const horas = jornadas.reduce((total, j) => total + (j.horas ?? 0), 0);
  const meta = Number(grupo.metaMinimaHoras) || 0;
  const metaAlcanzada = meta > 0 && horas >= meta;
  // Si el docente dio una prórroga individual, manda esa fecha.
  const fechaTermino = vinculacion?.fechaTerminoIndividual || grupo.fechaTermino || null;
  let ritmoSemanal = null;

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

    if (fechaTermino && meta > 0) {
      if (hoy > fechaTermino) {
        nivel = subir(nivel, NIVEL_RIESGO.RIESGO);
        motivos.push(`El periodo terminó el ${formatearFecha(fechaTermino)} sin alcanzar la meta (${redondear1(horas)} de ${meta} h).`);
      } else {
        // Horas por semana que le faltan para llegar a la meta a tiempo (incluye hoy).
        ritmoSemanal = redondear1((meta - horas) / ((diasEntre(hoy, fechaTermino) + 1) / 7));

        const diasTranscurridos = diasEntre(vinculadoEl, hoy);
        if (diasTranscurridos >= UMBRALES_RIESGO.DIAS_MINIMOS_PARA_RITMO) {
          const proyectadas = horas + (horas / diasTranscurridos) * diasEntre(hoy, fechaTermino);
          if (proyectadas < meta) {
            nivel = subir(nivel, proyectadas < meta * UMBRALES_RIESGO.RITMO_RIESGO_PROPORCION
              ? NIVEL_RIESGO.RIESGO : NIVEL_RIESGO.ATENCION);
            motivos.push(`Al ritmo actual llegaría a unas ${Math.round(proyectadas)} de ${meta} h al ${formatearFecha(fechaTermino)}.`);
          }
        }
      }
    }

    // Plan acordado con el docente: horas de los últimos 7 días contra las comprometidas.
    const compromiso = Number(vinculacion?.compromisoSemanal) || 0;
    if (compromiso > 0 && vinculacion?.compromisoDesde
      && diasEntre(vinculacion.compromisoDesde, hoy) >= UMBRALES_RIESGO.PLAN_REVISION_DIAS) {
      const inicioSemana = aFechaISO(new Date(new Date(`${hoy}T00:00:00`).getTime() - 6 * 86_400_000));
      const ultimaSemana = jornadas
        .filter((j) => j.fecha && j.fecha >= inicioSemana)
        .reduce((total, j) => total + (j.horas ?? 0), 0);
      if (ultimaSemana < compromiso) {
        nivel = subir(nivel, NIVEL_RIESGO.ATENCION);
        motivos.push(`No está cumpliendo el plan acordado: ${redondear1(ultimaSemana)} de ${redondear1(compromiso)} h en los últimos 7 días.`);
      }
    }
  }

  // Hasta aquí, alertas que el estudiante puede corregir por su cuenta.
  const nivelEstudiante = nivel;
  const motivosEstudiante = [...motivos];

  // 2. Solicitudes de corrección que esperan respuesta del docente.
  const diasSolicitud = jornadas
    .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE && j.solicitud.creadaEn)
    .map((j) => diasEntre(aFechaISO(j.solicitud.creadaEn), hoy));
  const masAntigua = diasSolicitud.length ? Math.max(...diasSolicitud) : 0;
  if (masAntigua > UMBRALES_RIESGO.SOLICITUD_SIN_RESPUESTA_DIAS) {
    nivel = subir(nivel, NIVEL_RIESGO.ATENCION);
    motivos.push(`Tiene una solicitud de corrección sin responder hace ${masAntigua} días.`);
  }

  return {
    nivel, motivos, nivelEstudiante, motivosEstudiante, ritmoSemanal, fechaTermino,
  };
};
