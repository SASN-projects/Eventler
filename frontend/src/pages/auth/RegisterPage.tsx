import type { FunctionComponent } from 'react';
import { useState } from 'react';
import { Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PageWrap, AppTitle, StepLabel, FooterText, LinkSpan } from './RegisterStyles';
import AccountDetailsForm from './AccountDetailsForm';
import ProfileDetailsForm from './ProfileDetailsForm';
import PreferencesSetup from './PreferencesSetup';

const RegisterPage: FunctionComponent = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    city: '', country: '', dateOfBirth: '', occupation: '',
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

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { setCurrentStep(1); return; }
    setLoading(true);
    setErrors({});
    try {
      const payload: any = {};
      if (formData.city.trim()) payload.city = formData.city.trim();
      if (formData.country.trim()) payload.country = formData.country.trim();
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.occupation.trim()) payload.occupation = formData.occupation.trim();

      await register(formData.email, formData.firstName, formData.lastName, formData.password, formData.confirmPassword, payload);
      setCurrentStep(3);
    } catch (error: any) {
      setErrors({ general: error?.response?.data?.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrap>
      <AppTitle>Eventler</AppTitle>
      <StepLabel>
        {currentStep === 1 && 'Step 1 of 3 · Account details'}
        {currentStep === 2 && 'Step 2 of 3 · Profile details'}
        {currentStep === 3 && 'Step 3 of 3 · Customizing recommendations'}
      </StepLabel>

      {errors.general && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: '320px', borderRadius: '12px' }}>
          {errors.general}
        </Alert>
      )}

      {currentStep === 1 && (
        <AccountDetailsForm formData={formData} errors={errors} loading={loading} onChange={handleChange} onSubmit={(e) => { e.preventDefault(); if (validateForm()) setCurrentStep(2); }} />
      )}
      {currentStep === 2 && (
        <ProfileDetailsForm formData={formData} loading={loading} onChange={handleChange} onBack={() => setCurrentStep(1)} onSubmit={submitRegistration} />
      )}
      {currentStep === 3 && (
        <PreferencesSetup onComplete={() => navigate('/')} />
      )}

      {currentStep !== 3 && (
        <FooterText>
          Already have an account?{' '}
          <LinkSpan onClick={() => navigate('/login')}>Log in here</LinkSpan>
        </FooterText>
      )}
    </PageWrap>
  );
};

export default RegisterPage;
