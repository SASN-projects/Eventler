import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState, type FunctionComponent } from "react";
import { FullSizeContainer } from "../../components/layouts";
import { PrimeButton } from "../../components/inputs";

const renderOption = (text: string, isSelected: boolean, onClick: () => void) => (
    <Box
        key={text}
        onClick={onClick}
        sx={{
            margin: '8px',
            cursor: 'pointer',
            textAlign: 'center',
            padding: '16px 32px',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0px 2px 10px rgba(0,0,0,0.05)',
            border: isSelected ? '3px solid #1976d2' : '3px solid transparent',
            transition: 'border-color 0.2s',
            '&:hover': {
                filter: 'brightness(0.96)'
            }
        }}
    >
        <Typography sx={{ color: '#333', fontSize: '18px', fontWeight: 500 }}>{text}</Typography>
    </Box>
);

interface SlideProps {
    title: string;
    options: string[];
    onNext: (s: string) => void;
}

const Slide: FunctionComponent<SlideProps> = ({ title, options, onNext }) => {
    const [answer, setAnswer] = useState<string>('');

    useEffect(() => {
        setAnswer('');
    }, [title]);

    return (
        <FullSizeContainer sx={{justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '30px', m: '30px', color: '#FFFFFF' }}>{title}</Typography>

            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                {options.map(o => renderOption(o, answer === o, () => setAnswer(o)))}
            </Box>

            <PrimeButton sx={{m: '30px'}} onClick={() => onNext(answer)} disabled={answer === ''}>
                Next
            </PrimeButton>
        </FullSizeContainer>
    );
};

export default Slide;