import { useCallback, useEffect, useState } from 'react';
import { evaluacionService } from '../../services';
import { useModoLectura } from '../../hooks/useModoLectura';
import { ESTADO_EVALUACION } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';
import { formatearHoras } from '../../utils/horas';
import { Aviso, Boton, Cargando, EstadoError, InsigniaEstado } from '../ui';
import { FormularioEvaluacion } from '../pauta';

const nota = (valor) => (valor === null || valor === undefined ? '—' : Number(valor).toFixed(1).replace('.', ','));

// Evaluaciones del supervisor de un estudiante.
//  - Docente: estado de cada hito, enviar ahora, copiar enlace, ver respuestas y publicar al estudiante.
//  - Estudiante: solo las evaluaciones que el docente publicó (si no hay ninguna, no se muestra nada).

const TarjetaEvaluaciones = ({ vinculacionId, esDocente = false }) => {
  const { propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ lista: [], cargando: true, error: null });
  const [abierta, setAbierta] = useState(null);
  const [envio, setEnvio] = useState({ enCurso: false, error: null, aviso: null });
  const [enlace, setEnlace] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;
    evaluacionService.deVinculacion(vinculacionId)
      .then((lista) => { if (vigente) setEstado({ lista, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) setEstado({ lista: [], cargando: false, error: fallo?.mensaje ?? 'No se pudieron cargar las evaluaciones.' });
      });
    return () => { vigente = false; };
  }, [vinculacionId]);

  useEffect(() => cargar(), [cargar]);

  const ejecutar = (accion, aviso) => {
    setEnvio({ enCurso: true, error: null, aviso: null });
    return accion()
      .then((resultado) => {
        setEnvio({ enCurso: false, error: null, aviso });
        cargar();
        return resultado;
      })
      .catch((fallo) => {
        setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo completar la acción.', aviso: null });
        return null;
      });
  };

  const copiarEnlace = (hito) => ejecutar(() => evaluacionService.crearEnlace(vinculacionId, hito), null)
    .then((nuevo) => {
      if (!nuevo) return;
      setEnlace({ hito, ...nuevo });
      navigator.clipboard?.writeText(nuevo.url)
        .then(() => setEnvio((previo) => ({ ...previo, aviso: 'Enlace copiado. Envíaselo al supervisor por el medio que prefieras.' })))
        .catch(() => {});
    });

  if (estado.cargando) return esDocente ? <Cargando mensaje="Cargando las evaluaciones…" /> : null;
  if (estado.error) return esDocente ? <EstadoError titulo="Evaluaciones no disponibles" mensaje={estado.error} /> : null;
  if (estado.lista.length === 0) {
    if (!esDocente) return null;
    return (
      <div className="ph-tarjeta ph-pila">
        <h3>Evaluación del supervisor</h3>
        <p className="ph-campo__ayuda">El grupo todavía no tiene configurada la evaluación del centro de práctica (sección Evaluación).</p>
      </div>
    );
  }

  return (
    <div className="ph-tarjeta ph-pila">
      <div>
        <h3>{esDocente ? 'Evaluación del supervisor' : 'Evaluación de tu supervisor'}</h3>
        {esDocente && (
          <p className="ph-tarjeta__apoyo">
            Se envía sola cuando el estudiante llega a las horas de cada evaluación. El estudiante la ve recién cuando tú la publicas.
          </p>
        )}
      </div>

      {envio.aviso && <Aviso tono="exito">{envio.aviso}</Aviso>}
      {envio.error && <Aviso tono="error" titulo="No se pudo completar">{envio.error}</Aviso>}

      {estado.lista.map((evaluacion) => {
        const respondida = evaluacion.estado === ESTADO_EVALUACION.RESPONDIDA;
        const verRespuestas = abierta === evaluacion.hito;
        return (
          <div key={evaluacion.hito} className="ph-pila ph-ficha--panel">
            <div className="ph-fila ph-fila--entre">
              <strong>{evaluacion.etiqueta}</strong>
              <div className="ph-fila">
                {esDocente && <InsigniaEstado tipo="evaluacion" estado={evaluacion.estado} />}
                {esDocente && respondida && (
                  <span className="ph-campo__ayuda">{evaluacion.publicada ? 'Publicada al estudiante' : 'No publicada al estudiante'}</span>
                )}
              </div>
            </div>

            {respondida ? (
              <p className="ph-evaluacion__final">
                <span>{`Nota${evaluacion.supervisor ? ` de ${evaluacion.supervisor}` : ''}`}</span>
                <strong>{nota(evaluacion.nota)}</strong>
              </p>
            ) : esDocente && (
              <p className="ph-campo__ayuda">
                {evaluacion.horasRequeridas !== null && `Se envía al llegar a ${formatearHoras(evaluacion.horasRequeridas)} h`}
                {evaluacion.alcanzado ? ' (ya las alcanzó).' : '.'}
                {evaluacion.estado === ESTADO_EVALUACION.ESPERANDO_PAUTA && ' Falta publicar la pauta en la sección Evaluación.'}
                {evaluacion.enviadaEn && ` Enviada el ${formatearInstante(evaluacion.enviadaEn)}`}
                {evaluacion.recordatorios > 0 && `, con ${evaluacion.recordatorios} ${evaluacion.recordatorios === 1 ? 'recordatorio' : 'recordatorios'}`}
                {evaluacion.enviadaEn && '.'}
              </p>
            )}

            <div className="ph-fila">
              {respondida && (
                <Boton variante="secundario" aria-expanded={verRespuestas} onClick={() => setAbierta(verRespuestas ? null : evaluacion.hito)}>
                  {verRespuestas ? 'Ocultar detalle' : 'Ver detalle'}
                </Boton>
              )}
              {esDocente && respondida && !evaluacion.publicada && (
                <Boton
                  onClick={() => ejecutar(() => evaluacionService.publicar(vinculacionId, evaluacion.hito), 'Evaluación publicada: el estudiante ya puede verla.')}
                  disabled={envio.enCurso}
                >
                  Publicar al estudiante
                </Boton>
              )}
              {esDocente && !respondida && (
                <>
                  <Boton
                    onClick={() => ejecutar(() => evaluacionService.enviarAhora(vinculacionId, evaluacion.hito), 'Correo enviado al supervisor. Si no lo encuentra, que revise la carpeta de spam.')}
                    disabled={envio.enCurso}
                    {...propsBoton}
                  >
                    {evaluacion.enviadaEn ? 'Reenviar correo' : 'Enviar evaluación ahora'}
                  </Boton>
                  <Boton variante="secundario" onClick={() => copiarEnlace(evaluacion.hito)} disabled={envio.enCurso} {...propsBoton}>
                    Copiar enlace
                  </Boton>
                </>
              )}
            </div>

            {enlace?.hito === evaluacion.hito && !respondida && (
              <div className="ph-pila ph-pila--apretada">
                <label className="ph-campo__etiqueta" htmlFor={`enlace-eval-${evaluacion.hito}`}>Enlace de evaluación</label>
                <input
                  id={`enlace-eval-${evaluacion.hito}`}
                  className="ph-campo__control"
                  readOnly
                  value={enlace.url}
                  onFocus={(evento) => evento.target.select()}
                />
                <span className="ph-campo__ayuda">{`Vence el ${formatearInstante(enlace.venceEn)}. Es personal: no lo publiques.`}</span>
              </div>
            )}

            {verRespuestas && evaluacion.pauta && evaluacion.respuestas && (
              <FormularioEvaluacion secciones={evaluacion.pauta.secciones} respuestas={evaluacion.respuestas} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TarjetaEvaluaciones;
