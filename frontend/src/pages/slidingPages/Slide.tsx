import { useEffect, useState, type FunctionComponent } from "react";
import { PrimeButton } from "../../components/buttons";
import { OptionBox, OptionsContainer, OptionText, SlideContainer, SlideTitle } from './styles';

interface SlideProps {
    title: string;
    options: string[];
    onNext: (s: string) => void;
    disabled?: boolean;
}

const Slide: FunctionComponent<SlideProps> = ({ title, options, onNext, disabled = false }) => {
    const [answer, setAnswer] = useState<string>('');

    useEffect(() => {
        setAnswer('');
    }, [title]);

    const renderOption = (value: string) => (
        <OptionBox
            key={value}
            onClick={() => {
                if (!disabled) setAnswer(value);
            }}
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

            <PrimeButton sx={{ m: '30px' }} onClick={() => onNext(answer)} disabled={disabled || answer === ''}>
                Next
            </PrimeButton>
        </SlideContainer>
    );
};

export default Slide;
