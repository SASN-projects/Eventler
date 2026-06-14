import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WorkIcon from '@mui/icons-material/Work';
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
  AuthStepText,
  AuthLinkText,
  AuthForm,
  AuthTextField,
  AuthButton,
  AuthOutlineButton,
} from '../../components/auth/AuthScreen';

const RegisterPage: FunctionComponent = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    country: '',
    dateOfBirth: '',
    occupation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const { [field]: removedError, ...rest } = errors;
      void removedError;
      setErrors(rest);
    }
  };

  const buildOptionalProfilePayload = () => {
    const payload: {
      city?: string;
      country?: string;
      dateOfBirth?: string;
      occupation?: string;
    } = {};

    if (formData.city.trim()) payload.city = formData.city.trim();
    if (formData.country.trim()) payload.country = formData.country.trim();
    if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
    if (formData.occupation.trim()) payload.occupation = formData.occupation.trim();

    return payload;
  };

  const submitRegistration = async (includeOptionalProfile: boolean) => {
    if (!validateForm()) {
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await register(
        formData.email,
        formData.firstName,
        formData.lastName,
        formData.password,
        formData.confirmPassword,
        includeOptionalProfile ? buildOptionalProfilePayload() : undefined,
      );
      navigate('/');
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Registration failed. Please try again.')
        : 'Registration failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setCurrentStep(2);
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRegistration(true);
  };

  return (
    <AuthPageBackground>
      <AuthPhoneFrame>
        <AuthPhoneNotch />
        <AuthHero>
          <AuthContent>
            <AuthTitle>Eventler</AuthTitle>
            <AuthStepText>{currentStep === 1 ? 'Create your account' : 'Complete your profile (optional)'}</AuthStepText>

            {errors.general && <Alert severity="error" sx={{ width: '100%' }}>{errors.general}</Alert>}

            {currentStep === 1 ? (
              <AuthForm onSubmit={handleContinueToProfile}>
                <AuthTextField
                  placeholder="First Name"
                  value={formData.firstName}
                  type="text"
                  icon={PersonIcon}
                  error={errors.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />

                <AuthTextField
                  placeholder="Last Name"
                  value={formData.lastName}
                  type="text"
                  icon={PersonIcon}
                  error={errors.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />

                <AuthTextField
                  placeholder="Email"
                  value={formData.email}
                  type="email"
                  icon={EmailIcon}
                  error={errors.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />

                <AuthTextField
                  placeholder="Password"
                  value={formData.password}
                  type="password"
                  icon={LockIcon}
                  error={errors.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />

                <AuthTextField
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  type="password"
                  icon={LockIcon}
                  error={errors.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />

                <AuthButton type="submit" disabled={loading}>
                  {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Continue'}
                </AuthButton>
              </AuthForm>
            ) : (
              <AuthForm onSubmit={handleCompleteRegistration}>
                <AuthTextField
                  placeholder="City"
                  value={formData.city}
                  type="text"
                  icon={LocationCityIcon}
                  onChange={(e) => handleChange('city', e.target.value)}
                />

                <AuthTextField
                  placeholder="Country"
                  value={formData.country}
                  type="text"
                  icon={PublicIcon}
                  onChange={(e) => handleChange('country', e.target.value)}
                />

                <AuthTextField
                  placeholder="Date of Birth"
                  value={formData.dateOfBirth}
                  type="date"
                  icon={CalendarMonthIcon}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                />

                <AuthTextField
                  placeholder="Occupation"
                  value={formData.occupation}
                  type="text"
                  icon={WorkIcon}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                />

                <Stack direction="row" spacing={2}>
                  <AuthOutlineButton type="button" onClick={() => setCurrentStep(1)} disabled={loading}>
                    Back
                  </AuthOutlineButton>
                  <AuthButton type="submit" disabled={loading}>
                    {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Finish'}
                  </AuthButton>
                </Stack>
              </AuthForm>
            )}

            <AuthLinkText>
              Already have an account?{' '}
              <span className="auth-link" onClick={() => navigate('/login')}>
                Login
              </span>
            </AuthLinkText>
          </AuthContent>
        </AuthHero>
        <AuthFooter />
      </AuthPhoneFrame>
    </AuthPageBackground>
  );
};

export default RegisterPage;