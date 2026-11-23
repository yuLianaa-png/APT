import { useCallback, useEffect, useState } from 'react';
import { supervisorService } from '../../services';
import { useModoLectura } from '../../hooks/useModoLectura';
import { formatearInstante } from '../../utils/fechas';
import { formatearHoras } from '../../utils/horas';
import { Aviso, Boton, Cargando, EstadoError } from '../ui';
import FormularioSupervisor from './FormularioSupervisor';

// Tarjeta del supervisor del centro de práctica de una vinculación.
//  - Estudiante: registra o actualiza a su supervisor.
//  - Docente: ve cuánto ha validado, corrige los datos, le envía el correo o copia el enlace.

const TarjetaSupervisor = ({ vinculacionId, esDocente = false }) => {
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ supervisor: null, cargando: true, error: null });
  const [editando, setEditando] = useState(false);
  const [envio, setEnvio] = useState({ enCurso: false, error: null, aviso: null });
  const [enlace, setEnlace] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;
    supervisorService.obtener(vinculacionId)
      .then((supervisor) => { if (vigente) setEstado({ supervisor, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) setEstado({ supervisor: null, cargando: false, error: fallo?.mensaje ?? 'No se pudo cargar el supervisor.' });
      });
    return () => { vigente = false; };
  }, [vinculacionId]);

  useEffect(() => cargar(), [cargar]);

  /** Ejecuta una acción del servicio; si devuelve el supervisor, lo deja en pantalla. */
  const ejecutar = (accion, aviso) => {
    setEnvio({ enCurso: true, error: null, aviso: null });
    return accion()
      .then((resultado) => {
        if (resultado?.vinculacionId) setEstado({ supervisor: resultado, cargando: false, error: null });
        setEnvio({ enCurso: false, error: null, aviso });
        return resultado;
      })
      .catch((fallo) => {
        setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo completar la acción.', aviso: null });
        return null;
      });
  };

  const guardar = (datos) => ejecutar(() => supervisorService.guardar(vinculacionId, datos), 'Datos del supervisor guardados.')
    .then((resultado) => { if (resultado) { setEditando(false); setEnlace(null); } });

  const copiarEnlace = () => ejecutar(() => supervisorService.crearEnlace(vinculacionId), null)
    .then((nuevo) => {
      if (!nuevo) return;
      setEnlace(nuevo);
      // Si el navegador no deja copiar, el enlace igual queda a la vista para copiarlo a mano.
      navigator.clipboard?.writeText(nuevo.url)
        .then(() => setEnvio((previo) => ({ ...previo, aviso: 'Enlace copiado. Envíaselo al supervisor por el medio que prefieras.' })))
        .catch(() => {});
    });

  if (estado.cargando) return <Cargando mensaje="Cargando el supervisor…" />;
  if (estado.error) return <EstadoError titulo="Supervisor no disponible" mensaje={estado.error} />;

  const { supervisor } = estado;
  const mostrarFormulario = editando || (!supervisor.registrado && !esDocente);

  return (
    <div className="ph-tarjeta ph-pila">
      <div>
        <h3>Supervisor del centro de práctica</h3>
        <p className="ph-tarjeta__apoyo">
          {esDocente
            ? 'Valida las jornadas desde un enlace que le llega por correo, sin crear una cuenta. La validación es un respaldo: las horas cuentan igual.'
            : 'Es la persona que te supervisa en la empresa. Cada semana recibirá un correo para validar tus jornadas.'}
        </p>
      </div>

      {envio.aviso && <Aviso tono="exito">{envio.aviso}</Aviso>}
      {!mostrarFormulario && envio.error && <Aviso tono="error" titulo="No se pudo completar">{envio.error}</Aviso>}

      {mostrarFormulario ? (
        soloLectura ? (
          <p className="ph-campo__ayuda">La práctica está inactiva: no se pueden cambiar los datos del supervisor.</p>
        ) : (
          <FormularioSupervisor
            inicial={supervisor}
            alGuardar={guardar}
            alCancelar={supervisor.registrado ? () => { setEditando(false); setEnvio({ enCurso: false, error: null, aviso: null }); } : null}
            enCurso={envio.enCurso}
            errorServicio={envio.error}
          />
        )
      ) : !supervisor.registrado ? (
        <Aviso titulo="El estudiante aún no registra a su supervisor">
          Cuando lo haga, podrás enviarle el enlace para validar las jornadas.
        </Aviso>
      ) : (
        <>
          <dl className="ph-ficha ph-ficha--panel">
            <div>
              <dt>Nombre</dt>
              <dd>{supervisor.nombre}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>{supervisor.cargo}</dd>
            </div>
            <div>
              <dt>Empresa</dt>
              <dd>{supervisor.empresa}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{supervisor.correo}</dd>
            </div>
            <div>
              <dt>Jornadas validadas</dt>
              <dd>{`${supervisor.validadas} (${formatearHoras(supervisor.horasValidadas)} de ${formatearHoras(supervisor.horasRegistradas)} h)`}</dd>
            </div>
            <div>
              <dt>Sin validar / observadas</dt>
              <dd>{`${supervisor.pendientes} / ${supervisor.observadas}`}</dd>
            </div>
            <div>
              <dt>Último correo</dt>
              <dd>{supervisor.ultimoCorreoEn ? formatearInstante(supervisor.ultimoCorreoEn) : 'Todavía no se envía'}</dd>
            </div>
          </dl>

          <div className="ph-fila">
            {esDocente && (
              <>
                <Boton
                  onClick={() => ejecutar(() => supervisorService.enviarAhora(vinculacionId), 'Correo enviado al supervisor. Si no lo encuentra, que revise la carpeta de spam.')}
                  disabled={envio.enCurso}
                  {...propsBoton}
                >
                  {envio.enCurso ? 'Enviando…' : 'Enviar correo ahora'}
                </Boton>
                <Boton variante="secundario" onClick={copiarEnlace} disabled={envio.enCurso} {...propsBoton}>
                  Copiar enlace
                </Boton>
              </>
            )}
            <Boton variante="tenue" onClick={() => { setEditando(true); setEnvio({ enCurso: false, error: null, aviso: null }); }} {...propsBoton}>
              {esDocente ? 'Corregir datos' : 'Cambiar supervisor'}
            </Boton>
          </div>

          {enlace && (
            <div className="ph-pila">
              <label className="ph-campo__etiqueta" htmlFor={`enlace-${vinculacionId}`}>Enlace para el supervisor</label>
              <input
                id={`enlace-${vinculacionId}`}
                className="ph-campo__control"
                readOnly
                value={enlace.url}
                onFocus={(evento) => evento.target.select()}
              />
              <span className="ph-campo__ayuda">{`Vence el ${formatearInstante(enlace.venceEn)}. Es personal: no lo publiques.`}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TarjetaSupervisor;
