import { InsigniaEstado } from '../ui';
import { ESTADO_GRUPO } from '../../utils/constants';

// Banner con la identidad del grupo y su estado (activo o inactivo).

const BannerGrupo = ({ grupo }) => {
  if (!grupo) return null;

  const inactivo = grupo.estado !== ESTADO_GRUPO.ACTIVO;

  return (
    <header className={`ph-banner-grupo${inactivo ? ' ph-banner-grupo--inactivo' : ''}`}>
      <div className="ph-banner-grupo__identidad">
        <h1 className="ph-banner-grupo__nombre">{grupo.nombre}</h1>
        <p className="ph-banner-grupo__datos">
          <span className="ph-banner-grupo__codigo">{grupo.codigo}</span>
          {grupo.docenteNombre && <span>{` · ${grupo.docenteNombre}`}</span>}
          {grupo.anio && <span>{` · ${grupo.anio}`}</span>}
        </p>
      </div>

      <div className="ph-banner-grupo__estado">
        <InsigniaEstado tipo="grupo" estado={grupo.estado} prefijo="Práctica" />
        {inactivo && (
          <span className="ph-banner-grupo__aviso">
            Solo lectura: puedes consultar todo, pero no modificar nada.
          </span>
        )}
      </div>
    </header>
  );
};

export default BannerGrupo;
