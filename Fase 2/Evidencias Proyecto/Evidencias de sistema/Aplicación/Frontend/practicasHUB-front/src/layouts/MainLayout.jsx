import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';

const MainLayout = () => {
  return (
    <div style={styles.layout}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
    padding: '25px',
    backgroundColor: '#f4f6f9',
    overflowY: 'auto',
    minWidth: 0,
  },
};

export default MainLayout;