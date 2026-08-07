import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PageWrap = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  width: '100vw',
  padding: '32px 24px',
  background: 'var(--eventler-gradient)',
  backgroundAttachment: 'fixed',
  boxSizing: 'border-box',
});

export const AppTitle = styled(Typography)({
  fontSize: '42px',
  fontWeight: 900,
  color: 'white',
  letterSpacing: 0,
  marginBottom: '8px',
  fontFamily: 'Nunito, sans-serif',
  textShadow: '0 8px 24px rgba(39, 49, 66, 0.18)',
});

export const StepLabel = styled(Typography)({
  fontSize: '13px',
  color: 'rgba(255,255,255,0.86)',
  fontWeight: 800,
  marginBottom: '20px',
  letterSpacing: 0,
  fontFamily: 'Nunito, sans-serif',
});

export const Form = styled('form')({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  width: '100%',
  maxWidth: '320px',
});

export const TextButton = styled(Button)({
  textTransform: 'none',
  color: 'rgba(255,255,255,0.9)',
  fontWeight: 800,
  fontFamily: 'Nunito, sans-serif',
});

export const FooterText = styled(Typography)({
  marginTop: '20px',
  color: 'rgba(255,255,255,0.86)',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'Nunito, sans-serif',
});

export const LinkSpan = styled('span')({
  color: '#ffffff',
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif',
  textDecorationColor: 'rgba(255,255,255,0.55)',
  '&:hover': { textDecoration: 'underline' },
});
export default Form;
