import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGrupo } from '../../context/useGrupo';
import { mensajeService } from '../../services';
import { NIVEL_RIESGO } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';
import { Cargando, EstadoError, EstadoVacio, InsigniaEstado } from '../../components/ui';
import { Conversacion } from '../../components/mensajes';

// Página de mensajes del docente: a la izquierda, un estudiante por fila (los que tienen
// mensajes sin leer primero); a la derecha, la conversación elegida. `?vinculacion=` abre
// directamente la de un estudiante, como hace «Escribirle».

const MensajesDocente = () => {
  const { grupo } = useGrupo();
  const [parametros, setParametros] = useSearchParams();
  const elegida = parametros.get('vinculacion');
  const [estado, setEstado] = useState({ bandeja: [], cargando: true, error: null });

  const cargar = useCallback(() => {
    let vigente = true;
    mensajeService.bandejaDelGrupo(grupo.id)
      .then((bandeja) => { if (vigente) setEstado({ bandeja, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) setEstado({ bandeja: [], cargando: false, error: fallo?.mensaje ?? 'No se pudo cargar la bandeja.' });
      });
    return () => { vigente = false; };
  }, [grupo.id]);

  useEffect(() => cargar(), [cargar]);

  if (estado.cargando) return <Cargando mensaje="Cargando mensajes…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} />;

  const actual = estado.bandeja.find((fila) => fila.vinculacionId === elegida) ?? null;

  return (
    <section className="ph-pila">
      <div>
        <h2>Mensajes</h2>
        <p className="ph-tarjeta__apoyo">Conversaciones con los estudiantes de este grupo.</p>
      </div>

      {estado.bandeja.length === 0 ? (
        <EstadoVacio titulo="Aún no hay estudiantes vinculados">
          Cuando un estudiante se vincule al grupo podrás escribirle desde aquí.
        </EstadoVacio>
      ) : (
        <div className="ph-mensajeria">
          <ul className="ph-bandeja" aria-label="Estudiantes">
            {estado.bandeja.map((fila) => (
              <li key={fila.vinculacionId}>
                <button
                  type="button"
                  className={`ph-bandeja__fila${fila.vinculacionId === elegida ? ' ph-bandeja__fila--activa' : ''}`}
                  aria-current={fila.vinculacionId === elegida ? 'true' : undefined}
                  onClick={() => setParametros({ vinculacion: fila.vinculacionId })}
                >
                  <span className="ph-fila ph-fila--entre">
                    <strong>{fila.nombre}</strong>
                    {fila.noLeidos > 0 && (
                      <span className="ph-contador" aria-label={`${fila.noLeidos} sin leer`}>{fila.noLeidos}</span>
                    )}
                  </span>
                  <span className="ph-campo__ayuda">
                    {fila.ultimoMensaje ?? 'Sin mensajes'}
                    {fila.ultimoEn && ` · ${formatearInstante(fila.ultimoEn)}`}
                  </span>
                  {fila.nivelRiesgo && fila.nivelRiesgo !== NIVEL_RIESGO.SIN_ALERTA && (
                    <InsigniaEstado tipo="riesgo" estado={fila.nivelRiesgo} />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {actual ? (
            <Conversacion
              key={actual.vinculacionId}
              vinculacionId={actual.vinculacionId}
              titulo={actual.nombre}
              alLeer={cargar}
            />
          ) : (
            <EstadoVacio titulo="Elige un estudiante">
              Selecciona una conversación de la lista para leerla o escribir.
            </EstadoVacio>
          )}
        </div>
      )}
    </section>
  );
};

export default MensajesDocente;
