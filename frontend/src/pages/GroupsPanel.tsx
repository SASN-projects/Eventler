import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../config/api';
import { PrimeButton } from '../components/buttons';
import { ParticipantAvatar, OverflowAvatar, HistoryCard } from './slidingPages/profile.styles';

type Member = { id: string; avatar?: string | null; name: string };
type Group = { id: string; name: string; members: Member[] };

const AvatarStack: React.FC<{ members: Member[] }> = ({ members }) => {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', position: 'relative', width: 80, mr: 1.5 }}>
        {visible.map((m, i) => (
          <ParticipantAvatar
            key={m.id}
            src={m.avatar ?? undefined}
            sx={{ position: 'relative', left: i * -10, zIndex: 10 - i }}
          >
            {!m.avatar && m.name
              ? m.name
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
              : null}
          </ParticipantAvatar>
        ))}
        {extra > 0 && (
          <OverflowAvatar sx={{ position: 'relative', left: visible.length * -10, zIndex: 1 }}>+{extra}</OverflowAvatar>
        )}
      </Box>
    </Box>
  );
};

const GroupCard: React.FC<{ group: Group }> = ({ group }) => {
  return (
    <HistoryCard elevation={0} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {group.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {group.members.length} friends
          </Typography>
        </Box>
        <AvatarStack members={group.members} />
      </Stack>
    </HistoryCard>
  );
};

const GroupsPanel: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        if (!mounted) return;
        // Expecting array of groups with members
        setGroups(data || []);
      } catch (err) {
        // fallback mock data when API unavailable
        if (!mounted) return;
        setGroups([
          {
            id: '1',
            name: 'The Gang',
            members: [
              { id: 'm1', name: 'Alice', avatar: null },
              { id: 'm2', name: 'Bob', avatar: null },
              { id: 'm3', name: 'Carol', avatar: null },
              { id: 'm4', name: 'Dan', avatar: null },
              { id: 'm5', name: 'Eve', avatar: null },
              { id: 'm6', name: 'Frank', avatar: null },
              { id: 'm7', name: 'Grace', avatar: null },
              { id: 'm8', name: 'Heidi', avatar: null },
            ],
          },
          {
            id: '2',
            name: 'Homies',
            members: [
              { id: 'm9', name: 'Ivy' },
              { id: 'm10', name: 'Justin' },
            ],
          },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGroups();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <PrimeButton startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create New Group
        </PrimeButton>
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #fff6fb 0%, #f0f4ff 100%)',
            boxShadow: '0 10px 30px rgba(16,24,40,0.08)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: 'transparent', fontWeight: 800, color: '#3b3054' }}>Create New Group</DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Group name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              required
              variant="outlined"
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
            <TextField
              label="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              variant="outlined"
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              You can add members later from group details.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <PrimeButton
            onClick={async () => {
              if (!newName.trim()) return;
              setCreating(true);
              try {
                const { data } = await api.post('/groups', {
                  name: newName.trim(),
                  description: newDescription.trim(),
                });
                // backend returns created group
                setGroups((prev) => [data, ...prev]);
                setCreateOpen(false);
                setNewName('');
                setNewDescription('');
              } catch (err) {
                console.error('Failed to create group', err);
                // TODO: show error UI
              } finally {
                setCreating(false);
              }
            }}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </PrimeButton>
        </DialogActions>
      </Dialog>
      {loading ? (
        <Typography align="center" sx={{ pt: 4 }}>
          Loading groups...
        </Typography>
      ) : groups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '24px', border: '1px dashed rgba(0,0,0,0.12)' }}>
          You have not created or joined any groups yet.
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GroupsPanel;
