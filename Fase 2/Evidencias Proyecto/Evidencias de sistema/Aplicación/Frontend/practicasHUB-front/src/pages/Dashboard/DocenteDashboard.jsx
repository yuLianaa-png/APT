import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const demoStudents = [
  { initials: 'JB', name: 'Jonatán B.', hours: 152, pending: '2 registros' },
  { initials: 'YR', name: 'Yuliana R.', hours: 210, pending: '1 registro' },
  { initials: 'NF', name: 'Nicolás F.', hours: 169, pending: 'Al día' },
];

const DocenteDashboard = () => {
  const navigate = useNavigate();
  const pendingRecords = useMemo(() => {
    const student = JSON.parse(localStorage.getItem('practicahub_actividades') || '[]');
    const teacher = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
    return [...student, ...teacher].filter((record) => record.estado === 'PENDIENTE');
  }, []);

  const students = demoStudents.map((student, index) => {
    const record = pendingRecords[index];
    return record ? {
      ...student,
      name: record.estudianteNombre || student.name,
      hours: Number(record.horas || student.hours),
      pending: '1 registro',
    } : student;
  });

  const reviewCount = pendingRecords.length || 12;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Inicio</h1>
          <p style={styles.subtitle}>Panel general de seguimiento</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <section style={styles.statsGrid}>
        <Stat label="Estudiantes vinculados" value="18" detail="15 prácticas activas" />
        <Stat label="Registros por revisar" value={reviewCount} detail="actividades pendientes" />
        <Stat label="Entregas recibidas" value="7" detail="documentos nuevos" />
        <Stat label="Horas aprobadas" value="1.248" detail="acumuladas en el grupo" />
      </section>

      <section style={styles.mainGrid}>
        <article style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Avance de estudiantes</h2>
              <p style={styles.sectionSubtitle}>Horas aprobadas respecto de la meta configurada</p>
            </div>
            <button type="button" style={styles.outlineButton}>Ver todos</button>
          </div>
          <div style={styles.table}>
            <div style={styles.tableHeader}><span>Estudiante</span><span>Avance</span><span>Horas</span><span>Pendientes</span><span /></div>
            {students.map((student) => (
              <div style={styles.tableRow} key={student.name}>
                <strong style={styles.student}><span style={styles.avatar}>{student.initials}</span>{student.name}</strong>
                <span style={styles.progressTrack}><span style={{ ...styles.progressBar, width: `${Math.min(student.hours / 360 * 100, 100)}%` }} /></span>
                <span>{student.hours} / 360</span>
                <span style={styles.pendingBadge}>{student.pending}</span>
                <button type="button" style={styles.actionButton} onClick={() => navigate('/docente/revisiones')}>Abrir</button>
              </div>
            ))}
          </div>
        </article>

        <article style={styles.card}>
          <h2 style={styles.sectionTitle}>Acciones rápidas</h2>
          <QuickAction label="Generar código" onClick={() => navigate('/docente/vinculacion')} primary />
          <QuickAction label="Subir documento" onClick={() => navigate('/docente/documentos')} />
          <QuickAction label="Revisar pendientes" onClick={() => navigate('/docente/revisiones')} />
          <QuickAction label="Generar reporte PDF" onClick={() => navigate('/docente/reportes')} />
        </article>
      </section>

      <section style={styles.bottomGrid}>
        <article style={styles.card}>
          <h2 style={styles.sectionTitle}>Registros pendientes</h2>
          <div style={styles.compactTable}>
            {(pendingRecords.length ? pendingRecords.slice(0, 3) : [
              { estudianteNombre: 'Jonatán B.', fecha: '19/09/2026', actividad: 'Registro de incidencias' },
              { estudianteNombre: 'Yuliana R.', fecha: '20/09/2026', actividad: 'Documentación técnica' },
            ]).map((record, index) => (
              <div style={styles.compactRow} key={`${record.fecha}-${index}`}>
                <span>{record.estudianteNombre || 'Estudiante'}</span>
                <span>{formatDate(record.fecha)}</span>
                <span>{record.actividad}</span>
                <button type="button" style={styles.actionButton} onClick={() => navigate('/docente/revisiones')}>Revisar</button>
              </div>
            ))}
          </div>
        </article>

        <article style={styles.card}>
          <h2 style={styles.sectionTitle}>Entregas recientes</h2>
          <Delivery type="DOCX" title="Informe de avance" student="Jonatán B." />
          <Delivery type="XLSX" title="Registro semanal" student="Yuliana R." />
        </article>
      </section>
    </div>
  );
};

