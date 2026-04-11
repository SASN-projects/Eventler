import VerifiedIcon from '@mui/icons-material/Verified';
import { Box, Typography } from '@mui/material';
import type { FunctionComponent } from 'react';
import { PrimeButton } from '../../components/buttons';
import { FullSizeContainer } from '../../components/layouts';

interface RecommendationsProps {
    recommendation: string;
    onRestart: () => void;
}

export const RecommendationsPage: FunctionComponent<RecommendationsProps> = ({ recommendation, onRestart }) => (
    <FullSizeContainer sx={{ justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: '20px' }}>Sliding Completed</Typography>
        <Typography sx={{ fontSize: '30px' }}>Looks like this can be a good match!</Typography>

        <Box sx={{
            gap: 2,
            m: '30px',
            padding: '40px',
            display: 'flex',
            borderRadius: '16px',
            alignItems: 'center',
            backgroundColor: '#fff8b5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
            <VerifiedIcon sx={{ color: '#edb53c' }} />
            <Typography sx={{ color: '#edb53c', fontSize: '24px' }}>
                {recommendation}
            </Typography>
        </Box>

        <PrimeButton onClick={onRestart}>
            Start New Event
        </PrimeButton>
    </FullSizeContainer>
);

export default RecommendationsPage;