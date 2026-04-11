import { useState } from 'react';
import type { FunctionComponent, ChangeEvent } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import type { SelectionBaseParams } from './types';
import { FullSizeContainer } from '../../components/layouts';

const DEFAULT_PARAMS: SelectionBaseParams = {
    place: '',
    time: new Date(),
    participantsAmount: 1
};

interface BaseQuestionsProps {
    onComplete: () => void;
}

export const BaseQuestions: FunctionComponent<BaseQuestionsProps> = ({ onComplete }) => {
    const [baseParams, setBaseParams] = useState<SelectionBaseParams>(DEFAULT_PARAMS);

    const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedDate = new Date(e.target.value);
        setBaseParams(prev => ({ ...prev, time: selectedDate }));
    };

    const handlePlaceChange = (e: ChangeEvent<HTMLInputElement>) =>
        setBaseParams(prev => ({ ...prev, place: e.target.value }));

    const handleParticipantsChange = (e: ChangeEvent<HTMLInputElement>) =>
        setBaseParams(prev => ({ ...prev, participantsAmount: Number(e.target.value) }));

    const timeString = baseParams.time instanceof Date && !isNaN(baseParams.time.getTime())
        ? baseParams.time.toISOString().slice(0, 16)
        : '';

    const now = new Date();
    now.setSeconds(0, 0);

    const isValidTime = baseParams.time >= now;
    const isValidAmount = baseParams.participantsAmount > 0;
    const isValidPlace = baseParams.place.trim() !== '';
    const isAllValid = isValidTime && isValidAmount && isValidPlace;

    const handleSlide = () => {
        if (isAllValid) onComplete();
    };

    return (
        <FullSizeContainer>
            <Typography sx={{ fontSize: '22px', m: '30px' }}>New Event</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                    label="Time"
                    type="datetime-local"
                    value={timeString}
                    onChange={handleTimeChange}
                    error={!isValidTime}
                    helperText={!isValidTime ? "Time must be equal to or later than now" : ""}
                />
                <TextField
                    label="Place"
                    type="text"
                    value={baseParams.place}
                    onChange={handlePlaceChange}
                    error={!isValidPlace}
                    helperText={!isValidPlace ? "Place cannot be empty" : ""}
                />
                <TextField
                    label="Participants Amount"
                    type="number"
                    value={baseParams.participantsAmount}
                    onChange={handleParticipantsChange}
                    error={!isValidAmount}
                    helperText={!isValidAmount ? "Amount must be at least 1" : ""}
                />
            </Box>
            <Button sx={{ m: '30px' }} onClick={handleSlide} disabled={!isAllValid}>
                Lets Slide!
            </Button>
        </FullSizeContainer>
    );
};

export default BaseQuestions;