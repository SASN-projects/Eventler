import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Box, Typography } from '@mui/material';
import { type FunctionComponent, useState } from 'react';
import { PrimeButton } from '../../components/buttons';
import { GOOD_MATCH_SUBTITLE, SLIDING_COMPLETED_TITLE, START_NEW_EVENT_BTN } from './consts';
import { LocationContainer, RecommendationCard, RecommendationContainer, RecommendationDescription, RecommendationName } from './styles';
import type { Recommendation } from './types';

interface RecommendationsProps {
    onRestart: () => void;
    recommendations: Recommendation[];
}

export const RecommendationsPage: FunctionComponent<RecommendationsProps> = ({ recommendations, onRestart }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const renderRecommendation = (recommendation: Recommendation, index: number) => {
        const isSelected = selectedIndex === index;
        const isFocused = hoveredIndex === index;

        return (
            <RecommendationCard
                key={index}
                $isSelected={isSelected}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedIndex(index)}
            >
                <RecommendationName $isSelected={isSelected}>
                    {recommendation.title}
                </RecommendationName>

                <Box
                    sx={{
                        maxHeight: isFocused ? '500px' : '0px',
                        opacity: isFocused ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'all 0.4s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        marginTop: isFocused ? '8px' : '0px'
                    }}
                >
                    <Box
                        sx={{
                            maxHeight: isFocused ? '200px' : '0px',
                            opacity: isFocused ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'all 0.4s ease-in-out',
                            width: '100%'
                        }}
                    >
                        <RecommendationDescription sx={{ fontSize: '15px' }}>
                            {recommendation.description}
                        </RecommendationDescription>
                    </Box>

                    <LocationContainer>
                        <LocationOnIcon fontSize="small" />
                        <Typography sx={{ fontSize: '14px' }}>
                            {recommendation.address}
                        </Typography>
                    </LocationContainer>

                    <Box
                        sx={{
                            maxHeight: isSelected ? '100px' : '0px',
                            opacity: isSelected ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'all 0.4s ease-in-out',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <PrimeButton
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '14px' }}
                        >
                            that's my event
                        </PrimeButton>
                    </Box>
                </Box>
            </RecommendationCard>
        );
    };

    return (
        <RecommendationContainer>
            <Typography sx={{ fontSize: '18px', margin: 0 }}>{SLIDING_COMPLETED_TITLE}</Typography>
            <Typography sx={{ fontSize: '24px', margin: 0, mb: 1 }}>{GOOD_MATCH_SUBTITLE}</Typography>

            {recommendations.map((rec, index) => renderRecommendation(rec, index))}

            <PrimeButton onClick={onRestart} style={{ marginTop: '16px', padding: '8px 24px' }}>
                {START_NEW_EVENT_BTN}
            </PrimeButton>
        </RecommendationContainer>
    );
};

export default RecommendationsPage;