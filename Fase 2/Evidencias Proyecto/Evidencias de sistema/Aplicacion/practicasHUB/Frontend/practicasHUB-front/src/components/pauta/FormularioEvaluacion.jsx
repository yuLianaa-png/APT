import { MAXIMO_ACTIVIDADES, TIPO_CRITERIO } from '../../utils/constants';
import {
  LIMITES_RESPUESTA, calcularNota, nuevaClave, notaDeSeccion, promedioDeNotas,
} from '../../utils/pauta';
import { Boton } from '../ui';

const NOTAS = [1, 2, 3, 4, 5, 6, 7];
const vacio = (valor) => valor === null || valor === undefined || valor === '';
const redondear = (valor) => (Math.round(valor * 10) / 10).toFixed(1);
const formatear = (nota) => (vacio(nota) ? '—' : redondear(Number(nota)).replace('.', ','));

/** Botones de nota de 1 a 7 (y «No aplica» si el criterio lo admite). */
const SelectorNota = ({ valor, noAplica = false, admiteNoAplica = false, alElegir, soloLectura, etiqueta, error }) => {
  if (soloLectura) {
    return <strong className="ph-evaluacion__valor">{noAplica ? 'No aplica' : formatear(valor)}</strong>;
  }
  return (
    <div className={`ph-notas${error ? ' ph-notas--error' : ''}`} role="group" aria-label={etiqueta}>
      {NOTAS.map((nota) => (
        <button
          key={nota}
          type="button"
          className="ph-notas__boton"
          aria-pressed={!noAplica && Number(valor) === nota}
          onClick={() => alElegir({ nota, noAplica: false })}
        >
          {nota}
        </button>
      ))}
      {admiteNoAplica && (
        <button
          type="button"
          className="ph-notas__boton ph-notas__boton--na"
          aria-pressed={noAplica}
          onClick={() => alElegir({ nota: null, noAplica: true })}
        >
          No aplica
        </button>
      )}
    </div>
  );
};

// Formulario de una pauta. Lo usan el supervisor (para responder), el docente (vista previa y
// respuestas recibidas) y el estudiante (su evaluación publicada). Sin `alCambiar` es de solo lectura.

