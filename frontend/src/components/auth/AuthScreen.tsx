import { Button, Box, TextField, Typography, InputAdornment, styled } from '@mui/material';
import type { ChangeEventHandler, HTMLInputTypeAttribute, FunctionComponent } from 'react';
import type { OverridableComponent } from '@mui/material/OverridableComponent';
import type { SvgIconTypeMap } from '@mui/material/SvgIcon';

export const AuthPageBackground = styled(Box)({
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  background: 'linear-gradient(90deg, #bfd4ff 0%, #cbbef0 52%, #d7c3f3 100%)',
  boxSizing: 'border-box',
  '@media (max-width: 480px)': {
    padding: '0',
  },
});

export const AuthPhoneFrame = styled(Box)({
  position: 'relative',
  width: 'min(100%, 420px)',
  height: 'min(100dvh, 860px)',
  borderRadius: '18px',
  border: '2px solid #2a2a2a',
  overflow: 'hidden',
  background: '#ffffff',
  boxShadow: '0 18px 48px rgba(25, 25, 40, 0.22)',
  boxSizing: 'border-box',
  '@media (max-width: 480px)': {
    width: '100%',
    height: '100dvh',
    border: 'none',
    borderRadius: '0',
    boxShadow: 'none',
  },
});

export const AuthPhoneNotch = styled(Box)({
  position: 'absolute',
  top: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '88px',
  height: '24px',
  background: '#000000',
  borderBottomLeftRadius: '18px',
  borderBottomRightRadius: '18px',
  zIndex: 3,
});

export const AuthHero = styled(Box)({
  position: 'relative',
  minHeight: 'calc(100% - 118px)',
  background: 'linear-gradient(180deg, #bfd4ff 0%, #d1bef0 54%, #d9c4f4 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 28px 40px',
  boxSizing: 'border-box',
});

export const AuthFooter = styled(Box)({
  height: '118px',
  background: '#ffffff',
});

export const AuthContent = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '18px',
});

export const AuthTitle = styled(Typography)({
  color: '#ffffff',
  textAlign: 'center',
  fontSize: 'clamp(2.4rem, 7vw, 3rem)',
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: '-0.04em',
  textShadow: '0 2px 12px rgba(255, 255, 255, 0.18)',
  marginBottom: '12px',
});

export const AuthStepText = styled(Typography)({
  textAlign: 'center',
  color: '#2f3558',
  fontSize: '0.92rem',
  marginTop: '-8px',
});

export const AuthLinkText = styled(Typography)({
  color: '#2c2f39',
  fontSize: '1rem',
  textAlign: 'center',
  '& .auth-link': {
    color: '#3b42f6',
    fontWeight: 700,
    cursor: 'pointer',
  },
});

export const AuthSecondaryText = styled(Typography)({
  color: '#2c2f39',
  fontSize: '1rem',
  textAlign: 'center',
});

export const AuthForm = styled('form')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
});

export const AuthField = styled(TextField)({
  width: '100%',
  '& .MuiInputBase-root': {
    minHeight: '56px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 16px rgba(84, 95, 171, 0.18)',
    overflow: 'hidden',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 1)',
    borderWidth: '1px',
  },
  '& .MuiInputBase-input': {
    paddingTop: '16px',
    paddingBottom: '16px',
    color: '#2f2f3f',
    fontSize: '1rem',
  },
  '& .MuiInputAdornment-root': {
    color: '#6d6f7f',
  },
  '& .MuiFormHelperText-root': {
    marginLeft: '6px',
  },
});

interface AuthFieldProps {
  placeholder: string;
  value: string;
  type: HTMLInputTypeAttribute;
  icon: OverridableComponent<SvgIconTypeMap>;
  error?: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export const AuthTextField: FunctionComponent<AuthFieldProps> = ({
  placeholder,
  value,
  type,
  icon: Icon,
  error,
  onChange,
}) => (
  <AuthField
    variant="outlined"
    placeholder={placeholder}
    value={value}
    type={type}
    onChange={onChange}
    error={!!error}
    helperText={error}
    slotProps={{
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <Icon />
          </InputAdornment>
        )
      },
    }}
  />
);

export const AuthButton = styled(Button)({
  width: '100%',
  minHeight: '52px',
  borderRadius: '14px',
  textTransform: 'none',
  fontSize: '1.02rem',
  fontWeight: 500,
  color: '#ff4f72',
  background: 'linear-gradient(90deg, #f7d3e7 0%, #f7efb6 100%)',
  boxShadow: '0 8px 18px rgba(43, 28, 75, 0.24)',
  '&:hover': {
    background: 'linear-gradient(90deg, #f4c8df 0%, #f5e69f 100%)',
    boxShadow: '0 10px 22px rgba(43, 28, 75, 0.28)',
  },
});

export const AuthOutlineButton = styled(Button)({
  width: '100%',
  minHeight: '44px',
  borderRadius: '14px',
  textTransform: 'none',
  fontSize: '0.98rem',
  fontWeight: 600,
  color: '#2f3558',
  background: 'rgba(255, 255, 255, 0.72)',
  boxShadow: '0 8px 16px rgba(84, 95, 171, 0.12)',
  border: '1px solid rgba(255, 255, 255, 0.85)',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.86)',
    border: '1px solid rgba(255, 255, 255, 0.95)',
  },
});
