import { Button, styled } from "@mui/material";

export const PrimeButton = styled(Button)(() => ({
    minWidth: '160px',
    maxWidth: '400px',
    fontSize: '16px',
    color: '#ffffff',
    borderRadius: '16px',
    paddingInline: '30px',
    paddingBlock: '10px',
    textTransform: 'none',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(255, 88, 118, 0.28)',
    background: 'linear-gradient(135deg, var(--eventler-primary) 0%, var(--eventler-secondary) 100%)',
    '&:hover': {
        boxShadow: '0 12px 28px rgba(255, 88, 118, 0.34)',
        filter: 'brightness(1.02)',
    },
    '&.Mui-disabled': {
        color: 'rgba(255,255,255,0.72)',
        background: 'linear-gradient(135deg, rgba(255, 88, 118, 0.42) 0%, rgba(109, 114, 232, 0.42) 100%)',
        boxShadow: 'none',
    },
}));
