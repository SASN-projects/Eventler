import { InputAdornment, TextField, type SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import type { ChangeEventHandler, FunctionComponent, HTMLInputTypeAttribute } from "react";

interface FieldInputProps {
    label: string;
    value: unknown;
    isError: boolean;
    helperText: string;
    type: HTMLInputTypeAttribute;
    icon: OverridableComponent<SvgIconTypeMap>;
    onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export const FieldInput: FunctionComponent<FieldInputProps> = ({ label, value, isError, helperText, type, icon: Icon, onChange }) => (
    <TextField
        {...{ label, type, value, onChange }}
        error={isError}
        helperText={isError && helperText}
        slotProps={{
            inputLabel: type === 'date' ? { shrink: true } : undefined,
            input: {
                startAdornment: (
                    <InputAdornment position="start">
                        <Icon />
                    </InputAdornment>
                ),
            }
        }}
    />
);