import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
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
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import api from "../config/api";
import { PrimeButton } from "../components/buttons";
import { AuthContext } from "../contexts/AuthContext";
import EventCard from "./EventCard";
import {
  HistoryCard,
  OverflowAvatar,
  ParticipantAvatar,
} from "./slidingPages/profile.styles";

type Member = {
  id: string;
  avatar?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  user?: Member;
  userId?: string;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  createdById?: string;
  members?: Array<Member | string | null | undefined>;
};

const getMemberName = (member?: Partial<Member> | null) => {
  if (!member) return "Member";

  return (
    member.name ||
    `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
    member.username ||
    member.id ||
    "Member"
  );
};

const getInitials = (member: Member) =>
  getMemberName(member)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const normalizeGroup = (group: Group): Group => ({
  ...group,
  members: group.members ?? [],
  description: group.description ?? "",
});

const normalizeMembers = (
  members: Array<Member | string | null | undefined> | undefined,
  users: Member[],
) =>
  (members ?? [])
    .map((member) => {
      if (!member) return null;

      if (typeof member !== "string") {
        if (member.user) return member.user;
        if (member.id) return member;
        if (member.userId) {
          return (
            users.find((user) => user.id === member.userId) ?? {
              id: member.userId,
              name: member.userId,
            }
          );
        }

        return member;
      }

      return (
        users.find((user) => user.id === member) ?? { id: member, name: member }
      );
    })
    .filter((member): member is Member => Boolean(member))
    .map((member, index) =>
      member.id
        ? member
        : { ...member, id: `member-${index}-${getMemberName(member)}` },
    );

const mergeMembersById = (...memberGroups: Member[][]): Member[] => {
  const membersById = new Map<string, Member>();

  memberGroups.flat().forEach((member) => {
    if (member.id && !membersById.has(member.id)) {
      membersById.set(member.id, member);
    }
  });

  return Array.from(membersById.values());
};

const dialogPaperSx: SxProps<Theme> = {
  background:
    "linear-gradient(180deg, #ffffff 0%, var(--eventler-surface-soft) 100%)",
};

const dialogFieldSx: SxProps<Theme> = {
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--eventler-secondary)",
  },
};

const quietButtonSx: SxProps<Theme> = {
  color: "var(--eventler-muted)",
  fontWeight: 800,
  textTransform: "none",
};

const AvatarStack: React.FC<{ members: Member[] }> = ({ members }) => {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: 72,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{ display: "flex", position: "relative", width: 62, height: 26 }}
      >
        {visible.map((member, index) => (
          <ParticipantAvatar
            key={member.id}
            src={member.avatar ?? undefined}
            sx={{ position: "absolute", left: index * 18, zIndex: 10 - index }}
          >
            {!member.avatar ? getInitials(member) : null}
          </ParticipantAvatar>
        ))}
        {extra > 0 && (
          <OverflowAvatar
            sx={{ position: "absolute", left: visible.length * 18, zIndex: 1 }}
          >
            +{extra}
          </OverflowAvatar>
        )}
      </Box>
    </Box>
  );
};

const GroupCard: React.FC<{
  group: Group;
  users: Member[];
  onOpen: (id: string) => void;
  onViewEvents: (group: Group) => void;
}> = ({ group, users, onOpen, onViewEvents }) => {
  const members = normalizeMembers(group.members, users);

  return (
    <HistoryCard
      elevation={0}
      sx={{
        p: 2,
        mb: 0,
        width: "100%",
        minHeight: 96,
        boxSizing: "border-box",
        cursor: "pointer",
      }}
      onClick={() => onOpen(group.id)}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: 2,
          width: "100%",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            width: "100%",
            justifySelf: "start",
            textAlign: "left",
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "block", fontWeight: 700, textAlign: "left" }}
            noWrap
          >
            {group.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "block", textAlign: "left" }}
          >
            {members.length} {members.length === 1 ? "member" : "members"}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={1}>
          <AvatarStack members={members} />
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              onViewEvents(group);
            }}
            sx={{
              borderRadius: "999px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "11px",
              minWidth: 92,
              borderColor: "rgba(109, 114, 232, 0.26)",
              color: "var(--eventler-secondary)",
            }}
          >
            View events
          </Button>
        </Stack>
      </Box>
    </HistoryCard>
  );
};

const GroupsPanel: React.FC<{
  onContinueEvent?: (event: { id: string; status?: string }) => void;
}> = ({ onContinueEvent }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [creating, setCreating] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [groupEventsOpen, setGroupEventsOpen] = useState(false);
  const [groupEvents, setGroupEvents] = useState<any[]>([]);
  const [groupEventsLoading, setGroupEventsLoading] = useState(false);
  const [currentGroupName, setCurrentGroupName] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMembers, setEditMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const auth = useContext(AuthContext);
  const currentUser = auth?.user
    ? {
        id: auth.user.id,
        name: `${auth.user.firstName ?? ""} ${auth.user.lastName ?? ""}`.trim(),
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      }
    : null;

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);

    try {
      const { data } = await api.get("/users");
      setUsers(data ?? []);
    } catch (err) {
      console.error("Failed to fetch users for group members", err);
      setUsers([]);
      setError("Could not load users for group members.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const hydrateGroupMembers = useCallback(async (groupList: Group[]) => {
    return Promise.all(
      groupList.map(async (group) => {
        if ((group.members ?? []).length > 0) {
          return group;
        }

        try {
          const { data } = await api.get(`/groups/${group.id}`);
          return normalizeGroup({ ...group, ...data });
        } catch (err) {
          console.error("Failed to hydrate group members", err);
          return group;
        }
      }),
    );
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/groups");
      const loadedGroups = (data ?? []).map(normalizeGroup);
      const hydratedGroups = await hydrateGroupMembers(loadedGroups);
      setGroups(hydratedGroups);
    } catch (err) {
      console.error("Failed to fetch groups", err);
      setError("Could not load groups right now.");
    } finally {
      setLoading(false);
    }
  }, [hydrateGroupMembers]);

  useEffect(() => {
    loadGroups();
    loadUsers().catch((err) => console.error("Failed to fetch users", err));
  }, [loadGroups, loadUsers]);

  const resetCreateForm = () => {
    setNewName("");
    setNewDescription("");
    setSelectedMembers([]);
  };

  const getCreatorMember = (group: Group | null) => {
    if (!group?.createdById) return null;

    return (
      normalizeMembers(group.members, users).find(
        (member) => member.id === group.createdById,
      ) ??
      users.find((user) => user.id === group.createdById) ??
      (currentUser?.id === group.createdById ? currentUser : null)
    );
  };

  const openGroup = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailGroup(null);
    setEditing(false);
    setError("");

    try {
      const { data } = await api.get(`/groups/${id}`);
      const group = normalizeGroup(data);
      const members = normalizeMembers(group.members, users);
      setDetailGroup(group);
      setEditName(group.name);
      setEditDescription(group.description ?? "");
      setEditMembers(members);
    } catch (err) {
      console.error("Failed to fetch group", err);
      const fallbackGroup = groups.find((group) => group.id === id) ?? null;
      setDetailGroup(fallbackGroup);
      setEditName(fallbackGroup?.name ?? "");
      setEditDescription(fallbackGroup?.description ?? "");
      setEditMembers(normalizeMembers(fallbackGroup?.members, users));
      setError("Could not refresh this group.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openGroupEvents = async (group: Group) => {
    setGroupEventsOpen(true);
    setGroupEventsLoading(true);
    setCurrentGroupName(group.name);
    setGroupEvents([]);
    setError("");

    try {
      const { data } = await api.get(`/groups/${group.id}/events`);
      setGroupEvents(data ?? []);
    } catch (err) {
      console.error("Failed to fetch group events", err);
      setError("Could not load events for this group.");
    } finally {
      setGroupEventsLoading(false);
    }
  };

  const closeGroupEvents = () => {
    setGroupEventsOpen(false);
    setGroupEvents([]);
    setCurrentGroupName("");
    setGroupEventsLoading(false);
  };

  const createGroup = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const memberIds = selectedMembers
        .map((member) => member.id?.trim())
        .filter((id): id is string => Boolean(id));

      const payload: Record<string, unknown> = {
        name: newName.trim(),
        description: newDescription.trim(),
      };

      if (memberIds.length > 0) {
        payload.memberIds = memberIds;
      }

      const { data } = await api.post("/groups", payload);
      const created = normalizeGroup(data);
      const [hydratedCreated] = await hydrateGroupMembers([created]);

      setGroups((previous) => [hydratedCreated, ...previous]);
      setCreateOpen(false);
      resetCreateForm();
      await loadGroups();
    } catch (err) {
      console.error("Failed to create group", err);
      const apiMessage = (err as any)?.response?.data?.message;
      setError(apiMessage ?? "Could not create the group.");
    } finally {
      setCreating(false);
    }
  };

  const saveGroup = async () => {
    if (!detailGroup || !editName.trim()) return;

    setSaving(true);
    setError("");

    try {
      await api.put(`/groups/${detailGroup.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      });

      const existingMemberIds = new Set(
        normalizeMembers(detailGroup.members, users).map((member) => member.id),
      );
      const selectedMemberIds = new Set(editMembers.map((member) => member.id));
      const memberIdsToAdd = editMembers
        .map((member) => member.id)
        .filter((memberId) => !existingMemberIds.has(memberId));
      const memberIdsToRemove = Array.from(existingMemberIds).filter(
        (memberId) => !selectedMemberIds.has(memberId),
      );

      if (memberIdsToAdd.length > 0) {
        await api.post(`/groups/${detailGroup.id}/members`, {
          memberIds: memberIdsToAdd,
        });
      }

      await Promise.all(
        memberIdsToRemove.map((memberId) =>
          api.delete(`/groups/${detailGroup.id}/members/${memberId}`),
        ),
      );

      const { data } = await api.get(`/groups/${detailGroup.id}`);
      const updated = normalizeGroup(data);

      setDetailGroup(updated);
      setEditMembers(normalizeMembers(updated.members, users));
      setGroups((previous) =>
        previous.map((group) => (group.id === updated.id ? updated : group)),
      );
      setEditing(false);
    } catch (err) {
      console.error("Failed to update group", err);
      setError("Could not update the group.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!detailGroup) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`/groups/${detailGroup.id}`);
      setGroups((previous) =>
        previous.filter((group) => group.id !== detailGroup.id),
      );
      setDetailOpen(false);
      setDetailGroup(null);
      setEditing(false);
    } catch (err) {
      console.error("Failed to delete group", err);
      setError("Could not delete the group. Only the creator can delete it.");
    } finally {
      setDeleting(false);
    }
  };

  const availableUsers = currentUser
    ? users.filter((user) => user.id !== currentUser.id)
    : users;
  const noSelectableUsersText = usersLoading
    ? "Loading users..."
    : "No users found";
  const detailMembers = normalizeMembers(detailGroup?.members, users);
  const creatorMember = getCreatorMember(detailGroup);
  const isManager =
    !!detailGroup?.createdById && detailGroup.createdById === currentUser?.id;
  const editMemberOptions = mergeMembersById(
    users,
    detailMembers,
    creatorMember ? [creatorMember] : [],
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "transparent",
          pt: 2,
          pb: 1,
          px: 1,
        }}
      >
        {error ? (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PrimeButton
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create New Group
          </PrimeButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: 1,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          "&::-webkit-scrollbar": {
            width: "10px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#f3f1fb",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(109, 114, 232, 0.34)",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(109, 114, 232, 0.55)",
          },
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(109, 114, 232, 0.4) #f3f1fb",
        }}
      >
        {loading ? (
          <Typography align="center" sx={{ pt: 4 }}>
            Loading groups...
          </Typography>
        ) : groups.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: "18px",
              border: "1px dashed rgba(109, 114, 232, 0.28)",
              color: "var(--eventler-muted)",
              backgroundColor: "rgba(255,255,255,0.78)",
            }}
          >
            You have not created or joined any groups yet.
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                users={users}
                onOpen={openGroup}
                onViewEvents={openGroupEvents}
              />
            ))}
          </Box>
        )}
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Group name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              fullWidth
              required
              sx={dialogFieldSx}
            />
            <TextField
              label="Description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
              sx={dialogFieldSx}
            />
            <Autocomplete<Member, true, false, false>
              multiple
              options={availableUsers}
              getOptionLabel={getMemberName}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={usersLoading}
              noOptionsText={noSelectableUsersText}
              value={selectedMembers}
              onChange={(_, value) => setSelectedMembers(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={getMemberName(option)}
                    {...getTagProps({ index })}
                    key={option.id}
                    color="secondary"
                    variant="outlined"
                  />
                ))
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Avatar
                    src={option.avatar ?? undefined}
                    sx={{ mr: 1, width: 32, height: 32 }}
                  >
                    {!option.avatar ? getInitials(option) : null}
                  </Avatar>
                  {getMemberName(option)}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add members"
                  placeholder="Select users"
                  sx={dialogFieldSx}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={quietButtonSx}>
            Cancel
          </Button>
          <PrimeButton
            onClick={createGroup}
            disabled={creating || !newName.trim()}
          >
            {creating ? "Creating..." : "Create"}
          </PrimeButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ pr: 10 }}>
          {editing ? "Edit Group" : (detailGroup?.name ?? "Group")}
          {detailGroup && isManager && !editing ? (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ position: "absolute", right: 12, top: 10 }}
            >
              <IconButton
                aria-label="Edit group"
                onClick={() => setEditing(true)}
              >
                <EditOutlinedIcon />
              </IconButton>
              <IconButton
                aria-label="Delete group"
                color="error"
                onClick={deleteGroup}
                disabled={deleting}
              >
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
                    sx={dialogFieldSx}
                  />
                  <TextField
                    label="Description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={dialogFieldSx}
                  />
                  <Autocomplete<Member, true, false, false>
                    multiple
                    options={editMemberOptions}
                    getOptionLabel={getMemberName}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    loading={usersLoading}
                    noOptionsText={noSelectableUsersText}
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
                            label={
                              isCreator
                                ? `${getMemberName(option)} (manager)`
                                : getMemberName(option)
                            }
                            {...tagProps}
                            onDelete={isCreator ? undefined : tagProps.onDelete}
                            key={option.id}
                            color="secondary"
                            variant="outlined"
                          />
                        );
                      })
                    }
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Avatar
                          src={option.avatar ?? undefined}
                          sx={{ mr: 1, width: 32, height: 32 }}
                        >
                          {!option.avatar ? getInitials(option) : null}
                        </Avatar>
                        {getMemberName(option)}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Group members"
                        placeholder="Add or remove users"
                        sx={dialogFieldSx}
                      />
                    )}
                  />
                </>
              ) : (
                <>
                  {detailGroup.description ? (
                    <Typography color="text.secondary">
                      {detailGroup.description}
                    </Typography>
                  ) : null}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Members
                  </Typography>
                  <List disablePadding>
                    {detailMembers.map((member) => (
                      <ListItem key={member.id} disableGutters>
                        <ListItemAvatar>
                          <Avatar src={member.avatar ?? undefined}>
                            {!member.avatar ? getInitials(member) : null}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={getMemberName(member)}
                          secondary={member.username ?? ""}
                        />
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
                  <Button onClick={() => setEditing(false)} disabled={saving} sx={quietButtonSx}>
                    Cancel
                  </Button>
              <PrimeButton
                onClick={saveGroup}
                disabled={saving || !editName.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </PrimeButton>
            </>
          ) : (
            <Button onClick={() => setDetailOpen(false)} sx={quietButtonSx}>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={groupEventsOpen}
        onClose={closeGroupEvents}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle>{currentGroupName || "Group"} events</DialogTitle>
        <DialogContent dividers>
          {groupEventsLoading ? (
            <Typography sx={{ py: 4, textAlign: "center" }}>
              Loading events...
            </Typography>
          ) : groupEvents.length === 0 ? (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                borderRadius: "18px",
                border: "1px dashed rgba(109, 114, 232, 0.28)",
                color: "var(--eventler-muted)",
                backgroundColor: "rgba(255,255,255,0.78)",
              }}
            >
              No events found for this group.
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {groupEvents.map((event) => (
                <EventCard key={event.id} event={event} onContinue={onContinueEvent} />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGroupEvents} sx={quietButtonSx}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPanel;
