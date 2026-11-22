import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeService } from '../../services';
import { useModoLectura } from '../../hooks/useModoLectura';
import { avisarNotificacionesLeidas } from '../../hooks/useNoLeidas';
import { LARGO_MAXIMO_MENSAJE, ROLES } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';
import { Aviso, Boton, Cargando, EstadoError, EstadoVacio } from '../ui';

/** Cada cuánto se buscan mensajes nuevos mientras la conversación está abierta. */
const INTERVALO_MS = 15_000;

// Hilo de mensajes entre el docente y un estudiante de una práctica, con el cuadro para
// escribir. Solo texto; en el servidor se guarda cifrado.

const Conversacion = ({ vinculacionId, titulo, alLeer }) => {
  const { soloLectura, propsBoton } = useModoLectura();
  const [estado, setEstado] = useState({ mensajes: [], cargando: true, error: null });
  const [texto, setTexto] = useState('');
  const [envio, setEnvio] = useState({ enCurso: false, error: null });
  const final = useRef(null);

  const cargar = useCallback((silencioso = false) => {
    let vigente = true;
    mensajeService.conversacion(vinculacionId)
      .then((mensajes) => {
        if (!vigente) return;
        setEstado({ mensajes, cargando: false, error: null });
        avisarNotificacionesLeidas();
        alLeer?.();
      })
      .catch((fallo) => {
        if (vigente && !silencioso) {
          setEstado({ mensajes: [], cargando: false, error: fallo?.mensaje ?? 'No se pudo cargar la conversación.' });
        }
      });
    return () => { vigente = false; };
  }, [vinculacionId, alLeer]);

  useEffect(() => {
    const cancelar = cargar();
    const intervalo = setInterval(() => cargar(true), INTERVALO_MS);
    return () => { cancelar(); clearInterval(intervalo); };
  }, [cargar]);

  useEffect(() => {
    final.current?.scrollIntoView?.({ block: 'end' });
  }, [estado.mensajes.length]);

  const enviar = (evento) => {
    evento.preventDefault();
    if (!texto.trim()) return;
    setEnvio({ enCurso: true, error: null });
    mensajeService.enviar(vinculacionId, texto)
      .then((mensaje) => {
        setEstado((previo) => ({ ...previo, mensajes: [...previo.mensajes, mensaje] }));
        setTexto('');
        setEnvio({ enCurso: false, error: null });
      })
      .catch((fallo) => setEnvio({ enCurso: false, error: fallo?.mensaje ?? 'No se pudo enviar el mensaje.' }));
  };

  return (
    <div className="ph-tarjeta ph-pila ph-conversacion">
      {titulo && <h3>{titulo}</h3>}

      {estado.cargando && <Cargando mensaje="Cargando mensajes…" />}
      {estado.error && <EstadoError titulo="Conversación no disponible" mensaje={estado.error} />}

      {!estado.cargando && !estado.error && (
        estado.mensajes.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay mensajes">
            Escribe el primero. Solo lo verán el docente y el estudiante de esta práctica.
          </EstadoVacio>
        ) : (
          <ol className="ph-conversacion__hilo" aria-live="polite">
            {estado.mensajes.map((mensaje) => (
              <li
                key={mensaje.id}
                className={`ph-mensaje${mensaje.propio ? ' ph-mensaje--propio' : ''}`}
              >
                <span className="ph-mensaje__autor">
                  {mensaje.propio ? 'Tú' : (mensaje.remitenteRol === ROLES.DOCENTE ? 'Docente' : 'Estudiante')}
                </span>
                <p className="ph-mensaje__texto">{mensaje.texto}</p>
                <span className="ph-mensaje__hora">{formatearInstante(mensaje.enviadoEn)}</span>
              </li>
            ))}
            <li ref={final} aria-hidden="true" />
          </ol>
        )
      )}

      {envio.error && <Aviso tono="error" titulo="No se pudo enviar">{envio.error}</Aviso>}

      <form className="ph-conversacion__escribir" onSubmit={enviar}>
        <label className="ph-solo-lectores" htmlFor={`mensaje-${vinculacionId}`}>Escribe un mensaje</label>
        <textarea
          id={`mensaje-${vinculacionId}`}
          className="ph-campo__control"
          placeholder={soloLectura ? 'La práctica está inactiva: no se pueden enviar mensajes.' : 'Escribe un mensaje…'}
          maxLength={LARGO_MAXIMO_MENSAJE}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          disabled={envio.enCurso || soloLectura}
          rows={3}
        />
        <Boton type="submit" disabled={envio.enCurso || !texto.trim()} {...propsBoton}>
          {envio.enCurso ? 'Enviando…' : 'Enviar'}
        </Boton>
      </form>
    </div>
  );
};

export default Conversacion;
