/**
 * Filtros de los dos Dashboard generales (§4.1 y §5.1).
 *
 * Está aparte de las pantallas para poder probarlo sin renderizar nada, y porque los dos
 * perfiles filtran lo mismo con nombres distintos: el estudiante busca entre sus
 * prácticas y el docente entre sus grupos, pero las reglas de coincidencia son las
 * mismas.
 *
 * Decisión D-02 y D-03 de [[04-Brechas-doc-vs-codigo]]: V1.2 (RF-02) pide buscar por
 * nombre **o código** y filtrar por estado; §5.1 del manual habla de nombre y **año**. Se
 * implementa el superconjunto —nombre, código, año y estado—, que no contradice a ninguno
 * de los dos documentos.
 *
 * El filtrado es del cliente mientras no haya backend. Con la API real, estas mismas
 * claves viajarán como parámetros de consulta y el servidor devolverá la página ya
 * filtrada; las pantallas no cambian porque siguen recibiendo una lista.
 */

import { ESTADO_SOLICITUD } from './constants';

/** Quita tildes y pasa a minúsculas: «Informática» encuentra «informatica». */
export const normalizar = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

/** true si `aguja` aparece en alguno de los campos, ignorando tildes y mayúsculas. */
const coincideTexto = (aguja, campos) => {
  const buscado = normalizar(aguja);
  if (!buscado) return true;
  return campos.some((campo) => normalizar(campo).includes(buscado));
};

/** Valor que significa «no filtrar por este campo». */
export const TODOS = 'TODOS';

/**
 * Filtra una lista de grupos o de prácticas.
 *
 * Los criterios se **combinan**: una fila tiene que cumplirlos todos. Un criterio vacío
 * o con `TODOS` no filtra.
 *
 * @param {Array} filas elementos con `nombre`, `codigo`, `anio`, `estado` y
 *                      opcionalmente `docenteNombre`
 * @param {{ texto?: string, anio?: string|number, estado?: string }} criterios
 */
export const filtrarPorCriterios = (filas, criterios = {}) => {
  const { texto = '', anio = TODOS, estado = TODOS } = criterios;

  return filas.filter((fila) => {
    if (!coincideTexto(texto, [fila.nombre, fila.codigo, fila.docenteNombre])) return false;
    if (anio !== TODOS && anio !== '' && String(fila.anio) !== String(anio)) return false;
    if (estado !== TODOS && estado !== '' && fila.estado !== estado) return false;
    return true;
  });
};

/**
 * Años presentes en la lista, de más reciente a más antiguo, para poblar el desplegable.
 * Se derivan de los datos en lugar de cablear un rango: el año de un grupo sale de su
 * fecha de creación (§5.3) y nadie lo escribe a mano.
 */
export const aniosDisponibles = (filas) => [
  ...new Set(filas.map((fila) => fila.anio).filter((anio) => anio != null)),
].sort((a, b) => b - a);

/** Opciones del desplegable de año, con «Todos» delante. */
export const opcionesDeAnio = (filas) => [
  { valor: TODOS, etiqueta: 'Todos los años' },
  ...aniosDisponibles(filas).map((anio) => ({ valor: String(anio), etiqueta: String(anio) })),
];

/**
 * Filtros de la vista Jornadas (§4.7): por fecha, actividad y estado.
 *
 * El «estado» de una fila no es un solo campo. §5.8 advierte de que una jornada
 * REGISTRADA puede tener a la vez una solicitud PENDIENTE, así que la tabla tiene que
 * poder filtrar por las dos cosas. Estas son las opciones que se ofrecen:
 *
 *   REGISTRADA            jornadas registradas, con o sin solicitud
 *   OBSERVADA             corrección habilitada por el docente (RN-13)
 *   SOLICITUD_PENDIENTE   esperando respuesta del docente
 *   EDITABLE              todavía dentro de la ventana de 24 h (RN-11)
 *
 * `EDITABLE` no es un estado del dominio: es una pregunta sobre el reloj. Se incluye
 * porque es lo que el estudiante quiere saber de un vistazo —«¿cuáles puedo corregir
 * todavía sin pedir permiso?»— y ningún estado almacenado lo responde.
 */
export const ESTADO_FILA = {
  REGISTRADA: 'REGISTRADA',
  OBSERVADA: 'OBSERVADA',
  SOLICITUD_PENDIENTE: 'SOLICITUD_PENDIENTE',
  EDITABLE: 'EDITABLE',
};

/** La búsqueda de actividad mira también la descripción: es donde está el detalle. */
const coincideTextoJornada = (texto, jornada) => {
  const buscado = normalizar(texto);
  if (!buscado) return true;
  return normalizar(jornada.actividadPrincipal).includes(buscado)
    || normalizar(jornada.descripcion).includes(buscado);
};

/**
 * @param {Array} jornadas
 * @param {{ desde?: string, hasta?: string, actividad?: string, estado?: string }} criterios
 * @param {(jornada: object) => boolean} esEditable responde si sigue dentro del plazo
 */
export const filtrarJornadas = (jornadas, criterios = {}, esEditable = () => false) => {
  const { desde = '', hasta = '', actividad = '', estado = TODOS } = criterios;

  return jornadas.filter((jornada) => {
    // Las fechas son 'YYYY-MM-DD', así que se comparan como texto sin ambigüedad.
    if (desde && jornada.fecha < desde) return false;
    if (hasta && jornada.fecha > hasta) return false;

    if (!coincideTextoJornada(actividad, jornada)) return false;

    if (estado === TODOS || estado === '') return true;
    if (estado === ESTADO_FILA.EDITABLE) return esEditable(jornada);
    if (estado === ESTADO_FILA.SOLICITUD_PENDIENTE) {
      return jornada.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE;
    }
    return jornada.estado === estado;
  });
};
