import { AccessTime, Group, PlaceOutlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import type { ChangeEvent, FunctionComponent } from 'react';
import { useState } from 'react';
import { PrimeButton } from '../../components/buttons';
import { FieldInput } from '../../components/inputs';
import { FullSizeContainer } from '../../components/layouts';
import { postNewEvent } from './apiWithMockups';
import { DEFAULT_PARAMS } from './consts';
import type { SelectionBaseParams } from './types';
import { formatTimeAsText } from './utils';

interface BaseQuestionsProps {
    onBaseComplete: (eventId: string) => void;
}

export const BaseQuestions: FunctionComponent<BaseQuestionsProps> = ({ onBaseComplete: onComplete }) => {
    const [baseParams, setBaseParams] = useState<SelectionBaseParams>(DEFAULT_PARAMS);

    const now = new Date();
    now.setSeconds(0, 0);

    const isValidTime = baseParams.time >= now;
    const isValidPlace = baseParams.place.trim() !== '';
    const isValidAmount = baseParams.participantsAmount > 0;
    const isAllValid = isValidTime && isValidAmount && isValidPlace;

    const handleStartSliding = async () => {
        if (isAllValid) {
            const id = await postNewEvent(baseParams.time, baseParams.place, baseParams.participantsAmount);
            onComplete(id);
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
        <FullSizeContainer sx={{ justifyContent: 'space-evenly', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '30px', m: '30px' }}>New Event</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '300px' }}>
                <FieldInput
                    label="Time"
                    icon={AccessTime}
                    type="datetime-local"
                    isError={!isValidTime}
                    onChange={handleTimeChange}
                    value={formatTimeAsText(baseParams.time)}
                    helperText={"Time must be equal to or later than now"}
                />

                <FieldInput
                    type="text"
                    label="Place"
                    icon={PlaceOutlined}
                    isError={!isValidPlace}
                    value={baseParams.place}
                    onChange={handlePlaceChange}
                    helperText={"Place cannot be empty"}
                />

                <FieldInput
                    icon={Group}
                    type="number"
                    isError={!isValidAmount}
                    label="Participants Amount"
                    onChange={handleParticipantsChange}
                    value={baseParams.participantsAmount}
                    helperText={"Amount must be at least 1"}
                />
            </Box>

            <PrimeButton sx={{ m: '30px' }} onClick={handleStartSliding} disabled={!isAllValid}>
                Start Sliding!
            </PrimeButton>
        </FullSizeContainer>
    );
};

export default BaseQuestions;