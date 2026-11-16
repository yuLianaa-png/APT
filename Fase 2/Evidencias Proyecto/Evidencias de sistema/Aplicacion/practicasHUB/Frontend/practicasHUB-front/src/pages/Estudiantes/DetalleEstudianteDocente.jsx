import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PRACTICE_GOAL = 360;

const students = {
  1: {
    name: 'Jonatán Barrios',
    initials: 'JB',
    center: 'Municipalidad',
    practice: 'Práctica profesional',
    startDate: '07/09/2026',
    hours: 152,
    pending: 2,
    documents: [{ type: 'DOCX', name: 'Informe de avance', date: 'Entregado hoy' }, { type: 'XLSX', name: 'Registro semanal', date: '18/09/2026' }],
    recent: [
      { date: '18/09', activity: 'Pruebas funcionales', hours: '8 h', status: 'APROBADO' },
      { date: '19/09', activity: 'Registro de incidencias', hours: '7,5 h', status: 'PENDIENTE' },
      { date: '20/09', activity: 'Actualización documentación', hours: '6 h', status: 'OBSERVADO' },
    ],
  },
  2: { name: 'Yuliana Román', initials: 'YR', center: 'Empresa Demo', practice: 'Práctica profesional', startDate: '01/09/2026', hours: 210, pending: 1, documents: [], recent: [] },
  3: { name: 'Nicolás Fernández', initials: 'NF', center: 'Empresa Demo', practice: 'Práctica profesional', startDate: '01/09/2026', hours: 169, pending: 0, documents: [], recent: [] },
};

const statusLabels = { APROBADO: 'Aprobado', PENDIENTE: 'Pendiente', OBSERVADO: 'Observado' };

