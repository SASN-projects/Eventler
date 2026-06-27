import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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

type Group = {
  id: string;
  name: string;
  description?: string;
  createdById?: string;
  members?: Array<Member | string>;
};

const getMemberName = (member: Member) =>
  (member.name ?? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()) || member.username || member.id;

const getInitials = (member: Member) =>
  getMemberName(member)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const normalizeGroup = (group: Group): Group => ({
  ...group,
  members: group.members ?? [],
  description: group.description ?? '',
});

const normalizeMembers = (members: Array<Member | string> | undefined, users: Member[]) =>
  (members ?? []).map((member) => {
    if (typeof member !== 'string') {
      return member;
    }

    return users.find((user) => user.id === member) ?? { id: member, name: member };
  });

const mergeMembersById = (...memberGroups: Array<Array<Member | null | undefined>>) => {
  const membersById = new Map<string, Member>();

  memberGroups.flat().forEach((member) => {
    if (member?.id && !membersById.has(member.id)) {
      membersById.set(member.id, member);
    }
  });

  return Array.from(membersById.values());
};

const AvatarStack: React.FC<{ members: Member[] }> = ({ members }) => {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: 72, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', position: 'relative', width: 62, height: 26 }}>
        {visible.map((member, index) => (
          <ParticipantAvatar
            key={member.id}
            src={member.avatar ?? undefined}
            sx={{ position: 'absolute', left: index * 18, zIndex: 10 - index }}
          >
            {!member.avatar ? getInitials(member) : null}
          </ParticipantAvatar>
        ))}
        {extra > 0 && (
          <OverflowAvatar sx={{ position: 'absolute', left: visible.length * 18, zIndex: 1 }}>+{extra}</OverflowAvatar>
        )}
      </Box>
    </Box>
  );
};

const GroupCard: React.FC<{ group: Group; users: Member[]; onOpen: (id: string) => void }> = ({
  group,
  users,
  onOpen,
}) => {
  const members = normalizeMembers(group.members, users);

  return (
    <HistoryCard
      elevation={0}
      sx={{ p: 2, mb: 0, width: '100%', minHeight: 96, boxSizing: 'border-box', cursor: 'pointer' }}
      onClick={() => onOpen(group.id)}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 72px',
          alignItems: 'center',
          columnGap: 2,
          width: '100%',
          justifyItems: 'stretch',
        }}
      >
        <Box sx={{ minWidth: 0, width: '100%', justifySelf: 'start', textAlign: 'left' }}>
          <Typography variant="h6" sx={{ display: 'block', fontWeight: 700, textAlign: 'left' }} noWrap>
            {group.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', textAlign: 'left' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Typography>
        </Box>
        <AvatarStack members={members} />
      </Box>
    </HistoryCard>
  );
};

