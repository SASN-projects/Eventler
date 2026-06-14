import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  AuthPageBackground,
  AuthPhoneFrame,
  AuthPhoneNotch,
  AuthHero,
  AuthFooter,
  AuthContent,
  AuthTitle,
  AuthForm,
  AuthTextField,
  AuthButton,
  AuthLinkText,
} from '../../components/auth/AuthScreen';

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
    <AuthPageBackground>
      <AuthPhoneFrame>
        <AuthPhoneNotch />
        <AuthHero>
          <AuthContent>
            <AuthTitle>Eventler</AuthTitle>

            {errors.general && <Alert severity="error" sx={{ width: '100%' }}>{errors.general}</Alert>}

            <AuthForm onSubmit={handleSubmit}>
              <AuthTextField
                placeholder="Username"
                value={email}
                type="text"
                icon={EmailIcon}
                error={errors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    const { email: _removedError, ...rest } = errors;
                    void _removedError;
                    setErrors(rest);
                  }
                }}
              />

              <AuthTextField
                placeholder="Password"
                value={password}
                type="password"
                icon={LockIcon}
                error={errors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    const { password: _removedError, ...rest } = errors;
                    void _removedError;
                    setErrors(rest);
                  }
                }}
              />

              <AuthButton type="submit" disabled={loading}>
                {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Log In'}
              </AuthButton>
            </AuthForm>

            <AuthLinkText>
              Don’t have an account?{' '}
              <span
                className="auth-link"
                onClick={() => {
                  onNavigateToRegister?.();
                  navigate('/register');
                }}
              >
                Register
              </span>
            </AuthLinkText>
          </AuthContent>
        </AuthHero>
        <AuthFooter />
      </AuthPhoneFrame>
    </AuthPageBackground>
  );
};

export default LoginPage;
