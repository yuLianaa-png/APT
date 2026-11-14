import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { archivoService, jornadaService } from '../../services';
import { useAhora } from '../../hooks/useAhora';
import { horasRestantes, puedeEditarDirecto } from '../../utils/plazo';
import { formatearFecha } from '../../utils/fechas';
import { Aviso, Boton, Cargando, EstadoError } from '../../components/ui';
import FormJornada from '../../components/jornadas/FormJornada';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de edición de una jornada. Se accede desde el historial de jornadas del estudiante, y solo se permite editarla directamente si no han pasado 24 horas desde que se registró y la práctica está activa.

const EditarJornada = () => {
  const { jornadaId } = useParams();
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const navegar = useNavigate();

  const [estado, setEstado] = useState({ jornada: null, jornadas: [], cargando: true, error: null });
  const [guardando, setGuardando] = useState(false);
  const [errorServicio, setErrorServicio] = useState(null);
  // En estado, no leído en el render: ver `useAhora`.
  const [ahora] = useAhora();

  const base = baseDeGrupo(usuario.rol, grupo.id);
  const volver = () => navegar(`${base}/jornadas`);

  useEffect(() => {
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

  const guardar = async (datos) => {
    setGuardando(true);
    setErrorServicio(null);

    try {
      let { evidencia } = datos;
      // Si es un `File` del navegador es nueva y hay que subirla; si ya tiene `id`, es
      // la que estaba y se deja como está.
      if (evidencia && !evidencia.id) {
        evidencia = await archivoService.subir(evidencia);
      }

      await jornadaService.editarDirecto(jornadaId, {
        horaInicio: datos.horaInicio,
        horaTermino: datos.horaTermino,
        descansoMin: datos.descansoMin,
        actividadPrincipal: datos.actividadPrincipal,
        descripcion: datos.descripcion,
        evidencia,
      });

      volver();
    } catch (fallo) {
      setErrorServicio(fallo?.mensaje ?? 'No se pudo guardar la jornada.');
    } finally {
      setGuardando(false);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando la jornada…" />;
  if (estado.error || !estado.jornada) {
    return <EstadoError titulo="Jornada no encontrada" mensaje={estado.error ?? ''} />;
  }

  const { jornada } = estado;
  const sePuede = puedeEditarDirecto(jornada, grupo, ahora);
  const restantes = horasRestantes(jornada, ahora);

  if (!sePuede) {
    return (
      <section className="ph-pila">
        <h2>{`Jornada del ${formatearFecha(jornada.fecha)}`}</h2>
        <Aviso tono="espera" titulo="Esta jornada ya no se puede editar directamente">
          Pasaron más de 24 horas desde que la registraste, o la práctica está inactiva.
          Si necesitas corregirla, pide una corrección al docente desde el historial.
        </Aviso>
        <div className="ph-fila">
          <Boton onClick={volver}>Volver al historial</Boton>
        </div>
      </section>
    );
  }

  const textoPlazo = restantes < 1
    ? `Te quedan ${Math.ceil(restantes * 60)} minutos de edición directa.`
    : `Te quedan ${Math.floor(restantes)} horas de edición directa.`;

  return (
    <section className="ph-pila">
      <div>
        <h2>{`Editar la jornada del ${formatearFecha(jornada.fecha)}`}</h2>
        <p className="ph-tarjeta__apoyo">
          Puedes corregir cualquier dato salvo la fecha.
        </p>
      </div>

      <Aviso tono="espera" titulo={textoPlazo}>
        Cuando venza el plazo, la jornada se bloquea y cualquier cambio necesitará que el
        docente lo autorice.
      </Aviso>

      <FormJornada
        valorInicial={jornada}
        jornadasDelGrupo={estado.jornadas}
        idExcluido={jornada.id}
        fechaBloqueada
        motivoFechaBloqueada="La fecha de una jornada no se puede modificar después de registrarla."
        etiquetaEnvio="Guardar cambios"
        enCurso={guardando}
        errorServicio={errorServicio}
        alEnviar={guardar}
        alCancelar={volver}
      />
    </section>
  );
};

export default EditarJornada;
