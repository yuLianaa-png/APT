import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const demoRecord = {
  id: 'revision-demo',
  fecha: '2026-09-19',
  actividad: 'Registro de incidencias',
  inicio: '09:00',
  termino: '17:00',
  descanso: '00:30',
  horas: 7.5,
  descripcion: 'Consolidación de incidencias detectadas durante pruebas funcionales y preparación de evidencia para el equipo.',
  evidencia: 'incidencias_19_09.pdf',
  estado: 'PENDIENTE',
  estudianteNombre: 'Jonatán Barrios',
};

const RevisarActividadDocente = () => {
  const navigate = useNavigate();
  const [record, setRecord] = useState(loadPendingRecord);
  const [observation, setObservation] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const calculatedHours = useMemo(() => {
    if (!record) return 0;
    const duration = toMinutes(record.termino) - toMinutes(record.inicio) - toMinutes(record.descanso);
    return duration / 60;
  }, [record]);

  const handleApprove = () => {
    updateRecord({ estado: 'APROBADO', observacion: '', revisadoPor: 'Docente Guía' });
    setMessage({ type: 'success', text: 'Registro aprobado correctamente.' });
  };

  const handleObserve = () => {
    if (!observation.trim()) {
      setMessage({ type: 'error', text: 'Escribe una observación antes de devolver el registro.' });
      return;
    }
    updateRecord({
      estado: 'OBSERVADO',
      observacion: observation.trim(),
      revisadoPor: 'Docente Guía',
    });
    setMessage({ type: 'success', text: 'Registro devuelto al estudiante con la observación.' });
  };

  const updateRecord = (changes) => {
    const updated = { ...record, ...changes };
    setRecord(updated);
    persistRecord(updated);
  };

  if (!record) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Revisar actividad</h1>
            <p style={styles.subtitle}>Validación de registros, horas y evidencias</p>
          </div>
          <span style={styles.visualBadge}>Propuesta visual</span>
        </header>
        <section style={styles.emptyCard}>
          <h2 style={styles.sectionTitle}>No hay registros pendientes</h2>
          <p style={styles.muted}>Cuando un estudiante registre una actividad, aparecerá aquí para revisión.</p>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/docente/dashboard')}>Volver al inicio</button>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Revisar actividad</h1>
          <p style={styles.subtitle}>Validación de registro, horas y evidencia</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <p style={styles.breadcrumb}>Revisiones / {record.estudianteNombre} / {formatDate(record.fecha)}</p>
      {message.text && <div style={message.type === 'error' ? styles.error : styles.success}>{message.text}</div>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.recordTitle}>{record.actividad}</h2>
          <span style={record.estado === 'PENDIENTE' ? styles.pendingBadge : styles.observedBadge}>
            {record.estado === 'PENDIENTE' ? 'Pendiente de revisión' : record.estado}
          </span>

          <div style={styles.detailsGrid}>
            <Detail label="Fecha" value={formatDate(record.fecha)} />
            <Detail label="Horario" value={`${record.inicio} - ${record.termino}`} />
            <Detail label="Descanso" value={formatBreak(record.descanso)} />
            <Detail label="Horas calculadas" value={`${formatHours(calculatedHours)} h`} />
          </div>

          <div style={styles.separator} />
          <h3 style={styles.detailHeading}>Descripción</h3>
          <p style={styles.description}>{record.descripcion}</p>

          <h3 style={styles.detailHeading}>Evidencias</h3>
          <div style={styles.evidenceRow}>
            <span style={styles.fileType}>PDF</span>
            <div style={styles.fileInfo}>
              <strong>{record.evidencia || 'Sin evidencia adjunta'}</strong>
              <span>{record.evidencia ? 'Evidencia asociada al registro' : 'Este registro no incluye archivo'}</span>
            </div>
            {record.evidencia && <button type="button" style={styles.downloadButton}>Descargar</button>}
          </div>
        </section>

        <aside style={styles.card}>
          <h2 style={styles.sectionTitle}>Decisión de revisión</h2>
          <label style={styles.label} htmlFor="observation">Observación para el estudiante</label>
          <textarea
            id="observation"
            value={observation}
            onChange={(event) => {
              setObservation(event.target.value);
              setMessage({ type: '', text: '' });
            }}
            placeholder="Describe qué debe corregir el estudiante..."
            style={styles.textarea}
            rows="5"
            disabled={record.estado === 'APROBADO'}
          />
          <button type="button" style={styles.approveButton} onClick={handleApprove} disabled={record.estado === 'APROBADO'}>
            Aprobar registro
          </button>
          <button type="button" style={styles.observeButton} onClick={handleObserve} disabled={record.estado === 'APROBADO'}>
            Observar y devolver
          </button>
          <p style={styles.warning}>Al aprobar, el registro queda bloqueado para el estudiante y no podrá ser modificado.</p>
        </aside>
      </div>
    </div>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <span style={styles.detailLabel}>{label}</span>
    <strong style={styles.detailValue}>{value}</strong>
  </div>
);

