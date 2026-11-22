import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { seguimientoService } from '../../services';
import { useModoLectura } from '../../hooks/useModoLectura';
import { ESTADO_SEGUIMIENTO, ETIQUETAS, TIPO_ACCION_SEGUIMIENTO } from '../../utils/constants';
import { formatearFecha, formatearInstante } from '../../utils/fechas';
import { formatearHoras } from '../../utils/horas';
import { Aviso, Boton, Cargando, EstadoError, InsigniaEstado } from '../ui';
import RegistrarAccion from './RegistrarAccion';
import DefinirPlan from './DefinirPlan';

// Panel del docente con el seguimiento de la alerta de un estudiante: estado, ritmo
// necesario, plan vigente, acciones registradas y los botones para gestionarla.

const MODALES = { ACCION: 'ACCION', PLAN: 'PLAN' };

const PanelSeguimiento = ({ vinculacionId, rutaMensajes, alCambiar }) => {
  const { propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ seguimiento: null, cargando: true, error: null });
  const [modal, setModal] = useState(null);
  const [envio, setEnvio] = useState({ enCurso: false, error: null });

  const cargar = useCallback(() => {
    let vigente = true;
    seguimientoService.obtener(vinculacionId)
      .then((seguimiento) => { if (vigente) setEstado({ seguimiento, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({ seguimiento: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo cargar el seguimiento.' });
        }
      });
    return () => { vigente = false; };
  }, [vinculacionId]);

  useEffect(() => cargar(), [cargar]);

  /** Ejecuta una acción del servicio y, si sale bien, cierra el modal y recarga. */
  const ejecutar = (accion) => {
    setEnvio({ enCurso: true, error: null });
    accion()
      .then((seguimiento) => {
        setEstado({ seguimiento, cargando: false, error: null });
        setEnvio({ enCurso: false, error: null });
        setModal(null);
        alCambiar?.();
      })
      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo guardar.' }));
  };

  const cerrarModal = () => { setModal(null); setEnvio({ enCurso: false, error: null }); };

  if (estado.cargando) return <Cargando mensaje="Cargando el seguimiento…" />;
  if (estado.error) return <EstadoError titulo="Seguimiento no disponible" mensaje={estado.error} />;

  const { seguimiento } = estado;
  const abierta = seguimiento.estado && seguimiento.estado !== ESTADO_SEGUIMIENTO.RESUELTA;
  const { plan } = seguimiento;

  return (
    <div className="ph-tarjeta ph-pila">
      <div className="ph-fila ph-fila--entre">
        <div>
          <h3>Seguimiento de la alerta</h3>
          <p className="ph-tarjeta__apoyo">
            Registra lo que hiciste con el estudiante y, si hace falta, un plan o una prórroga.
          </p>
        </div>
        {seguimiento.estado
          ? <InsigniaEstado tipo="seguimiento" estado={seguimiento.estado} />
          : <span className="ph-campo__ayuda">Sin alertas registradas</span>}
      </div>

      <dl className="ph-ficha ph-ficha--panel">
        <div>
          <dt>Fecha de término</dt>
          <dd>
            {seguimiento.fechaTermino ? formatearFecha(seguimiento.fechaTermino) : 'Sin fecha definida'}
            {plan.fechaTermino && ' (prórroga)'}
          </dd>
        </div>
        <div>
          <dt>Ritmo necesario</dt>
          <dd>
            {typeof seguimiento.ritmoSemanal === 'number'
              ? `${formatearHoras(seguimiento.ritmoSemanal)} h por semana`
              : 'No aplica'}
          </dd>
        </div>
        <div>
          <dt>Compromiso semanal</dt>
          <dd>
            {typeof plan.horasSemanales === 'number'
              ? `${formatearHoras(plan.horasSemanales)} h desde el ${formatearFecha(plan.desde)}`
              : 'Sin compromiso'}
          </dd>
        </div>
      </dl>

      <div className="ph-fila">
        <Boton variante="secundario" onClick={() => setModal(MODALES.ACCION)} {...propsBoton}>
          Registrar acción
        </Boton>
        <Boton variante="secundario" onClick={() => setModal(MODALES.PLAN)} {...propsBoton}>
          Plan o prórroga
        </Boton>
        {abierta && (
          <Boton
            variante="tenue"
            onClick={() => ejecutar(() => seguimientoService.resolver(vinculacionId))}
            disabled={envio.enCurso}
            {...propsBoton}
          >
            Marcar como resuelta
          </Boton>
        )}
        {rutaMensajes && (
          <Link className="ph-boton ph-boton--secundario" to={rutaMensajes}>Escribirle</Link>
        )}
      </div>

      {!modal && envio.error && <Aviso tono="error" titulo="No se pudo guardar">{envio.error}</Aviso>}

      <div>
        <h4>Historial</h4>
        {seguimiento.acciones.length === 0 ? (
          <p className="ph-campo__ayuda">Todavía no hay acciones registradas.</p>
        ) : (
          <ul className="ph-historial">
            {seguimiento.acciones.map((accion) => (
              <li key={accion.id} className="ph-historial__item">
                <div className="ph-fila ph-fila--entre">
                  <strong>
                    {ETIQUETAS.TIPO_ACCION_SEGUIMIENTO[accion.tipo] ?? accion.tipo}
                    {accion.automatica && ' (automático)'}
                  </strong>
                  <span className="ph-campo__ayuda">{formatearInstante(accion.creadaEn)}</span>
                </div>
                <p>{accion.nota}</p>
                {accion.fechaCompromiso && accion.tipo !== TIPO_ACCION_SEGUIMIENTO.PLAN && (
                  <p className="ph-campo__ayuda">{`Compromiso para el ${formatearFecha(accion.fechaCompromiso)}`}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal === MODALES.ACCION && (
        <RegistrarAccion
          alCerrar={cerrarModal}
          enCurso={envio.enCurso}
          errorServicio={envio.error}
          alEnviar={(datos) => ejecutar(() => seguimientoService.registrarAccion(vinculacionId, datos))}
        />
      )}
      {modal === MODALES.PLAN && (
        <DefinirPlan
          plan={plan}
          alCerrar={cerrarModal}
          enCurso={envio.enCurso}
          errorServicio={envio.error}
          alEnviar={(datos) => ejecutar(() => seguimientoService.definirPlan(vinculacionId, datos))}
        />
      )}
    </div>
  );
};

export default PanelSeguimiento;
