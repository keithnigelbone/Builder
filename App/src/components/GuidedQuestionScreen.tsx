import { useState } from 'react';
import { Container, Surface, Text, Input, Button, ChipGroup, Chip, Divider, CircularProgressIndicator } from '@jds4/oneui-react';
import type { BuildCategory } from '../types';
import type { FollowUpQuestion } from '../ai/schema';
import { StepProgress } from './StepProgress';

interface GuidedQuestionScreenProps {
  category: BuildCategory;
  question: FollowUpQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedOptionId: string | undefined;
  onSelectOption: (optionId: string) => void;
  onBack: () => void;
  busyLabel: string | null;
}

export function GuidedQuestionScreen({
  category,
  question,
  questionIndex,
  totalQuestions,
  selectedOptionId,
  onSelectOption,
  onBack,
  busyLabel,
}: GuidedQuestionScreenProps) {
  return (
    <Surface mode="default" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container variant="full-bleed" layout="flex" direction="column" gap="5" style={{ width: '100%', maxWidth: 560, padding: '0 24px' }}>
        <Container variant="full-bleed" layout="flex" direction="column" gap="3">
          <Text variant="label" size="S" appearance="primary">
            {category.label}
          </Text>
          <StepProgress step={questionIndex} total={totalQuestions} />
        </Container>

        <Divider />

        <Text variant="title" size="M">
          {question.prompt}
        </Text>

        {question.input === 'text' ? (
          <TextAnswer question={question} onSubmit={onSelectOption} disabled={!!busyLabel} />
        ) : (
          <ChipGroup
            aria-label={question.prompt}
            value={selectedOptionId ? [selectedOptionId] : []}
            onValueChange={(values) => {
              const next = values[values.length - 1];
              if (next) onSelectOption(next);
            }}
          >
            <Container variant="full-bleed" layout="flex" wrap gap="2">
              {question.options.map((option) => (
                <Chip key={option.id} value={option.id} size="l" attention="medium" disabled={!!busyLabel}>
                  {option.label}
                </Chip>
              ))}
            </Container>
          </ChipGroup>
        )}

        <Container variant="full-bleed" layout="flex" align="center" justify="space-between">
          <Button attention="low" onClick={onBack} disabled={!!busyLabel}>
            Back
          </Button>
          {busyLabel && (
            <Container variant="full-bleed" layout="flex" align="center" gap="2">
              <CircularProgressIndicator variant="indeterminate" size="XS" aria-label="Working" />
              <Text variant="label" size="S" appearance="neutral">
                {busyLabel}
              </Text>
            </Container>
          )}
        </Container>
      </Container>
    </Surface>
  );
}

function TextAnswer({
  question,
  onSubmit,
  disabled,
}: {
  question: FollowUpQuestion;
  onSubmit: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (!disabled) onSubmit(value.trim());
  };
  return (
    <Container variant="full-bleed" layout="flex" gap="2" width="full">
      <div style={{ flex: 1 }}>
        <Input
          size="l"
          placeholder={question.placeholder}
          value={value}
          onChange={setValue}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      <Button attention="high" size="l" onClick={submit} disabled={disabled}>
        Continue
      </Button>
    </Container>
  );
}