const loadPendingRecord = () => {
  const docenteRecords = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
  const studentRecords = JSON.parse(localStorage.getItem('practicahub_actividades') || '[]');
  return [...docenteRecords, ...studentRecords].find((item) => item.estado === 'PENDIENTE') || demoRecord;
};

const persistRecord = (record) => {
  const key = record.autor === 'DOCENTE'
    ? 'practicahub_actividades_docente'
    : 'practicahub_actividades';
  const records = JSON.parse(localStorage.getItem(key) || '[]');
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.push(record);
  localStorage.setItem(key, JSON.stringify(records));
};

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const formatDate = (date) => {
  if (date.includes('/')) return date;
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
const formatBreak = (value) => `${Math.floor(toMinutes(value) / 60)} h ${toMinutes(value) % 60} min`;
const formatHours = (hours) => Number(hours).toLocaleString('es-CL', { maximumFractionDigits: 2 });

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  breadcrumb: { color: '#8190a5', fontSize: '0.62rem', margin: '0 0 10px' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(270px, 0.85fr)', gap: '14px' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  recordTitle: { margin: 0, color: '#27364d', fontSize: '1rem' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  pendingBadge: { display: 'inline-block', marginTop: '8px', backgroundColor: '#fff1c9', color: '#9a6b00', borderRadius: '12px', padding: '4px 8px', fontSize: '0.56rem', fontWeight: 700 },
  observedBadge: { display: 'inline-block', marginTop: '8px', backgroundColor: '#ffe5e2', color: '#c83d32', borderRadius: '12px', padding: '4px 8px', fontSize: '0.56rem', fontWeight: 700 },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '18px' },
  detailLabel: { display: 'block', color: '#35445a', fontSize: '0.62rem', fontWeight: 700 },
  detailValue: { display: 'block', color: '#7c8da4', fontSize: '0.65rem', fontWeight: 400, marginTop: '3px' },
  separator: { height: '1px', backgroundColor: '#edf1f5', margin: '14px 0' },
  detailHeading: { margin: '0 0 6px', color: '#35445a', fontSize: '0.68rem' },
  description: { margin: '0 0 15px', color: '#7c8da4', fontSize: '0.65rem', lineHeight: 1.5 },
  evidenceRow: { display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid #e1e8f0', borderRadius: '8px', padding: '8px' },
  fileType: { display: 'grid', placeItems: 'center', width: '27px', height: '27px', borderRadius: '6px', backgroundColor: '#edf4fc', color: '#5681b9', fontSize: '0.53rem', fontWeight: 800 },
  fileInfo: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, color: '#33445b', fontSize: '0.62rem' },
  downloadButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 9px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' },
  label: { display: 'block', color: '#47576d', fontSize: '0.62rem', fontWeight: 700, margin: '12px 0 5px' },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontFamily: 'inherit', fontSize: '0.68rem' },
  approveButton: { width: '100%', border: 0, borderRadius: '6px', padding: '9px', marginTop: '12px', backgroundColor: '#16a38e', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  observeButton: { width: '100%', border: '1px solid #e5a528', borderRadius: '6px', padding: '8px', marginTop: '7px', backgroundColor: '#fff', color: '#9a6b00', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  warning: { margin: '12px 0 0', padding: '9px', borderLeft: '3px solid #f1b32b', borderRadius: '5px', backgroundColor: '#fff5df', color: '#8a691c', fontSize: '0.6rem', lineHeight: 1.35 },
  success: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#e4f7f1', color: '#147c61', fontSize: '0.68rem' },
  error: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#fff0ee', color: '#be3b31', fontSize: '0.68rem' },
  emptyCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '40px', textAlign: 'center' },
  muted: { color: '#8190a5', fontSize: '0.7rem', margin: '10px 0 18px' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 12px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
};

export default RevisarActividadDocente;
