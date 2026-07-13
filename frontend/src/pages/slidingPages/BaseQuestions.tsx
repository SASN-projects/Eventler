import { AccessTime, Group, PlaceOutlined } from '@mui/icons-material';
import { Typography } from '@mui/material';
import type { ChangeEvent, FunctionComponent } from 'react';
import { useState } from 'react';
import { PrimeButton } from '../../components/buttons';
import { FieldInput } from '../../components/inputs';
import { postNewEvent } from './api';
import {
    AMOUNT_ERROR_MSG,
    DEFAULT_PARAMS,
    NEW_EVENT_TITLE,
    PLACE_ERROR_MSG,
    START_SLIDING_BTN,
    TIME_ERROR_MSG
} from './consts';
import { BaseQuestionsContainer, BaseQuestionsTitle, InputsContainer } from './styles';
import type { SelectionBaseParams } from './types';
import { formatTimeAsText } from './utils';

interface BaseQuestionsProps {
    onBaseComplete: (eventId: string) => void;
}

export const BaseQuestions: FunctionComponent<BaseQuestionsProps> = ({ onBaseComplete: onComplete }) => {
    const [baseParams, setBaseParams] = useState<SelectionBaseParams>(DEFAULT_PARAMS);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [createEventError, setCreateEventError] = useState("");

    const now = new Date();
    now.setSeconds(0, 0);

    const isValidTime = baseParams.time >= now;
    const isValidPlace = baseParams.place.trim() !== '';
    const isValidAmount = baseParams.participantsAmount > 0;
    const isAllValid = isValidTime && isValidAmount && isValidPlace;

    const handleStartSliding = async () => {
        if (isAllValid) {
            setIsCreatingEvent(true);
            setCreateEventError("");
            try {
                const id = await postNewEvent(baseParams.time, baseParams.place, baseParams.participantsAmount);
                onComplete(id);
            } catch (error) {
                setCreateEventError(error instanceof Error ? error.message : "Could not create the event.");
            } finally {
                setIsCreatingEvent(false);
            }
        }
    };

    const setParam = <K extends keyof SelectionBaseParams>(key: K, value: SelectionBaseParams[K]) =>
        setBaseParams(prev => ({ ...prev, [key]: value }));

    const handleTimeChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
        setParam('time', new Date(value));

    const handlePlaceChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
        setParam('place', value);

    const handleParticipantsChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
        setParam('participantsAmount', Number(value));


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

            <PrimeButton sx={{ m: '30px' }} onClick={handleStartSliding} disabled={!isAllValid || isCreatingEvent}>
                {isCreatingEvent ? "Creating..." : START_SLIDING_BTN}
            </PrimeButton>
        </BaseQuestionsContainer>
    );
};

export default BaseQuestions;
