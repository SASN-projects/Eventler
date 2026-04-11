import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import type { ChangeEvent, FunctionComponent } from 'react';
import { useState } from 'react';
import { PrimeButton } from '../../components/inputs';
import { FullSizeContainer } from '../../components/layouts';
import type { SelectionBaseParams } from './types';

const msInTwoHours = 5 * 60 * 60 * 1000;

const DEFAULT_PARAMS: SelectionBaseParams = {
    place: 'Tel Aviv',
    time: new Date(Date.now() + msInTwoHours),
    participantsAmount: 2
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
        <FullSizeContainer sx={{ justifyContent: 'space-evenly', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '30px', m: '30px' }}>New Event</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '300px' }}>
                <TextField
                    label="Time"
                    type="datetime-local"
                    value={timeString}
                    onChange={handleTimeChange}
                    error={!isValidTime}
                    helperText={!isValidTime ? "Time must be equal to or later than now" : ""}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <AccessTimeIcon />
                                </InputAdornment>
                            ),
                        }
                    }}
                />
                <TextField
                    label="Place"
                    type="text"
                    value={baseParams.place}
                    onChange={handlePlaceChange}
                    error={!isValidPlace}
                    helperText={!isValidPlace ? "Place cannot be empty" : ""}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PlaceOutlinedIcon />
                                </InputAdornment>
                            ),
                        }
                    }}
                />
                <TextField
                    label="Participants Amount"
                    type="number"
                    value={baseParams.participantsAmount}
                    onChange={handleParticipantsChange}
                    error={!isValidAmount}
                    helperText={!isValidAmount ? "Amount must be at least 1" : ""}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <GroupIcon />
                                </InputAdornment>
                            ),
                        }
                    }}
                />
            </Box>
            <PrimeButton sx={{ m: '30px' }} onClick={handleSlide} disabled={!isAllValid}>
                Start Sliding!
            </PrimeButton>
        </FullSizeContainer>
    );
};

export default BaseQuestions;