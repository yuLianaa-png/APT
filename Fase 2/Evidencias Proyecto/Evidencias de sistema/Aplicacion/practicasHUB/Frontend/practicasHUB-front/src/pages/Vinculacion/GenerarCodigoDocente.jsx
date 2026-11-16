import { useState } from 'react';

const STORAGE_KEY = 'practicahub_codigos_vinculacion';

const demoCodes = [
  { id: 1, codigo: 'PH-3A9Q-15', estado: 'USADO', estudiante: 'Jonatán B.', fechaCreacion: '2026-09-08' },
  { id: 2, codigo: 'PH-8K4M-27', estado: 'ACTIVO', estudiante: null, fechaCreacion: '2026-09-20' },
];

const linkedStudents = [
  { nombre: 'Jonatán Barrios', practica: 'Práctica profesional', horas: '360 h' },
  { nombre: 'Yuliana Román', practica: 'Práctica profesional', horas: '360 h' },
];

const GenerarCodigoDocente = () => {
  const [codigos, setCodigos] = useState(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return stored.length ? stored : demoCodes;
  });
  const [nuevoCodigo, setNuevoCodigo] = useState(() => (
    codigos.find((codigo) => codigo.estado === 'ACTIVO')?.codigo || ''
  ));
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const persistCodes = (codes) => {
    setCodigos(codes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  };

  const generateCode = () => {
    const code = `PH-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const newCode = {
      id: Date.now(),
      codigo: code,
      estado: 'ACTIVO',
      estudiante: null,
      fechaCreacion: new Date().toLocaleDateString('es-CL'),
    };
    persistCodes([newCode, ...codigos]);
    setNuevoCodigo(code);
    setMessage('Código generado correctamente.');
    setCopied(false);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setMessage('Código copiado al portapapeles.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage(`Copia manualmente el código: ${code}`);
    }
  };

  const cancelCode = (id) => {
    const code = codigos.find((item) => item.id === id);
    if (!code || code.estado !== 'ACTIVO') return;
    if (!window.confirm('¿Deseas anular este código?')) return;
    persistCodes(codigos.map((item) => item.id === id ? { ...item, estado: 'ANULADO' } : item));
    if (code.codigo === nuevoCodigo) setNuevoCodigo('');
    setMessage('Código anulado correctamente.');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Vinculación</h1>
          <p style={styles.subtitle}>Genera códigos y administra asociaciones</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <section style={styles.topGrid}>
        <article style={styles.card}>
          <h2 style={styles.sectionTitle}>Generar código de vinculación</h2>
          <p style={styles.description}>Comparte un código único con el estudiante para asociarlo a tu supervisión.</p>
          <div style={styles.codeBox}>{nuevoCodigo || 'Genera un nuevo código'}</div>
          <div style={styles.buttonRow}>
            <button type="button" style={styles.primaryButton} onClick={() => copyCode(nuevoCodigo)} disabled={!nuevoCodigo}>
              {copied ? '¡Copiado!' : 'Copiar código'}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={generateCode}>Generar nuevo</button>
          </div>
          <p style={styles.infoBox}>El estudiante debe ingresar el código desde su sección “Mi práctica”.</p>
        </article>

        <article style={styles.card}>
          <h2 style={styles.sectionTitle}>Códigos generados</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Código</th><th style={styles.th}>Estado</th><th style={styles.th}>Estudiante</th><th style={styles.th}>Fecha</th><th style={styles.th} /></tr></thead>
              <tbody>
                {codigos.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.tdCode}>{item.codigo}</td>
                    <td style={styles.td}><Status status={item.estado} /></td>
                    <td style={styles.td}>{item.estudiante || '-'}</td>
                    <td style={styles.td}>{item.fechaCreacion}</td>
                    <td style={styles.td}>
                      {item.estado === 'ACTIVO' ? (
                        <button type="button" style={styles.cancelButton} onClick={() => cancelCode(item.id)}>Anular</button>
                      ) : (
                        <button type="button" style={styles.actionButton}>Ver</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Estudiantes vinculados recientemente</h2>
        <div style={styles.studentTable}>
          <div style={styles.studentHeader}><span>Estudiante</span><span>Práctica</span><span>Horas objetivo</span><span>Estado</span></div>
          {linkedStudents.map((student) => (
            <div style={styles.studentRow} key={student.nombre}>
              <span>{student.nombre}</span><span>{student.practica}</span><span>{student.horas}</span><Status status="ACTIVA" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Status = ({ status }) => (
  <span style={{ ...styles.status, ...(status === 'USADO' || status === 'ACTIVA' ? styles.used : status === 'ANULADO' ? styles.cancelled : styles.available) }}>
    {status === 'USADO' ? 'Utilizado' : status === 'ACTIVO' ? 'Disponible' : status === 'ANULADO' ? 'Anulado' : 'Activa'}
  </span>
);

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  title: { margin: 0, fontSize: '1.55rem', color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '.68rem', fontWeight: 700 },
  message: { marginBottom: '10px', padding: '9px 12px', borderRadius: '6px', backgroundColor: '#e4f7f1', color: '#147c61', fontSize: '.68rem' },
  topGrid: { display: 'grid', gridTemplateColumns: 'minmax(280px, .85fr) minmax(0, 1.45fr)', gap: '14px', marginBottom: '14px' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px', marginBottom: '14px' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '.82rem' },
  description: { color: '#8190a5', fontSize: '.65rem', lineHeight: 1.4 },
  codeBox: { border: '2px dashed #b9d1ed', borderRadius: '8px', backgroundColor: '#f6faff', color: '#2868bd', padding: '13px', textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px', fontWeight: 700 },
  buttonRow: { display: 'flex', justifyContent: 'center', gap: '7px', marginTop: '10px' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '8px 12px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 12px', backgroundColor: '#fff', color: '#35465d', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer' },
  infoBox: { margin: '12px 0 0', padding: '8px 10px', borderLeft: '3px solid #4ba8ef', backgroundColor: '#edf7ff', color: '#4b78a5', fontSize: '.59rem' },
  tableWrapper: { overflowX: 'auto', marginTop: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '.6rem' },
  th: { padding: '8px 6px', backgroundColor: '#f5f8fb', color: '#74859b', textAlign: 'left', fontSize: '.54rem', textTransform: 'uppercase' },
  td: { padding: '10px 6px', borderBottom: '1px solid #edf1f5', color: '#52637a', whiteSpace: 'nowrap' },
  tdCode: { padding: '10px 6px', borderBottom: '1px solid #edf1f5', color: '#33445b', fontWeight: 700, whiteSpace: 'nowrap' },
  status: { display: 'inline-block', borderRadius: '12px', padding: '4px 7px', fontSize: '.52rem', fontWeight: 700 },
  available: { backgroundColor: '#e6efff', color: '#3570c7' },
  used: { backgroundColor: '#dff6ed', color: '#138a68' },
  cancelled: { backgroundColor: '#f1f3f5', color: '#7c8794' },
  actionButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '5px 8px', backgroundColor: '#fff', color: '#35465d', fontSize: '.56rem', cursor: 'pointer' },
  cancelButton: { border: '1px solid #f1b3ad', borderRadius: '6px', padding: '5px 8px', backgroundColor: '#fff', color: '#c83d32', fontSize: '.56rem', cursor: 'pointer' },
  studentTable: { marginTop: '10px', fontSize: '.62rem' },
  studentHeader: { display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '10px', padding: '8px', backgroundColor: '#f5f8fb', color: '#74859b', fontSize: '.54rem', textTransform: 'uppercase' },
  studentRow: { display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '10px', alignItems: 'center', padding: '10px 8px', borderBottom: '1px solid #edf1f5', color: '#52637a' },
};

export default GenerarCodigoDocente;
