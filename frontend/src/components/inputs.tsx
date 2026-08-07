import { TextField, type SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import type { ChangeEventHandler, FunctionComponent, HTMLInputTypeAttribute } from "react";

interface FieldInputProps {
    label: string;
    value: unknown;
    isError: boolean;
    helperText: string;
    type: HTMLInputTypeAttribute;
    icon?: OverridableComponent<SvgIconTypeMap>;
    onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export const FieldInput: FunctionComponent<FieldInputProps> = ({ label, value, isError, helperText, type, onChange }) => (
    <TextField
        variant="filled"
        {...{ label, type, value, onChange }}
        error={isError}
        helperText={isError && helperText}
        fullWidth
        slotProps={{
            inputLabel: type === 'date' ? { shrink: true } : undefined,
        }}
        sx={{
            '& .MuiFilledInput-root': {
                borderRadius: '16px',
                backgroundColor: 'white',
                fontFamily: 'Nunito, sans-serif',
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(85, 73, 145, 0.12)',
                border: '1px solid rgba(255,255,255,0.62)',
                '&::before': { display: 'none' },
                '&::after': { display: 'none' },
                '&:hover': { backgroundColor: 'white' },
                '&.Mui-focused': { backgroundColor: 'white' },
            },
            '& .MuiInputLabel-root': {
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 600,
                color: 'var(--eventler-muted)',
                '&.Mui-focused': { color: 'var(--eventler-secondary)' },
            },
            '& .MuiInputBase-input': {
                fontFamily: 'Nunito, sans-serif',
                color: 'var(--eventler-text)',
            },
        }}
    />
);
