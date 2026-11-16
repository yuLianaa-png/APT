import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ETIQUETAS } from '../../utils/constants';
import { Boton } from '../ui';


 //Barra superior con la identidad de quien ha entrado y Cerrar sesión.
 
const Navbar = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();

  const salir = () => {
    cerrarSesion();
    // `replace` para que el botón Atrás no reabra el panel con la sesión ya cerrada.
    navegar('/login', { replace: true });
  };

  return (
    <header className="ph-navbar">
      <div className="ph-navbar__marca">
        <span className="ph-navbar__sigla" aria-hidden="true">PH</span>
        <strong>PrácticasHub</strong>
      </div>

      <div className="ph-navbar__sesion">
        <span className="ph-navbar__nombre">{usuario?.nombre ?? usuario?.correo}</span>
        <span className="ph-navbar__rol">{ETIQUETAS.ROLES[usuario?.rol] ?? ''}</span>
        <Boton variante="secundario" tamano="pequeno" onClick={salir}>
          Cerrar sesión
        </Boton>
      </div>
    </header>
  );
};

export default Navbar;
