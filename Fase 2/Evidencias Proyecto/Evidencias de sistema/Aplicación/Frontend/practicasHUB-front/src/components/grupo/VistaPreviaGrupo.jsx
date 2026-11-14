import { InsigniaEstado } from '../ui';
import { formatearHoras } from '../../utils/horas';

// Vista previa de un grupo, con su nombre, docente responsable, código, meta mínima, año y estado.

const VistaPreviaGrupo = ({ grupo, children = null }) => (
  <dl className="ph-ficha">
    <div>
      <dt>Grupo</dt>
      <dd><strong>{grupo.nombre}</strong></dd>
    </div>
    <div>
      <dt>Docente responsable</dt>
      <dd>{grupo.docenteNombre}</dd>
    </div>
    <div>
      <dt>Código</dt>
      <dd><code>{grupo.codigo}</code></dd>
    </div>
    <div>
      <dt>Meta mínima</dt>
      <dd>{`${formatearHoras(grupo.metaMinimaHoras)} h`}</dd>
    </div>
    <div>
      <dt>Año</dt>
      <dd>{grupo.anio ?? '—'}</dd>
    </div>
    <div>
      <dt>Estado</dt>
      <dd><InsigniaEstado tipo="grupo" estado={grupo.estado} /></dd>
    </div>
    <div className="ph-ficha__ancho">
      <dt>Descripción</dt>
      <dd>{grupo.descripcion}</dd>
    </div>
    {children}
  </dl>
);

export default VistaPreviaGrupo;
