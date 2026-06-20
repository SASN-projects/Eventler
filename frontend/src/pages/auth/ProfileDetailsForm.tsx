import type { FunctionComponent } from 'react';
import { CircularProgress, Stack } from '@mui/material';
import { FieldInput } from '../../components/inputs';
import { PrimeButton } from '../../components/buttons';
import { Form, TextButton } from './RegisterStyles';

interface ProfileDetailsFormProps {
  formData: any;
  loading: boolean;
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProfileDetailsForm: FunctionComponent<ProfileDetailsFormProps> = ({
  formData,
  loading,
  onChange,
  onBack,
  onSubmit,
}) => {
  return (
    <Form onSubmit={onSubmit}>
      <FieldInput
        label="City (Optional)"
        value={formData.city}
        isError={false}
        helperText=""
        type="text"
        onChange={(e) => onChange('city', e.target.value)}
      />
      <FieldInput
        label="Country (Optional)"
        value={formData.country}
        isError={false}
        helperText=""
        type="text"
        onChange={(e) => onChange('country', e.target.value)}
      />
      <FieldInput
        label="Date of Birth (Optional)"
        value={formData.dateOfBirth}
        isError={false}
        helperText=""
        type="date"
        onChange={(e) => onChange('dateOfBirth', e.target.value)}
      />
      <FieldInput
        label="Occupation (Optional)"
        value={formData.occupation}
        isError={false}
        helperText=""
        type="text"
        onChange={(e) => onChange('occupation', e.target.value)}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextButton fullWidth onClick={onBack} disabled={loading}>
          Back
        </TextButton>
      </Stack>
      <PrimeButton type="submit" fullWidth disabled={loading}>
        {loading ? <CircularProgress size={24} sx={{ color: 'inherit' }} /> : 'Complete registration'}
      </PrimeButton>
    </Form>
  );
};

export default ProfileDetailsForm;
