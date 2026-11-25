import { useCallback, useEffect, useRef, useState } from 'react';
import { useGrupo } from '../../context/useGrupo';
import { useModoLectura } from '../../hooks/useModoLectura';
import { evaluacionService, pautaService } from '../../services';
import { ETIQUETAS, MODO_EVALUACION } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';
import {
  conClaves, pautaVacia, respuestasVacias, validarPauta,
} from '../../utils/pauta';
import {
  Aviso, Boton, Cargando, EstadoError, InsigniaEstado,
} from '../../components/ui';
import { EditorPauta, FormularioEvaluacion } from '../../components/pauta';

const MODOS = Object.values(MODO_EVALUACION);

// Página del docente para configurar la evaluación del centro de práctica: cuántas evaluaciones
// hace el supervisor y la pauta de cada una. La pauta se sube desde una plantilla (Excel, Word o
// PDF con texto) y se revisa en el editor, o se arma a mano.

const EvaluacionDocente = () => {
  const { grupo } = useGrupo();
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ config: null, cargando: true, error: null });
  const [modo, setModo] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [envio, setEnvio] = useState({ enCurso: false, error: null, aviso: null });
  const selectorArchivo = useRef(null);
  const espacioDeSubida = useRef(null);

  const cargar = useCallback(() => {
    let vigente = true;
    pautaService.configuracion(grupo.id)
      .then((config) => {
        if (!vigente) return;
        setEstado({ config, cargando: false, error: null });
        setModo(config.modo);
      })
      .catch((fallo) => {
        if (vigente) setEstado({ config: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo cargar la evaluación.' });
      });
    // Cuántas evaluaciones hay respondidas y publicadas en cada momento (si falla, no se muestra).
    evaluacionService.resultadosDelGrupo(grupo.id)
      .then((lista) => { if (vigente) setResultados(lista); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [grupo.id]);

  useEffect(() => cargar(), [cargar]);

  /** Ejecuta una acción del servicio que devuelve la configuración actualizada. */
  const ejecutar = (accion, aviso) => {
    setEnvio({ enCurso: true, error: null, aviso: null });
    return accion()
      .then((config) => {
        setEstado({ config, cargando: false, error: null });
        setModo(config.modo);
        setEnvio({ enCurso: false, error: null, aviso });
        return true;
      })
      .catch((fallo) => {
        setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo guardar.', aviso: null });
        return false;
      });
  };

  const subirPlantilla = (espacio) => {
    espacioDeSubida.current = espacio;
    selectorArchivo.current?.click();
  };

  const alElegirArchivo = (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setEnvio({ enCurso: true, error: null, aviso: null });
    pautaService.analizarPlantilla(archivo)
      .then((leida) => {
        setEnvio({ enCurso: false, error: null, aviso: null });
        setEdicion({
          espacio: espacioDeSubida.current,
          pauta: conClaves(leida),
          advertencias: leida.advertencias,
          origen: archivo.name,
        });
      })
      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo leer la plantilla.', aviso: null }));
  };

  const guardar = (publicar) => {
    const { espacio, pauta } = edicion;
    ejecutar(async () => {
      const config = await pautaService.guardarBorrador(grupo.id, espacio, pauta);
      return publicar ? pautaService.publicar(grupo.id, espacio) : config;
    }, publicar ? 'Pauta publicada. Es la que recibirán los supervisores.' : 'Borrador guardado.')
      .then((bien) => { if (bien) setEdicion(null); });
  };

  if (estado.cargando) return <Cargando mensaje="Cargando la evaluación…" />;
  if (estado.error) return <EstadoError titulo="Evaluación no disponible" mensaje={estado.error} />;

  const { config } = estado;

  // ----------------------------------------------------------------------------- vista previa
  if (previa) {
    return (
      <section className="ph-pila">
        <div className="ph-fila ph-fila--entre">
          <div>
            <h2>Vista previa</h2>
            <p className="ph-tarjeta__apoyo">{`Así verá el supervisor la ${previa.etiqueta.toLowerCase()}. Puedes probar el formulario; nada se guarda.`}</p>
          </div>
          <Boton variante="tenue" onClick={() => setPrevia(null)}>← Volver</Boton>
        </div>
        {previa.pauta.instrucciones && (
          <Aviso titulo="Instrucciones">
            <span className="ph-evaluacion__respuesta">{previa.pauta.instrucciones}</span>
          </Aviso>
        )}
        <FormularioEvaluacion
          secciones={previa.pauta.secciones}
          respuestas={previa.respuestas}
          alCambiar={(respuestas) => setPrevia((actual) => ({ ...actual, respuestas }))}
        />
      </section>
    );
  }

  // ---------------------------------------------------------------------------------- editor
  if (edicion) {
    const etiqueta = config.espacios.find((e) => e.espacio === edicion.espacio)?.etiqueta ?? '';
    const completa = validarPauta(edicion.pauta).length === 0;
    return (
      <section className="ph-pila">
        <div className="ph-fila ph-fila--entre">
          <div>
            <h2>Pauta de evaluación</h2>
            <p className="ph-tarjeta__apoyo">{etiqueta}</p>
          </div>
          <Boton variante="tenue" onClick={() => { setEdicion(null); setEnvio({ enCurso: false, error: null, aviso: null }); }} disabled={envio.enCurso}>
            ← Volver sin guardar
          </Boton>
        </div>

        {edicion.origen && (
          <Aviso titulo={`Borrador leído desde «${edicion.origen}»`}>
            Revisa cada sección y criterio antes de publicar: la lectura automática puede equivocarse.
            El archivo no se guardó en el sistema.
            {edicion.advertencias?.length > 0 && (
              <ul className="ph-editor-pauta__errores">
                {edicion.advertencias.map((advertencia) => <li key={advertencia}>{advertencia}</li>)}
              </ul>
            )}
          </Aviso>
        )}

        <EditorPauta
          pauta={edicion.pauta}
          alCambiar={(pauta) => setEdicion((previa) => ({ ...previa, pauta }))}
          deshabilitado={envio.enCurso}
        />

        {envio.error && <Aviso tono="error" titulo="No se pudo guardar">{envio.error}</Aviso>}

        <div className="ph-fila">
          <Boton onClick={() => guardar(true)} disabled={envio.enCurso || !completa} {...propsBoton}>
            {envio.enCurso ? 'Guardando…' : 'Guardar y publicar'}
          </Boton>
          <Boton variante="secundario" onClick={() => guardar(false)} disabled={envio.enCurso} {...propsBoton}>
            Guardar borrador
          </Boton>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------- configuración
  return (
    <section className="ph-pila">
      <div>
        <h2>Evaluación del centro de práctica</h2>
        <p className="ph-tarjeta__apoyo">
          Define cuántas veces evalúa el supervisor al estudiante y con qué pauta. El supervisor la
          llena desde un enlace, sin crear una cuenta, y el estudiante solo ve su evaluación cuando
          tú la publiques.
        </p>
      </div>

      {envio.aviso && <Aviso tono="exito">{envio.aviso}</Aviso>}
      {envio.error && <Aviso tono="error" titulo="No se pudo completar">{envio.error}</Aviso>}

      <fieldset className="ph-tarjeta ph-pila" disabled={soloLectura || !config.modoEditable || envio.enCurso}>
        <legend className="ph-tarjeta__titulo">¿Cuántas evaluaciones hace el centro de práctica?</legend>
        {!config.modoEditable && (
          <p className="ph-campo__ayuda">Ya se enviaron evaluaciones a los supervisores: esta configuración no se puede cambiar.</p>
        )}
        <div className="ph-pila ph-pila--apretada">
          {MODOS.map((opcion) => (
            <label key={opcion} className="ph-seleccion ph-seleccion--neutra">
              <input
                type="radio"
                name="modo-evaluacion"
                value={opcion}
                checked={modo === opcion}
                onChange={() => setModo(opcion)}
              />
              {ETIQUETAS.MODO_EVALUACION[opcion]}
            </label>
          ))}
        </div>
        <div>
          <Boton
            onClick={() => ejecutar(() => pautaService.elegirModo(grupo.id, modo), 'Configuración guardada.')}
            disabled={!modo || modo === config.modo || envio.enCurso}
            {...propsBoton}
          >
            Guardar configuración
          </Boton>
        </div>
      </fieldset>

      {config.espacios.map((espacio) => {
        const { publicada, borrador } = espacio;
        const base = borrador ?? publicada;
        return (
          <div key={espacio.espacio} className="ph-tarjeta ph-pila">
            <div className="ph-fila ph-fila--entre">
              <h3>{espacio.etiqueta}</h3>
              <div className="ph-fila">
                {publicada && <InsigniaEstado tipo="pauta" estado={publicada.estado} prefijo={`v${publicada.version}`} />}
                {borrador && <InsigniaEstado tipo="pauta" estado={borrador.estado} prefijo={`v${borrador.version}`} />}
              </div>
            </div>

            {!base ? (
              <p className="ph-campo__ayuda">
                Todavía no hay pauta. Sube la plantilla de tu institución (Excel, Word o PDF con texto,
                hasta 5 MB) o créala a mano.
              </p>
            ) : (
              <p className="ph-campo__ayuda">
                {`${base.secciones.length} ${base.secciones.length === 1 ? 'sección' : 'secciones'}, `
                  + `${base.secciones.reduce((suma, s) => suma + s.criterios.length, 0)} criterios.`}
                {publicada?.publicadaEn && ` Publicada el ${formatearInstante(publicada.publicadaEn)}.`}
                {borrador && ' Hay cambios sin publicar: los supervisores siguen recibiendo la versión publicada.'}
              </p>
            )}

            <div className="ph-fila">
              <Boton variante="secundario" onClick={() => subirPlantilla(espacio.espacio)} disabled={envio.enCurso} {...propsBoton}>
                {envio.enCurso ? 'Leyendo…' : 'Subir plantilla'}
              </Boton>
              {base ? (
                <Boton
                  variante="secundario"
                  onClick={() => setEdicion({ espacio: espacio.espacio, pauta: conClaves(base), advertencias: [], origen: null })}
                  {...propsBoton}
                >
                  {borrador ? 'Editar borrador' : 'Editar pauta'}
                </Boton>
              ) : (
                <Boton
                  variante="secundario"
                  onClick={() => setEdicion({ espacio: espacio.espacio, pauta: pautaVacia(), advertencias: [], origen: null })}
                  {...propsBoton}
                >
                  Crear a mano
                </Boton>
              )}
              {base && (
                <Boton
                  variante="tenue"
                  onClick={() => setPrevia({
                    etiqueta: espacio.etiqueta,
                    pauta: base,
                    respuestas: respuestasVacias(base.secciones),
                  })}
                >
                  Vista previa
                </Boton>
              )}
              {borrador && (
                <>
                  <Boton
                    onClick={() => ejecutar(() => pautaService.publicar(grupo.id, espacio.espacio), 'Pauta publicada. Es la que recibirán los supervisores.')}
                    disabled={envio.enCurso || validarPauta(borrador).length > 0}
                    {...propsBoton}
                  >
                    Publicar borrador
                  </Boton>
                  <Boton
                    variante="tenue"
                    onClick={() => ejecutar(() => pautaService.descartarBorrador(grupo.id, espacio.espacio), 'Borrador descartado.')}
                    disabled={envio.enCurso}
                    {...propsBoton}
                  >
                    Descartar borrador
                  </Boton>
                </>
              )}
            </div>
          </div>
        );
      })}

      {resultados.length > 0 && (
        <div className="ph-tarjeta ph-pila">
          <div>
            <h3 className="ph-tarjeta__titulo">Resultados</h3>
            <p className="ph-tarjeta__apoyo">
              El estudiante ve su evaluación solo cuando la publicas. Puedes publicarlas una por una
              desde el detalle de cada estudiante o todas las respondidas de una vez.
            </p>
          </div>
          {resultados.map((resultado) => {
            const porPublicar = resultado.respondidas - resultado.publicadas;
            return (
              <div key={resultado.hito} className="ph-fila ph-fila--entre ph-ficha--panel">
                <div>
                  <strong>{resultado.etiqueta}</strong>
                  <p className="ph-campo__ayuda">
                    {`Respondidas: ${resultado.respondidas} · Publicadas: ${resultado.publicadas} · Esperando respuesta: ${resultado.enviadas}`}
                    {resultado.esperandoPauta > 0 && ` · Esperando la pauta: ${resultado.esperandoPauta}`}
                  </p>
                </div>
                <Boton
                  variante="secundario"
                  disabled={porPublicar === 0 || envio.enCurso}
                  onClick={() => {
                    setEnvio({ enCurso: true, error: null, aviso: null });
                    evaluacionService.publicarDelGrupo(grupo.id, resultado.hito)
                      .then((lista) => {
                        setResultados(lista);
                        setEnvio({ enCurso: false, error: null, aviso: 'Evaluaciones publicadas: los estudiantes ya pueden verlas.' });
                      })
                      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudieron publicar.', aviso: null }));
                  }}
                >
                  {porPublicar > 0 ? `Publicar ${porPublicar} ${porPublicar === 1 ? 'respondida' : 'respondidas'}` : 'Nada por publicar'}
                </Boton>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={selectorArchivo}
        type="file"
        accept=".xlsx,.docx,.pdf"
        className="ph-solo-lectores"
        tabIndex={-1}
        aria-hidden="true"
        onChange={alElegirArchivo}
      />
    </section>
  );
};

export default EvaluacionDocente;
