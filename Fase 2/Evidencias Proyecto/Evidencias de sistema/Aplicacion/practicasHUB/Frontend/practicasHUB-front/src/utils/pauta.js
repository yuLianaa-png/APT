import { MAXIMO_ACTIVIDADES, TIPO_CRITERIO } from './constants';

/**
 * Reglas de una pauta de evaluación del centro de práctica. Son las MISMAS que valida
 * `EvaluationTemplateService` en el backend: si se cambia una, hay que cambiarla en los dos.
 *
 * Forma de una pauta en el front:
 *   { instrucciones, secciones: [{ titulo, cuentaParaNota, criterios: [{ tipo, texto,
 *     admiteNoAplica, ponderacion, seccionOrigen, minimoActividades }] }] }
 */

export const LIMITES_PAUTA = {
  SECCIONES: 10,
  CRITERIOS: 40,
  TEXTO: 500,
  TITULO: 150,
  INSTRUCCIONES: 3000,
};

const FORMATOS_PLANTILLA = ['xlsx', 'docx', 'pdf'];
const MAXIMO_PLANTILLA = 5 * 1024 * 1024;

/** Mismas reglas que document-service: Excel, Word o PDF con texto, hasta 5 MB. */
export const validarPlantilla = (archivo) => {
  if (!archivo) return 'Selecciona la plantilla.';
  const extension = String(archivo.name ?? '').split('.').pop().toLowerCase();
  if (!FORMATOS_PLANTILLA.includes(extension)) {
    return 'Formato no permitido. Sube la plantilla en Excel (.xlsx), Word (.docx) o PDF con texto.';
  }
  if (archivo.size > MAXIMO_PLANTILLA) return 'La plantilla no puede superar los 5 MB.';
  return null;
};

let siguienteClave = 0;
/** Clave estable para las listas del editor; no viaja al servidor. */
export const nuevaClave = () => {
  siguienteClave += 1;
  return `k${siguienteClave}`;
};

export const nuevoCriterio = (tipo = TIPO_CRITERIO.NOTA) => ({
  clave: nuevaClave(),
  tipo,
  texto: tipo === TIPO_CRITERIO.ACTIVIDADES ? 'Actividades realizadas por el estudiante' : '',
  admiteNoAplica: false,
  ponderacion: null,
  seccionOrigen: null,
  minimoActividades: tipo === TIPO_CRITERIO.ACTIVIDADES ? 1 : null,
});

export const nuevaSeccion = (titulo = '') => ({
  clave: nuevaClave(),
  titulo,
  cuentaParaNota: true,
  criterios: [nuevoCriterio()],
});

export const pautaVacia = () => ({
  instrucciones: '',
  secciones: [nuevaSeccion('Aspectos a evaluar')],
});

/** Agrega claves a una pauta que llega del servidor o del lector de plantillas. */
export const conClaves = (pauta) => ({
  ...pauta,
  instrucciones: pauta?.instrucciones ?? '',
  secciones: (pauta?.secciones ?? []).map((seccion) => ({
    ...seccion,
    clave: nuevaClave(),
    criterios: (seccion.criterios ?? []).map((criterio) => ({ ...criterio, clave: nuevaClave() })),
  })),
});

const tieneNota = (criterio) => criterio.tipo !== TIPO_CRITERIO.TEXTO;
const vacio = (valor) => valor === null || valor === undefined || valor === '';
const corto = (texto) => {
  const plano = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return plano.length <= 60 ? plano : `${plano.slice(0, 59)}…`;
};

/**
 * Problemas que impiden publicar la pauta, en el orden en que aparecen. Lista vacía = se
 * puede publicar.
 */
