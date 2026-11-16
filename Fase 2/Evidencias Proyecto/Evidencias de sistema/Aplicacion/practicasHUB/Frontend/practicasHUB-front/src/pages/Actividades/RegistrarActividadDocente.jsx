import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const RegistrarActividadDocente = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fecha: '2026-09-21',
    tipoJornada: 'Presencial',
    inicio: '09:00',
    termino: '17:30',
    descanso: '00:30',
    actividad: 'Reunión de seguimiento y pruebas funcionales',
    descripcion: 'Registro ingresado por el docente a partir de la jornada validada con el estudiante.',
  });
  const [evidencia, setEvidencia] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const totalMinutes = useMemo(() => (
    Math.max(0, toMinutes(form.termino) - toMinutes(form.inicio) - toMinutes(form.descanso))
  ), [form.inicio, form.termino, form.descanso]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage({ type: '', text: '' });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'La evidencia debe ser PDF, JPG o PNG.' });
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'La evidencia no puede superar los 2 MB.' });
      event.target.value = '';
      return;
    }
    setEvidencia(file);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.fecha || !form.actividad.trim() || !form.descripcion.trim()) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios antes de guardar.' });
      return;
    }
    if (toMinutes(form.termino) <= toMinutes(form.inicio)) {
      setMessage({ type: 'error', text: 'La hora de término debe ser posterior al inicio.' });
      return;
    }
    if (totalMinutes <= 0 || totalMinutes > 600) {
      setMessage({ type: 'error', text: 'La jornada debe durar entre 1 y 10 horas.' });
      return;
    }

    const registro = {
      id: Date.now(),
      estudianteId: 1,
      estudianteNombre: 'Jonatán Barrios',
      ...form,
      horas: totalMinutes / 60,
      evidencia: evidencia?.name || null,
      estado: 'PENDIENTE',
      autor: 'DOCENTE',
      creadoPor: 'Docente Guía',
      fechaCreacion: new Date().toISOString(),
    };
    const registros = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
    localStorage.setItem('practicahub_actividades_docente', JSON.stringify([registro, ...registros]));
    setMessage({ type: 'success', text: 'Actividad registrada por el docente correctamente.' });
  };

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Registrar actividad</h1>
          <p style={styles.subtitle}>Ingreso de una jornada en nombre del estudiante</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      <p style={styles.breadcrumb}>Estudiantes / Jonatán Barrios / Registrar actividad</p>
      {message.text && (
        <div style={message.type === 'error' ? styles.error : styles.success}>{message.text}</div>
      )}

      <div style={styles.topGrid}>
        <form style={styles.card} onSubmit={handleSubmit}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Registrar actividad para Jonatán Barrios</h2>
              <p style={styles.sectionSubtitle}>Registro creado por docente responsable</p>
            </div>
            <span style={styles.authorBadge}>Autor: Docente</span>
          </div>
          <div style={styles.formGrid}>
            <Field label="Fecha">
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Tipo de jornada">
              <select name="tipoJornada" value={form.tipoJornada} onChange={handleChange} style={styles.input}>
                <option>Presencial</option><option>Remota</option><option>Híbrida</option>
              </select>
            </Field>
            <Field label="Hora de inicio">
              <input name="inicio" type="time" value={form.inicio} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Hora de término">
              <input name="termino" type="time" value={form.termino} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Descanso / colación">
              <input name="descanso" type="time" value={form.descanso} onChange={handleChange} style={styles.input} />
            </Field>
            <div style={styles.fullField}>
              <Field label="Actividad">
                <input name="actividad" value={form.actividad} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
            <div style={styles.fullField}>
              <Field label="Descripción">
                <textarea name="descripcion" rows="3" value={form.descripcion} onChange={handleChange} style={styles.textarea} />
              </Field>
            </div>
          </div>
          <div style={styles.buttons}>
            <button type="submit" style={styles.primaryButton}>Guardar registro</button>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate('/docente/dashboard')}>Cancelar</button>
          </div>
        </form>

        <aside style={styles.card}>
          <h2 style={styles.sectionTitle}>Cálculo automático</h2>
          <span style={styles.calculationLabel}>Duración de jornada</span>
          <strong style={styles.hours}>{hours} h{minutes ? ` ${minutes} min` : ''}</strong>
          <p style={styles.calculationDetail}>
            {form.termino} - {form.inicio} = {Math.floor((toMinutes(form.termino) - toMinutes(form.inicio)) / 60)} h {Math.max(0, toMinutes(form.termino) - toMinutes(form.inicio)) % 60} min
            <br />Descanso: {formatBreak(form.descanso)}
          </p>
          <strong style={styles.total}>Total: {hours} h{minutes ? ` ${minutes} min` : ''}</strong>
          <p style={styles.info}>El registro conservará el autor y la fecha de creación para mantener trazabilidad.</p>
        </aside>
      </div>

      <section style={styles.evidenceCard}>
        <h2 style={styles.sectionTitle}>Evidencia opcional</h2>
        <label style={styles.dropZone}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={styles.hiddenInput} />
          <strong>{evidencia ? evidencia.name : 'Adjuntar evidencia al registro'}</strong>
          <span>El archivo quedará asociado a la actividad del estudiante.</span>
          <span style={styles.fileButton}>Seleccionar archivo</span>
        </label>
      </section>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>
);
const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const formatBreak = (value) => {
  const minutes = toMinutes(value);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  breadcrumb: { color: '#8190a5', fontSize: '0.62rem', margin: '0 0 10px' },
  success: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#e4f7f1', color: '#147c61', fontSize: '0.68rem' },
  error: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#fff0ee', color: '#be3b31', fontSize: '0.68rem' },
  topGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(270px, 0.85fr)', gap: '14px' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  sectionSubtitle: { margin: '5px 0 0', color: '#8391a4', fontSize: '0.65rem' },
  authorBadge: { alignSelf: 'flex-start', backgroundColor: '#e8f1ff', color: '#2868bd', borderRadius: '12px', padding: '4px 8px', fontSize: '0.56rem', fontWeight: 700, whiteSpace: 'nowrap' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' },
  fullField: { gridColumn: '1 / -1' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { color: '#47576d', fontSize: '0.62rem', fontWeight: 700 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 9px', color: '#35465d', backgroundColor: '#fff', fontSize: '0.68rem' },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontFamily: 'inherit', fontSize: '0.68rem' },
  buttons: { display: 'flex', gap: '7px', marginTop: '12px' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '8px 12px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 12px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  calculationLabel: { display: 'block', marginTop: '10px', color: '#47576d', fontSize: '0.64rem' },
  hours: { display: 'block', color: '#1f2e45', fontSize: '1.45rem', margin: '5px 0 12px' },
  calculationDetail: { color: '#7c8da4', fontSize: '0.65rem', lineHeight: 1.45, borderTop: '1px solid #edf1f5', paddingTop: '10px' },
  total: { display: 'block', color: '#33445b', fontSize: '0.68rem', marginTop: '7px' },
  info: { margin: '14px 0 0', padding: '9px', borderLeft: '3px solid #4ba8ef', borderRadius: '5px', backgroundColor: '#edf7ff', color: '#4b78a5', fontSize: '0.6rem', lineHeight: 1.35 },
  evidenceCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', padding: '15px', marginTop: '14px' },
  dropZone: { minHeight: '80px', border: '2px dashed #bdcfe3', borderRadius: '9px', backgroundColor: '#f9fbfd', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#7f91a8', fontSize: '0.64rem', textAlign: 'center', cursor: 'pointer' },
  hiddenInput: { display: 'none' },
  fileButton: { color: '#35465d', backgroundColor: '#fff', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 10px', fontWeight: 700 },
};

export default RegistrarActividadDocente;
