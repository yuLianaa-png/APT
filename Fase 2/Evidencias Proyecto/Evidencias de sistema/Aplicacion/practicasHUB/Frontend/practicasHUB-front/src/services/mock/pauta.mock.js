/**
 * Pautas de evaluación del centro de práctica en el almacén simulado. Mismas reglas que
 * `EvaluationTemplateService`. Sin backend no se puede leer el archivo: `analizarPlantilla`
 * devuelve un borrador de ejemplo (la pauta de Duoc) para poder probar el editor.
 */

import {
  ERRORES, ESPACIO_PAUTA, ESTADO_PAUTA, MODO_EVALUACION, ROLES, STORAGE_KEYS, TIPO_CRITERIO,
} from '../../utils/constants';
import { validarPauta, validarPlantilla } from '../../utils/pauta';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, responder,
} from './soporte';

const ESPACIOS = {
  [MODO_EVALUACION.UNA_INTERMEDIA]: [ESPACIO_PAUTA.INTERMEDIA],
  [MODO_EVALUACION.UNA_FINAL]: [ESPACIO_PAUTA.FINAL],
  [MODO_EVALUACION.DOS_MISMA]: [ESPACIO_PAUTA.AMBAS],
  [MODO_EVALUACION.DOS_DISTINTAS]: [ESPACIO_PAUTA.INTERMEDIA, ESPACIO_PAUTA.FINAL],
};
const ETIQUETAS_ESPACIO = {
  [ESPACIO_PAUTA.INTERMEDIA]: 'Evaluación intermedia (50 % de las horas)',
  [ESPACIO_PAUTA.FINAL]: 'Evaluación final (100 % de las horas)',
  [ESPACIO_PAUTA.AMBAS]: 'Pauta para las dos evaluaciones (50 % y 100 % de las horas)',
};

const usuarioActual = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER)) ?? null;
  } catch {
    return null;
  }
};

const exigirDocente = (grupo) => {
  const usuario = usuarioActual();
  if (usuario?.rol !== ROLES.DOCENTE || grupo.docenteId !== usuario.id) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No eres el docente de este grupo.');
  }
};

/** Sin las claves del editor (`clave`): así se guarda. */
const sinClave = (objeto) => Object.fromEntries(Object.entries(objeto).filter(([nombre]) => nombre !== 'clave'));

const limpia = (pauta) => ({
  instrucciones: String(pauta.instrucciones ?? '').trim(),
  secciones: (pauta.secciones ?? []).map((seccion) => ({
    ...sinClave(seccion),
    titulo: String(seccion.titulo ?? '').trim(),
    criterios: (seccion.criterios ?? []).map((criterio) => ({
      ...sinClave(criterio),
      texto: String(criterio.texto ?? '').trim(),
      admiteNoAplica: criterio.tipo === TIPO_CRITERIO.NOTA && Boolean(criterio.admiteNoAplica),
    })),
  })),
});

const configuracion = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  const pautas = listar('pautas').filter((p) => p.grupoId === grupoId);
  const buscar = (espacio, estado) => pautas.find((p) => p.espacio === espacio && p.estado === estado) ?? null;
  return {
    grupoId,
    modo: grupo.modoEvaluacion ?? null,
    modoEditable: !pautas.some((p) => p.bloqueada),
    espacios: (ESPACIOS[grupo.modoEvaluacion] ?? []).map((espacio) => ({
      espacio,
      etiqueta: ETIQUETAS_ESPACIO[espacio],
      publicada: buscar(espacio, ESTADO_PAUTA.PUBLICADA),
      borrador: buscar(espacio, ESTADO_PAUTA.BORRADOR),
    })),
  };
};

