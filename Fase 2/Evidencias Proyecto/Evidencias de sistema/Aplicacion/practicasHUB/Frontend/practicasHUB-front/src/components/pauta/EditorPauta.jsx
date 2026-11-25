import { useMemo } from 'react';
import { ETIQUETAS, MAXIMO_ACTIVIDADES, TIPO_CRITERIO } from '../../utils/constants';
import {
  LIMITES_PAUTA, explicarNota, nuevaSeccion, nuevoCriterio, validarPauta,
} from '../../utils/pauta';
import { Aviso, Boton } from '../ui';

const TIPOS = Object.values(TIPO_CRITERIO);

/** Mueve un elemento de una lista una posición arriba (-1) o abajo (+1). */
const mover = (lista, indice, paso) => {
  const destino = indice + paso;
  if (destino < 0 || destino >= lista.length) return lista;
  const copia = [...lista];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
};

// Editor de la pauta: secciones, criterios y cómo se calcula la nota. Muestra en vivo lo que
// falta para poder publicarla. Es un componente controlado: la pauta vive en quien lo usa.

const EditorPauta = ({ pauta, alCambiar, deshabilitado = false }) => {
  const errores = useMemo(() => validarPauta(pauta), [pauta]);
  const { secciones } = pauta;

  const cambiarSeccion = (s, cambios) => alCambiar({
    ...pauta,
    secciones: secciones.map((seccion, i) => (i === s ? { ...seccion, ...cambios } : seccion)),
  });

  const cambiarCriterio = (s, c, cambios) => cambiarSeccion(s, {
    criterios: secciones[s].criterios.map((criterio, i) => (i === c ? { ...criterio, ...cambios } : criterio)),
  });

  // Al mover o quitar una sección, los criterios calculados siguen apuntando a la misma.
  const reordenarSecciones = (nuevas) => {
    const posicion = new Map(nuevas.map((seccion, i) => [seccion.clave, i]));
    alCambiar({
      ...pauta,
      secciones: nuevas.map((seccion) => ({
        ...seccion,
        criterios: seccion.criterios.map((criterio) => {
          if (criterio.tipo !== TIPO_CRITERIO.CALCULADO || criterio.seccionOrigen === null) return criterio;
          const origen = secciones[criterio.seccionOrigen];
          const nueva = origen ? posicion.get(origen.clave) : undefined;
          return { ...criterio, seccionOrigen: nueva === undefined ? null : nueva };
        }),
      })),
    });
  };

  const cambiarTipo = (s, c, tipo) => {
    const base = nuevoCriterio(tipo);
    const actual = secciones[s].criterios[c];
    cambiarCriterio(s, c, {
      tipo,
      texto: actual.texto || base.texto,
      admiteNoAplica: false,
      ponderacion: tipo === TIPO_CRITERIO.TEXTO ? null : actual.ponderacion,
      seccionOrigen: null,
      minimoActividades: base.minimoActividades,
    });
  };

  const totalCriterios = secciones.reduce((suma, s) => suma + s.criterios.length, 0);

  return (
    <div className="ph-pila">
      <div className="ph-campo">
        <label className="ph-campo__etiqueta" htmlFor="pauta-instrucciones">Instrucciones para el supervisor</label>
        <textarea
          id="pauta-instrucciones"
          className="ph-campo__control"
          rows={4}
          maxLength={LIMITES_PAUTA.INSTRUCCIONES}
          value={pauta.instrucciones}
          onChange={(evento) => alCambiar({ ...pauta, instrucciones: evento.target.value })}
          disabled={deshabilitado}
        />
        <span className="ph-campo__ayuda">Opcional. Se muestra arriba del formulario que llena el supervisor.</span>
      </div>

      {secciones.map((seccion, s) => {
        const idSeccion = `seccion-${seccion.clave}`;
        const tieneActividades = seccion.criterios.some((c) => c.tipo === TIPO_CRITERIO.ACTIVIDADES);
        return (
          <fieldset key={seccion.clave} className="ph-tarjeta ph-pila ph-editor-pauta__seccion" disabled={deshabilitado}>
            <legend className="ph-solo-lectores">{`Sección ${s + 1}`}</legend>
            <div className="ph-fila ph-fila--entre">
              <div className="ph-campo ph-editor-pauta__titulo">
                <label className="ph-campo__etiqueta" htmlFor={idSeccion}>{`Sección ${s + 1}`}</label>
                <input
                  id={idSeccion}
                  className="ph-campo__control"
                  maxLength={LIMITES_PAUTA.TITULO}
                  placeholder="Competencias de empleabilidad"
                  value={seccion.titulo}
                  onChange={(evento) => cambiarSeccion(s, { titulo: evento.target.value })}
                />
              </div>
              <div className="ph-fila">
                <Boton tamano="pequeno" variante="tenue" aria-label={`Subir sección ${s + 1}`} disabled={s === 0}
                  onClick={() => reordenarSecciones(mover(secciones, s, -1))}>↑</Boton>
                <Boton tamano="pequeno" variante="tenue" aria-label={`Bajar sección ${s + 1}`} disabled={s === secciones.length - 1}
                  onClick={() => reordenarSecciones(mover(secciones, s, 1))}>↓</Boton>
                <Boton tamano="pequeno" variante="peligro" disabled={secciones.length === 1}
                  onClick={() => reordenarSecciones(secciones.filter((_, i) => i !== s))}>Quitar sección</Boton>
              </div>
            </div>

            <label className="ph-seleccion ph-seleccion--neutra">
              <input
                type="checkbox"
                checked={seccion.cuentaParaNota}
                onChange={(evento) => cambiarSeccion(s, { cuentaParaNota: evento.target.checked })}
              />
              Cuenta para la nota final
            </label>

            <ol className="ph-editor-pauta__criterios">
              {seccion.criterios.map((criterio, c) => {
                const idTexto = `texto-${criterio.clave}`;
                const conNota = criterio.tipo !== TIPO_CRITERIO.TEXTO;
                return (
                  <li key={criterio.clave} className="ph-editor-pauta__criterio">
                    <div className="ph-editor-pauta__fila">
                      <div className="ph-campo">
                        <label className="ph-campo__etiqueta" htmlFor={`tipo-${criterio.clave}`}>Tipo</label>
                        <select
                          id={`tipo-${criterio.clave}`}
                          className="ph-campo__control"
                          value={criterio.tipo}
                          onChange={(evento) => cambiarTipo(s, c, evento.target.value)}
                        >
                          {TIPOS.map((tipo) => (
                            <option
                              key={tipo}
                              value={tipo}
                              disabled={tipo === TIPO_CRITERIO.ACTIVIDADES && tieneActividades && criterio.tipo !== tipo}
                            >
                              {ETIQUETAS.TIPO_CRITERIO[tipo]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="ph-campo ph-editor-pauta__texto">
                        <label className="ph-campo__etiqueta" htmlFor={idTexto}>
                          {criterio.tipo === TIPO_CRITERIO.TEXTO ? 'Pregunta' : 'Criterio'}
                        </label>
                        <textarea
                          id={idTexto}
                          className="ph-campo__control"
                          rows={2}
                          maxLength={LIMITES_PAUTA.TEXTO}
                          value={criterio.texto}
                          onChange={(evento) => cambiarCriterio(s, c, { texto: evento.target.value })}
                        />
                      </div>
                    </div>

                    <div className="ph-fila">
                      {criterio.tipo === TIPO_CRITERIO.NOTA && (
                        <label className="ph-seleccion ph-seleccion--neutra">
                          <input
                            type="checkbox"
                            checked={criterio.admiteNoAplica}
                            onChange={(evento) => cambiarCriterio(s, c, { admiteNoAplica: evento.target.checked })}
                          />
                          Admite «No aplica»
                        </label>
                      )}

                      {criterio.tipo === TIPO_CRITERIO.CALCULADO && (
                        <div className="ph-campo">
                          <label className="ph-campo__etiqueta" htmlFor={`origen-${criterio.clave}`}>Promedio de la sección</label>
                          <select
                            id={`origen-${criterio.clave}`}
                            className="ph-campo__control"
                            value={criterio.seccionOrigen ?? ''}
                            onChange={(evento) => cambiarCriterio(s, c, {
                              seccionOrigen: evento.target.value === '' ? null : Number(evento.target.value),
                            })}
                          >
                            <option value="">Elige una sección</option>
                            {secciones.map((otra, o) => (o === s ? null : (
                              <option key={otra.clave} value={o}>{`${o + 1}. ${otra.titulo || 'Sin título'}`}</option>
                            )))}
                          </select>
                        </div>
                      )}

                      {criterio.tipo === TIPO_CRITERIO.ACTIVIDADES && (
                        <div className="ph-campo">
                          <label className="ph-campo__etiqueta" htmlFor={`minimo-${criterio.clave}`}>Mínimo de actividades</label>
                          <input
                            id={`minimo-${criterio.clave}`}
                            type="number"
                            min="1"
                            max={MAXIMO_ACTIVIDADES}
                            className="ph-campo__control ph-editor-pauta__numero"
                            value={criterio.minimoActividades ?? ''}
                            onChange={(evento) => cambiarCriterio(s, c, {
                              minimoActividades: evento.target.value === '' ? '' : Number(evento.target.value),
                            })}
                          />
                          <span className="ph-campo__ayuda">{`Máximo ${MAXIMO_ACTIVIDADES}. Cada actividad lleva descripción y nota.`}</span>
                        </div>
                      )}

                      {conNota && seccion.cuentaParaNota && (
                        <div className="ph-campo">
                          <label className="ph-campo__etiqueta" htmlFor={`peso-${criterio.clave}`}>Ponderación (%)</label>
                          <input
                            id={`peso-${criterio.clave}`}
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            placeholder="Opcional"
                            className="ph-campo__control ph-editor-pauta__numero"
                            value={criterio.ponderacion ?? ''}
                            onChange={(evento) => cambiarCriterio(s, c, {
                              ponderacion: evento.target.value === '' ? null : evento.target.value,
                            })}
                          />
                        </div>
                      )}

                      <div className="ph-fila ph-editor-pauta__acciones">
                        <Boton tamano="pequeno" variante="tenue" aria-label="Subir criterio" disabled={c === 0}
                          onClick={() => cambiarSeccion(s, { criterios: mover(seccion.criterios, c, -1) })}>↑</Boton>
                        <Boton tamano="pequeno" variante="tenue" aria-label="Bajar criterio" disabled={c === seccion.criterios.length - 1}
                          onClick={() => cambiarSeccion(s, { criterios: mover(seccion.criterios, c, 1) })}>↓</Boton>
                        <Boton tamano="pequeno" variante="tenue" aria-label="Quitar criterio"
                          onClick={() => cambiarSeccion(s, { criterios: seccion.criterios.filter((_, i) => i !== c) })}>Quitar</Boton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div>
              <Boton
                tamano="pequeno"
                variante="secundario"
                disabled={totalCriterios >= LIMITES_PAUTA.CRITERIOS}
                onClick={() => cambiarSeccion(s, { criterios: [...seccion.criterios, nuevoCriterio()] })}
              >
                + Agregar criterio
              </Boton>
            </div>
          </fieldset>
        );
      })}

      <div>
        <Boton
          variante="secundario"
          disabled={deshabilitado || secciones.length >= LIMITES_PAUTA.SECCIONES}
          onClick={() => alCambiar({ ...pauta, secciones: [...secciones, { ...nuevaSeccion(), cuentaParaNota: false }] })}
        >
          + Agregar sección
        </Boton>
      </div>

      <Aviso titulo="Cómo se calcula la nota">{explicarNota(pauta)}</Aviso>

      {errores.length > 0 ? (
        <Aviso tono="espera" titulo="Antes de publicar falta revisar">
          <ul className="ph-editor-pauta__errores">
            {errores.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </Aviso>
      ) : (
        <Aviso tono="exito">La pauta está completa y se puede publicar.</Aviso>
      )}
    </div>
  );
};

export default EditorPauta;
