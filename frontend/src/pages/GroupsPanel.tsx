import React, { useEffect, useState, useContext } from 'react';
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
  Autocomplete,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../config/api';
import { PrimeButton } from '../components/buttons';
import { ParticipantAvatar, OverflowAvatar, HistoryCard } from './slidingPages/profile.styles';
import { AuthContext } from '../contexts/AuthContext';

type Member = {
  id: string;
  avatar?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};
type Group = { id: string; name: string; members?: Array<Member | string> };

const AvatarStack: React.FC<{ members: Member[] }> = ({ members }) => {
  const m = members || [];
  const visible = m.slice(0, 3);
  const extra = Math.max(0, m.length - visible.length);
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

const GroupCard: React.FC<{ group: Group; users?: Member[]; onOpen?: (id: string) => void }> = ({
  group,
  users,
  onOpen,
}) => {
  const membersRaw = group.members || [];
  const members = membersRaw.map((it) =>
    typeof it === 'string' ? users?.find((u) => u.id === it) || { id: it, name: it } : it,
  );
  return (
    <HistoryCard
      elevation={0}
      sx={{ p: 2, cursor: onOpen ? 'pointer' : 'default' }}
      onClick={() => onOpen && onOpen(group.id)}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {group.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {members.length} friends
          </Typography>
        </Box>
        <AvatarStack members={members} />
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
  const auth = useContext(AuthContext);
  const currentUser = auth?.user
    ? {
        id: auth.user.id,
        name: `${auth.user.firstName ?? ''} ${auth.user.lastName ?? ''}`.trim(),
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      }
    : null;
  const [users, setUsers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        if (!mounted) return;
        // Expecting array of groups with members
        setGroups(data || []);
        // load user list for member selection
        try {
          const ures = await api.get('/users');
          if (mounted) setUsers(ures.data || []);
        } catch (err) {
          // ignore
        }
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

  useEffect(() => {
    if (!createOpen || users.length > 0) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/users');
        if (!mounted) return;
        setUsers(data || []);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [createOpen, users.length]);

  const openGroup = async (id: string) => {
    setDetailOpen(true);
    setDetailGroup(null);
    try {
      const { data } = await api.get(`/groups/${id}`);
      // if members are IDs and we don't have users yet, try to load users
      if (
        Array.isArray(data?.members) &&
        data.members.length > 0 &&
        typeof data.members[0] === 'string' &&
        users.length === 0
      ) {
        try {
          const ures = await api.get('/users');
          setUsers(ures.data || []);
        } catch {
          // ignore
        }
      }
      setDetailGroup(data || null);
    } catch (err) {
      // fallback to local group if available
      const g = groups.find((x) => x.id === id) || null;
      setDetailGroup(g);
    }
  };

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
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(o) =>
                (o.name ?? `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim()) || o.username || o.id
              }
              value={selectedMembers}
              onChange={(_, v) => setSelectedMembers(v)}
              renderTags={(value: Member[], getTagProps) =>
                value.map((option: Member, index: number) => (
                  <Chip
                    label={
                      (option.name ?? `${option.firstName ?? ''} ${option.lastName ?? ''}`.trim()) || option.username
                    }
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
              renderOption={(props, option: Member) => (
                <li {...props} key={option.id}>
                  <Avatar src={option.avatar ?? undefined} sx={{ mr: 1, width: 32, height: 32 }}>
                    {!option.avatar && (option.name ?? option.firstName ?? option.username ?? '').slice(0, 2)}
                  </Avatar>
                  {(option.name ?? `${option.firstName ?? ''} ${option.lastName ?? ''}`.trim()) || option.username}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add members"
                  placeholder="Select users"
                  variant="outlined"
                  sx={{ bgcolor: 'white', borderRadius: 1 }}
                />
              )}
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
                  memberIds: selectedMembers.map((m) => m.id),
                });
                // backend returns created group; ensure UI shows members immediately (include current user)
                const created: Group = {
                  id: data?.id ?? `g_${Date.now()}`,
                  name: data?.name ?? newName.trim(),
                  members: data?.members ?? [...(currentUser ? [currentUser] : []), ...selectedMembers],
                };
                setGroups((prev) => [created, ...prev]);
                setCreateOpen(false);
                setNewName('');
                setNewDescription('');
                setSelectedMembers([]);
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
            <GroupCard key={g.id} group={g} users={users} onOpen={openGroup} />
          ))}
        </Box>
      )}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Group members</DialogTitle>
        <DialogContent>
          {detailGroup ? (
            <List>
              {(detailGroup.members || []).map((raw) => {
                const m: Member =
                  typeof raw === 'string' ? users.find((u) => u.id === raw) || { id: raw, name: raw } : raw;
                const display =
                  (m.name ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()) || m.username || m.id || '';
                return (
                  <ListItem key={m.id}>
                    <ListItemAvatar>
                      <Avatar src={m.avatar ?? undefined}>{!m.avatar && display.slice(0, 2)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={display} secondary={m.username ?? ''} />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography sx={{ py: 2 }}>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPanel;
