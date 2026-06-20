import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PageWrap = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100%',
  padding: '32px 24px',
  background: 'linear-gradient(160deg, #b8c8f0 0%, #c9aee8 45%, #f0bcd4 100%)',
  backgroundAttachment: 'fixed',
  boxSizing: 'border-box',
});

export const AppTitle = styled(Typography)({
  fontSize: '42px',
  fontWeight: 900,
  color: 'white',
  letterSpacing: '-0.5px',
  marginBottom: '8px',
  fontFamily: 'Nunito, sans-serif',
  textShadow: '0 2px 12px rgba(120, 80, 180, 0.18)',
});

export const StepLabel = styled(Typography)({
  fontSize: '13px',
  color: 'rgba(255,255,255,0.8)',
  fontWeight: 600,
  marginBottom: '20px',
  letterSpacing: '0.3px',
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
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 600,
  fontFamily: 'Nunito, sans-serif',
});

export const FooterText = styled(Typography)({
  marginTop: '20px',
  color: 'rgba(60,40,80,0.75)',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'Nunito, sans-serif',
});

export const LinkSpan = styled('span')({
  color: '#5b6fd6',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif',
  '&:hover': { textDecoration: 'underline' },
});
export default Form;
