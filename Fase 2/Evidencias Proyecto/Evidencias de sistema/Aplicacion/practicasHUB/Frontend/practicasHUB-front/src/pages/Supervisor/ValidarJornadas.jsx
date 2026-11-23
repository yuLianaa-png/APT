import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supervisorPublicoService } from '../../services';
import { ESTADO_VALIDACION } from '../../utils/constants';
import { formatearFecha, formatearInstante } from '../../utils/fechas';
import { formatearDescanso, formatearHoras } from '../../utils/horas';
import {
  Aviso, Boton, Cargando, EstadoError, EstadoVacio, Indicador, Indicadores, InsigniaEstado,
} from '../../components/ui';

/** Qué decide el supervisor sobre cada jornada en esta revisión. */
const DECISION = { VALIDAR: 'VALIDAR', OBSERVAR: 'OBSERVAR' };
const FILTRO = { PENDIENTES: 'PENDIENTES', TODAS: 'TODAS' };
const COMENTARIO_MIN = 5;
const COMENTARIO_MAX = 500;

// Página pública del supervisor del centro de práctica. Se abre desde el enlace del correo,
// sin iniciar sesión: el acceso lo da el token del enlace. Pensada para usarse en el celular.

const ValidarJornadas = () => {
  const { token } = useParams();
  const [estado, setEstado] = useState({ vista: null, cargando: true, error: null });
  const [filtro, setFiltro] = useState(FILTRO.PENDIENTES);
  const [decisiones, setDecisiones] = useState({});
  const [comentarios, setComentarios] = useState({});
  const [errores, setErrores] = useState({});
  const [envio, setEnvio] = useState({ enCurso: false, error: null, aviso: null });

  const cargar = useCallback(() => {
    let vigente = true;
    supervisorPublicoService.ver(token)
      .then((vista) => { if (vigente) setEstado({ vista, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) setEstado({ vista: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo abrir el enlace.' });
      });
    return () => { vigente = false; };
  }, [token]);

  useEffect(() => cargar(), [cargar]);

  const jornadas = useMemo(() => {
    const todas = estado.vista?.jornadas ?? [];
    return filtro === FILTRO.PENDIENTES
      ? todas.filter((j) => j.validacion.estado === ESTADO_VALIDACION.PENDIENTE)
      : todas;
  }, [estado.vista, filtro]);

  if (estado.cargando) return <main className="ph-publica"><Cargando mensaje="Abriendo las jornadas…" /></main>;
  if (estado.error) {
    return (
      <main className="ph-publica">
        <Marca />
        <EstadoError titulo="No se pudo abrir el enlace" mensaje={estado.error} />
      </main>
    );
  }

  const { vista } = estado;
  const pendientes = vista.jornadas.filter((j) => j.validacion.estado === ESTADO_VALIDACION.PENDIENTE);
  const elegidas = Object.entries(decisiones).filter(([, decision]) => decision);

  const decidir = (jornadaId, decision) => {
    setDecisiones((previo) => ({ ...previo, [jornadaId]: previo[jornadaId] === decision ? null : decision }));
    setErrores((previo) => ({ ...previo, [jornadaId]: null }));
    setEnvio((previo) => ({ ...previo, aviso: null }));
  };

  const validarPendientes = () => {
    setDecisiones((previo) => {
      const siguiente = { ...previo };
      pendientes.forEach((j) => { if (!siguiente[j.id]) siguiente[j.id] = DECISION.VALIDAR; });
      return siguiente;
    });
    setEnvio((previo) => ({ ...previo, aviso: null }));
  };

  const enviar = () => {
    // Ninguna observación puede quedar vacía.
    const faltan = {};
    elegidas.forEach(([jornadaId, decision]) => {
      const texto = (comentarios[jornadaId] ?? '').trim();
      if (decision === DECISION.OBSERVAR && (texto.length < COMENTARIO_MIN || texto.length > COMENTARIO_MAX)) {
        faltan[jornadaId] = `Explica la observación (entre ${COMENTARIO_MIN} y ${COMENTARIO_MAX} caracteres).`;
      }
    });
    setErrores(faltan);
    if (Object.keys(faltan).length > 0) {
      setEnvio({ enCurso: false, error: 'Hay observaciones sin comentario.', aviso: null });
      return;
    }

    setEnvio({ enCurso: true, error: null, aviso: null });
    supervisorPublicoService.revisar(token, {
      validar: elegidas.filter(([, d]) => d === DECISION.VALIDAR).map(([jornadaId]) => jornadaId),
      observar: elegidas.filter(([, d]) => d === DECISION.OBSERVAR)
        .map(([jornadaId]) => ({ jornadaId, comentario: comentarios[jornadaId].trim() })),
    })
      .then((nueva) => {
        setEstado({ vista: nueva, cargando: false, error: null });
        setDecisiones({});
        setComentarios({});
        setEnvio({ enCurso: false, error: null, aviso: `Listo: se guardó tu revisión de ${elegidas.length} ${elegidas.length === 1 ? 'jornada' : 'jornadas'}. ¡Gracias!` });
      })
      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo guardar la revisión.', aviso: null }));
  };

  return (
    <main className="ph-publica ph-pila">
      <Marca />

      <div>
        <h1 className="ph-publica__titulo">Validación de jornadas</h1>
        <p className="ph-tarjeta__apoyo">
          {`${vista.estudiante} · ${vista.empresa}${vista.practica ? ` · ${vista.practica}` : ''}`}
        </p>
      </div>

      <Indicadores>
        <Indicador
          etiqueta="Horas registradas"
          valor={formatearHoras(vista.horasRegistradas)}
          detalle={vista.metaHoras ? `de ${formatearHoras(vista.metaHoras)} h de meta` : 'en total'}
        />
        <Indicador
          etiqueta="Horas validadas por ti"
          valor={formatearHoras(vista.horasValidadas)}
          detalle={`${pendientes.length} ${pendientes.length === 1 ? 'jornada pendiente' : 'jornadas pendientes'}`}
        />
      </Indicadores>

      {vista.soloLectura ? (
        <Aviso titulo="La práctica ya está cerrada">
          Puedes consultar las jornadas, pero ya no se pueden validar ni observar.
        </Aviso>
      ) : (
        <p className="ph-campo__ayuda">
          {`Revisa cada jornada y elige Validar u Observar. Si observas una, explica qué no corresponde: lo verán el estudiante y su docente. Este enlace es personal y vence el ${formatearInstante(vista.venceEn)}.`}
        </p>
      )}

      {envio.aviso && <Aviso tono="exito">{envio.aviso}</Aviso>}

      <div className="ph-fila ph-fila--entre">
        <div className="ph-fila" role="group" aria-label="Qué jornadas mostrar">
          <Boton
            tamano="pequeno"
            variante={filtro === FILTRO.PENDIENTES ? 'primario' : 'secundario'}
            aria-pressed={filtro === FILTRO.PENDIENTES}
            onClick={() => setFiltro(FILTRO.PENDIENTES)}
          >
            {`Pendientes (${pendientes.length})`}
          </Boton>
          <Boton
            tamano="pequeno"
            variante={filtro === FILTRO.TODAS ? 'primario' : 'secundario'}
            aria-pressed={filtro === FILTRO.TODAS}
            onClick={() => setFiltro(FILTRO.TODAS)}
          >
            {`Todas (${vista.jornadas.length})`}
          </Boton>
        </div>
        {!vista.soloLectura && pendientes.length > 0 && (
          <Boton tamano="pequeno" variante="tenue" onClick={validarPendientes}>
            Marcar todas las pendientes como validadas
          </Boton>
        )}
      </div>

      {jornadas.length === 0 ? (
        <EstadoVacio titulo={filtro === FILTRO.PENDIENTES ? 'No hay jornadas pendientes' : 'Todavía no hay jornadas'}>
          {filtro === FILTRO.PENDIENTES
            ? 'Ya revisaste todas las jornadas registradas hasta ahora.'
            : 'Cuando el estudiante registre jornadas, aparecerán aquí.'}
        </EstadoVacio>
      ) : (
        <ul className="ph-revision">
          {jornadas.map((jornada) => {
            const decision = decisiones[jornada.id] ?? null;
            const idComentario = `comentario-${jornada.id}`;
            return (
              <li key={jornada.id} className="ph-tarjeta ph-pila ph-revision__jornada">
                <div className="ph-fila ph-fila--entre">
                  <strong>{formatearFecha(jornada.fecha)}</strong>
                  <InsigniaEstado tipo="validacion" estado={jornada.validacion.estado} />
                </div>
                <p className="ph-campo__ayuda">
                  {`${jornada.horaInicio} a ${jornada.horaTermino} · descanso ${formatearDescanso(jornada.descansoMin)} · ${formatearHoras(jornada.horas)} h`}
                </p>
                <p><strong>{jornada.actividadPrincipal}</strong></p>
                {jornada.descripcion && <p className="ph-revision__descripcion">{jornada.descripcion}</p>}
                {jornada.validacion.comentario && (
                  <p className="ph-campo__ayuda">{`Tu observación: «${jornada.validacion.comentario}»`}</p>
                )}

                {!vista.soloLectura && (
                  <>
                    <div className="ph-fila" role="group" aria-label={`Decisión sobre la jornada del ${formatearFecha(jornada.fecha)}`}>
                      <Boton
                        tamano="pequeno"
                        variante={decision === DECISION.VALIDAR ? 'primario' : 'secundario'}
                        aria-pressed={decision === DECISION.VALIDAR}
                        onClick={() => decidir(jornada.id, DECISION.VALIDAR)}
                      >
                        Validar
                      </Boton>
                      <Boton
                        tamano="pequeno"
                        variante={decision === DECISION.OBSERVAR ? 'primario' : 'secundario'}
                        aria-pressed={decision === DECISION.OBSERVAR}
                        onClick={() => decidir(jornada.id, DECISION.OBSERVAR)}
                      >
                        Observar
                      </Boton>
                    </div>
                    {decision === DECISION.OBSERVAR && (
                      <div className="ph-campo">
                        <label className="ph-campo__etiqueta" htmlFor={idComentario}>¿Qué no corresponde?</label>
                        <textarea
                          id={idComentario}
                          className={`ph-campo__control${errores[jornada.id] ? ' ph-campo__control--error' : ''}`}
                          maxLength={COMENTARIO_MAX}
                          placeholder="Ese día el estudiante salió a las 17:00, no a las 18:00."
                          value={comentarios[jornada.id] ?? ''}
                          onChange={(evento) => {
                            setComentarios((previo) => ({ ...previo, [jornada.id]: evento.target.value }));
                            setErrores((previo) => ({ ...previo, [jornada.id]: null }));
                          }}
                          aria-invalid={Boolean(errores[jornada.id])}
                        />
                        {errores[jornada.id] && <span className="ph-campo__error">{errores[jornada.id]}</span>}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!vista.soloLectura && (
        <div className="ph-publica__pie ph-pila">
          {envio.error && <Aviso tono="error" titulo="No se pudo guardar">{envio.error}</Aviso>}
          <Boton ancho onClick={enviar} disabled={envio.enCurso || elegidas.length === 0}>
            {envio.enCurso ? 'Guardando…' : `Enviar revisión (${elegidas.length})`}
          </Boton>
        </div>
      )}
    </main>
  );
};

const Marca = () => (
  <div className="ph-acceso__marca">
    <span className="ph-navbar__sigla" aria-hidden="true">PH</span>
    <span className="ph-acceso__marca-texto">PrácticasHub</span>
  </div>
);

export default ValidarJornadas;
