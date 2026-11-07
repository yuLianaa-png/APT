import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const NuevaActividadEstudiante = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fecha: '2026-09-20',
    tipoJornada: 'Presencial',
    inicio: '09:00',
    termino: '17:30',
    descanso: '00:30',
    actividad: 'Pruebas funcionales del módulo de postulaciones',
    descripcion: 'Se ejecutaron casos de prueba funcionales y se registraron incidencias detectadas durante el proceso.',
  });
  const [evidencia, setEvidencia] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const totalMinutes = useMemo(() => {
    const start = toMinutes(form.inicio);
    const end = toMinutes(form.termino);
    const breakMinutes = toBreakMinutes(form.descanso);
    return Math.max(0, end - start - breakMinutes);
  }, [form.inicio, form.termino, form.descanso]);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSaved(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('La evidencia debe ser un archivo PDF, JPG o PNG.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('La evidencia no puede superar los 2 MB.');
      event.target.value = '';
      return;
    }

    setEvidencia(file);
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const start = toMinutes(form.inicio);
    const end = toMinutes(form.termino);

    if (!form.fecha || !form.actividad.trim() || !form.descripcion.trim()) {
      setError('Completa la fecha, actividad y descripción antes de guardar.');
      return;
    }

    if (end <= start) {
      setError('La hora de término debe ser posterior a la hora de inicio.');
      return;
    }

    if (totalMinutes <= 0 || totalMinutes > 10 * 60) {
      setError('La jornada debe tener una duración válida de hasta 10 horas.');
      return;
    }

    const registro = {
      id: Date.now(),
      ...form,
      horas: totalMinutes / 60,
      evidencia: evidencia?.name || null,
      estado: 'PENDIENTE',
    };
    const registrosGuardados = JSON.parse(
      localStorage.getItem('practicahub_actividades') || '[]',
    );
    localStorage.setItem(
      'practicahub_actividades',
      JSON.stringify([registro, ...registrosGuardados]),
    );
    localStorage.setItem('practicahub_ultima_actividad', JSON.stringify(registro));
    setSaved(true);
    setError('');
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Nuevo registro</h1>
          <p style={styles.subtitle}>Registra una jornada y adjunta evidencia</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      {saved && <div style={styles.successMessage}>Registro guardado correctamente en modo demostración.</div>}
      {error && <div style={styles.errorMessage}>{error}</div>}

      <div style={styles.topGrid}>
        <form style={styles.formCard} onSubmit={handleSubmit}>
          <h2 style={styles.sectionTitle}>Nuevo registro de actividad</h2>
          <div style={styles.formGrid}>
            <Field label="Fecha">
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Tipo de jornada">
              <select name="tipoJornada" value={form.tipoJornada} onChange={handleChange} style={styles.input}>
                <option>Presencial</option>
                <option>Remota</option>
                <option>Híbrida</option>
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
              <Field label="Actividad realizada">
                <input name="actividad" value={form.actividad} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
            <div style={styles.fullField}>
              <Field label="Descripción">
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} style={styles.textarea} rows="3" />
              </Field>
            </div>
          </div>
          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton}>Guardar registro</button>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/dashboard')}>Cancelar</button>
          </div>
        </form>

        <aside style={styles.calculationCard}>
          <h2 style={styles.sectionTitle}>Cálculo automático</h2>
          <span style={styles.calculationLabel}>Duración de jornada</span>
          <strong style={styles.hoursValue}>{totalHours} h{remainingMinutes ? ` ${remainingMinutes} min` : ''}</strong>
          <p style={styles.calculationDetail}>
            {form.termino} - {form.inicio} = {Math.floor(Math.max(0, toMinutes(form.termino) - toMinutes(form.inicio)) / 60)} h {Math.max(0, toMinutes(form.termino) - toMinutes(form.inicio)) % 60} min
            <br />
            Descanso: {formatBreak(form.descanso)}
          </p>
          <strong style={styles.totalValid}>Total válido: {totalHours} h{remainingMinutes ? ` ${remainingMinutes} min` : ''}</strong>
          <p style={styles.warning}>El sistema valida horarios inconsistentes, superposición de registros y fechas no permitidas.</p>
        </aside>
      </div>

      <section style={styles.evidenceCard}>
        <h2 style={styles.sectionTitle}>Evidencia de la actividad</h2>
        <label style={styles.dropZone}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={styles.hiddenInput} />
          <strong>{evidencia ? evidencia.name : 'Arrastra archivos aquí o selecciónalos desde tu equipo'}</strong>
          <span>Imágenes, PDF u otros archivos permitidos por la configuración del sistema</span>
          <span style={styles.fileButton}>Seleccionar archivo</span>
          {evidencia && <small>{formatFileSize(evidencia.size)} · archivo válido</small>}
        </label>
      </section>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={styles.field}>
    <span style={styles.label}>{label}</span>
    {children}
  </label>
);

const toMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
};

const toBreakMinutes = (value) => {
  if (!value) return 0;
  return toMinutes(value);
};

const formatBreak = (value) => {
  const minutes = toBreakMinutes(value);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const formatFileSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  successMessage: { padding: '10px 12px', borderRadius: '7px', marginBottom: '12px', backgroundColor: '#e4f7f1', color: '#147c61', fontSize: '0.72rem' },
  errorMessage: { padding: '10px 12px', borderRadius: '7px', marginBottom: '12px', backgroundColor: '#fff0ee', color: '#be3b31', border: '1px solid #ffd1cd', fontSize: '0.72rem' },
  topGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(270px, 0.85fr)', gap: '14px' },
  formCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  calculationCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  sectionTitle: { margin: '0 0 10px', color: '#27364d', fontSize: '0.82rem' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' },
  fullField: { gridColumn: '1 / -1' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { color: '#47576d', fontSize: '0.62rem', fontWeight: 700 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 9px', color: '#35465d', backgroundColor: '#fff', fontSize: '0.68rem', outline: 'none' },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontFamily: 'inherit', fontSize: '0.68rem', outline: 'none' },
  buttonRow: { display: 'flex', gap: '7px', marginTop: '12px' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '8px 12px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 12px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  calculationLabel: { display: 'block', color: '#47576d', fontSize: '0.64rem' },
  hoursValue: { display: 'block', color: '#1f2e45', fontSize: '1.45rem', margin: '5px 0 12px' },
  calculationDetail: { color: '#7c8da4', fontSize: '0.65rem', lineHeight: 1.45, borderTop: '1px solid #edf1f5', paddingTop: '10px' },
  totalValid: { display: 'block', color: '#33445b', fontSize: '0.68rem', marginTop: '7px' },
  warning: { margin: '14px 0 0', padding: '9px', borderLeft: '3px solid #f1b32b', borderRadius: '5px', backgroundColor: '#fff5df', color: '#8a691c', fontSize: '0.6rem', lineHeight: 1.35 },
  evidenceCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px', marginTop: '14px' },
  dropZone: { minHeight: '80px', border: '2px dashed #bdcfe3', borderRadius: '9px', backgroundColor: '#f9fbfd', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#7f91a8', fontSize: '0.64rem', textAlign: 'center', cursor: 'pointer' },
  hiddenInput: { display: 'none' },
  fileButton: { color: '#35465d', backgroundColor: '#fff', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 10px', fontWeight: 700 },
};

export default NuevaActividadEstudiante;
