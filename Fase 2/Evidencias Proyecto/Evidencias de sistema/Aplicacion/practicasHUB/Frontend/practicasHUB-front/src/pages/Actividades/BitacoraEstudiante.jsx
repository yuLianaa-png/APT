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
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [activities, setActivities] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('practicahub_actividades') || '[]');
    const docente = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
    const combined = [...saved, ...docente];
    return combined.length ? combined : demoActivities;
  });

  const filteredActivities = useMemo(
    () => activities.filter((activity) => {
      const matchesStatus = filter === 'TODOS' || activity.estado === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || activity.actividad.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    }),
    [activities, filter, search],
  );

  const clearDemoNotice = () => {
    setActivities([]);
    localStorage.setItem('practicahub_actividades', '[]');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Bitácora</h1>
          <p style={styles.subtitle}>Consulta y seguimiento de actividades registradas</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <section style={styles.card}>
        {actionMessage && <div style={styles.actionMessage}>{actionMessage}</div>}
        <div style={styles.toolbar}>
          <div>
            <h2 style={styles.sectionTitle}>Bitácora de actividades</h2>
            <p style={styles.sectionSubtitle}>Registro cronológico de jornadas y actividades</p>
          </div>
          <div style={styles.actions}>
            <input
              type="search"
              placeholder="Buscar actividad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={styles.searchInput}
            />
            <button type="button" style={styles.primaryButton} onClick={() => navigate('/estudiante/bitacora/nuevo')}>
              + Nuevo registro
            </button>
          </div>
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

        {filteredActivities.length ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Fecha</th>
                  <th style={styles.tableHeader}>Actividad</th>
                  <th style={styles.tableHeader}>Horario</th>
                  <th style={styles.tableHeader}>Horas</th>
                  <th style={styles.tableHeader}>Evidencia</th>
                  <th style={styles.tableHeader}>Estado</th>
                  <th style={styles.tableHeader}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{formatDate(activity.fecha)}</td>
                    <td style={{ ...styles.tableCell, ...styles.activityCell }}>{activity.actividad}</td>
                    <td style={styles.tableCell}>
                      {activity.inicio && activity.termino
                        ? `${activity.inicio} - ${activity.termino}`
                        : '09:00 - 17:00'}
                      <small style={styles.subCell}>{formatBreak(activity.descanso || '00:30')} descanso</small>
                    </td>
                    <td style={styles.tableCell}>{formatHours(activity.horas)} h</td>
                    <td style={styles.tableCell}>
                      <span style={styles.fileBadge}>{activity.evidencia ? '1 archivo' : 'Sin archivo'}</span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.statusBadge, ...statusStyles[activity.estado] }}>
                        {activity.estado}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => activity.estado === 'OBSERVADO'
                          ? navigate('/estudiante/bitacora/corregir')
                          : setActionMessage(`Registro ${activity.estado.toLowerCase()}: ${activity.actividad}`)}
                      >
                        {activity.estado === 'OBSERVADO' ? 'Corregir' : activity.estado === 'PENDIENTE' ? 'Editar' : 'Ver'}
                      </button>
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
        <span style={styles.infoBox}>Los registros aprobados quedan bloqueados para evitar modificaciones posteriores.</span>
        <button type="button" style={styles.clearButton} onClick={clearDemoNotice}>Limpiar datos demo</button>
      </div>
    </div>
  );
};

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
const formatBreak = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours} h ${minutes} min`;
};

const statusStyles = {
  PENDIENTE: { backgroundColor: '#fff1c9', color: '#9a6b00' },
  APROBADO: { backgroundColor: '#dff6ed', color: '#138a68' },
  OBSERVADO: { backgroundColor: '#ffe5e2', color: '#c83d32' },
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  primaryButton: { border: 0, borderRadius: '6px', padding: '9px 13px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  actions: { display: 'flex', gap: '7px', alignItems: 'center' },
  searchInput: { width: '145px', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontSize: '0.62rem' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  sectionSubtitle: { margin: '5px 0 0', color: '#8391a4', fontSize: '0.65rem' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid #e8eef4', marginTop: '13px', paddingBottom: '7px' },
  filterButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 9px', backgroundColor: '#fff', color: '#52637a', fontSize: '0.6rem', cursor: 'pointer' },
  activeFilter: { backgroundColor: '#e8f1ff', borderColor: '#5790df', color: '#2868bd', fontWeight: 700 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' },
  tableHeader: { padding: '9px 8px', backgroundColor: '#f5f8fb', color: '#74859b', textAlign: 'left', fontSize: '0.56rem', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #edf1f5' },
  tableCell: { padding: '11px 8px', color: '#52637a', whiteSpace: 'nowrap' },
  activityCell: { color: '#2f4057', fontWeight: 600, whiteSpace: 'normal', minWidth: '260px' },
  subCell: { display: 'block', color: '#8190a5', fontSize: '0.55rem', marginTop: '2px' },
  fileBadge: { display: 'inline-block', borderRadius: '5px', padding: '4px 7px', backgroundColor: '#f1f4f8', color: '#71839a', fontSize: '0.54rem' },
  statusBadge: { display: 'inline-block', borderRadius: '12px', padding: '4px 8px', fontSize: '0.54rem', fontWeight: 700 },
  actionButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '5px 8px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '45px 20px', color: '#7d8da3', fontSize: '0.7rem' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 11px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' },
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', color: '#8190a5', fontSize: '0.62rem' },
  infoBox: { display: 'block', borderLeft: '3px solid #4ba8ef', borderRadius: '4px', backgroundColor: '#edf7ff', padding: '8px 10px', color: '#4b78a5', fontSize: '0.6rem' },
  actionMessage: { padding: '8px 10px', marginBottom: '10px', borderRadius: '5px', backgroundColor: '#edf7ff', color: '#4b78a5', fontSize: '0.62rem' },
  clearButton: { border: 0, background: 'transparent', color: '#7c8da4', fontSize: '0.6rem', cursor: 'pointer', textDecoration: 'underline' },
};

export default BitacoraEstudiante;
