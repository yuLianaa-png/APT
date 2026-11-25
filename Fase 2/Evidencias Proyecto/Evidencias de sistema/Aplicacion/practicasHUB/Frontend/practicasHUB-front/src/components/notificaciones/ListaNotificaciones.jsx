import { useState } from 'react';
import { Boton, EstadoVacio } from '../ui';
import { ETIQUETAS, TIPO_NOTIFICACION } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';



 /// Lista de notificaciones, compartida por la bandeja general y la del grupo. Muestra primero
 /// las no vistas y deja elegir ver todas.

/** Qué notificaciones se muestran. */
const FILTRO = { NO_VISTAS: 'NO_VISTAS', TODAS: 'TODAS' };


/** Un signo por tipo. Es refuerzo: el mensaje ya dice qué pasó. */
const SIGNOS = {
  [TIPO_NOTIFICACION.SOLICITUD_ENVIADA]: '?',
  [TIPO_NOTIFICACION.CORRECCION_HABILITADA]: '✎',
  [TIPO_NOTIFICACION.CORRECCION_GUARDADA]: '✓',
  [TIPO_NOTIFICACION.SOLICITUD_RECHAZADA]: '✕',
  [TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO]: '+',
  [TIPO_NOTIFICACION.DOCUMENTO_ACTUALIZADO]: '↻',
  [TIPO_NOTIFICACION.REEMPLAZO_HABILITADO]: '✎',
  [TIPO_NOTIFICACION.ENTREGA_RECIBIDA]: '↓',
  [TIPO_NOTIFICACION.ESTUDIANTE_VINCULADO]: '+',
  [TIPO_NOTIFICACION.JORNADA_REGISTRADA]: '+',
  [TIPO_NOTIFICACION.JORNADA_EDITADA]: '✎',
  [TIPO_NOTIFICACION.GRUPO_DESACTIVADO]: '■',
  [TIPO_NOTIFICACION.GRUPO_REACTIVADO]: '▶',
  [TIPO_NOTIFICACION.GRUPO_ELIMINADO]: '✕',
  [TIPO_NOTIFICACION.ALERTAS_RIESGO]: '!',
  [TIPO_NOTIFICACION.RECORDATORIO_RIESGO]: '!',
  [TIPO_NOTIFICACION.PLAN_SEGUIMIENTO]: '✎',
  [TIPO_NOTIFICACION.MENSAJE_RECIBIDO]: '✉',
  [TIPO_NOTIFICACION.SUPERVISOR_ACTUALIZADO]: '↻',
  [TIPO_NOTIFICACION.OBSERVACION_SUPERVISOR]: '!',
  [TIPO_NOTIFICACION.EVALUACION_SIN_PAUTA]: '!',
  [TIPO_NOTIFICACION.EVALUACION_RECIBIDA]: '↓',
  [TIPO_NOTIFICACION.EVALUACION_PUBLICADA]: '★',
};

const TONOS = {
  [TIPO_NOTIFICACION.SOLICITUD_ENVIADA]: 'espera',
  [TIPO_NOTIFICACION.CORRECCION_HABILITADA]: 'info',
  [TIPO_NOTIFICACION.CORRECCION_GUARDADA]: 'exito',
  [TIPO_NOTIFICACION.SOLICITUD_RECHAZADA]: 'error',
  [TIPO_NOTIFICACION.REEMPLAZO_HABILITADO]: 'info',
  [TIPO_NOTIFICACION.ENTREGA_RECIBIDA]: 'exito',
  [TIPO_NOTIFICACION.ESTUDIANTE_VINCULADO]: 'exito',
  [TIPO_NOTIFICACION.JORNADA_REGISTRADA]: 'info',
  [TIPO_NOTIFICACION.JORNADA_EDITADA]: 'info',
  [TIPO_NOTIFICACION.GRUPO_DESACTIVADO]: 'espera',
  [TIPO_NOTIFICACION.GRUPO_REACTIVADO]: 'exito',
  [TIPO_NOTIFICACION.GRUPO_ELIMINADO]: 'error',
  [TIPO_NOTIFICACION.ALERTAS_RIESGO]: 'espera',
  [TIPO_NOTIFICACION.RECORDATORIO_RIESGO]: 'espera',
  [TIPO_NOTIFICACION.PLAN_SEGUIMIENTO]: 'info',
  [TIPO_NOTIFICACION.MENSAJE_RECIBIDO]: 'info',
  [TIPO_NOTIFICACION.SUPERVISOR_ACTUALIZADO]: 'info',
  [TIPO_NOTIFICACION.OBSERVACION_SUPERVISOR]: 'espera',
  [TIPO_NOTIFICACION.EVALUACION_SIN_PAUTA]: 'espera',
  [TIPO_NOTIFICACION.EVALUACION_RECIBIDA]: 'exito',
  [TIPO_NOTIFICACION.EVALUACION_PUBLICADA]: 'exito',
};

