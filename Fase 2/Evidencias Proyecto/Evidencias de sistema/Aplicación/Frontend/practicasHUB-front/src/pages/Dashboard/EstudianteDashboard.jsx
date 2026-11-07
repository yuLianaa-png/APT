import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const demoActivityRows = [
  { date: '18/09/2026', activity: 'Pruebas funcionales módulo usuarios', hours: '8 h', status: 'Aprobado' },
  { date: '19/09/2026', activity: 'Registro de incidencias', hours: '7,5 h', status: 'Pendiente' },
  { date: '20/09/2026', activity: 'Actualización documentación', hours: '6 h', status: 'Observado' },
];

const documents = [
  { type: 'DOCX', title: 'Informe de avance', detail: 'Requiere entrega', status: 'Pendiente' },
  { type: 'PDF', title: 'Reglamento de práctica', detail: 'Solo lectura', status: 'Disponible' },
];

const EstudianteDashboard = () => {
  const navigate = useNavigate();
  const [savedActivities] = useState(() => (
    JSON.parse(localStorage.getItem('practicahub_actividades') || '[]')
  ));

  const activityRows = useMemo(() => (
    savedActivities.length
      ? savedActivities.map((activity) => ({
        date: formatDate(activity.fecha),
        activity: activity.actividad,
        hours: formatHours(activity.horas),
        status: capitalizeStatus(activity.estado),
      }))
      : demoActivityRows
  ), [savedActivities]);

  const recordedHours = savedActivities.length
    ? savedActivities.reduce((total, activity) => total + Number(activity.horas || 0), 0)
    : 152;
  const pendingActivities = savedActivities.length
    ? savedActivities.filter((activity) => activity.estado === 'PENDIENTE').length
    : 3;
  const progress = Math.min((recordedHours / 360) * 100, 100);
  const summaryCards = [
    { label: 'Horas realizadas', value: `${formatHours(recordedHours)} h`, detail: 'de 360 h configuradas' },
    { label: 'Horas restantes', value: `${formatHours(Math.max(360 - recordedHours, 0))} h`, detail: `avance total ${progress.toFixed(1).replace('.', ',')}%` },
    { label: 'Registros pendientes', value: pendingActivities, detail: 'esperando revisión' },
    { label: 'Documentos', value: '2', detail: 'requieren entrega' },
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Inicio</h1>
          <p style={styles.subtitle}>Resumen general de tu práctica</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <section style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} style={styles.summaryCard}>
            <span style={styles.cardLabel}>{card.label}</span>
            <strong style={styles.cardValue}>{card.value}</strong>
            <span style={styles.cardDetail}>{card.detail}</span>
          </article>
        ))}
      </section>

      <section style={styles.mainGrid}>
        <article style={styles.progressCard}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>Progreso de la práctica</h2>
              <p style={styles.sectionSubtitle}>Horas aprobadas y pendientes</p>
            </div>
            <span style={styles.activeBadge}>Práctica activa</span>
          </div>

          <div style={styles.progressSummary}>{formatHours(recordedHours)} de 360 horas</div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
          </div>

          <div style={styles.divider} />
          <div style={styles.detailsGrid}>
            <div>
              <span style={styles.detailLabel}>Docente guía</span>
              <strong style={styles.detailValue}>Prof. Carolina Pérez</strong>
            </div>
            <div>
              <span style={styles.detailLabel}>Centro de práctica</span>
              <strong style={styles.detailValue}>Empresa / institución registrada</strong>
            </div>
            <div>
              <span style={styles.detailLabel}>Fecha de inicio</span>
              <strong style={styles.detailValue}>07/09/2026</strong>
            </div>
          </div>
        </article>

        <article style={styles.actionsCard}>
          <h2 style={styles.sectionTitle}>Acciones rápidas</h2>
          <button type="button" style={styles.primaryButton} onClick={() => navigate('/estudiante/bitacora/nuevo')}>
            + Registrar actividad
          </button>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/documentos')}>
            Ver documentos
          </button>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/vinculacion')}>
            Ingresar código docente
          </button>
          <p style={styles.infoBox}>El total de horas se actualiza automáticamente a partir de los registros válidos.</p>
        </article>
      </section>

      <section style={styles.bottomGrid}>
        <article style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Últimos registros</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Fecha</th>
                  <th style={styles.tableHeader}>Actividad</th>
                  <th style={styles.tableHeader}>Horas</th>
                  <th style={styles.tableHeader}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((row) => (
                  <tr key={row.date} style={styles.tableRow}>
                    <td style={styles.tableCell}>{row.date}</td>
                    <td style={styles.tableCell}>{row.activity}</td>
                    <td style={styles.tableCell}>{row.hours}</td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.statusBadge, ...statusStyles[row.status] }}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article style={styles.documentsCard}>
          <h2 style={styles.sectionTitle}>Documentación pendiente</h2>
          <div style={styles.documentsList}>
            {documents.map((document) => (
              <div key={document.title} style={styles.documentRow}>
                <span style={styles.fileType}>{document.type}</span>
                <div style={styles.documentInfo}>
                  <strong>{document.title}</strong>
                  <span>{document.detail}</span>
                </div>
                <span style={{ ...styles.statusBadge, ...statusStyles[document.status] }}>{document.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

const statusStyles = {
  Aprobado: { backgroundColor: '#dff6ed', color: '#138a68' },
  Pendiente: { backgroundColor: '#fff1c9', color: '#9a6b00' },
  Observado: { backgroundColor: '#ffe5e2', color: '#c83d32' },
  Disponible: { backgroundColor: '#e6efff', color: '#3570c7' },
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '14px' },
  summaryCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '14px 15px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  cardLabel: { color: '#7889a0', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.02em' },
  cardValue: { color: '#1e2d45', fontSize: '1.35rem', lineHeight: 1.25, margin: '4px 0' },
  cardDetail: { color: '#8190a5', fontSize: '0.62rem' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(250px, 0.8fr)', gap: '14px', marginBottom: '14px' },
  bottomGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 1fr)', gap: '14px' },
  progressCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  actionsCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  tableCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px', overflow: 'hidden' },
  documentsCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  sectionHeading: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  sectionSubtitle: { margin: '7px 0 0', color: '#8391a4', fontSize: '0.65rem' },
  activeBadge: { backgroundColor: '#e8f1ff', color: '#3972c4', borderRadius: '12px', padding: '4px 9px', fontSize: '0.58rem', fontWeight: 700 },
  progressSummary: { marginTop: '14px', color: '#3e4f66', fontSize: '0.68rem' },
  progressTrack: { height: '7px', backgroundColor: '#e7edf4', borderRadius: '8px', overflow: 'hidden', marginTop: '7px' },
  progressBar: { width: '42.2%', height: '100%', backgroundColor: '#28b6a6' },
  divider: { height: '1px', backgroundColor: '#e7edf4', margin: '11px 0' },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' },
  detailLabel: { display: 'block', color: '#35445a', fontSize: '0.65rem', fontWeight: 700 },
  detailValue: { display: 'block', color: '#8090a6', fontSize: '0.63rem', fontWeight: 400, marginTop: '2px' },
  primaryButton: { width: '100%', border: 0, borderRadius: '6px', padding: '8px 10px', marginTop: '9px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { width: '100%', border: '1px solid #d6e0eb', borderRadius: '6px', padding: '7px 10px', marginTop: '7px', backgroundColor: '#fff', color: '#34445a', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' },
  infoBox: { margin: '12px 0 0', padding: '9px', borderLeft: '3px solid #4ba8ef', borderRadius: '5px', backgroundColor: '#edf7ff', color: '#4b78a5', fontSize: '0.59rem', lineHeight: 1.35 },
  tableWrapper: { overflowX: 'auto', marginTop: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.62rem' },
  tableHeader: { padding: '8px 7px', backgroundColor: '#f5f8fb', color: '#74859b', textAlign: 'left', fontSize: '0.56rem', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #edf1f5' },
  tableCell: { padding: '9px 7px', color: '#3e4d63', whiteSpace: 'nowrap' },
  statusBadge: { display: 'inline-block', borderRadius: '12px', padding: '4px 8px', fontSize: '0.54rem', fontWeight: 700, whiteSpace: 'nowrap' },
  documentsList: { display: 'grid', gap: '8px', marginTop: '10px' },
  documentRow: { display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid #e1e8f0', borderRadius: '8px', padding: '9px' },
  fileType: { display: 'grid', placeItems: 'center', width: '27px', height: '27px', borderRadius: '6px', backgroundColor: '#edf4fc', color: '#5681b9', fontSize: '0.53rem', fontWeight: 800 },
  documentInfo: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, fontSize: '0.62rem', color: '#33445b' },
};

export default EstudianteDashboard;

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

const capitalizeStatus = (status) => (
  status.charAt(0) + status.slice(1).toLowerCase()
);
