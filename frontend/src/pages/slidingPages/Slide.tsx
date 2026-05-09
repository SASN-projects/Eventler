import { useEffect, useState, type FunctionComponent } from "react";
import { PrimeButton } from "../../components/buttons";
import { OptionBox, OptionsContainer, OptionText, SlideContainer, SlideTitle } from './styles';

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
        <OptionBox
            key={value}
            onClick={() => setAnswer(value)}
            selected={answer === value}
        >
            <OptionText>{value}</OptionText>
        </OptionBox>
    );

    return (
        <SlideContainer>
            <SlideTitle>{title}</SlideTitle>

            <OptionsContainer>
                {options.map(renderOption)}
            </OptionsContainer>

            <PrimeButton sx={{ m: '30px' }} onClick={() => onNext(answer)} disabled={answer === ''}>
                Next
            </PrimeButton>
        </SlideContainer>
    );
};

export default Slide;