export const validarPauta = (pauta) => {
  const errores = [];
  const secciones = pauta?.secciones ?? [];

  if (String(pauta?.instrucciones ?? '').length > LIMITES_PAUTA.INSTRUCCIONES) {
    errores.push(`Las instrucciones no pueden superar los ${LIMITES_PAUTA.INSTRUCCIONES} caracteres.`);
  }
  if (secciones.length === 0) errores.push('La pauta no tiene secciones.');
  if (secciones.length > LIMITES_PAUTA.SECCIONES) errores.push(`La pauta puede tener como máximo ${LIMITES_PAUTA.SECCIONES} secciones.`);
  const total = secciones.reduce((suma, s) => suma + s.criterios.length, 0);
  if (total > LIMITES_PAUTA.CRITERIOS) errores.push(`La pauta puede tener como máximo ${LIMITES_PAUTA.CRITERIOS} criterios.`);

  let finalConNota = false;
  let finalObligatorio = false;

  secciones.forEach((seccion, s) => {
    const titulo = String(seccion.titulo ?? '').trim();
    const nombre = titulo ? `«${corto(titulo)}»` : `la sección ${s + 1}`;
    if (!titulo) errores.push(`Falta el título de la sección ${s + 1}.`);
    if (titulo.length > LIMITES_PAUTA.TITULO) errores.push(`El título de ${nombre} es demasiado largo.`);
    if (seccion.criterios.length === 0) errores.push(`La sección ${nombre} no tiene criterios.`);

    const textos = new Set();
    let actividades = 0;
    let conPonderacion = 0;
    let conNota = 0;
    let suma = 0;

    seccion.criterios.forEach((criterio) => {
      const texto = String(criterio.texto ?? '').trim();
      if (texto.length < 2) errores.push(`Hay un criterio sin texto en ${nombre}.`);
      else if (textos.has(texto.toLowerCase())) errores.push(`El criterio «${corto(texto)}» está repetido en ${nombre}.`);
      textos.add(texto.toLowerCase());
      if (texto.length > LIMITES_PAUTA.TEXTO) errores.push(`El criterio «${corto(texto)}» supera los ${LIMITES_PAUTA.TEXTO} caracteres.`);

      if (criterio.tipo === TIPO_CRITERIO.CALCULADO) {
        const origen = secciones[criterio.seccionOrigen];
        if (vacio(criterio.seccionOrigen) || !origen || criterio.seccionOrigen === s) {
          errores.push(`Elige de qué sección sale el promedio de «${corto(texto)}».`);
        } else if (!origen.criterios.some((c) => c.tipo === TIPO_CRITERIO.NOTA)
          || origen.criterios.some((c) => c.tipo === TIPO_CRITERIO.CALCULADO)) {
          errores.push(`«${corto(texto)}» debe salir de una sección que tenga criterios con nota y ningún otro criterio calculado.`);
        }
      }
      if (criterio.tipo === TIPO_CRITERIO.ACTIVIDADES) {
        actividades += 1;
        const minimo = Number(criterio.minimoActividades);
        if (!Number.isInteger(minimo) || minimo < 1 || minimo > MAXIMO_ACTIVIDADES) {
          errores.push(`El mínimo de actividades debe estar entre 1 y ${MAXIMO_ACTIVIDADES}.`);
        }
      }

      if (tieneNota(criterio)) {
        conNota += 1;
        if (!vacio(criterio.ponderacion)) {
          const valor = Number(criterio.ponderacion);
          if (!Number.isFinite(valor) || valor <= 0 || valor > 100) {
            errores.push('Las ponderaciones deben ser mayores que 0 y como máximo 100 %.');
          }
          conPonderacion += 1;
          suma += Number.isFinite(valor) ? valor : 0;
        }
        const admite = criterio.tipo === TIPO_CRITERIO.NOTA && criterio.admiteNoAplica;
        if (seccion.cuentaParaNota && !admite) finalObligatorio = true;
      }
    });

    if (actividades > 1) errores.push(`La sección ${nombre} tiene más de una lista de actividades.`);
    if (conPonderacion > 0) {
      if (!seccion.cuentaParaNota) errores.push('Las ponderaciones solo se usan en secciones que cuentan para la nota final.');
      else if (conPonderacion !== conNota) errores.push(`En ${nombre} pon ponderación a todos los criterios con nota o a ninguno.`);
      else if (Math.abs(suma - 100) > 0.01) errores.push(`Las ponderaciones de ${nombre} suman ${Math.round(suma * 100) / 100} %: deben sumar 100 %.`);
    }
    if (seccion.cuentaParaNota && conNota > 0) finalConNota = true;
  });

  if (secciones.length > 0 && !finalConNota) errores.push('Marca al menos una sección con criterios con nota para la nota final.');
  if (finalConNota && !finalObligatorio) errores.push('En la nota final debe haber al menos un criterio que no admita «No aplica».');

  // Sin repetidos: varios criterios vacíos generan el mismo mensaje.
  return [...new Set(errores)];
};

