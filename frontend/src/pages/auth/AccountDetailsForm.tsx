import type { FunctionComponent } from 'react';
import { FieldInput } from '../../components/inputs';
import { PrimeButton } from '../../components/buttons';
import { Form } from './RegisterStyles';

interface AccountDetailsFormProps {
  formData: any;
  errors: Record<string, string>;
  loading: boolean;
  onChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AccountDetailsForm: FunctionComponent<AccountDetailsFormProps> = ({
  formData,
  errors,
  loading,
  onChange,
  onSubmit,
}) => {
  return (
    <Form onSubmit={onSubmit}>
      <FieldInput
        label="First Name"
        value={formData.firstName}
        isError={!!errors.firstName}
        helperText={errors.firstName || ''}
        type="text"
        onChange={(e) => onChange('firstName', e.target.value)}
      />
      <FieldInput
        label="Last Name"
        value={formData.lastName}
        isError={!!errors.lastName}
        helperText={errors.lastName || ''}
        type="text"
        onChange={(e) => onChange('lastName', e.target.value)}
      />
      <FieldInput
        label="Email"
        value={formData.email}
        isError={!!errors.email}
        helperText={errors.email || ''}
        type="email"
        onChange={(e) => onChange('email', e.target.value)}
      />
      <FieldInput
        label="Password"
        value={formData.password}
        isError={!!errors.password}
        helperText={errors.password || ''}
        type="password"
        onChange={(e) => onChange('password', e.target.value)}
      />
      <FieldInput
        label="Confirm Password"
        value={formData.confirmPassword}
        isError={!!errors.confirmPassword}
        helperText={errors.confirmPassword || ''}
        type="password"
        onChange={(e) => onChange('confirmPassword', e.target.value)}
      />
      <PrimeButton type="submit" fullWidth disabled={loading}>
        Continue
      </PrimeButton>
    </Form>
  );
};

export default AccountDetailsForm;
