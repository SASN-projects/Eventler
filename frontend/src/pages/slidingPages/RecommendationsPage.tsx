import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Box, Typography } from '@mui/material';
import type { FunctionComponent } from 'react';
import { PrimeButton } from '../../components/buttons';
import { FullSizeContainer } from '../../components/layouts';
import type { Recommendation } from './types';

interface RecommendationsProps {
    onRestart: () => void;
    recommendation: Recommendation;
}

export const RecommendationsPage: FunctionComponent<RecommendationsProps> = ({ recommendation, onRestart }) => {
    const price = parseInt(recommendation.priceLevel, 10) || 0;

    return (
        <FullSizeContainer sx={{ justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '20px' }}>Sliding Completed</Typography>
            <Typography sx={{ fontSize: '30px' }}>Looks like this can be a good match!</Typography>

            <Box sx={{
                gap: 2,
                m: '30px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                alignItems: 'center',
                backgroundColor: '#fff8b5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
                <VerifiedIcon sx={{ color: '#edb53c' }} />
                <Typography sx={{ color: '#edb53c', fontSize: '24px', fontWeight: 'bold' }}>
                    {recommendation.name}
                </Typography>
                
                <Typography sx={{ fontSize: '16px', fontStyle: 'italic', color: 'text.secondary' }}>
                    {recommendation.category}
                </Typography>

                <Typography sx={{ fontSize: '17px', textAlign: 'center' }}>
                    {recommendation.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon />
                    <Typography sx={{ fontSize: '16px' }}>
                        {`${recommendation.address}, ${recommendation.city}, ${recommendation.country}`}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '18px', fontWeight: 'bold' }}>{recommendation.rating}</Typography>
                        <StarIcon sx={{ color: '#edb53c' }} />
                    </Box>

                    <Typography sx={{ fontSize: '18px', letterSpacing: 2 }}>
                        {[...Array(4)].map((_, i) => (
                            <span 
                                key={i} 
                                style={{ 
                                    fontWeight: i < price ? 'bold' : 'normal', 
                                    color: i < price ? 'inherit' : '#aaa' 
                                }}
                            >
                                $
                            </span>
                        ))}
                    </Typography>
                </Box>
            </Box>

            <PrimeButton onClick={onRestart}>
                Start New Event
            </PrimeButton>
        </FullSizeContainer>
    );
};

export default RecommendationsPage;