import { Indicador, Indicadores } from '../ui';
import { formatearHoras } from '../../utils/horas';

// Indicadores de las jornadas de un estudiante, con sus horas registradas, jornadas registradas, solicitudes pendientes y correcciones habilitadas.

const IndicadoresJornadas = ({ datos }) => (
  <Indicadores>
    <Indicador
      etiqueta="Horas registradas"
      valor={formatearHoras(datos.horasRegistradas)}
      detalle={`de ${formatearHoras(datos.metaMinimaHoras)} h de meta mínima`}
      avance={datos.porcentaje}
    />
    <Indicador
      etiqueta="Jornadas registradas"
      valor={datos.totalJornadas}
      detalle={datos.totalJornadas === 1 ? 'en esta práctica' : 'en esta práctica'}
    />
    <Indicador
      etiqueta="Solicitudes pendientes"
      valor={datos.solicitudesPendientes}
      detalle={datos.solicitudesPendientes > 0
        ? 'esperando al docente'
        : 'sin solicitudes abiertas'}
    />
    <Indicador
      etiqueta="Correcciones habilitadas"
      valor={datos.correccionesHabilitadas}
      detalle={datos.correccionesHabilitadas > 0
        ? 'puedes modificarlas ahora'
        : 'ninguna pendiente de corregir'}
    />
  </Indicadores>
);

export default IndicadoresJornadas;
