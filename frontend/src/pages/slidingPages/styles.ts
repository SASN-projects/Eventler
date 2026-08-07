import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FullSizeContainer } from '../../components/layouts';

// BaseQuestions.tsx styles
export const BaseQuestionsContainer = styled(FullSizeContainer)({
    justifyContent: 'center',
    alignItems: 'center',
    gap: '28px',
    padding: '32px 20px',
    background: 'var(--eventler-gradient-soft)'
});

export const BaseQuestionsTitle = styled(Typography)({
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 'min(340px, 88vw)',
    margin: '0 0 4px',
    padding: '18px 28px 20px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.78)',
    background: 'rgba(255,255,255,0.74)',
    boxShadow: 'var(--eventler-shadow)',
    color: 'transparent',
    backgroundImage: 'var(--eventler-gradient)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    fontSize: 'clamp(42px, 10vw, 64px)',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: 0,
    textAlign: 'center',
    textShadow: '0 12px 30px rgba(255, 88, 118, 0.1)',
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: '8px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(255, 88, 118, 0.12), rgba(109, 114, 232, 0.1))',
        zIndex: -1
    },
});

export const InputsContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '300px'
});

// RecommendationsPage.tsx styles
export const RecommendationContainer = styled(FullSizeContainer)({
    justifyContent: 'safe center',
    alignItems: 'center',
    gap: '12px',
    padding: '24px',
    overflowY: 'auto',
    minHeight: '100%',
    background: 'var(--eventler-gradient-soft)'
});

export const RecommendationCard = styled(Box)<{ $isSelected?: boolean }>(({ $isSelected }) => ({
    gap: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    alignItems: 'stretch',
    backgroundColor: $isSelected ? '#fff8dd' : '#ffffff',
    border: $isSelected ? '3px solid var(--eventler-accent)' : '1px solid var(--eventler-border)',
    boxShadow: 'var(--eventler-shadow-soft)',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s, transform 0.2s',
    minWidth: 0,
    height: '100%',
    '&:hover': {
        transform: 'translateY(-2px)'
    }
}));

export const RecommendationName = styled(Typography)<{ $isSelected?: boolean }>(({ $isSelected }) => ({
    fontSize: '20px',
    fontWeight: $isSelected  ? 900 : 800,
    color: $isSelected ? '#b7791f' : 'var(--eventler-secondary)',
    lineHeight: 1.2,
}));

export const RecommendationCategory = styled(Typography)(({ theme }) => ({
    fontSize: '16px',
    fontStyle: 'italic',
    color: theme.palette.text.secondary
}));

export const RecommendationDescription = styled(Typography)({
    fontSize: '15px',
    textAlign: 'left',
    lineHeight: 1.45
});

export const LocationContainer = styled(Box)({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
});

export const RecommendationsGrid = styled(Box)(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '16px',
    width: '100%',
    maxWidth: '1180px',
    alignItems: 'stretch',
    [theme.breakpoints.down('md')]: {
        gridTemplateColumns: '1fr',
        maxWidth: '560px'
    }
}));

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
    gap: '8px',
    padding: '24px',
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
    backdropFilter: 'blur(8px)',
    minHeight: '100%',
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
    boxShadow: 'var(--eventler-shadow-soft)',
    border: selected ? '3px solid var(--eventler-secondary)' : '3px solid transparent',
    transition: 'border-color 0.2s',
    '&:hover': {
        filter: 'brightness(0.98)'
    }
}));

export const OptionText = styled(Typography)({
    color: 'var(--eventler-secondary)',
    fontSize: '18px',
    fontWeight: 800
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
