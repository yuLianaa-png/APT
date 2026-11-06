import { createContext, useState, useContext } from 'react';
import { ROLES, STORAGE_KEYS } from '../utils/constants';

export const AuthContext = createContext(null);

const getStoredSession = () => {
  const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
  const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

  if (!storedUser || !storedToken) {
    return {
      user: {
        id: 1,
        nombre: 'Estudiante Demo',
        email: 'estudiante@practicahub.cl',
        rol: ROLES.ESTUDIANTE,
        isDemo: true,
      },
      token: 'demo-token',
    };
  }

  try {
    return { user: JSON.parse(storedUser), token: storedToken };
  } catch {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    return { user: null, token: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(getStoredSession);

  const login = (userData, jwtToken) => {
    setSession({ user: userData, token: jwtToken });
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.TOKEN, jwtToken);
  };

  const logout = () => {
    setSession({ user: null, token: null });
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  };

  return (
    <AuthContext.Provider value={{
      ...session,
      loading: false,
      login,
      logout,
      isAuthenticated: !!session.token,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};