const GroupsPanel: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [creating, setCreating] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMembers, setEditMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const auth = useContext(AuthContext);
  const currentUser = auth?.user
    ? {
        id: auth.user.id,
        name: `${auth.user.firstName ?? ''} ${auth.user.lastName ?? ''}`.trim(),
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      }
    : null;

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/users');
    setUsers(data ?? []);
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/groups');
      setGroups((data ?? []).map(normalizeGroup));
    } catch (err) {
      console.error('Failed to fetch groups', err);
      setError('Could not load groups right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadUsers().catch((err) => console.error('Failed to fetch users', err));
  }, [loadGroups, loadUsers]);

  const resetCreateForm = () => {
    setNewName('');
    setNewDescription('');
    setSelectedMembers([]);
  };

  const getCreatorMember = (group: Group | null) => {
    if (!group?.createdById) return null;

    return (
      normalizeMembers(group.members, users).find((member) => member.id === group.createdById) ??
      users.find((user) => user.id === group.createdById) ??
      (currentUser?.id === group.createdById ? currentUser : null)
    );
  };

  const openGroup = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailGroup(null);
    setEditing(false);
    setError('');

    try {
      const { data } = await api.get(`/groups/${id}`);
      const group = normalizeGroup(data);
      setDetailGroup(group);
      setEditName(group.name);
      setEditDescription(group.description ?? '');
      setEditMembers(normalizeMembers(group.members, users));
    } catch (err) {
      console.error('Failed to fetch group', err);
      const fallbackGroup = groups.find((group) => group.id === id) ?? null;
      setDetailGroup(fallbackGroup);
      setEditName(fallbackGroup?.name ?? '');
      setEditDescription(fallbackGroup?.description ?? '');
      setEditMembers(normalizeMembers(fallbackGroup?.members, users));
      setError('Could not refresh this group.');
    } finally {
      setDetailLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    setError('');

    try {
      const memberIds = selectedMembers.map((member) => member.id);
      const { data } = await api.post('/groups', {
        name: newName.trim(),
        description: newDescription.trim(),
        memberIds,
      });
      const created = normalizeGroup({
        id: data?.id ?? `group-${Date.now()}`,
        name: data?.name ?? newName.trim(),
        description: data?.description ?? newDescription.trim(),
        members: data?.members ?? [...(currentUser ? [currentUser] : []), ...selectedMembers],
        createdById: data?.createdById,
      });

      setGroups((previous) => [created, ...previous]);
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      console.error('Failed to create group', err);
      setError('Could not create the group.');
    } finally {
      setCreating(false);
    }
  };

  const saveGroup = async () => {
    if (!detailGroup || !editName.trim()) return;

    setSaving(true);
    setError('');

    try {
      const { data } = await api.put(`/groups/${detailGroup.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      });

      const existingMemberIds = new Set(normalizeMembers(detailGroup.members, users).map((member) => member.id));
      const selectedMemberIds = new Set(editMembers.map((member) => member.id));
      const memberIdsToAdd = editMembers
        .map((member) => member.id)
        .filter((memberId) => !existingMemberIds.has(memberId));
      const memberIdsToRemove = Array.from(existingMemberIds).filter((memberId) => !selectedMemberIds.has(memberId));

      if (memberIdsToAdd.length > 0) {
        await api.post(`/groups/${detailGroup.id}/members`, { memberIds: memberIdsToAdd });
      }

      await Promise.all(memberIdsToRemove.map((memberId) => api.delete(`/groups/${detailGroup.id}/members/${memberId}`)));

      const response = await api.get(`/groups/${detailGroup.id}`);
      const updated = normalizeGroup(response.data ?? data);

      setDetailGroup(updated);
      setEditMembers(normalizeMembers(updated.members, users));
      setGroups((previous) => previous.map((group) => (group.id === updated.id ? updated : group)));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update group', err);
      setError('Could not update the group.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!detailGroup) return;

    setDeleting(true);
    setError('');

    try {
      await api.delete(`/groups/${detailGroup.id}`);
      setGroups((previous) => previous.filter((group) => group.id !== detailGroup.id));
      setDetailOpen(false);
      setDetailGroup(null);
      setEditing(false);
    } catch (err) {
      console.error('Failed to delete group', err);
      setError('Could not delete the group. Only the creator can delete it.');
    } finally {
      setDeleting(false);
    }
  };

  const availableUsers = currentUser ? users.filter((user) => user.id !== currentUser.id) : users;
  const detailMembers = normalizeMembers(detailGroup?.members, users);
  const creatorMember = getCreatorMember(detailGroup);
  const isManager = !!detailGroup?.createdById && detailGroup.createdById === currentUser?.id;
  const editMemberOptions = mergeMembersById(users, detailMembers, creatorMember ? [creatorMember] : []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error ? (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <PrimeButton startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create New Group
        </PrimeButton>
      </Box>

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
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} users={users} onOpen={openGroup} />
          ))}
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Group name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Autocomplete
              multiple
              options={availableUsers}
              getOptionLabel={getMemberName}
              value={selectedMembers}
              onChange={(_, value) => setSelectedMembers(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={getMemberName(option)} {...getTagProps({ index })} key={option.id} />
                ))
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Avatar src={option.avatar ?? undefined} sx={{ mr: 1, width: 32, height: 32 }}>
                    {!option.avatar ? getInitials(option) : null}
                  </Avatar>
                  {getMemberName(option)}
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Add members" placeholder="Select users" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <PrimeButton onClick={createGroup} disabled={creating || !newName.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </PrimeButton>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 10 }}>
          {editing ? 'Edit Group' : detailGroup?.name ?? 'Group'}
          {detailGroup && isManager && !editing ? (
            <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', right: 12, top: 10 }}>
              <IconButton aria-label="Edit group" onClick={() => setEditing(true)}>
                <EditOutlinedIcon />
              </IconButton>
              <IconButton aria-label="Delete group" color="error" onClick={deleteGroup} disabled={deleting}>
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ) : null}
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Typography sx={{ py: 2 }}>Loading...</Typography>
          ) : detailGroup ? (
            <Stack spacing={2}>
              {editing ? (
                <>
                  <TextField
                    label="Group name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <Autocomplete
                    multiple
                    options={editMemberOptions}
                    getOptionLabel={getMemberName}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={editMembers}
                    onChange={(_, value) => {
                      if (!creatorMember) {
                        setEditMembers(value);
                        return;
                      }

                      setEditMembers(mergeMembersById([creatorMember], value));
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const tagProps = getTagProps({ index });
                        const isCreator = option.id === detailGroup.createdById;

                        return (
                          <Chip
                            label={isCreator ? `${getMemberName(option)} (manager)` : getMemberName(option)}
                            {...tagProps}
                            onDelete={isCreator ? undefined : tagProps.onDelete}
                            key={option.id}
                          />
                        );
                      })
                    }
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Avatar src={option.avatar ?? undefined} sx={{ mr: 1, width: 32, height: 32 }}>
                          {!option.avatar ? getInitials(option) : null}
                        </Avatar>
                        {getMemberName(option)}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Group members" placeholder="Add or remove users" />
                    )}
                  />
                </>
              ) : (
                <>
                  {detailGroup.description ? (
                    <Typography color="text.secondary">{detailGroup.description}</Typography>
                  ) : null}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Members
                  </Typography>
                  <List disablePadding>
                    {detailMembers.map((member) => (
                      <ListItem key={member.id} disableGutters>
                        <ListItemAvatar>
                          <Avatar src={member.avatar ?? undefined}>{!member.avatar ? getInitials(member) : null}</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={getMemberName(member)} secondary={member.username ?? ''} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Stack>
          ) : (
            <Typography sx={{ py: 2 }}>Group not found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <PrimeButton onClick={saveGroup} disabled={saving || !editName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </PrimeButton>
            </>
          ) : (
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPanel;
