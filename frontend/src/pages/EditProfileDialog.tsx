import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import type { ChangeEvent, FunctionComponent } from 'react';
import type { User } from './slidingPages/profile.types';
import { PrimeButton } from '../components/buttons';

interface EditProfileDialogProps {
  user: User;
  open: boolean;
  onSave: () => void;
  onClose: () => void;
  onChange: (field: keyof User) => (e: ChangeEvent<HTMLInputElement>) => void;
}

const EditProfileDialog: FunctionComponent<EditProfileDialogProps> = ({ open, onClose, user, onChange, onSave }) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #fffaf6 0%, #f6fbff 100%)',
        boxShadow: '0 10px 30px rgba(16,24,40,0.08)',
      },
    }}
  >
    <DialogTitle sx={{ fontWeight: 800, pb: 1, color: '#3b3054' }}>Edit Profile Details</DialogTitle>
    <DialogContent>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <TextField
          label="Username"
          value={user.username || ''}
          onChange={onChange('username')}
          fullWidth
          size="small"
          variant="outlined"
          sx={{ bgcolor: 'white', borderRadius: 1 }}
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="First Name"
            value={user.firstName}
            onChange={onChange('firstName')}
            fullWidth
            size="small"
            variant="outlined"
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />
          <TextField
            label="Last Name"
            value={user.lastName}
            onChange={onChange('lastName')}
            fullWidth
            size="small"
            variant="outlined"
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />
        </Stack>
        <TextField
          label="Email"
          value={user.email}
          onChange={onChange('email')}
          fullWidth
          size="small"
          variant="outlined"
          sx={{ bgcolor: 'white', borderRadius: 1 }}
        />
        <Stack direction="row" spacing={2}>
          <TextField
            label="City"
            value={user.city || ''}
            onChange={onChange('city')}
            fullWidth
            size="small"
            variant="outlined"
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />
          <TextField
            label="Country"
            value={user.country || ''}
            onChange={onChange('country')}
            fullWidth
            size="small"
            variant="outlined"
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />
        </Stack>
        <TextField
          label="Date of Birth"
          value={user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : ''}
          onChange={onChange('dateOfBirth')}
          type="date"
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
          variant="outlined"
          sx={{ bgcolor: 'white', borderRadius: 1 }}
        />
        <TextField
          label="Occupation"
          value={user.occupation || ''}
          onChange={onChange('occupation')}
          fullWidth
          size="small"
          variant="outlined"
          sx={{ bgcolor: 'white', borderRadius: 1 }}
        />
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 700 }}>
        Cancel
      </Button>
      <PrimeButton onClick={onSave} sx={{ textTransform: 'none', borderRadius: '12px', fontWeight: 700, px: 3 }}>
        Save Changes
      </PrimeButton>
    </DialogActions>
  </Dialog>
);

export default EditProfileDialog;