const DetalleEstudianteDocente = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const student = students[studentId] || students[1];
  const [downloadMessage, setDownloadMessage] = useState('');
  const storedActivities = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]')
        .filter((activity) => String(activity.estudianteId || 1) === String(studentId));
    } catch {
      return [];
    }
  }, [studentId]);
  const recentActivities = storedActivities.length
    ? storedActivities.slice(0, 3).map((activity) => ({
      date: activity.fecha?.slice(5).replace('-', '/') || '--/--',
      activity: activity.actividad,
      hours: `${String(activity.horas).replace('.', ',')} h`,
      status: activity.estado,
    }))
    : student.recent;
  const progress = Math.min((student.hours / PRACTICE_GOAL) * 100, 100);

  const downloadDocument = (document) => {
    const blob = new Blob([`Documento demo: ${document.name}\nEstudiante: ${student.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.name.replace(/\s+/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadMessage(`Descarga iniciada: ${document.name}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.breadcrumb}>Estudiantes / {student.name}</div>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Detalle del estudiante</h1>
          <p style={styles.subtitle}>Seguimiento individual de horas, registros y documentación</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <section style={styles.summaryGrid}>
        <div style={styles.profileCard}>
          <div style={styles.profileTop}>
            <div style={styles.profileIdentity}>
              <span style={styles.avatar}>{student.initials}</span>
              <div><h2 style={styles.studentName}>{student.name}</h2><p style={styles.studentMeta}>{student.practice} · <strong>Activa</strong></p></div>
            </div>
            <button type="button" style={styles.primaryButton} onClick={() => navigate(`/docente/estudiantes/${studentId}/actividad/nueva`)}>Registrar actividad</button>
          </div>
          <div style={styles.metrics}>
            <Metric label="Horas aprobadas" value={`${student.hours} h`} />
            <Metric label="Meta configurada" value={`${PRACTICE_GOAL} h`} />
            <Metric label="Avance" value={`${progress.toFixed(1).replace('.', ',')}%`} />
          </div>
          <div style={styles.progressTrack}><span style={{ ...styles.progressBar, width: `${progress}%` }} /></div>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Resumen</h2>
          <span style={styles.summaryLabel}>Inicio</span><strong style={styles.summaryValue}>{student.startDate}</strong>
          <span style={styles.summaryLabel}>Registros pendientes</span><strong style={styles.pendingCount}>{student.pending}</strong>
          <span style={styles.summaryLabel}>Entregas nuevas</span><strong style={styles.documentCount}>{student.documents.length ? `${student.documents.length} documento${student.documents.length > 1 ? 's' : ''}` : 'Sin novedades'}</strong>
        </div>
      </section>

      {downloadMessage && <div style={styles.downloadMessage}>{downloadMessage}</div>}
      <section style={styles.contentGrid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}><h2 style={styles.cardTitle}>Bitácora reciente</h2><button type="button" style={styles.linkButton} onClick={() => navigate('/docente/revisiones')}>Ver revisiones</button></div>
          <div style={styles.activityTable}>
            <div style={styles.tableHeader}><span>Fecha</span><span>Actividad</span><span>Horas</span><span>Estado</span><span /></div>
            {recentActivities.length ? recentActivities.map((activity, index) => (
              <div style={styles.tableRow} key={`${activity.date}-${index}`}><span>{activity.date}</span><span>{activity.activity}</span><span>{activity.hours}</span><span><em style={styles[`status${activity.status}`]}>{statusLabels[activity.status] || activity.status}</em></span><button type="button" style={activity.status === 'PENDIENTE' ? styles.reviewButton : styles.viewButton} onClick={() => navigate('/docente/revisiones')}>{activity.status === 'PENDIENTE' ? 'Revisar' : 'Ver'}</button></div>
            )) : <p style={styles.empty}>No hay registros recientes.</p>}
          </div>
        </div>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Documentos del estudiante</h2>
          <div style={styles.documents}>
            {student.documents.length ? student.documents.map((document) => <div style={styles.documentRow} key={document.name}><span style={styles.fileType}>{document.type}</span><div style={styles.documentInfo}><strong>{document.name}</strong><small>{document.date}</small></div><button type="button" style={styles.downloadButton} onClick={() => downloadDocument(document)}>Descargar</button></div>) : <p style={styles.empty}>No hay entregas documentales recientes.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

const Metric = ({ label, value }) => <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>;

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  breadcrumb: { color: '#8492a5', fontSize: '.61rem', marginBottom: '8px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '13px' },
  title: { margin: 0, fontSize: '1.55rem', color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '.73rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '.62rem', fontWeight: 700 },
  summaryGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' },
  profileCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '14px' },
  profileTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  profileIdentity: { display: 'flex', alignItems: 'center', gap: '9px' },
  avatar: { display: 'grid', placeItems: 'center', width: '29px', height: '29px', borderRadius: '50%', backgroundColor: '#e5eef9', color: '#3972c4', fontSize: '.55rem', fontWeight: 700 },
  studentName: { margin: 0, fontSize: '.9rem', color: '#26354b' },
  studentMeta: { margin: '2px 0 0', color: '#8190a5', fontSize: '.58rem' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '9px 13px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '17px' },
  metric: { display: 'flex', flexDirection: 'column', gap: '4px' },
  progressTrack: { height: '7px', backgroundColor: '#e7edf4', borderRadius: '8px', overflow: 'hidden', marginTop: '10px' },
  progressBar: { display: 'block', height: '100%', backgroundColor: '#28b6a6' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '14px' },
  cardTitle: { margin: '0 0 10px', color: '#27364d', fontSize: '.78rem' },
  summaryLabel: { display: 'block', color: '#8290a2', fontSize: '.59rem', marginTop: '8px' },
  summaryValue: { display: 'block', color: '#34445b', fontSize: '.62rem', marginTop: '2px' },
  pendingCount: { display: 'inline-block', backgroundColor: '#fff1c9', color: '#9a6b00', borderRadius: '12px', padding: '3px 7px', fontSize: '.54rem', marginTop: '3px' },
  documentCount: { display: 'inline-block', backgroundColor: '#e6efff', color: '#3570c7', borderRadius: '12px', padding: '3px 7px', fontSize: '.54rem', marginTop: '3px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '14px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  linkButton: { border: 0, background: 'transparent', color: '#3972c4', fontSize: '.58rem', cursor: 'pointer' },
  activityTable: { fontSize: '.59rem' },
  tableHeader: { display: 'grid', gridTemplateColumns: '45px 1fr 45px 70px 45px', gap: '8px', padding: '8px', backgroundColor: '#f5f8fb', color: '#74859b', fontSize: '.5rem', textTransform: 'uppercase' },
  tableRow: { display: 'grid', gridTemplateColumns: '45px 1fr 45px 70px 45px', gap: '8px', alignItems: 'center', padding: '9px 8px', borderBottom: '1px solid #edf1f5', color: '#52637a' },
  statusAPROBADO: { color: '#138a68', backgroundColor: '#dff6ed', borderRadius: '10px', padding: '4px 6px', fontStyle: 'normal', fontSize: '.5rem', fontWeight: 700 },
  statusPENDIENTE: { color: '#9a6b00', backgroundColor: '#fff1c9', borderRadius: '10px', padding: '4px 6px', fontStyle: 'normal', fontSize: '.5rem', fontWeight: 700 },
  statusOBSERVADO: { color: '#d4534e', backgroundColor: '#ffebe8', borderRadius: '10px', padding: '4px 6px', fontStyle: 'normal', fontSize: '.5rem', fontWeight: 700 },
  viewButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '5px 7px', backgroundColor: '#fff', color: '#35465d', fontSize: '.5rem', cursor: 'pointer' },
  reviewButton: { border: 0, borderRadius: '6px', padding: '6px 7px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '.5rem', cursor: 'pointer' },
  documents: { display: 'flex', flexDirection: 'column', gap: '7px' },
  documentRow: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e1e8f0', borderRadius: '8px', padding: '8px' },
  fileType: { display: 'grid', placeItems: 'center', width: '27px', height: '27px', backgroundColor: '#edf4ff', color: '#3972c4', borderRadius: '6px', fontSize: '.48rem', fontWeight: 700 },
  documentInfo: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
  downloadButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#fff', color: '#35465d', fontSize: '.51rem', fontWeight: 700, cursor: 'pointer' },
  empty: { color: '#8190a5', fontSize: '.62rem' },
  downloadMessage: { color: '#138a68', backgroundColor: '#dff6ed', borderRadius: '6px', padding: '7px 10px', fontSize: '.6rem', marginBottom: '12px' },
};

export default DetalleEstudianteDocente;
