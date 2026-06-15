import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FieldInput } from '../../components/inputs';
import { PrimeButton } from '../../components/buttons';

/* ── Background ── */
const PageWrap = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100dvh',
  overflow: 'hidden',
  padding: '32px 24px',
  background: 'linear-gradient(160deg, #b8c8f0 0%, #c9aee8 45%, #f0bcd4 100%)',
  boxSizing: 'border-box',
  overflowY: 'auto',
});

/* ── App title ── */
const AppTitle = styled(Typography)({
  fontSize: '42px',
  fontWeight: 900,
  color: 'white',
  letterSpacing: '-0.5px',
  marginBottom: '40px',
  fontFamily: 'Nunito, sans-serif',
  textShadow: '0 2px 12px rgba(120, 80, 180, 0.18)',
});

/* ── Form wrapper ── */
const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  width: '100%',
  maxWidth: '320px',
});

/* ── Footer link text ── */
const FooterText = styled(Typography)({
  marginTop: '20px',
  color: 'rgba(60,40,80,0.75)',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'Nunito, sans-serif',
});

const LinkSpan = styled('span')({
  color: '#5b6fd6',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif',
  '&:hover': { textDecoration: 'underline' },
});

/* ─────────────────────────────────────────── */

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrors({ general: 'Please fill in all fields.' });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.message || 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrap>
      <AppTitle>Eventler</AppTitle>

      {errors.general && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: '320px', borderRadius: '12px' }}>
          {errors.general}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <FieldInput
          label="Email"
          value={email}
          isError={!!errors.email}
          helperText={errors.email || ''}
          type="email"
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
      </Form>

      <FooterText>
        Don't have an account?{' '}
        <LinkSpan
          onClick={() => {
            onNavigateToRegister?.();
            navigate('/register');
          }}
        >
          Sign up here
        </LinkSpan>
      </FooterText>
    </PageWrap>
  );
};

export default LoginPage;
