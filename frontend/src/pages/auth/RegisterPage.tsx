import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WorkIcon from '@mui/icons-material/Work';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { FieldInput } from '../../components/inputs';
import { PrimeButton } from '../../components/buttons';

const RegisterContainer = styled(Box)({
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
  maxHeight: '90vh',
  overflowY: 'auto',
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

const StepHint = styled(Typography)({
  textAlign: 'center',
  color: '#666',
  marginTop: '-8px',
  marginBottom: '8px',
  fontSize: '14px',
});

const TextButton = styled(Button)({
  textTransform: 'none',
  color: '#666',
  fontWeight: 600,
});

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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

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
      const { [field]: _, ...rest } = errors;
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

    if (formData.city.trim()) {
      payload.city = formData.city.trim();
    }

    if (formData.country.trim()) {
      payload.country = formData.country.trim();
    }

    if (formData.dateOfBirth) {
      payload.dateOfBirth = formData.dateOfBirth;
    }

    if (formData.occupation.trim()) {
      payload.occupation = formData.occupation.trim();
    }

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
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Registration failed. Please try again.';
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
    <RegisterContainer>
      <FormContainer>
        <Title>Create Account</Title>
        <StepHint>
          {currentStep === 1 ? 'Step 1 of 2: Account details' : 'Step 2 of 2: Optional profile details'}
        </StepHint>

        {errors.general && <Alert severity="error">{errors.general}</Alert>}

        {currentStep === 1 ? (
          <form onSubmit={handleContinueToProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <FieldInput
              label="First Name"
              value={formData.firstName}
              isError={!!errors.firstName}
              helperText={errors.firstName || ''}
              type="text"
              icon={PersonIcon}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />

            <FieldInput
              label="Last Name"
              value={formData.lastName}
              isError={!!errors.lastName}
              helperText={errors.lastName || ''}
              type="text"
              icon={PersonIcon}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />

            <FieldInput
              label="Email"
              value={formData.email}
              isError={!!errors.email}
              helperText={errors.email || ''}
              type="email"
              icon={EmailIcon}
              onChange={(e) => handleChange('email', e.target.value)}
            />

            <FieldInput
              label="Password"
              value={formData.password}
              isError={!!errors.password}
              helperText={errors.password || ''}
              type="password"
              icon={LockIcon}
              onChange={(e) => handleChange('password', e.target.value)}
            />

            <FieldInput
              label="Confirm Password"
              value={formData.confirmPassword}
              isError={!!errors.confirmPassword}
              helperText={errors.confirmPassword || ''}
              type="password"
              icon={LockIcon}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />

            <PrimeButton type="submit" fullWidth disabled={loading}>
              Continue
            </PrimeButton>
          </form>
        ) : (
          <form onSubmit={handleCompleteRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FieldInput
              label="City (Optional)"
              value={formData.city}
              isError={false}
              helperText=""
              type="text"
              icon={LocationCityIcon}
              onChange={(e) => handleChange('city', e.target.value)}
            />

            <FieldInput
              label="Country (Optional)"
              value={formData.country}
              isError={false}
              helperText=""
              type="text"
              icon={PublicIcon}
              onChange={(e) => handleChange('country', e.target.value)}
            />

            <FieldInput
              label="Date of Birth (Optional)"
              value={formData.dateOfBirth}
              isError={false}
              helperText=""
              type="date"
              icon={CalendarMonthIcon}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            />

            <FieldInput
              label="Occupation (Optional)"
              value={formData.occupation}
              isError={false}
              helperText=""
              type="text"
              icon={WorkIcon}
              onChange={(e) => handleChange('occupation', e.target.value)}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextButton
                fullWidth
                onClick={() => setCurrentStep(1)}
                disabled={loading}
              >
                Back
              </TextButton>
            </Stack>

            <PrimeButton type="submit" fullWidth disabled={loading}>
              {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Complete registration'}
            </PrimeButton>
          </form>
        )}

        <LinkText>
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            style={{ cursor: 'pointer', color: '#667eea' }}
          >
            Log in here
          </span>
        </LinkText>
      </FormContainer>
    </RegisterContainer>
  );
};

export default RegisterPage;