const ListaNotificaciones = ({
  notificaciones,
  mostrarGrupo = false,
  alVer,
  abriendo = null,
  vacio = null,
}) => {
  const [filtro, setFiltro] = useState(FILTRO.NO_VISTAS);

  if (notificaciones.length === 0) {
    return vacio ?? (
      <EstadoVacio titulo="No tienes novedades">
        Aquí aparecerán las solicitudes, correcciones, documentos y entregas a medida que
        ocurran.
      </EstadoVacio>
    );
  }

  // `leida` es como estaba al abrir la página: la página las marca leídas en el servidor,
  // pero la lista recuerda cuáles eran nuevas mientras el usuario no la recargue.
  const noVistas = notificaciones.filter((aviso) => aviso.leida === false);
  const visibles = filtro === FILTRO.NO_VISTAS ? noVistas : notificaciones;

  return (
    <div className="ph-pila">
      <div className="ph-fila" role="group" aria-label="Qué notificaciones mostrar">
        <Boton
          tamano="pequeno"
          variante={filtro === FILTRO.NO_VISTAS ? 'primario' : 'secundario'}
          aria-pressed={filtro === FILTRO.NO_VISTAS}
          onClick={() => setFiltro(FILTRO.NO_VISTAS)}
        >
          {`No vistas (${noVistas.length})`}
        </Boton>
        <Boton
          tamano="pequeno"
          variante={filtro === FILTRO.TODAS ? 'primario' : 'secundario'}
          aria-pressed={filtro === FILTRO.TODAS}
          onClick={() => setFiltro(FILTRO.TODAS)}
        >
          {`Todas (${notificaciones.length})`}
        </Boton>
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio titulo="Estás al día">
          No tienes notificaciones nuevas.
          {' '}
          <button type="button" className="ph-enlace-sutil" onClick={() => setFiltro(FILTRO.TODAS)}>
            Ver todas las notificaciones
          </button>
        </EstadoVacio>
      ) : (
        <ul className="ph-notificaciones">
          {visibles.map((aviso) => {
            const tono = TONOS[aviso.tipo] ?? 'neutro';

            return (
              <li key={aviso.id} className="ph-notificacion">
                <span
                  className={`ph-notificacion__signo ph-notificacion__signo--${tono}`}
                  aria-hidden="true"
                >
                  {SIGNOS[aviso.tipo] ?? '·'}
                </span>

                <div className="ph-notificacion__cuerpo">
                  {/* §9: el grupo de origen, antes de navegar. */}
                  {mostrarGrupo && (
                    <p className="ph-notificacion__origen">
                      <strong>{aviso.grupoNombre}</strong>
                      <code>{aviso.grupoCodigo}</code>
                    </p>
                  )}

                  <p className="ph-notificacion__tipo">
                    {ETIQUETAS.TIPO_NOTIFICACION[aviso.tipo] ?? 'Novedad'}
                    {aviso.leida === false && <span className="ph-notificacion__nueva">Nueva</span>}
                  </p>
                  <p className="ph-notificacion__mensaje">{aviso.mensaje}</p>
                  <p className="ph-campo__ayuda">{formatearInstante(aviso.creadaEn)}</p>
                </div>

                {/* Sin referencia (por ejemplo, un grupo eliminado) no hay nada que abrir. */}
                {aviso.referencia && (
                  <Boton
                    variante="secundario"
                    tamano="pequeno"
                    disabled={abriendo === aviso.id}
                    onClick={() => alVer(aviso)}
                  >
                    {abriendo === aviso.id ? 'Abriendo…' : 'Ver'}
                  </Boton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ListaNotificaciones;
