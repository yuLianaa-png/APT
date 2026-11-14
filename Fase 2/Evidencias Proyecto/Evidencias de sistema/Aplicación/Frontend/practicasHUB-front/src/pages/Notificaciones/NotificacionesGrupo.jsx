import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useGrupo } from '../../context/useGrupo';
import { jornadaService, notificacionService } from '../../services';
import { destinoDe, necesitaVinculacion } from '../../utils/rutasNotificacion';
import { Aviso, Cargando, EstadoError, EstadoVacio } from '../../components/ui';
import ListaNotificaciones from '../../components/notificaciones/ListaNotificaciones';

// Página de notificaciones del grupo. Se accede desde el menú lateral del grupo, y muestra todas las novedades de la práctica, sin importar el estudiante.

const NotificacionesGrupo = () => {
  const { usuario } = useAuth();
  const { grupo } = useGrupo();
  const navegar = useNavigate();

  const [estado, setEstado] = useState({ avisos: [], cargando: true, error: null });
  const [abriendo, setAbriendo] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    notificacionService.delGrupo(usuario.id, grupo.id)
      .then((avisos) => { if (vigente) setEstado({ avisos, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            avisos: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar las notificaciones.',
          });
        }
      });

    return () => { vigente = false; };
  }, [usuario.id, grupo.id]);

  useEffect(() => cargar(), [cargar]);

  /** Desde aquí `Ver` abre el elemento **en el contexto actual**: ya se está en el grupo. */
  const abrir = async (aviso) => {
    setAbriendo(aviso.id);
    setError(null);

    try {
      let extras = {};
      if (necesitaVinculacion(aviso, usuario.rol)) {
        const jornada = await jornadaService.obtener(aviso.referencia.id);
        extras = { vinculacionId: jornada.vinculacionId };
      }

      const destino = destinoDe(aviso, usuario.rol, extras);
      if (!destino) {
        setError('Esta notificación no apunta a ningún elemento que se pueda abrir.');
        return;
      }

      navegar(destino);
    } catch {
      setError('El elemento de esta notificación ya no está disponible.');
    } finally {
      setAbriendo(null);
    }
  };

  if (estado.cargando) return <Cargando mensaje="Cargando las notificaciones…" />;
  if (estado.error) return <EstadoError mensaje={estado.error} alReintentar={cargar} />;

  return (
    <section className="ph-pila">
      <div>
        <h2>Notificaciones de esta práctica</h2>
        <p className="ph-tarjeta__apoyo">
          Solo lo que ha pasado en este código. Para ver las novedades de todas tus
          prácticas a la vez, usa Notificaciones desde el panel general.
        </p>
      </div>

      {error && <Aviso tono="error" titulo="No se pudo abrir">{error}</Aviso>}

      <ListaNotificaciones
        notificaciones={estado.avisos}
        abriendo={abriendo}
        alVer={abrir}
        vacio={(
          <EstadoVacio titulo="Sin novedades en esta práctica">
            {`Nada ha cambiado en ${grupo.nombre} desde tu punto de vista.`}
          </EstadoVacio>
        )}
      />
    </section>
  );
};

export default NotificacionesGrupo;
