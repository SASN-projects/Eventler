import type { FunctionComponent, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import TimerIcon from "@mui/icons-material/Timer";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import {
  fetchPendingQuestionnaires,
  type PendingQuestionnaireItem,
} from "../pages/slidingPages/api";

interface NotificationInboxProps {
  onSelectEvent: (eventId: string) => void;
  refreshTrigger?: number;
}

function getActionLabel(item: PendingQuestionnaireItem): string {
  switch (item.itemType) {
    case "GROUP_FINAL_SELECTION_PENDING":
      return "Choose final event";
    case "INDIVIDUAL_FINAL_SELECTION_PENDING":
      return "Choose final event";
    case "INDIVIDUAL_QUESTIONNAIRE_ANSWER_PENDING":
      return "Answer questionnaire";
    case "GROUP_QUESTIONNAIRE_ANSWER_PENDING":
    default:
      return "Answer questionnaire";
  }
}

function isFinalSelectionItem(item: PendingQuestionnaireItem): boolean {
  return (
    item.itemType === "GROUP_FINAL_SELECTION_PENDING" ||
    item.itemType === "INDIVIDUAL_FINAL_SELECTION_PENDING"
  );
}

function isIndividualItem(item: PendingQuestionnaireItem): boolean {
  return (
    item.itemType === "INDIVIDUAL_QUESTIONNAIRE_ANSWER_PENDING" ||
    item.itemType === "INDIVIDUAL_FINAL_SELECTION_PENDING"
  );
}

export const NotificationInbox: FunctionComponent<NotificationInboxProps> = ({
  onSelectEvent,
  refreshTrigger = 0,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<PendingQuestionnaireItem[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  // Stable ref so event listeners don't capture stale closures
  const loadPendingRef = useRef<() => Promise<void>>(null!);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPendingQuestionnaires();
      setItems(res.items || []);
      setCount(res.count || 0);
    } catch {
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep ref in sync so listeners always call the latest version
  useEffect(() => {
    loadPendingRef.current = loadPending;
  }, [loadPending]);

  // Initial fetch and on refreshTrigger change
  useEffect(() => {
    void loadPending();
  }, [loadPending, refreshTrigger]);

  // Refetch on window focus (user returns from another tab/app)
  useEffect(() => {
    const onFocus = () => void loadPendingRef.current?.();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Refetch whenever a status-change event is dispatched by DecisionPage
  useEffect(() => {
    const onStatusChanged = () => void loadPendingRef.current?.();
    window.addEventListener("eventler:event-status-changed", onStatusChanged);
    return () =>
      window.removeEventListener(
        "eventler:event-status-changed",
        onStatusChanged
      );
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    void loadPending();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (eventId: string) => {
    handleClose();
    onSelectEvent(eventId);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleClick}
        aria-label="Pending questionnaires"
        sx={{
          color: "#ffffff",
          backgroundColor:
            count > 0 ? "rgba(237, 181, 60, 0.35)" : "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(6px)",
          border: "1px solid",
          borderColor: count > 0 ? "#edb53c" : "rgba(255, 255, 255, 0.3)",
          boxShadow: count > 0 ? "0 0 12px rgba(237, 181, 60, 0.4)" : "none",
          transition: "all 0.25s ease",
          "&:hover": {
            backgroundColor:
              count > 0
                ? "rgba(237, 181, 60, 0.5)"
                : "rgba(255, 255, 255, 0.25)",
            borderColor: count > 0 ? "#edb53c" : "rgba(255, 255, 255, 0.5)",
          },
          width: 42,
          height: 42,
        }}
      >
        <Badge
          badgeContent={count}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontWeight: 800,
              fontSize: "11px",
              bgcolor: "#e53e3e",
            },
          }}
        >
          {count > 0 ? (
            <MarkEmailUnreadIcon sx={{ fontSize: 22, color: "#ffffff" }} />
          ) : (
            <MailOutlineIcon sx={{ fontSize: 22, color: "rgba(255, 255, 255, 0.85)" }} />
          )}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 340,
            maxWidth: "92vw",
            borderRadius: "16px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
            border: "1px solid rgba(0,0,0,0.08)",
            mt: 1,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b" }}>
              Pending Actions
            </Typography>
            <Chip
              label={`${count} waiting`}
              size="small"
              sx={{
                bgcolor: count > 0 ? "#fef3c7" : "#e2e8f0",
                color: count > 0 ? "#b45309" : "#64748b",
                fontWeight: 700,
                fontSize: "11px",
              }}
            />
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
          {loading && items.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress size={28} sx={{ color: "#edb53c" }} />
            </Box>
          ) : items.length === 0 ? (
            <Box textAlign="center" py={4} px={2}>
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
                No pending actions. You're all caught up! 🎉
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {items.map((item) => {
                const isIndividual = isIndividualItem(item);
                const isFinalSelection = isFinalSelectionItem(item);
                const actionLabel = getActionLabel(item);

                return (
                  <Box key={item.eventId}>
                    <ListItem
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        p: 2,
                        gap: 1,
                        "&:hover": {
                          bgcolor: "#f1f5f9",
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}
                          >
                            {item.title}
                          </Typography>
                          {!isIndividual && item.groupName && (
                            <Typography
                              variant="caption"
                              sx={{ color: "#64748b", fontWeight: 600, display: "block" }}
                            >
                              Group: {item.groupName}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {isIndividual && (
                            <Chip
                              label="Individual"
                              size="small"
                              sx={{
                                bgcolor: "#f0fdf4",
                                color: "#166534",
                                fontSize: "10px",
                                fontWeight: 700,
                                height: 18,
                              }}
                            />
                          )}
                          {item.isCreator && (
                            <Chip
                              label={isFinalSelection ? "Choose" : "Creator"}
                              size="small"
                              sx={{
                                bgcolor: isFinalSelection ? "#fef3c7" : "#e0f2fe",
                                color: isFinalSelection ? "#b45309" : "#0369a1",
                                fontSize: "10px",
                                fontWeight: 700,
                                height: 18,
                              }}
                            />
                          )}
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                        {item.deadlineAt && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TimerIcon sx={{ fontSize: 14, color: "#d97706" }} />
                            <Typography variant="caption" sx={{ color: "#d97706", fontWeight: 600 }}>
                              {new Date(item.deadlineAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                          </Stack>
                        )}

                        {!isIndividual &&
                          item.answeredMembersCount !== null &&
                          item.expectedMembersCount !== null && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <PeopleIcon sx={{ fontSize: 14, color: "#64748b" }} />
                              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                {item.answeredMembersCount} of {item.expectedMembersCount} answered
                              </Typography>
                            </Stack>
                          )}

                        {isIndividual && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <PersonIcon sx={{ fontSize: 14, color: "#64748b" }} />
                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                              Your event
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleItemClick(item.eventId)}
                        sx={{
                          mt: 1,
                          borderRadius: "8px",
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "12px",
                          bgcolor: isFinalSelection ? "#7c3aed" : "#edb53c",
                          color: isFinalSelection ? "#ffffff" : "#1e293b",
                          boxShadow: "none",
                          "&:hover": {
                            bgcolor: isFinalSelection ? "#6d28d9" : "#d89d1f",
                            boxShadow: "none",
                          },
                        }}
                      >
                        {actionLabel}
                      </Button>
                    </ListItem>
                    <Divider />
                  </Box>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationInbox;
