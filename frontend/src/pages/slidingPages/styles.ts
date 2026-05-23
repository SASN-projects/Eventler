import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FullSizeContainer } from '../../components/layouts';

// BaseQuestions.tsx styles
export const BaseQuestionsContainer = styled(FullSizeContainer)({
    justifyContent: 'space-evenly',
    alignItems: 'center'
});

export const BaseQuestionsTitle = styled(Typography)({
    fontSize: '30px',
    margin: '30px'
});

export const InputsContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '300px'
});

// RecommendationsPage.tsx styles
export const RecommendationContainer = styled(FullSizeContainer)({
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 0'
});

export const RecommendationCard = styled(Box)<{ $isSelected?: boolean }>(({ $isSelected }) => ({
    gap: '8px',
    margin: '4px 16px',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    alignItems: 'center',
    backgroundColor: $isSelected ? '#fff8b5' : '#e3f2fd',
    border: $isSelected ? '4px solid #edb53c' : '4px solid transparent',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'all 0.4s ease-in-out',
    width: '90%',
    maxWidth: '700px'
}));

export const RecommendationName = styled(Typography)<{ $isSelected?: boolean }>(({ $isSelected }) => ({
    fontSize: '24px',
    fontWeight: $isSelected  ? 'bold' : 'normal',
    color: $isSelected ? '#edb53c' : '#1976d2',
}));

export const RecommendationCategory = styled(Typography)(({ theme }) => ({
    fontSize: '16px',
    fontStyle: 'italic',
    color: theme.palette.text.secondary
}));

export const RecommendationDescription = styled(Typography)({
    fontSize: '17px',
    textAlign: 'center'
});

export const LocationContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
});

export const DetailsContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    marginTop: '8px'
});

export const RatingContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
});

export const RatingText = styled(Typography)({
    fontSize: '18px',
    fontWeight: 'bold'
});

export const PriceText = styled(Typography)({
    fontSize: '18px',
    letterSpacing: 2
});

// Slide.tsx styles
export const SlideContainer = styled(FullSizeContainer)({
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
});

export const SlideTitle = styled(Typography)({
    fontSize: '30px',
    margin: '30px',
    color: '#FFFFFF'
});

export const OptionsContainer = styled(Box)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
});

export const OptionBox = styled(Box)<{ selected: boolean }>(({ selected }) => ({
    margin: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    padding: '16px 32px',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.05)',
    border: selected ? '3px solid #50a4ff' : '3px solid transparent',
    transition: 'border-color 0.2s',
    '&:hover': {
        filter: 'brightness(0.98)'
    }
}));

export const OptionText = styled(Typography)({
    color: '#50a4ff',
    fontSize: '18px',
    fontWeight: 500
});

// DecisionPage.tsx styles
export const LoadingContainer = styled(FullSizeContainer)({
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px'
});

export const LoadingTitle = styled(Typography)({
    fontSize: '20px',
    fontWeight: 'bold'
});

export const LoadingSubtitle = styled(Typography)(({ theme }) => ({
    fontSize: '16px',
    color: theme.palette.text.secondary
}));

export const LoadingTextContainer = styled(Box)({
    textAlign: 'center'
});
