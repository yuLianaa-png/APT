import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const demoRecord = {
  id: 'correction-demo',
  fecha: '2026-09-20',
  tipoJornada: 'Presencial',
  inicio: '09:00',
  termino: '17:00',
  descanso: '00:30',
  actividad: 'Actualización documentación',
  descripcion: 'Se actualizó la documentación del módulo y se preparó la evidencia correspondiente.',
  horas: 7.5,
  evidencia: 'documentacion.png',
  estado: 'OBSERVADO',
  observacion: 'Completa la descripción con el detalle de las tareas realizadas y adjunta la evidencia actualizada.',
  revisadoPor: 'Docente Guía',
  estudianteNombre: 'Estudiante Demo',
};

const CorregirActividadEstudiante = () => {
  const navigate = useNavigate();
  const [record, setRecord] = useState(loadObservedRecord);
  const [form, setForm] = useState(() => recordToForm(loadObservedRecord()));
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
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setMessage({ type: 'error', text: 'La evidencia debe ser PDF, JPG o PNG.' });
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La evidencia no puede superar los 2 MB.' });
      event.target.value = '';
      return;
    }
    setEvidencia(file);
    setMessage({ type: '', text: '' });
  };

  const handleResubmit = (event) => {
    event.preventDefault();
    if (!form.fecha || !form.actividad.trim() || !form.descripcion.trim()) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios antes de reenviar.' });
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

    const updated = {
      ...record,
      ...form,
      horas: totalMinutes / 60,
      evidencia: evidencia?.name || record.evidencia || null,
      estado: 'PENDIENTE',
      observacion: '',
      reenviadoEn: new Date().toISOString(),
    };
    persistRecord(updated);
    setRecord(updated);
    setMessage({ type: 'success', text: 'Registro corregido y reenviado al docente para revisión.' });
  };

  if (!record) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Corregir registro</h1>
            <p style={styles.subtitle}>Revisa las observaciones del docente</p>
          </div>
          <span style={styles.visualBadge}>Propuesta visual</span>
        </header>
        <section style={styles.emptyCard}>
          <h2 style={styles.sectionTitle}>No hay registros observados</h2>
          <p style={styles.muted}>Cuando un docente devuelva un registro, podrás corregirlo desde aquí.</p>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/bitacora')}>Volver a la bitácora</button>
        </section>
      </div>
    );
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Corregir registro</h1>
          <p style={styles.subtitle}>Lee las observaciones, actualiza la información y reenvía la actividad</p>
        </div>
        <span style={styles.visualBadge}>Propuesta visual</span>
      </header>

      {message.text && <div style={message.type === 'error' ? styles.error : styles.success}>{message.text}</div>}

      <div style={styles.grid}>
        <form style={styles.card} onSubmit={handleResubmit}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.sectionTitle}>{record.actividad}</h2>
              <p style={styles.sectionSubtitle}>Registro observado por {record.revisadoPor || 'el docente'}</p>
            </div>
            <span style={styles.observedBadge}>Observado</span>
          </div>
          <div style={styles.formGrid}>
            <Field label="Fecha"><input name="fecha" type="date" value={form.fecha} onChange={handleChange} style={styles.input} /></Field>
            <Field label="Tipo de jornada">
              <select name="tipoJornada" value={form.tipoJornada} onChange={handleChange} style={styles.input}>
                <option>Presencial</option><option>Remota</option><option>Híbrida</option>
              </select>
            </Field>
            <Field label="Hora de inicio"><input name="inicio" type="time" value={form.inicio} onChange={handleChange} style={styles.input} /></Field>
            <Field label="Hora de término"><input name="termino" type="time" value={form.termino} onChange={handleChange} style={styles.input} /></Field>
            <Field label="Descanso / colación"><input name="descanso" type="time" value={form.descanso} onChange={handleChange} style={styles.input} /></Field>
            <div style={styles.fullField}><Field label="Actividad"><input name="actividad" value={form.actividad} onChange={handleChange} style={styles.input} /></Field></div>
            <div style={styles.fullField}><Field label="Descripción"><textarea name="descripcion" rows="4" value={form.descripcion} onChange={handleChange} style={styles.textarea} /></Field></div>
          </div>
          <div style={styles.buttons}>
            <button type="submit" style={styles.primaryButton}>Reenviar a revisión</button>
            <button type="button" style={styles.secondaryButton} onClick={() => navigate('/estudiante/bitacora')}>Cancelar</button>
          </div>
        </form>

        <aside style={styles.sideColumn}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Observación del docente</h2>
            <p style={styles.observation}>{record.observacion}</p>
            <span style={styles.reviewer}>Revisado por {record.revisadoPor || 'Docente Guía'}</span>
          </section>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Cálculo automático</h2>
            <strong style={styles.hours}>{hours} h{minutes ? ` ${minutes} min` : ''}</strong>
            <p style={styles.calculationDetail}>Horas válidas después del descanso de {formatBreak(form.descanso)}.</p>
          </section>
        </aside>
      </div>

      <section style={styles.evidenceCard}>
        <h2 style={styles.sectionTitle}>Evidencia actualizada</h2>
        <label style={styles.dropZone}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={styles.hiddenInput} />
          <strong>{evidencia ? evidencia.name : record.evidencia || 'Adjunta una nueva evidencia si corresponde'}</strong>
          <span>PDF, JPG o PNG · máximo 2 MB</span>
          <span style={styles.fileButton}>Seleccionar archivo</span>
        </label>
      </section>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>
);
const recordToForm = (record) => record ? ({
  fecha: record.fecha || '',
  tipoJornada: record.tipoJornada || 'Presencial',
  inicio: record.inicio || '09:00',
  termino: record.termino || '17:00',
  descanso: record.descanso || '00:30',
  actividad: record.actividad || '',
  descripcion: record.descripcion || '',
}) : {
  fecha: '', tipoJornada: 'Presencial', inicio: '09:00', termino: '17:00', descanso: '00:30', actividad: '', descripcion: '',
};
const loadObservedRecord = () => {
  const student = JSON.parse(localStorage.getItem('practicahub_actividades') || '[]');
  const teacher = JSON.parse(localStorage.getItem('practicahub_actividades_docente') || '[]');
  return [...student, ...teacher].find((item) => item.estado === 'OBSERVADO') || demoRecord;
};
const persistRecord = (record) => {
  const key = record.autor === 'DOCENTE' ? 'practicahub_actividades_docente' : 'practicahub_actividades';
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
const formatBreak = (value) => `${Math.floor(toMinutes(value) / 60)} h ${toMinutes(value) % 60} min`;

const styles = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', color: '#24344d' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  title: { margin: 0, fontSize: '1.55rem', lineHeight: 1.1, color: '#1d2c43' },
  subtitle: { margin: '3px 0 0', color: '#8190a5', fontSize: '0.75rem' },
  visualBadge: { backgroundColor: '#e4f7f3', color: '#1a9b88', borderRadius: '14px', padding: '6px 16px', fontSize: '0.68rem', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(270px, 0.85fr)', gap: '14px' },
  sideColumn: { display: 'grid', gap: '14px', alignContent: 'start' },
  card: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '15px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' },
  sectionTitle: { margin: 0, color: '#27364d', fontSize: '0.82rem' },
  sectionSubtitle: { margin: '5px 0 0', color: '#8391a4', fontSize: '0.65rem' },
  observedBadge: { alignSelf: 'flex-start', backgroundColor: '#ffe5e2', color: '#c83d32', borderRadius: '12px', padding: '4px 8px', fontSize: '0.56rem', fontWeight: 700 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' },
  fullField: { gridColumn: '1 / -1' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { color: '#47576d', fontSize: '0.62rem', fontWeight: 700 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 9px', color: '#35465d', backgroundColor: '#fff', fontSize: '0.68rem' },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '8px 9px', color: '#35465d', backgroundColor: '#fff', fontFamily: 'inherit', fontSize: '0.68rem' },
  buttons: { display: 'flex', gap: '7px', marginTop: '12px' },
  primaryButton: { border: 0, borderRadius: '6px', padding: '8px 12px', backgroundColor: '#1d72dc', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d5e0ec', borderRadius: '6px', padding: '7px 12px', backgroundColor: '#fff', color: '#35465d', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  observation: { margin: '12px 0 10px', padding: '10px', borderLeft: '3px solid #f1b32b', borderRadius: '5px', backgroundColor: '#fff5df', color: '#70591d', fontSize: '0.68rem', lineHeight: 1.45 },
  reviewer: { color: '#8190a5', fontSize: '0.6rem' },
  hours: { display: 'block', margin: '12px 0 5px', color: '#1f2e45', fontSize: '1.45rem' },
  calculationDetail: { margin: 0, color: '#7c8da4', fontSize: '0.65rem', lineHeight: 1.4 },
  evidenceCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', padding: '15px', marginTop: '14px' },
  dropZone: { minHeight: '80px', border: '2px dashed #bdcfe3', borderRadius: '9px', backgroundColor: '#f9fbfd', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#7f91a8', fontSize: '0.64rem', textAlign: 'center', cursor: 'pointer' },
  hiddenInput: { display: 'none' },
  fileButton: { color: '#35465d', backgroundColor: '#fff', border: '1px solid #d5e0ec', borderRadius: '6px', padding: '6px 10px', fontWeight: 700 },
  success: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#e4f7f1', color: '#147c61', fontSize: '0.68rem' },
  error: { padding: '9px 12px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#fff0ee', color: '#be3b31', fontSize: '0.68rem' },
  emptyCard: { backgroundColor: '#fff', border: '1px solid #e1e8f0', borderRadius: '11px', padding: '40px', textAlign: 'center' },
  muted: { color: '#8190a5', fontSize: '0.7rem', margin: '10px 0 18px' },
};

export default CorregirActividadEstudiante;
