import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FieldInput } from '../../components/inputs';
import { PrimeButton } from '../../components/buttons';

const LoginContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: '20px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
});

const FormContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  width: '100%',
  maxWidth: '400px',
  padding: '40px',
  borderRadius: '20px',
  backgroundColor: 'white',
  boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.1)',
});

const Title = styled(Typography)({
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '16px',
  textAlign: 'center',
  color: '#333',
});

const LinkText = styled(Typography)({
  textAlign: 'center',
  marginTop: '16px',
  color: '#666',
  fontSize: '14px',
  '& a': {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});

interface LoginPageProps {
  onNavigateToRegister?: () => void;
}

const LoginPage: FunctionComponent<LoginPageProps> = ({ onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <FormContainer>
        <Title>Login</Title>

        {errors.general && <Alert severity="error">{errors.general}</Alert>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <FieldInput
            label="Email"
            value={email}
            isError={!!errors.email}
            helperText={errors.email || ''}
            type="email"
            icon={EmailIcon}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                const { email: _, ...rest } = errors;
                setErrors(rest);
              }
            }}
          />

          <FieldInput
            label="Password"
            value={password}
            isError={!!errors.password}
            helperText={errors.password || ''}
            type="password"
            icon={LockIcon}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                const { password: _, ...rest } = errors;
                setErrors(rest);
              }
            }}
          />

          <PrimeButton type="submit" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Login'}
          </PrimeButton>
        </form>

        <LinkText>
          Don't have an account?{' '}
          <span
            onClick={() => {
              onNavigateToRegister?.();
              navigate('/register');
            }}
            style={{ cursor: 'pointer', color: '#667eea' }}
          >
            Sign up here
          </span>
        </LinkText>
      </FormContainer>
    </LoginContainer>
  );
};

export default LoginPage;
