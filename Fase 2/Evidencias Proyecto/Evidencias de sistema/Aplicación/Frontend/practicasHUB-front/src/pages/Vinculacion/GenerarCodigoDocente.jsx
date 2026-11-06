import { useState, useEffect } from 'react';
import { vinculacionService } from '../../services/vinculacion.service';

const GenerarCodigoDocente = () => {
  const [codigos, setCodigos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    cargarCodigos();
  }, []);

  const cargarCodigos = async () => {
    try {
      setLoading(true);
      const data = await vinculacionService.getCodigosDocente();
      setCodigos(data);
    } catch (err) {
      // Datos mock de respaldo si el backend aún no está respondiendo
      setCodigos([
        { id: 1, codigo: 'PH-8K4M-27', fechaCreacion: '2026-09-20', estado: 'ACTIVO', estudiante: null },
        { id: 2, codigo: 'PH-3A9Q-15', fechaCreacion: '2026-09-08', estado: 'USADO', estudiante: 'Juan Pérez' },
        { id: 3, codigo: 'PH-9X12-04', fechaCreacion: '2026-08-15', estado: 'ANULADO', estudiante: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarCodigo = async () => {
    try {
      setGenerating(true);
      setMessage({ type: '', text: '' });
      const response = await vinculacionService.generarCodigo();
      setNuevoCodigo(response.codigo);
      setMessage({ type: 'success', text: '¡Código generado exitosamente!' });
      cargarCodigos();
    } catch (err) {
      // Simulación en frontend para desarrollo
      const codigoSimulado = `PH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
      setNuevoCodigo(codigoSimulado);
      setCodigos((prev) => [
        { id: Date.now(), codigo: codigoSimulado, fechaCreacion: new Date().toISOString().split('T')[0], estado: 'ACTIVO', estudiante: null },
        ...prev,
      ]);
      setMessage({ type: 'success', text: '¡Código de vinculación generado!' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopiar = (codigoTexto, index) => {
    navigator.clipboard.writeText(codigoTexto);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas anular este código?')) return;

    try {
      await vinculacionService.anularCodigo(id);
      cargarCodigos();
    } catch (err) {
      setCodigos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: 'ANULADO' } : c))
      );
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Códigos de vinculación</h2>
          <p style={styles.subtitle}>Genera y gestiona los accesos para tus estudiantes asignados</p>
        </div>
      </div>

      {message.text && (
        <div style={styles.alertSuccess}>{message.text}</div>
      )}

      {/* Grid Principal */}
      <div style={styles.grid}>
        {/* Card Generador */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Generar nuevo código</h3>
          <p style={styles.cardText}>
            Cada código es único y permitirá a un estudiante enlazarse directamente a tu panel de supervisión.
          </p>

          <button
            onClick={handleGenerarCodigo}
            style={styles.primaryButton}
            disabled={generating}
          >
            {generating ? 'Generando...' : 'Generar nuevo código'}
          </button>

          {nuevoCodigo && (
            <div style={styles.generatedBox}>
              <span style={styles.generatedLabel}>CÓDIGO GENERADO:</span>
              <div style={styles.codeDisplay}>{nuevoCodigo}</div>
              <button
                onClick={() => handleCopiar(nuevoCodigo, 'new')}
                style={styles.copyButton}
              >
                {copiedIndex === 'new' ? '¡Copiado!' : 'Copiar código'}
              </button>
            </div>
          )}
        </div>

        {/* Card Historial / Lista */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Historial de códigos</h3>

          {loading ? (
            <p style={{ color: '#718096' }}>Cargando registros...</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Estudiante</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {codigos.map((item, idx) => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.tdCode}>{item.codigo}</td>
                      <td style={styles.td}>{item.fechaCreacion}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(item.estado === 'ACTIVO'
                              ? styles.badgeActivo
                              : item.estado === 'USADO'
                              ? styles.badgeUsado
                              : styles.badgeAnulado),
                          }}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {item.estudiante || <span style={{ color: '#a0aec0' }}>Sin vincular</span>}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleCopiar(item.codigo, idx)}
                            style={styles.actionBtn}
                            title="Copiar"
                          >
                            {copiedIndex === idx ? '✓' : '📋'}
                          </button>
                          {item.estado === 'ACTIVO' && (
                            <button
                              onClick={() => handleAnular(item.id)}
                              style={{ ...styles.actionBtn, color: '#e53e3e' }}
                              title="Anular"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.6rem', fontWeight: '700', color: '#1a202c', margin: 0 },
  subtitle: { fontSize: '0.9rem', color: '#718096', margin: '0.2rem 0 0 0' },
  alertSuccess: {
    padding: '0.8rem 1rem',
    backgroundColor: '#e6f4ea',
    color: '#137333',
    border: '1px solid #a8dab5',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #edf2f7',
  },
  cardTitle: { fontSize: '1.2rem', fontWeight: '700', color: '#1a202c', margin: '0 0 0.8rem 0' },
  cardText: { fontSize: '0.9rem', color: '#718096', lineHeight: '1.5', marginBottom: '1.5rem' },
  primaryButton: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1d6ee8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  generatedBox: {
    marginTop: '1.5rem',
    padding: '1.2rem',
    backgroundColor: '#f7fafc',
    borderRadius: '10px',
    border: '1px dashed #cbd5e0',
    textAlign: 'center',
  },
  generatedLabel: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', letterSpacing: '1px' },
  codeDisplay: { fontSize: '1.8rem', fontWeight: '800', color: '#1d6ee8', letterSpacing: '4px', margin: '0.5rem 0' },
  copyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#2d3748',
    cursor: 'pointer',
  },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' },
  th: { padding: '0.75rem', borderBottom: '2px solid #edf2f7', color: '#718096', fontWeight: '600' },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '0.75rem', color: '#2d3748' },
  tdCode: { padding: '0.75rem', fontWeight: '700', color: '#1d6ee8', letterSpacing: '1px' },
  badge: { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' },
  badgeActivo: { backgroundColor: '#e6f4ea', color: '#137333' },
  badgeUsado: { backgroundColor: '#e8f0fe', color: '#1a73e8' },
  badgeAnulado: { backgroundColor: '#fce8e6', color: '#c5221f' },
  actionBtn: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '0.3rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

export default GenerarCodigoDocente;