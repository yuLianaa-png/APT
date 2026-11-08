import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const demoActivities = [
  { id: 'demo-1', fecha: '18/09/2026', actividad: 'Pruebas funcionales módulo usuarios', horas: 8, estado: 'APROBADO', evidencia: 'pruebas.pdf' },
  { id: 'demo-2', fecha: '19/09/2026', actividad: 'Registro de incidencias', horas: 7.5, estado: 'PENDIENTE', evidencia: null },
  { id: 'demo-3', fecha: '20/09/2026', actividad: 'Actualización documentación', horas: 6, estado: 'OBSERVADO', evidencia: 'documentacion.png' },
];

const statusLabels = {
  TODOS: 'Todos',
  PENDIENTE: 'Pendientes',
  APROBADO: 'Aprobados',
  OBSERVADO: 'Observados',
};

const BitacoraEstudiante = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('TODOS');
  const [activities, setActivities] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('practicahub_actividades') || '[]');
    const docente = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
    const combined = [...saved, ...docente];
    return combined.length ? combined : demoActivities;
  });

  const filteredActivities = useMemo(
    () => filter === 'TODOS'
      ? activities
      : activities.filter((activity) => activity.estado === filter),
    [activities, filter],
  );
  const totalHours = activities.reduce((total, activity) => total + Number(activity.horas || 0), 0);

  const clearDemoNotice = () => {
    setActivities([]);
    localStorage.setItem('practicahub_actividades', '[]');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Bitácora de horas</h1>
          <p style={styles.subtitle}>Consulta y administra tus registros de actividades</p>
        </div>
        <button type="button" style={styles.primaryButton} onClick={() => navigate('/estudiante/bitacora/nuevo')}>
          + Nuevo registro
        </button>
      </header>

      <section style={styles.summaryGrid}>
        <Summary label="Registros" value={activities.length} />
        <Summary label="Horas registradas" value={`${formatHours(totalHours)} h`} />
        <Summary label="Pendientes" value={activities.filter((item) => item.estado === 'PENDIENTE').length} />
        <Summary label="Aprobados" value={activities.filter((item) => item.estado === 'APROBADO').length} />
      </section>

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <div>
            <h2 style={styles.sectionTitle}>Registros de actividad</h2>
            <p style={styles.sectionSubtitle}>Filtra por estado para revisar el avance de tus jornadas</p>
          </div>
          <div style={styles.filters}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setFilter(value)}
                style={{ ...styles.filterButton, ...(filter === value ? styles.activeFilter : {}) }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredActivities.length ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Fecha</th>
                  <th style={styles.tableHeader}>Actividad</th>
                  <th style={styles.tableHeader}>Horas</th>
                  <th style={styles.tableHeader}>Evidencia</th>
                  <th style={styles.tableHeader}>Autor</th>
                  <th style={styles.tableHeader}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{formatDate(activity.fecha)}</td>
                    <td style={{ ...styles.tableCell, ...styles.activityCell }}>{activity.actividad}</td>
                    <td style={styles.tableCell}>{formatHours(activity.horas)} h</td>
                    <td style={styles.tableCell}>{activity.evidencia || 'Sin archivo'}</td>
                    <td style={styles.tableCell}>{activity.autor === 'DOCENTE' ? 'Docente' : 'Estudiante'}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.statusBadge, ...statusStyles[activity.estado] }}>
                        {activity.estado}
                      </span>
                      {activity.estado === 'OBSERVADO' && (
                        <button
                          type="button"
                          style={styles.correctButton}
                          onClick={() => navigate('/estudiante/bitacora/corregir')}
                        >
                          Corregir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <strong>No hay registros para este filtro</strong>
            <span>Registra una jornada para comenzar tu bitácora.</span>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/bitacora/nuevo')}>
              Registrar actividad
            </button>
          </div>
        )}
      </section>

      <div style={styles.footerRow}>
        <span>Los registros nuevos quedan pendientes de revisión del docente.</span>
        <button type="button" style={styles.clearButton} onClick={clearDemoNotice}>Limpiar datos demo</button>
      </div>
    </div>
  );
};

const Summary = ({ label, value }) => (
  <article style={styles.summaryCard}>
    <span style={styles.summaryLabel}>{label}</span>
    <strong style={styles.summaryValue}>{value}</strong>
  </article>
);

const formatDate = (date) => {
  if (!date) return '-';
  if (date.includes('/')) return date;
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const formatHours = (hours) => Number(hours).toLocaleString('es-CL', {
  minimumFractionDigits: Number(hours) % 1 ? 1 : 0,
  maximumFractionDigits: 2,
});

const statusStyles = {
  PENDIENTE: { backgroundColor: '#fff1c9', color: '#9a6b00' },
  APROBADO: { backgroundColor: '#dff6ed', color: '#138a68' },
  OBSERVADO: { backgroundColor: '#ffe5e2', color: '#c83d32' },
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '9px 13px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '14px' },
  summaryCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px' },
  summaryLabel: { display: 'block', color: '#7889a0', fontSize: '0.65rem', textTransform: 'uppercase' },
  summaryValue: { display: 'block', color: '#1e2d45', fontSize: '1.25rem', marginTop: '5px' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  sectionSubtitle: { margin: '5px 0 0', color: '#8391a4', fontSize: '0.65rem' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' },
  filterButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 9px', backgroundColor: '#fff', color: '#52637a', fontSize: '0.6rem', cursor: 'pointer' },
  activeFilter: { backgroundColor: '#e8f1ff', borderColor: '#5790df', color: '#2868bd', fontWeight: 700 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' },
  tableHeader: { padding: '9px 8px', backgroundColor: '#f5f8fb', color: '#74859b', textAlign: 'left', fontSize: '0.56rem', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #edf1f5' },
  tableCell: { padding: '11px 8px', color: '#52637a', whiteSpace: 'nowrap' },
  activityCell: { color: '#2f4057', fontWeight: 600, whiteSpace: 'normal', minWidth: '260px' },
  statusBadge: { display: 'inline-block', borderRadius: '12px', padding: '4px 8px', fontSize: '0.54rem', fontWeight: 700 },
  correctButton: { display: 'block', marginTop: '5px', border: 0, background: 'transparent', color: '#2868bd', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer', padding: 0 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '45px 20px', color: '#7d8da3', fontSize: '0.7rem' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 11px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' },
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', color: '#8190a5', fontSize: '0.62rem' },
  clearButton: { border: 0, background: 'transparent', color: '#7c8da4', fontSize: '0.6rem', cursor: 'pointer', textDecoration: 'underline' },
};

export default BitacoraEstudiante;
