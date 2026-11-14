import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ETIQUETAS } from '../../utils/constants';
import { MENU_GENERAL, menuDeGrupo, salidaDeGrupo } from '../../routes/navegacion';


const Sidebar = ({ grupo = null }) => {
  const { usuario } = useAuth();
  const rol = usuario?.rol;

  const enGrupo = Boolean(grupo);
  const enlaces = enGrupo ? menuDeGrupo(rol, grupo.id) : (MENU_GENERAL[rol] ?? []);
  const salida = salidaDeGrupo(rol);

  return (
    <aside className="ph-lateral">
      <p className="ph-lateral__nivel">
        {enGrupo ? 'Práctica seleccionada' : `Vista ${ETIQUETAS.ROLES[rol] ?? ''}`}
      </p>

      <nav className="ph-lateral__nav" aria-label={enGrupo ? 'Secciones de la práctica' : 'Secciones generales'}>
        {enlaces.map((enlace) => (
          <NavLink
            key={enlace.a}
            to={enlace.a}
            className={({ isActive }) => `ph-lateral__enlace${isActive ? ' ph-lateral__enlace--activo' : ''}`}
          >
            {enlace.etiqueta}
          </NavLink>
        ))}
      </nav>

      {enGrupo && (
        <div className="ph-lateral__salida">
          <NavLink to={salida.a} className="ph-lateral__enlace ph-lateral__enlace--salida">
            ← {salida.etiqueta}
          </NavLink>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
