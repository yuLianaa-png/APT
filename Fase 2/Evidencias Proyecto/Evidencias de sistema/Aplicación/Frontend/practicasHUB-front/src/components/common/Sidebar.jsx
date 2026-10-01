import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const Sidebar = () => {
  const { user } = useAuth();
  const isEstudiante = user?.rol === ROLES.ESTUDIANTE;

  // Rutas del menú para el Estudiante
  const estudianteLinks = [
    { to: '/estudiante/dashboard', label: 'Inicio / Dashboard' },
    { to: '/estudiante/vinculacion', label: 'Mi Práctica' },
    { to: '/estudiante/bitacora', label: 'Bitácora de Horas' },
    { to: '/estudiante/documentos', label: 'Documentos' },
  ];

  // Rutas del menú para el Docente / Supervisor
  const docenteLinks = [
    { to: '/docente/dashboard', label: 'Inicio / Dashboard' },
    { to: '/docente/vinculacion', label: 'Códigos de Vinculación' },
    { to: '/docente/revisiones', label: 'Revisar Bitácoras' },
    { to: '/docente/documentos', label: 'Gestión Documental' },
    { to: '/docente/reportes', label: 'Reportes y PDF' },
  ];

  const links = isEstudiante ? estudianteLinks : docenteLinks;

  return (
    <aside style={styles.sidebar}>
      <nav style={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.activeLink : {}),
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: '#2c3e50',
    minHeight: 'calc(100vh - 60px)',
    padding: '20px 0',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '5px' },
  link: {
    padding: '12px 20px',
    color: '#ecf0f1',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
  activeLink: {
    backgroundColor: '#34495e',
    borderLeft: '4px solid #3498db',
    fontWeight: 'bold',
  },
};

export default Sidebar;