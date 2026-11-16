import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { useModoLectura } from '../../hooks/useModoLectura';
import { archivoService, jornadaService } from '../../services';
import { Aviso, Cargando, EstadoError } from '../../components/ui';
import FormJornada from '../../components/jornadas/FormJornada';
import ConfirmarJornada from '../../components/jornadas/ConfirmarJornada';
import { baseDeGrupo } from '../../routes/navegacion';

// Página de registro de una jornada. Se accede desde el historial de jornadas del estudiante, y solo se permite registrar si la práctica está activa.

const RegistrarJornada = () => {
  const { usuario } = useAuth();
  const { grupo, vinculacion } = useGrupo();
  const { soloLectura } = useModoLectura();
  const navegar = useNavigate();

  const [jornadas, setJornadas] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorServicio, setErrorServicio] = useState(null);

  const base = baseDeGrupo(usuario.rol, grupo.id);
  const volver = () => navegar(`${base}/jornadas`);

  useEffect(() => {
    let vigente = true;

    jornadaService.listarDeEstudianteEnGrupo(usuario.id, grupo.id)
      .then((lista) => { if (vigente) setJornadas(lista); })
      .catch((fallo) => {
        if (vigente) setErrorCarga(fallo?.mensaje ?? 'No se pudo preparar el formulario.');
      });

    return () => { vigente = false; };
  }, [usuario.id, grupo.id]);

  const guardar = async () => {
    setGuardando(true);
    setErrorServicio(null);

    try {
      let evidencia = null;
      if (borrador.evidencia) {
        evidencia = await archivoService.subir(borrador.evidencia);
      }

      await jornadaService.registrar(vinculacion.id, {
        fecha: borrador.fecha,
        horaInicio: borrador.horaInicio,
        horaTermino: borrador.horaTermino,
        descansoMin: borrador.descansoMin,
        actividadPrincipal: borrador.actividadPrincipal,
        descripcion: borrador.descripcion,
        evidencia,
      });

      volver();
    } catch (fallo) {
      setErrorServicio(fallo?.mensaje ?? 'No se pudo registrar la jornada.');
      setBorrador(null);
    } finally {
      setGuardando(false);
    }
  };

  // RN-03: en un grupo inactivo no se registra nada, y se explica por qué.
  if (soloLectura) {
    return (
      <section className="ph-pila">
        <h2>Registrar jornada</h2>
        <Aviso tono="espera" titulo="Esta práctica está inactiva">
          No se pueden registrar jornadas nuevas. Puedes consultar y descargar todo tu
          historial desde la vista Jornadas.
        </Aviso>
      </section>
    );
  }

  if (errorCarga) return <EstadoError mensaje={errorCarga} />;
  if (jornadas === null) return <Cargando mensaje="Preparando el formulario…" />;

  return (
    <section className="ph-pila">
      <div>
        <h2>Registrar jornada</h2>
        <p className="ph-tarjeta__apoyo">
          {`En ${grupo.nombre}. Las horas las calcula el sistema a partir del horario y el descanso.`}
        </p>
      </div>

      <FormJornada
        jornadasDelGrupo={jornadas}
        etiquetaEnvio="Revisar y confirmar"
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
        />
      )}
    </section>
  );
};

export default RegistrarJornada;
