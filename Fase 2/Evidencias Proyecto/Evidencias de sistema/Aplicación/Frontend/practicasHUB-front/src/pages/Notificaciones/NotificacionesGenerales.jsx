import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { jornadaService, notificacionService } from '../../services';
import { destinoDe, necesitaVinculacion } from '../../utils/rutasNotificacion';
import { ROLES } from '../../utils/constants';
import {
  Aviso, Cargando, EstadoError, EstadoVacio,
} from '../../components/ui';
import ListaNotificaciones from '../../components/notificaciones/ListaNotificaciones';

// Página de notificaciones generales del usuario. Se accede desde el menú lateral, y muestra todas las novedades de todas las prácticas del usuario, sin importar el grupo.

const NotificacionesGenerales = () => {
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [estado, setEstado] = useState({ avisos: [], cargando: true, error: null });
  const [abriendo, setAbriendo] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;

    notificacionService.generales(usuario.id)
      .then((avisos) => { if (vigente) setEstado({ avisos, cargando: false, error: null }); })
      .catch((fallo) => {
        if (vigente) {
          setEstado({
            avisos: [],
            cargando: false,
            error: fallo?.mensaje ?? 'No se pudieron cargar tus notificaciones.',
          });
        }
      });

    return () => { vigente = false; };
  }, [usuario.id]);

  useEffect(() => cargar(), [cargar]);

  /**
   * RN-16: cargar el grupo y abrir el elemento.
   *
   * Para una jornada vista por el docente hace falta la vinculación del estudiante, que la
   * notificación no trae —su referencia es a la jornada—, así que se resuelve aquí antes
   * de navegar. Si la jornada ya no existe, se dice en lugar de llevar a una ruta rota.
   */
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

  if (estado.cargando) {
    return <div className="ph-pagina"><Cargando mensaje="Cargando tus notificaciones…" /></div>;
  }
  if (estado.error) {
    return (
      <div className="ph-pagina">
        <EstadoError mensaje={estado.error} alReintentar={cargar} />
      </div>
    );
  }

  const esDocente = usuario.rol === ROLES.DOCENTE;
  const grupos = new Set(estado.avisos.map((a) => a.grupoId)).size;

  return (
    <div className="ph-pagina">
      <header className="ph-pila">
        <h1>Notificaciones</h1>
        <p className="ph-tarjeta__apoyo">
          {esDocente
            ? 'Solicitudes de corrección, entregas y versiones nuevas de todos tus grupos.'
            : 'Novedades de todas tus prácticas. Cada aviso dice de cuál viene.'}
        </p>
      </header>

      {error && <Aviso tono="error" titulo="No se pudo abrir">{error}</Aviso>}

      {grupos > 1 && (
        <Aviso>
          {`Tienes novedades de ${grupos} prácticas distintas. Pulsa Ver y te llevamos a la correcta.`}
        </Aviso>
      )}

      <ListaNotificaciones
        notificaciones={estado.avisos}
        mostrarGrupo
        abriendo={abriendo}
        alVer={abrir}
        vacio={(
          <EstadoVacio titulo="No tienes novedades">
            {esDocente
              ? 'Aquí aparecerán las solicitudes de corrección de tus estudiantes y las entregas que vayan enviando.'
              : 'Aquí aparecerán las respuestas de tu docente y los documentos que publique.'}
          </EstadoVacio>
        )}
      />
    </div>
  );
};

export default NotificacionesGenerales;
