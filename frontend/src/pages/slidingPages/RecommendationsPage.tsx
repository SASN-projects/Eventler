import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Typography } from '@mui/material';
import type { FunctionComponent } from 'react';
import { PrimeButton } from '../../components/buttons';
import { GOOD_MATCH_SUBTITLE, SLIDING_COMPLETED_TITLE, START_NEW_EVENT_BTN } from './consts';
import { DetailsContainer, LocationContainer, PriceText, RatingContainer, RatingText, RecommendationCard, RecommendationCategory, RecommendationContainer, RecommendationDescription, RecommendationName } from './styles';
import type { Recommendation } from './types';
import { parsePriceLevel } from './utils';

interface RecommendationsProps {
    onRestart: () => void;
    recommendation: Recommendation;
}

export const RecommendationsPage: FunctionComponent<RecommendationsProps> = ({ recommendation, onRestart }) => {
    const price = parsePriceLevel(recommendation.priceLevel);

    return (
        <RecommendationContainer>
            <Typography sx={{ fontSize: '20px' }}>{SLIDING_COMPLETED_TITLE}</Typography>
            <Typography sx={{ fontSize: '30px' }}>{GOOD_MATCH_SUBTITLE}</Typography>

            <RecommendationCard>
                <VerifiedIcon sx={{ color: '#edb53c' }} />
                <RecommendationName>
                    {recommendation.name}
                </RecommendationName>
                
                <RecommendationCategory>
                    {recommendation.category}
                </RecommendationCategory>

                <RecommendationDescription>
                    {recommendation.description}
                </RecommendationDescription>

                <LocationContainer>
                    <LocationOnIcon />
                    <Typography sx={{ fontSize: '16px' }}>
                        {`${recommendation.address}, ${recommendation.city}, ${recommendation.country}`}
                    </Typography>
                </LocationContainer>

                <DetailsContainer>
                    {/* <RatingContainer>
                        <RatingText>{recommendation.rating}</RatingText>
                        <StarIcon sx={{ color: '#edb53c' }} />
                    </RatingContainer> */}

                    {/* <PriceText>
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
                    </PriceText> */}
                </DetailsContainer>
            </RecommendationCard>

            <PrimeButton onClick={onRestart}>
                {START_NEW_EVENT_BTN}
            </PrimeButton>
        </RecommendationContainer>
    );
};

export default RecommendationsPage;