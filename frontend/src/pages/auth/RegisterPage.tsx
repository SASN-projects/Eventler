import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Button, Stack } from '@mui/material';
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
  marginBottom: '8px',
  fontFamily: 'Nunito, sans-serif',
  textShadow: '0 2px 12px rgba(120, 80, 180, 0.18)',
});

const StepLabel = styled(Typography)({
  fontSize: '13px',
  color: 'rgba(255,255,255,0.8)',
  fontWeight: 600,
  marginBottom: '20px',
  letterSpacing: '0.3px',
  fontFamily: 'Nunito, sans-serif',
});

/* ── Form wrapper ── */
const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  width: '100%',
  maxWidth: '320px',
});

const TextButton = styled(Button)({
  textTransform: 'none',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 600,
  fontFamily: 'Nunito, sans-serif',
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
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

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
    const payload: { city?: string; country?: string; dateOfBirth?: string; occupation?: string } = {};
    if (formData.city.trim()) payload.city = formData.city.trim();
    if (formData.country.trim()) payload.country = formData.country.trim();
    if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
    if (formData.occupation.trim()) payload.occupation = formData.occupation.trim();
    return payload;
  };

  const submitRegistration = async (includeOptionalProfile: boolean) => {
    if (!validateForm()) { setCurrentStep(1); return; }
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
      setErrors({ general: error?.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) setCurrentStep(2);
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRegistration(true);
  };

  return (
    <PageWrap>
      <AppTitle>Eventler</AppTitle>
      <StepLabel>
        {currentStep === 1 ? 'Step 1 of 2 · Account details' : 'Step 2 of 2 · Profile details'}
      </StepLabel>

      {errors.general && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: '320px', borderRadius: '12px' }}>
          {errors.general}
        </Alert>
      )}

      {currentStep === 1 ? (
        <Form onSubmit={handleContinueToProfile}>
          <FieldInput label="First Name" value={formData.firstName} isError={!!errors.firstName} helperText={errors.firstName || ''} type="text" onChange={(e) => handleChange('firstName', e.target.value)} />
          <FieldInput label="Last Name" value={formData.lastName} isError={!!errors.lastName} helperText={errors.lastName || ''} type="text" onChange={(e) => handleChange('lastName', e.target.value)} />
          <FieldInput label="Email" value={formData.email} isError={!!errors.email} helperText={errors.email || ''} type="email" onChange={(e) => handleChange('email', e.target.value)} />
          <FieldInput label="Password" value={formData.password} isError={!!errors.password} helperText={errors.password || ''} type="password" onChange={(e) => handleChange('password', e.target.value)} />
          <FieldInput label="Confirm Password" value={formData.confirmPassword} isError={!!errors.confirmPassword} helperText={errors.confirmPassword || ''} type="password" onChange={(e) => handleChange('confirmPassword', e.target.value)} />
          <PrimeButton type="submit" fullWidth disabled={loading}>
            Continue
          </PrimeButton>
        </Form>
      ) : (
        <Form onSubmit={handleCompleteRegistration}>
          <FieldInput label="City (Optional)" value={formData.city} isError={false} helperText="" type="text" onChange={(e) => handleChange('city', e.target.value)} />
          <FieldInput label="Country (Optional)" value={formData.country} isError={false} helperText="" type="text" onChange={(e) => handleChange('country', e.target.value)} />
          <FieldInput label="Date of Birth (Optional)" value={formData.dateOfBirth} isError={false} helperText="" type="date" onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
          <FieldInput label="Occupation (Optional)" value={formData.occupation} isError={false} helperText="" type="text" onChange={(e) => handleChange('occupation', e.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextButton fullWidth onClick={() => setCurrentStep(1)} disabled={loading}>
              Back
            </TextButton>
          </Stack>
          <PrimeButton type="submit" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Complete registration'}
          </PrimeButton>
        </Form>
      )}

      <FooterText>
        Already have an account?{' '}
        <LinkSpan onClick={() => navigate('/login')}>Log in here</LinkSpan>
      </FooterText>
    </PageWrap>
  );
};

export default RegisterPage;
