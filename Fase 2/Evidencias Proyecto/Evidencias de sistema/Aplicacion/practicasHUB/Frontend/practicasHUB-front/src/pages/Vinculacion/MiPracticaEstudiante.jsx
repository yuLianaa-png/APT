import { useState, useEffect } from 'react';
import { vinculacionService } from '../../services/vinculacion.service';

const MiPracticaEstudiante = () => {
  const [codigo, setCodigo] = useState('');
  const [vinculacion, setVinculacion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar información de la vinculación activa al montar la pantalla
  useEffect(() => {
    cargarVinculacion();
  }, []);

  const cargarVinculacion = async () => {
    try {
      setLoading(true);
      const data = await vinculacionService.getVinculacionActual();
      setVinculacion(data);
    } catch (err) {
      // Si no tiene vinculación activa, simulamos o dejamos el estado en null
      console.log('Sin vinculación activa actualmente.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa un código de vinculación.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      
      // Llamada al backend
      const data = await vinculacionService.vincularConCodigo(codigo.trim());
      setVinculacion(data);
      setCodigo('');
      setMessage({ type: 'success', text: '¡Te has vinculado exitosamente con tu docente!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Código inválido o no encontrado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header de la sección */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Mi práctica</h2>
          <p style={styles.subtitle}>Vinculación con el docente responsable</p>
        </div>
        <span style={styles.badgePropuesta}>Propuesta visual</span>
      </div>

      {message.text && (
        <div
          style={{
            ...styles.alertMessage,
            backgroundColor: message.type === 'error' ? '#fde8e8' : '#e6f4ea',
            color: message.type === 'error' ? '#c53030' : '#137333',
            border: `1px solid ${message.type === 'error' ? '#f8b4b4' : '#a8dab5'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Grid Principal Superior */}
      <div style={styles.topGrid}>
        {/* Card 1: Formulario Vincular */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Vincular docente guía</h3>
          <p style={styles.cardText}>
            Ingresa el código único que te proporcionó tu docente. Al vincularte, podrás compartir tus registros y acceder a los documentos que publique.
          </p>

          <form onSubmit={handleVincular} style={{ marginTop: '1.5rem' }}>
            <label style={styles.label}>Código de vinculación</label>
            <input
              type="text"
              placeholder="PH-8K4M-27"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              style={styles.codeInput}
              disabled={submitting}
            />

            <div style={styles.buttonGroup}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={submitting}
              >
                {submitting ? 'Vinculando...' : 'Vincular docente'}
              </button>
              <button
                type="button"
                onClick={() => setCodigo('')}
                style={styles.secondaryButton}
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div style={styles.infoBanner}>
            Solo podrás acceder a la información asociada al docente con el que estés vinculado.
          </div>
        </div>

        {/* Card 2: Vinculación Actual */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Vinculación actual</h3>

          {loading ? (
            <p style={{ color: '#718096' }}>Cargando información...</p>
          ) : vinculacion ? (
            <div>
              <div style={styles.docenteInfo}>
                <div style={styles.avatarCircle}>
                  {vinculacion.docenteNombre
                    ? vinculacion.docenteNombre
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                    : 'CP'}
                </div>
                <div>
                  <div style={styles.docenteNombre}>
                    {vinculacion.docenteNombre || 'Carolina Pérez'}
                  </div>
                  <div style={styles.docenteRol}>Docente guía</div>
                </div>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Estado</span>
                <span style={styles.statusBadgeActive}>
                  {vinculacion.estado || 'Activa'}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Código utilizado</span>
                <span style={styles.detailValue}>
                  {vinculacion.codigoUtilizado || 'PH-3A9Q-15'}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Fecha de vinculación</span>
                <span style={styles.detailValue}>
                  {vinculacion.fechaVinculacion || '08/09/2026'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem 0', color: '#718096' }}>
              Aún no tienes un docente vinculado. Ingresa el código proporcionado por tu profesor.
            </div>
          )}
        </div>
      </div>

      {/* Card Inferior: ¿Qué habilita esta vinculación? */}
      <div style={{ ...styles.card, marginTop: '1.5rem' }}>
        <h3 style={styles.cardTitle}>¿Qué habilita esta vinculación?</h3>

        <div style={styles.featuresGrid}>
          <div style={styles.featureBox}>
            El docente puede revisar tus actividades y horas registradas.
          </div>
          <div style={styles.featureBox}>
            Puedes descargar documentos o plantillas publicados por tu docente.
          </div>
          <div style={styles.featureBox}>
            El docente puede acceder a los archivos que entregues dentro de la plataforma.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  title: { fontSize: '1.6rem', fontWeight: '700', color: '#1a202c', margin: 0 },
  subtitle: { fontSize: '0.9rem', color: '#718096', margin: '0.2rem 0 0 0' },
  badgePropuesta: {
    backgroundColor: '#e6f4ea',
    color: '#137333',
    padding: '0.4rem 0.8rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  alertMessage: {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #edf2f7',
  },
  cardTitle: { fontSize: '1.2rem', fontWeight: '700', color: '#1a202c', margin: '0 0 0.8rem 0' },
  cardText: { fontSize: '0.9rem', color: '#718096', lineHeight: '1.5', margin: 0 },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', marginBottom: '0.5rem' },
  codeInput: {
    width: '100%',
    padding: '0.9rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1.4rem',
    fontWeight: '700',
    letterSpacing: '6px',
    textAlign: 'center',
    color: '#2d3748',
    boxSizing: 'border-box',
    marginBottom: '1.2rem',
    outline: 'none',
  },
  buttonGroup: { display: 'flex', gap: '0.8rem', marginBottom: '1.5rem' },
  primaryButton: {
    padding: '0.75rem 1.4rem',
    backgroundColor: '#1d6ee8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.75rem 1.4rem',
    backgroundColor: '#ffffff',
    color: '#4a5568',
    border: '1px solid #cbd5e0',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  infoBanner: {
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    borderLeft: '4px solid #3182ce',
  },

  /* Card Vinculación Actual */
  docenteInfo: { display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.2rem', borderBottom: '1px solid #edf2f7', marginBottom: '1.2rem' },
  avatarCircle: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#2b6cb0',
    fontWeight: '700',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docenteNombre: { fontWeight: '700', fontSize: '1rem', color: '#2d3748' },
  docenteRol: { fontSize: '0.85rem', color: '#718096' },
  detailRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' },
  detailLabel: { fontSize: '0.85rem', color: '#718096', fontWeight: '600' },
  detailValue: { fontSize: '0.95rem', color: '#2d3748', fontWeight: '500' },
  statusBadgeActive: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '700',
  },

  /* Features Grid */
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' },
  featureBox: {
    backgroundColor: '#f7fafc',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#4a5568',
    lineHeight: '1.4',
    borderLeft: '4px solid #3182ce',
  },
};

export default MiPracticaEstudiante;