/** Cómo se calculará la nota final con esta pauta, en palabras. */
export const explicarNota = (pauta) => {
  const finales = (pauta?.secciones ?? []).filter((s) => s.cuentaParaNota);
  if (finales.length === 0) return 'Todavía no hay secciones que cuenten para la nota final.';
  const nombres = finales.map((s) => `«${corto(s.titulo) || 'sin título'}»`).join(', ');
  const ponderada = finales.some((s) => s.criterios.some((c) => !vacio(c.ponderacion)));
  const partes = [
    finales.length === 1
      ? `La nota final sale de la sección ${nombres}`
      : `La nota final es el promedio de las secciones ${nombres}`,
    ponderada
      ? 'según las ponderaciones de cada criterio'
      : 'como promedio simple de sus criterios (cada actividad cuenta como un criterio)',
  ];
  return `${partes.join(', ')}. Los criterios calculados toman el promedio de su sección de origen y «No aplica» no cuenta. Escala de 1,0 a 7,0.`;
};

/* --------------------------------------------------- respuestas del supervisor y nota */

/**
 * Respuestas de una evaluación, en el mismo orden que la pauta:
 *   [{ criterios: [{ nota, noAplica, texto, actividades: [{ descripcion, nota }] }] }]
 */
export const respuestasVacias = (secciones) => (secciones ?? []).map((seccion) => ({
  criterios: seccion.criterios.map((criterio) => ({
    nota: null,
    noAplica: false,
    texto: '',
    actividades: criterio.tipo === TIPO_CRITERIO.ACTIVIDADES
      ? Array.from({ length: Number(criterio.minimoActividades) || 1 }, () => ({ clave: nuevaClave(), descripcion: '', nota: null }))
      : [],
  })),
}));

export const LIMITES_RESPUESTA = { DESCRIPCION_MIN: 3, DESCRIPCION_MAX: 300, TEXTO: 2000 };

const promedio = (valores) => valores.reduce((suma, v) => suma + v, 0) / valores.length;
export const redondearNota = (valor) => Math.round(valor * 10) / 10;

const respuestaDe = (respuestas, s, c) => respuestas?.[s]?.criterios?.[c] ?? null;

/** Promedio de los criterios con nota de una sección (lo que toma un criterio calculado). */
export const promedioDeNotas = (secciones, respuestas, s) => {
  const seccion = secciones?.[s];
  if (!seccion) return null;
  const valores = seccion.criterios
    .map((criterio, c) => ({ criterio, r: respuestaDe(respuestas, s, c) }))
    .filter(({ criterio, r }) => criterio.tipo === TIPO_CRITERIO.NOTA && r && !r.noAplica && r.nota !== null && r.nota !== undefined)
    .map(({ r }) => Number(r.nota));
  return valores.length ? promedio(valores) : null;
};

/**
 * Nota de una sección. MISMA regla que `EvaluationGradeCalculator` del backend: sin
 * ponderaciones, promedio simple donde cada actividad cuenta como un criterio; con
 * ponderaciones, promedio ponderado (si hay «No aplica», se reparte el resto).
 */
