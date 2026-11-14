import { ROLES, TIPO_REFERENCIA } from './constants';

/**
 * A dónde lleva el botón *Ver* de una notificación (RN-16, §6.5, §9).
 *
 * La regla del manual es concreta y tiene dos mitades que se olvidan por separado:
 * «identifica nombre y código; **carga el grupo** y **abre el elemento relacionado**».
 *
 *  - *Cargar el grupo* es lo que hace que una bandeja general funcione: el aviso puede
 *    venir de cualquiera de las prácticas del usuario, así que la ruta tiene que llevar
 *    su `grupoId` o se acabaría abriendo el elemento en el grupo equivocado (RN-04).
 *  - *Abrir el elemento* es el `?jornada=…` del final: sin él se llega a la sección y
 *    toca buscar a mano cuál de las veinte filas era.
 *
 * Los dos perfiles llegan a sitios distintos para la misma jornada, y es lo correcto: el
 * estudiante tiene **su** historial (§4.7) y el docente tiene que entrar al historial
 * **de esa persona** (§5.7), que vive bajo su vinculación.
 *
 * Es una función pura para poder probarla sin navegador. El `vinculacionId` que el
 * docente necesita no viaja en la notificación —la referencia es a la jornada—, así que
 * quien llama lo resuelve antes y lo pasa aquí.
 */

/** Prefijo de las rutas internas del grupo, por perfil. */
const base = (rol, grupoId) => (rol === ROLES.DOCENTE
  ? `/docente/grupos/${grupoId}`
  : `/estudiante/grupos/${grupoId}`);

/**
 * @param {object} notificacion con `grupoId` y `referencia: { tipo, id }`
 * @param {string} rol ROLES.ESTUDIANTE o ROLES.DOCENTE
 * @param {{ vinculacionId?: string }} [extras] lo que la notificación no trae
 * @returns {string|null} la ruta, o null si no se puede construir
 */
export const destinoDe = (notificacion, rol, extras = {}) => {
  if (!notificacion?.grupoId || !notificacion?.referencia?.tipo) return null;

  const raiz = base(rol, notificacion.grupoId);
  const { tipo, id } = notificacion.referencia;

  switch (tipo) {
    case TIPO_REFERENCIA.JORNADA:
      if (rol === ROLES.DOCENTE) {
        // Sin la vinculación no se puede abrir el historial de esa persona; se deja al
        // docente en el listado de estudiantes, que es el paso previo de §5.6.
        return extras.vinculacionId
          ? `${raiz}/jornadas/${extras.vinculacionId}?jornada=${id}`
          : `${raiz}/jornadas`;
      }
      return `${raiz}/jornadas?jornada=${id}`;

    // Documentos y entregas viven en la misma sección: la entrega es una fila dentro de
    // la tarjeta de su documento (§5.18).
    case TIPO_REFERENCIA.DOCUMENTO:
      return `${raiz}/documentos?documento=${id}`;
    case TIPO_REFERENCIA.ENTREGA:
      return `${raiz}/documentos?entrega=${id}`;

    default:
      return null;
  }
};

/** true si abrir esta notificación necesita resolver antes la vinculación. */
export const necesitaVinculacion = (notificacion, rol) =>
  rol === ROLES.DOCENTE
  && notificacion?.referencia?.tipo === TIPO_REFERENCIA.JORNADA;
