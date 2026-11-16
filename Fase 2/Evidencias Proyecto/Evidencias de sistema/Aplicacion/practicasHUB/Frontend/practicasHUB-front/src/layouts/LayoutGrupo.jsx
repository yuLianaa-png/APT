import { Link, Outlet, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import BannerGrupo from '../components/grupo/BannerGrupo';
import { GrupoProvider } from '../context/GrupoContext';
import { useGrupo } from '../context/useGrupo';
import { Cargando, EstadoError } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { salidaDeGrupo } from '../routes/navegacion';

/**
 * Disposición de todo lo que ocurre **dentro** de un grupo .
 *
 * El grupo se carga una vez aquí, en el layout, y no en cada sección: así el banner y el
 * menú no parpadean al cambiar de Jornadas a Documentos, y ninguna sección puede dibujar
 * datos antes de saber en qué grupo está.
 *
 * Mientras carga no se enseña el esqueleto de la sección: se enseña que está cargando.
 * Un panel de jornadas vacío durante medio segundo se lee como «no tengo jornadas», que
 * es justo lo contrario de lo que pasa.
 */

/** Lo de dentro, ya con el contexto disponible. */
const ContenidoDelGrupo = () => {
  const { grupo, cargando, error, recargar } = useGrupo();
  const { usuario } = useAuth();
  const salida = salidaDeGrupo(usuario?.rol);

  if (cargando) {
    return (
      <div className="ph-pagina">
        <Cargando mensaje="Cargando la práctica…" />
      </div>
    );
  }

  // Un `:grupoId` ajeno o inventado no deja un panel vacío ni medio pintado: lo dice.
  if (error || !grupo) {
    return (
      <div className="ph-pagina">
        <EstadoError
          titulo="Práctica no encontrada"
          mensaje={error ?? 'Esta práctica no existe o no tienes acceso a ella.'}
          alReintentar={recargar}
        />
        <div className="ph-fila">
          <Link className="ph-boton ph-boton--secundario" to={salida.a}>
            {salida.etiqueta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-marco">
      <Sidebar grupo={grupo} />
      <main className="ph-marco__contenido">
        <div className="ph-pagina">
          <BannerGrupo grupo={grupo} />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const LayoutGrupo = () => {
  const { grupoId } = useParams();

  return (
    <div className="ph-armazon">
      <Navbar />
      <GrupoProvider key={grupoId} grupoId={grupoId}>
        <ContenidoDelGrupo />
      </GrupoProvider>
    </div>
  );
};

export default LayoutGrupo;