export const notaDeSeccion = (secciones, respuestas, s) => {
  const seccion = secciones[s];
  const ponderada = seccion.criterios.some((c) => c.tipo !== TIPO_CRITERIO.TEXTO && !vacio(c.ponderacion));
  const valores = [];
  let suma = 0;
  let pesos = 0;

  seccion.criterios.forEach((criterio, c) => {
    const r = respuestaDe(respuestas, s, c);
    let valor = null;
    let deActividades = [];
    if (criterio.tipo === TIPO_CRITERIO.NOTA && r && !r.noAplica && r.nota !== null && r.nota !== undefined) valor = Number(r.nota);
    if (criterio.tipo === TIPO_CRITERIO.CALCULADO) valor = promedioDeNotas(secciones, respuestas, criterio.seccionOrigen);
    if (criterio.tipo === TIPO_CRITERIO.ACTIVIDADES) {
      deActividades = (r?.actividades ?? []).filter((a) => a.nota !== null && a.nota !== undefined).map((a) => Number(a.nota));
      if (deActividades.length) valor = promedio(deActividades);
    }
    if (valor === null) return;
    if (ponderada) {
      const peso = Number(criterio.ponderacion) || 0;
      suma += peso * valor;
      pesos += peso;
    } else if (deActividades.length) {
      valores.push(...deActividades);
    } else {
      valores.push(valor);
    }
  });

  if (ponderada) return pesos > 0 ? suma / pesos : null;
  return valores.length ? promedio(valores) : null;
};

/** Nota final: promedio de las secciones que cuentan para la nota final, con un decimal. */
export const calcularNota = (secciones, respuestas) => {
  const notas = (secciones ?? [])
    .map((seccion, s) => (seccion.cuentaParaNota ? notaDeSeccion(secciones, respuestas, s) : null))
    .filter((nota) => nota !== null);
  return notas.length ? redondearNota(promedio(notas)) : null;
};

/**
 * Qué falta para poder enviar la evaluación. Devuelve `{ lista, porCampo }`: `lista` son los
 * mensajes y `porCampo` marca cada campo vacío con la clave `s-c` o `s-c-a` (actividad).
 */
export const validarRespuestas = (secciones, respuestas) => {
  const lista = [];
  const porCampo = {};
  const marcar = (clave, mensaje) => {
    porCampo[clave] = mensaje;
    lista.push(mensaje);
  };
  const esNota = (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 7 && v !== null && v !== '';

  (secciones ?? []).forEach((seccion, s) => {
    const donde = ` en «${corto(seccion.titulo)}»`;
    seccion.criterios.forEach((criterio, c) => {
      const r = respuestaDe(respuestas, s, c) ?? {};
      const clave = `${s}-${c}`;
      if (criterio.tipo === TIPO_CRITERIO.NOTA && !(r.noAplica && criterio.admiteNoAplica) && !esNota(r.nota)) {
        marcar(clave, `Falta la nota de «${corto(criterio.texto)}»${donde}.`);
      }
      if (criterio.tipo === TIPO_CRITERIO.TEXTO) {
        const texto = String(r.texto ?? '').trim();
        if (!texto) marcar(clave, `Falta responder «${corto(criterio.texto)}».`);
        else if (texto.length > LIMITES_RESPUESTA.TEXTO) marcar(clave, `La respuesta a «${corto(criterio.texto)}» es demasiado larga.`);
      }
      if (criterio.tipo === TIPO_CRITERIO.ACTIVIDADES) {
        const actividades = r.actividades ?? [];
        const minimo = Number(criterio.minimoActividades) || 1;
        if (actividades.length < minimo) marcar(clave, `Escribe al menos ${minimo} ${minimo === 1 ? 'actividad' : 'actividades'}${donde}.`);
        if (actividades.length > MAXIMO_ACTIVIDADES) marcar(clave, `Puedes escribir como máximo ${MAXIMO_ACTIVIDADES} actividades.`);
        actividades.forEach((actividad, a) => {
          const descripcion = String(actividad.descripcion ?? '').trim();
          if (descripcion.length < LIMITES_RESPUESTA.DESCRIPCION_MIN || descripcion.length > LIMITES_RESPUESTA.DESCRIPCION_MAX) {
            marcar(`${clave}-${a}-d`, `Describe la actividad ${a + 1}${donde} (${LIMITES_RESPUESTA.DESCRIPCION_MIN} a ${LIMITES_RESPUESTA.DESCRIPCION_MAX} caracteres).`);
          }
          if (!esNota(actividad.nota)) marcar(`${clave}-${a}-n`, `Falta la nota de la actividad ${a + 1}${donde}.`);
        });
      }
    });
  });
  return { lista, porCampo };
};
