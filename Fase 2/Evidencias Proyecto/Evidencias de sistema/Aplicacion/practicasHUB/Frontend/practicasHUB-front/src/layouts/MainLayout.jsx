import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';

/**
 * Disposición del **nivel general**: antes de elegir un grupo (§2.2).
 *
 * El `Sidebar` sin la prop `grupo` muestra el menú general. Dentro de un grupo se usa
 * `LayoutGrupo`, que además carga el contexto y pinta el banner.
 */
const MainLayout = () => (
  <div className="ph-armazon">
    <Navbar />
    <div className="ph-marco">
      <Sidebar />
      <main className="ph-marco__contenido">
        <Outlet />
      </main>
    </div>
  </div>
);

export default MainLayout;