const ejecutar = (grupoId, cambio) => {
  try {
    transaccion((datos) => {
      const grupo = exigirGrupoActivo(exigirExista(datos.grupos.find((g) => g.id === grupoId), 'El grupo no existe.'));
      exigirDocente(grupo);
      cambio(datos, grupo);
    });
    return responder(configuracion(grupoId));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

const exigirEspacio = (grupo, espacio) => {
  if (!(ESPACIOS[grupo.modoEvaluacion] ?? []).includes(espacio)) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Primero elige cuántas evaluaciones hace el centro de práctica.');
  }
};

export const pautaMock = {
  configuracion: (grupoId) => {
    const grupo = porId('grupos', grupoId);
    if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');
    try {
      exigirDocente(grupo);
    } catch (error) {
      return fallar(error.codigo, error.mensaje);
    }
    return responder(configuracion(grupoId));
  },

  elegirModo: (grupoId, modo) => ejecutar(grupoId, (datos, grupo) => {
    if (!ESPACIOS[modo]) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Elige cuántas evaluaciones hace el centro de práctica y cuándo.');
    if (datos.pautas.some((p) => p.grupoId === grupoId && p.bloqueada) && modo !== grupo.modoEvaluacion) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Ya se enviaron evaluaciones a los supervisores: la configuración no se puede cambiar.');
    }
    grupo.modoEvaluacion = modo;
  }),

  analizarPlantilla: (archivo) => {
    const problema = validarPlantilla(archivo);
    if (problema) return fallar(ERRORES.ARCHIVO_INVALIDO, problema);
    return responder(BORRADOR_DE_EJEMPLO());
  },

  guardarBorrador: (grupoId, espacio, pauta) => ejecutar(grupoId, (datos, grupo) => {
    exigirEspacio(grupo, espacio);
    let borrador = datos.pautas.find((p) => p.grupoId === grupoId && p.espacio === espacio && p.estado === ESTADO_PAUTA.BORRADOR);
    if (!borrador) {
      const publicada = datos.pautas.find((p) => p.grupoId === grupoId && p.espacio === espacio && p.estado === ESTADO_PAUTA.PUBLICADA);
      borrador = {
        id: nuevoId('pau'),
        grupoId,
        espacio,
        estado: ESTADO_PAUTA.BORRADOR,
        bloqueada: false,
        version: publicada ? publicada.version + (publicada.bloqueada ? 1 : 0) : 1,
        publicadaEn: null,
      };
      datos.pautas.push(borrador);
    }
    Object.assign(borrador, limpia(pauta), { actualizadaEn: ahoraISO() });
  }),

  publicar: (grupoId, espacio) => ejecutar(grupoId, (datos, grupo) => {
    exigirEspacio(grupo, espacio);
    const borrador = datos.pautas.find((p) => p.grupoId === grupoId && p.espacio === espacio && p.estado === ESTADO_PAUTA.BORRADOR);
    if (!borrador) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No hay un borrador para publicar.');
    const errores = validarPauta(borrador);
    if (errores.length > 0) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, errores[0]);

    const anterior = datos.pautas.findIndex((p) => p.grupoId === grupoId && p.espacio === espacio && p.estado === ESTADO_PAUTA.PUBLICADA);
    if (anterior >= 0) {
      if (datos.pautas[anterior].bloqueada) datos.pautas[anterior].estado = 'REEMPLAZADA';
      else datos.pautas.splice(anterior, 1);
    }
    borrador.estado = ESTADO_PAUTA.PUBLICADA;
    borrador.publicadaEn = ahoraISO();
  }),

  descartarBorrador: (grupoId, espacio) => ejecutar(grupoId, (datos) => {
    const indice = datos.pautas.findIndex((p) => p.grupoId === grupoId && p.espacio === espacio && p.estado === ESTADO_PAUTA.BORRADOR);
    if (indice >= 0) datos.pautas.splice(indice, 1);
  }),
};

/** Lo que devolvería el lector con la pauta de Duoc. */
const BORRADOR_DE_EJEMPLO = () => ({
  instrucciones: 'Evalúe de 1 a 7 los indicadores generales, escriba las actividades que realizó el estudiante en el centro de práctica y evalúe cada una con una nota de 1 a 7.',
  secciones: [
    {
      titulo: 'Aspectos a evaluar/actividades realizadas por el alumno',
      cuentaParaNota: true,
      criterios: [
        { tipo: TIPO_CRITERIO.NOTA, texto: 'Realiza las tareas asignadas, de acuerdo a los requerimientos del centro de práctica.', admiteNoAplica: false, ponderacion: null, seccionOrigen: null, minimoActividades: null },
        { tipo: TIPO_CRITERIO.CALCULADO, texto: 'Se desenvuelve en el centro de práctica, de acuerdo a los lineamientos institucionales (competencias de empleabilidad seleccionadas)', admiteNoAplica: false, ponderacion: null, seccionOrigen: 1, minimoActividades: null },
        { tipo: TIPO_CRITERIO.ACTIVIDADES, texto: 'Actividades realizadas por el estudiante', admiteNoAplica: false, ponderacion: null, seccionOrigen: null, minimoActividades: 1 },
      ],
    },
    {
      titulo: 'Competencias de empleabilidad',
      cuentaParaNota: false,
      criterios: [
        'Capacidad para identificar, plantear y resolver problemas.',
        'Capacidad de trabajo en equipo.',
        'Capacidad de aprender y actualizarse permanentemente.',
        'Habilidades interpersonales.',
        'Capacidad de comunicación en un segundo idioma.',
        'Capacidad creativa.',
        'Capacidad de motivar y conducir hacia metas comunes.',
        'Habilidades para buscar, procesar y analizar información procedente de fuentes diversas.',
      ].map((texto) => ({ tipo: TIPO_CRITERIO.NOTA, texto, admiteNoAplica: false, ponderacion: null, seccionOrigen: null, minimoActividades: null })),
    },
  ],
  advertencias: ['Modo simulado: este borrador es un ejemplo fijo (la pauta de Duoc), no la lectura de tu archivo.'],
  escala: 7,
  formato: 'EXCEL',
});
