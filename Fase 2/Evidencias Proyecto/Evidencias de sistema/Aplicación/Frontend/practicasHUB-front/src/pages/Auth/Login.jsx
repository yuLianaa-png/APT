import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { ROLES } from '../../utils/constants';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [perfil, setPerfil] = useState(ROLES.ESTUDIANTE); // 'ESTUDIANTE' o 'SUPERVISOR'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      // Enviamos credenciales al backend
      const data = await authService.login(email, password);
      
      // Guardar sesión en contexto
      login(data.user, data.token);

      // Redirigir según el rol retornado o seleccionado
      const userRol = data.user?.rol || perfil;
      if (userRol === ROLES.ESTUDIANTE) {
        navigate('/estudiante/dashboard');
      } else {
        navigate('/docente/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Credenciales inválidas. Inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Panel Izquierdo - Presentación */}
      <div style={styles.leftPanel}>
        <div style={styles.brandContainer}>
          <div style={styles.phBadge}>PH</div>
          <span style={styles.brandTitle}>PrácticaHub</span>
        </div>

        <div style={styles.heroContent}>
          <h1 style={styles.heroHeading}>
            Seguimiento de prácticas, en un solo lugar.
          </h1>
          <p style={styles.heroDescription}>
            Registra actividades, controla horas, administra evidencia y
            documentación, y mantén trazabilidad entre estudiantes y docentes.
          </p>
        </div>

        <div style={styles.heroFooter}>
          Plataforma web para seguimiento de práctica laboral y profesional.
        </div>
      </div>

      {/* Panel Derecho - Formulario de Inicio de Sesión */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.phBadgeSmall}>PH</div>
            <h2 style={styles.cardTitle}>Iniciar sesión</h2>
          </div>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Correo institucional</label>
              <input
                type="email"
                placeholder="usuario@institucion.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>

            {/* Selector de Perfil */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil</label>
              <div style={styles.profileSelector}>
                <button
                  type="button"
                  onClick={() => setPerfil(ROLES.ESTUDIANTE)}
                  style={{
                    ...styles.profileButton,
                    ...(perfil === ROLES.ESTUDIANTE ? styles.profileActive : {}),
                  }}
                >
                  Estudiante
                </button>
                <button
                  type="button"
                  onClick={() => setPerfil(ROLES.SUPERVISOR)}
                  style={{
                    ...styles.profileButton,
                    ...(perfil === ROLES.SUPERVISOR ? styles.profileActive : {}),
                  }}
                >
                  Docente
                </button>
              </div>
            </div>

            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>

            <p style={styles.cardFooter}>
              Acceso protegido por autenticación y roles.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },

  /* Left Panel Styles */
  leftPanel: {
    flex: 1,
    backgroundColor: '#193353',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '4rem 5rem',
    boxSizing: 'border-box',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  phBadge: {
    backgroundColor: '#0fb893',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '1.1rem',
    padding: '0.5rem 0.7rem',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  heroContent: {
    maxWidth: '520px',
  },
  heroHeading: {
    fontSize: '2.8rem',
    fontWeight: '700',
    lineHeight: '1.2',
    marginBottom: '1.8rem',
    color: '#ffffff',
  },
  heroDescription: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#a3b8cc',
    margin: 0,
  },
  heroFooter: {
    fontSize: '0.9rem',
    color: '#6e88a3',
  },

  /* Right Panel Styles */
  rightPanel: {
    flex: 1,
    backgroundColor: '#f2f5f9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    marginBottom: '2rem',
  },
  phBadgeSmall: {
    backgroundColor: '#0fb893',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '0.9rem',
    padding: '0.4rem 0.6rem',
    borderRadius: '8px',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0,
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    marginBottom: '1.2rem',
    backgroundColor: '#fff5f5',
    color: '#c53030',
    border: '1px solid #feb2b2',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
  formGroup: {
    marginBottom: '1.4rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    color: '#2d3748',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },

  /* Selector de Perfil */
  profileSelector: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '4px',
  },
  profileButton: {
    flex: 1,
    padding: '0.6rem 0',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#4a5568',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  profileActive: {
    backgroundColor: '#ffffff',
    color: '#1d6ee8',
    border: '2px solid #1d6ee8',
    boxShadow: '0 2px 4px rgba(29, 110, 232, 0.1)',
  },

  /* Botón Ingresar */
  submitButton: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#1d6ee8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  cardFooter: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.8rem',
    color: '#a0aec0',
    margin: '1.5rem 0 0 0',
  },
};

export default Login;