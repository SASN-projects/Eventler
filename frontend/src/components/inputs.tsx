import { InputAdornment, TextField, type SvgIconTypeMap } from "@mui/material";
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

export const FieldInput: FunctionComponent<FieldInputProps> = ({ label, value, isError, helperText, type, icon: Icon, onChange }) => (
    <TextField
        {...{ label, type, value, onChange }}
        error={isError}
        helperText={isError && helperText}
        fullWidth
        slotProps={{
            inputLabel: type === 'date' ? { shrink: true } : undefined,
            input: Icon ? {
                startAdornment: (
                    <InputAdornment position="start">
                        <Icon />
                    </InputAdornment>
                ),
            } : undefined,
        }}
        sx={{
            '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                backgroundColor: 'white',
                fontFamily: 'Nunito, sans-serif',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: '2px solid rgba(120,80,200,0.4)' },
            },
            '& .MuiInputLabel-root': {
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 600,
                color: '#999',
                '&.Mui-focused': { color: 'rgba(120,80,200,0.8)' },
            },
            '& .MuiInputBase-input': {
                fontFamily: 'Nunito, sans-serif',
            },
        }}
    />
);