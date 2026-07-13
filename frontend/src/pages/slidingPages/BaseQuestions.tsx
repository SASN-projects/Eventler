import { AccessTime, Group, PlaceOutlined } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import type { ChangeEvent, FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { PrimeButton } from "../../components/buttons";
import { FieldInput } from "../../components/inputs";
import api from "../../config/api";
import { postNewEvent } from "./api";
import {
  AMOUNT_ERROR_MSG,
  DECISION_MODE_DESCRIPTION,
  DECISION_MODE_TITLE,
  DEFAULT_PARAMS,
  GROUP_DECISION_LABEL,
  NEW_EVENT_TITLE,
  PLACE_ERROR_MSG,
  SOLO_DECISION_LABEL,
  START_SLIDING_BTN,
  TIME_ERROR_MSG,
} from "./consts";
import {
  BaseQuestionsContainer,
  BaseQuestionsTitle,
  InputsContainer,
} from "./styles";
import type { SelectionBaseParams } from "./types";
import { formatTimeAsText } from "./utils";

interface BaseQuestionsProps {
  onBaseComplete: (eventId: string) => void;
}

export const BaseQuestions: FunctionComponent<BaseQuestionsProps> = ({
  onBaseComplete: onComplete,
}) => {
  const [baseParams, setBaseParams] =
    useState<SelectionBaseParams>(DEFAULT_PARAMS);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState("");
  const [decisionModeDialogOpen, setDecisionModeDialogOpen] = useState(false);
  const [groupSelectionOpen, setGroupSelectionOpen] = useState(false);
  const [groups, setGroups] = useState<
    Array<{ id: string; name: string; members?: any[] }>
  >([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const now = new Date();
  now.setSeconds(0, 0);

  const isValidTime = baseParams.time >= now;
  const isValidPlace = baseParams.place.trim() !== "";
  const isValidAmount = baseParams.participantsAmount > 0;
  const isAllValid = isValidTime && isValidAmount && isValidPlace;

  const loadGroups = async () => {
    setGroupsLoading(true);

    try {
      const { data } = await api.get("/groups");
      setGroups(data ?? []);
    } catch (err) {
      console.error("Failed to load groups", err);
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const createEvent = async (eventType: string, groupId?: string) => {
    setIsCreatingEvent(true);
    setCreateEventError("");

    try {
      const id = await postNewEvent(
        baseParams.time,
        baseParams.place,
        baseParams.participantsAmount,
        eventType,
        groupId,
      );
      onComplete(id);
    } catch (error) {
      setCreateEventError(
        error instanceof Error ? error.message : "Could not create the event.",
      );
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleStartSliding = () => {
    if (isAllValid) {
      setCreateEventError("");
      setDecisionModeDialogOpen(true);
    }
  };

  const handleDecisionModeSelect = async (mode: "solo" | "group") => {
    setDecisionModeDialogOpen(false);

    if (mode === "group") {
      setSelectedGroupId(null);
      setGroupSelectionOpen(true);
      return;
    }

    await createEvent("individual");
  };

  const handleGroupContinue = async () => {
    if (!selectedGroupId) return;

    setGroupSelectionOpen(false);
    await createEvent("group", selectedGroupId);
  };

  const setParam = <K extends keyof SelectionBaseParams>(
    key: K,
    value: SelectionBaseParams[K],
  ) => setBaseParams((prev) => ({ ...prev, [key]: value }));

  const handleTimeChange = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) => setParam("time", new Date(value));

  const handlePlaceChange = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) => setParam("place", value);

  const handleParticipantsChange = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) =>
    setParam("participantsAmount", Number(value));

  return (
    <BaseQuestionsContainer>
      <BaseQuestionsTitle>{NEW_EVENT_TITLE}</BaseQuestionsTitle>

      <InputsContainer>
        <FieldInput
          label="Time"
          icon={AccessTime}
          type="datetime-local"
          isError={!isValidTime}
          onChange={handleTimeChange}
          value={formatTimeAsText(baseParams.time)}
          helperText={TIME_ERROR_MSG}
        />

        <FieldInput
          type="text"
          label="Place"
          icon={PlaceOutlined}
          isError={!isValidPlace}
          value={baseParams.place}
          onChange={handlePlaceChange}
          helperText={PLACE_ERROR_MSG}
        />

        <FieldInput
          icon={Group}
          type="number"
          isError={!isValidAmount}
          label="Participants Amount"
          onChange={handleParticipantsChange}
          value={baseParams.participantsAmount}
          helperText={AMOUNT_ERROR_MSG}
        />
      </InputsContainer>

      {createEventError && (
        <Typography color="error" textAlign="center">
          {createEventError}
        </Typography>
      )}

      <PrimeButton
        sx={{ m: "30px" }}
        onClick={handleStartSliding}
        disabled={!isAllValid || isCreatingEvent}
      >
        {isCreatingEvent ? "Creating..." : START_SLIDING_BTN}
      </PrimeButton>

      <Dialog
        open={decisionModeDialogOpen}
        onClose={() => setDecisionModeDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{DECISION_MODE_TITLE}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {DECISION_MODE_DESCRIPTION}
          </DialogContentText>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mb: 1, textTransform: "none" }}
            disabled={isCreatingEvent}
            onClick={() => handleDecisionModeSelect("solo")}
          >
            {SOLO_DECISION_LABEL}
          </Button>
          <Button
            fullWidth
            variant="contained"
            sx={{ textTransform: "none" }}
            disabled={isCreatingEvent}
            onClick={() => handleDecisionModeSelect("group")}
          >
            {GROUP_DECISION_LABEL}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupSelectionOpen}
        onClose={() => setGroupSelectionOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select a group</DialogTitle>
        <DialogContent>
          {groupsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : groups.length === 0 ? (
            <Typography sx={{ py: 3, textAlign: "center" }}>
              You are not a member of any groups yet. Create or join one first
              to continue with group decision.
            </Typography>
          ) : (
            <List>
              {groups.map((group) => (
                <ListItemButton
                  key={group.id}
                  selected={group.id === selectedGroupId}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <ListItemText
                    primary={group.name}
                    secondary={
                      group.members?.length
                        ? `${group.members.length} members`
                        : "No members"
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2, textTransform: "none" }}
            disabled={!selectedGroupId || isCreatingEvent}
            onClick={handleGroupContinue}
          >
            {isCreatingEvent ? "Creating..." : "Continue with selected group"}
          </Button>
        </DialogContent>
      </Dialog>
    </BaseQuestionsContainer>
  );
};

export default BaseQuestions;
