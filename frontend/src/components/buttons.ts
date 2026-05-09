import { Button, styled } from "@mui/material";

export const PrimeButton = styled(Button)(() => ({
    minWidth: '200px',
    maxWidth: '400px',
    fontSize: '20px',
    color: '#ff3e6b',
    borderRadius: '15px',
    paddingInline: '30px',
    textTransform: 'none',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    background: 'linear-gradient(to right, #FFD1DC, #FDFD96)',
}));
