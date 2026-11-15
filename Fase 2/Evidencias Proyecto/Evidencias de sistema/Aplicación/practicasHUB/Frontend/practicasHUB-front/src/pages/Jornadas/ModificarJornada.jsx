import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { archivoService, jornadaService } from '../../services';
import { puedeModificarObservada } from '../../utils/plazo';
import { formatearFecha } from '../../utils/fechas';
import { Aviso, Boton, Cargando, EstadoError } from '../../components/ui';
import FormJornada from '../../components/jornadas/FormJornada';
import ConfirmarJornada from '../../components/jornadas/ConfirmarJornada';
import DetalleSolicitud from '../../components/jornadas/DetalleSolicitud';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de modificación de una jornada Observada. Se accede desde el historial de jornadas del estudiante, y solo se permite modificarla directamente si el docente la autorizó y la práctica está activa.

const ModificarJornada = () => {
  const { jornadaId } = useParams();
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const navegar = useNavigate();

  const [estado, setEstado] = useState({ jornada: null, jornadas: [], cargando: true, error: null });
  const [borrador, setBorrador] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorServicio, setErrorServicio] = useState(null);

  const base = baseDeGrupo(usuario.rol, grupo.id);
  const volver = () => navegar(`${base}/jornadas`);

  const cargar = useCallback(() => {
    let vigente = true;

    Promise.all([
      jornadaService.obtener(jornadaId),
      jornadaService.listarDeEstudianteEnGrupo(usuario.id, grupo.id),
    ])
      .then(([jornada, jornadas]) => {
        if (vigente) setEstado({ jornada, jornadas, cargando: false, error: null });
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            jornada: null,
            jornadas: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudo cargar la jornada.',
          });
        }
      });

    return () => { vigente = false; };
  }, [jornadaId, usuario.id, grupo.id]);

  useEffect(() => cargar(), [cargar]);

  const guardar = async () => {
    setGuardando(true);
    setErrorServicio(null);

    try {
      let { evidencia } = borrador;
      if (evidencia && !evidencia.id) {
        evidencia = await archivoService.subir(evidencia);
      }

      // Cierra el ciclo: Observada -> Registrada, solicitud Completada.
      await jornadaService.guardarCorreccion(jornadaId, {
        horaInicio: borrador.horaInicio,
        horaTermino: borrador.horaTermino,
        descansoMin: borrador.descansoMin,
        actividadPrincipal: borrador.actividadPrincipal,
        descripcion: borrador.descripcion,
        evidencia,
      });

      volver();
    } catch (fallo) {
      setErrorServicio(fallo?.mensaje ?? 'No se pudo guardar la corrección.');
      setBorrador(null);
    } finally {
      setGuardando(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando la jornada…" />;
  if (estado.error || !estado.jornada) {
    return <EstadoError titulo="Jornada no encontrada" mensaje={estado.error ?? ''} />;
  }

  const { jornada } = estado;

  // Si la corrección ya no está habilitada, se dice aquí en lugar de dejar que el
  // servicio rechace el guardado después de rellenar el formulario entero.
  if (!puedeModificarObservada(jornada, grupo)) {
    return (
      <section className="ph-pila">
        <h2>{`Jornada del ${formatearFecha(jornada.fecha)}`}</h2>
        <Aviso tono="espera" titulo="Esta jornada no tiene una corrección habilitada">
          O ya guardaste la corrección, o el docente aún no la ha autorizado, o la práctica
          está inactiva. Revisa el estado en tu historial.
        </Aviso>
        <div className="ph-fila">
          <Boton onClick={volver}>Volver al historial</Boton>
        </div>
      </section>
    );
  }

  return (
    <section className="ph-pila">
      <div>
        <h2>{`Corregir la jornada del ${formatearFecha(jornada.fecha)}`}</h2>
        <p className="ph-tarjeta__apoyo">
          El docente autorizó esta corrección. Puedes cambiar cualquier dato salvo la fecha.
        </p>
      </div>

      <div className="ph-tarjeta">
        <DetalleSolicitud solicitud={jornada.solicitud} />
      </div>

      <FormJornada
        valorInicial={jornada}
        jornadasDelGrupo={estado.jornadas}
        idExcluido={jornada.id}
        fechaBloqueada
        motivoFechaBloqueada="La fecha original de una jornada no se modifica, tampoco en una corrección."
        etiquetaEnvio="Revisar y guardar"
        enCurso={guardando}
        errorServicio={errorServicio}
        alEnviar={setBorrador}
        alCancelar={volver}
      />

      {borrador && (
        <ConfirmarJornada
          datos={borrador}
          enCurso={guardando}
          alConfirmar={guardar}
          alCerrar={() => setBorrador(null)}
          modoCorreccion
        />
      )}
    </section>
  );
};

export default ModificarJornada;