const FormularioEvaluacion = ({ secciones, respuestas, alCambiar = null, errores = {}, mostrarNota = true }) => {
  const soloLectura = !alCambiar;

  const cambiar = (s, c, cambios) => alCambiar(respuestas.map((seccion, i) => (i !== s ? seccion : {
    ...seccion,
    criterios: seccion.criterios.map((r, j) => (j === c ? { ...r, ...cambios } : r)),
  })));

  const cambiarActividad = (s, c, a, cambios) => cambiar(s, c, {
    actividades: respuestas[s].criterios[c].actividades.map((act, k) => (k === a ? { ...act, ...cambios } : act)),
  });

  const notaFinal = calcularNota(secciones, respuestas);

  return (
    <div className="ph-pila">
      {secciones.map((seccion, s) => {
        const notaSeccion = notaDeSeccion(secciones, respuestas, s);
        return (
          <section key={`s${s}`} className="ph-tarjeta ph-pila">
            <div className="ph-fila ph-fila--entre">
              <h3>{seccion.titulo}</h3>
              {mostrarNota && seccion.criterios.some((c) => c.tipo !== TIPO_CRITERIO.TEXTO) && (
                <span className="ph-campo__ayuda">{`Promedio: ${formatear(notaSeccion)}`}</span>
              )}
            </div>

            <ol className="ph-evaluacion__criterios">
              {seccion.criterios.map((criterio, c) => {
                const r = respuestas?.[s]?.criterios?.[c] ?? { actividades: [] };
                const clave = `${s}-${c}`;
                return (
                  <li key={clave} className="ph-evaluacion__criterio">
                    <p className="ph-evaluacion__texto">
                      {criterio.texto}
                      {!vacio(criterio.ponderacion) && criterio.tipo !== TIPO_CRITERIO.TEXTO && (
                        <span className="ph-campo__ayuda">{` (${criterio.ponderacion} %)`}</span>
                      )}
                    </p>

                    {criterio.tipo === TIPO_CRITERIO.NOTA && (
                      <SelectorNota
                        valor={r.nota}
                        noAplica={r.noAplica}
                        admiteNoAplica={criterio.admiteNoAplica}
                        soloLectura={soloLectura}
                        etiqueta={`Nota de: ${criterio.texto}`}
                        error={errores[clave]}
                        alElegir={(cambios) => cambiar(s, c, cambios)}
                      />
                    )}

                    {criterio.tipo === TIPO_CRITERIO.CALCULADO && (
                      <p className="ph-campo__ayuda">
                        {`Se calcula solo con el promedio de «${secciones[criterio.seccionOrigen]?.titulo ?? '—'}»: `}
                        <strong>{formatear(promedioDeNotas(secciones, respuestas, criterio.seccionOrigen))}</strong>
                      </p>
                    )}

                    {criterio.tipo === TIPO_CRITERIO.TEXTO && (soloLectura ? (
                      <p className="ph-evaluacion__respuesta">{r.texto || '—'}</p>
                    ) : (
                      <textarea
                        className={`ph-campo__control${errores[clave] ? ' ph-campo__control--error' : ''}`}
                        aria-label={criterio.texto}
                        rows={3}
                        maxLength={LIMITES_RESPUESTA.TEXTO}
                        value={r.texto ?? ''}
                        onChange={(evento) => cambiar(s, c, { texto: evento.target.value })}
                      />
                    ))}

                    {criterio.tipo === TIPO_CRITERIO.ACTIVIDADES && (
                      <div className="ph-pila ph-pila--apretada">
                        {!soloLectura && (
                          <span className="ph-campo__ayuda">
                            {`Escribe cada actividad que realizó el estudiante y ponle nota. Mínimo ${criterio.minimoActividades ?? 1}, máximo ${MAXIMO_ACTIVIDADES}.`}
                          </span>
                        )}
                        {(r.actividades ?? []).map((actividad, a) => (
                          <div key={actividad.clave ?? `a${a}`} className="ph-evaluacion__actividad">
                            {soloLectura ? (
                              <>
                                <span>{`${a + 1}. ${actividad.descripcion}`}</span>
                                <strong className="ph-evaluacion__valor">{formatear(actividad.nota)}</strong>
                              </>
                            ) : (
                              <>
                                <input
                                  className={`ph-campo__control${errores[`${clave}-${a}-d`] ? ' ph-campo__control--error' : ''}`}
                                  aria-label={`Actividad ${a + 1}`}
                                  placeholder={`Actividad ${a + 1}: por ejemplo, desarrollo del módulo de reportes`}
                                  maxLength={LIMITES_RESPUESTA.DESCRIPCION_MAX}
                                  value={actividad.descripcion}
                                  onChange={(evento) => cambiarActividad(s, c, a, { descripcion: evento.target.value })}
                                />
                                <SelectorNota
                                  valor={actividad.nota}
                                  etiqueta={`Nota de la actividad ${a + 1}`}
                                  error={errores[`${clave}-${a}-n`]}
                                  alElegir={({ nota }) => cambiarActividad(s, c, a, { nota })}
                                />
                                <Boton
                                  tamano="pequeno"
                                  variante="tenue"
                                  disabled={(r.actividades ?? []).length <= (Number(criterio.minimoActividades) || 1)}
                                  onClick={() => cambiar(s, c, { actividades: r.actividades.filter((_, k) => k !== a) })}
                                >
                                  Quitar
                                </Boton>
                              </>
                            )}
                          </div>
                        ))}
                        {!soloLectura && (
                          <div>
                            <Boton
                              tamano="pequeno"
                              variante="secundario"
                              disabled={(r.actividades ?? []).length >= MAXIMO_ACTIVIDADES}
                              onClick={() => cambiar(s, c, {
                                actividades: [...(r.actividades ?? []), { clave: nuevaClave(), descripcion: '', nota: null }],
                              })}
                            >
                              + Agregar actividad
                            </Boton>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {mostrarNota && (
        <div className="ph-tarjeta ph-evaluacion__final">
          <span>Nota final</span>
          <strong>{formatear(notaFinal)}</strong>
        </div>
      )}
    </div>
  );
};

export default FormularioEvaluacion;
