import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../../utils/constants';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <h3 style={{ margin: 0 }}>PrácticaHub</h3>
      </div>
      <div style={styles.userInfo}>
        <span style={styles.userName}>{user?.nombre || user?.email}</span>
        <span style={styles.roleBadge}>
          {user?.rol === ROLES.SUPERVISOR ? 'DOCENTE' : 'ESTUDIANTE'}
        </span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '60px',
    backgroundColor: '#1f4e78',
    color: '#fff',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  brand: { display: 'flex', alignItems: 'center' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
  userName: { fontSize: '0.9rem', fontWeight: '500' },
  roleBadge: {
    fontSize: '0.75rem',
    backgroundColor: '#337ab7',
    padding: '3px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #fff',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};

export default Navbar;