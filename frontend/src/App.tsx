import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import './App.css';
import DecisionPage from './pages/slidingPages/DecisionPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

const AppContent = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return <Box sx={{ height: '100vh', width: '100vw' }} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Box sx={{ position: 'relative' }}>
              <Box
                onClick={logout}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '8px 16px',
                  backgroundColor: '#ff3e6b',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  zIndex: 10,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#ff1f4a',
                  },
                }}
              >
                Logout
              </Box>
              <DecisionPage />
            </Box>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
