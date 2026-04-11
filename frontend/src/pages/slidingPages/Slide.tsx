import { Box, Typography } from "@mui/material";
import { useEffect, useState, type FunctionComponent } from "react";
import { PrimeButton } from "../../components/buttons";
import { FullSizeContainer } from "../../components/layouts";

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

    const renderOption = (value: string) => (
        <Box
            key={value}
            onClick={() => setAnswer(value)}
            sx={{
                margin: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '16px 32px',
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0px 2px 10px rgba(0,0,0,0.05)',
                border: answer === value ? '3px solid #50a4ff' : '3px solid transparent',
                transition: 'border-color 0.2s',
                '&:hover': {
                    filter: 'brightness(0.98)'
                }
            }}
        >
            <Typography sx={{ color: '#50a4ff', fontSize: '18px', fontWeight: 500 }}>{value}</Typography>
        </Box>
    );

    return (
        <FullSizeContainer sx={{ justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '30px', m: '30px', color: '#FFFFFF' }}>{title}</Typography>

            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                {options.map(renderOption)}
            </Box>

            <PrimeButton sx={{ m: '30px' }} onClick={() => onNext(answer)} disabled={answer === ''}>
                Next
            </PrimeButton>
        </FullSizeContainer>
    );
};

export default Slide;