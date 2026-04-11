import { Box, Button, Typography } from "@mui/material";
import { useState, type FunctionComponent } from "react";
import { FullSizeContainer } from "../../components/layouts";

interface SlideProps {
    title: string;
    options: string[];
    onNext: (s: string) => void;
}

const Slide: FunctionComponent<SlideProps> = ({ title, options, onNext }) => {
    const [answer, setAnswer] = useState<string>('');

    return (
        <FullSizeContainer>
            <Typography>{title}</Typography>

            <Box style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                {
                    options.map(o =>
                        <Typography onClick={() => setAnswer(o)}>{o}</Typography>)
                }
            </Box>

            <Button onClick={() => onNext(answer)}>
                Next
            </Button>
        </FullSizeContainer>
    );
};

export default Slide;