const Stat = ({ label, value, detail }) => (
  <article style={styles.stat}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
);
const QuickAction = ({ label, onClick, primary }) => (
  <button type="button" onClick={onClick} style={primary ? styles.primaryAction : styles.secondaryAction}>{label}</button>
);
const Delivery = ({ type, title, student }) => (
  <div style={styles.delivery}><span style={styles.fileType}>{type}</span><div><strong>{title}</strong><small>{student}</small></div><button type="button" style={styles.actionButton}>Descargar</button></div>
);
const formatDate = (date) => {
  if (!date) return '-';
  if (date.includes('/')) return date;
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '18px' },
  title: { margin: 0, fontSize: '1.55rem', color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(250px, .8fr)', gap: '14px', marginBottom: '14px' },
  bottomGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 1fr)', gap: '14px' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  statLabel: { color: '#7889a0', fontSize: '.65rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '.82rem' },
  sectionSubtitle: { margin: '5px 0 12px', color: '#8391a4', fontSize: '.65rem' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  stat: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '4px' },
  tableHeader: { display: 'grid', gridTemplateColumns: '1.4fr 1fr .8fr 1fr .5fr', gap: '10px', padding: '8px', backgroundColor: '#f5f8fb', color: '#74859b', fontSize: '.56rem', textTransform: 'uppercase' },
  tableRow: { display: 'grid', gridTemplateColumns: '1.4fr 1fr .8fr 1fr .5fr', gap: '10px', alignItems: 'center', padding: '10px 8px', borderBottom: '1px solid #edf1f5', fontSize: '.62rem' },
  student: { display: 'flex', alignItems: 'center', gap: '7px', color: '#33445b' },
  avatar: { display: 'grid', placeItems: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#e5eef9', color: '#3972c4', fontSize: '.55rem' },
  progressTrack: { height: '7px', backgroundColor: '#e7edf4', borderRadius: '8px', overflow: 'hidden' },
  progressBar: { display: 'block', height: '100%', backgroundColor: '#28b6a6' },
  pendingBadge: { color: '#9a6b00', backgroundColor: '#fff1c9', borderRadius: '10px', padding: '4px 7px', fontSize: '.54rem', width: 'max-content' },
  outlineButton: { border: '1px solid #d5e0ec', borderRadius: '6px', backgroundColor: '#fff', padding: '6px 9px', color: '#35465d', fontSize: '.6rem', fontWeight: 700 },
  primaryAction: { width: '100%', border: 0, borderRadius: '6px', padding: '9px', marginTop: '9px', backgroundColor: '#1d72dc', color: '#fff', textAlign: 'left', fontSize: '.62rem', fontWeight: 700 },
  secondaryAction: { width: '100%', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px', marginTop: '7px', backgroundColor: '#fff', color: '#35465d', textAlign: 'left', fontSize: '.62rem', fontWeight: 700 },
  actionButton: { border: '1px solid #d5e0ec', borderRadius: '6px', backgroundColor: '#fff', padding: '5px 8px', color: '#35465d', fontSize: '.56rem', fontWeight: 700, cursor: 'pointer' },
  compactTable: { marginTop: '10px' },
  compactRow: { display: 'grid', gridTemplateColumns: '1fr .7fr 1.5fr .5fr', gap: '8px', alignItems: 'center', padding: '10px 7px', borderBottom: '1px solid #edf1f5', color: '#52637a', fontSize: '.6rem' },
  delivery: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e1e8f0', borderRadius: '8px', padding: '9px', marginTop: '9px', fontSize: '.62rem' },
  fileType: { display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#edf4fc', color: '#5681b9', fontSize: '.5rem', fontWeight: 800 },
  delivery: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e1e8f0', borderRadius: '8px', padding: '9px', marginTop: '9px', fontSize: '.62rem' },
};

export default DocenteDashboard;
