import { useState } from 'react';
import { Container, Text, Input, Button } from '@jds4/oneui-react';

interface RefinePromptProps {
  refinements: string[];
  onAddRefinement: (note: string) => void;
  disabled?: boolean;
}

export function RefinePrompt({ refinements, onAddRefinement, disabled }: RefinePromptProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onAddRefinement(trimmed);
    setValue('');
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="2">
      <Text variant="label" size="S" appearance="neutral">
        Refine prompt
      </Text>
      {refinements.length > 0 && (
        <Container variant="full-bleed" layout="flex" direction="column" gap="1">
          {refinements.map((note, i) => (
            <Text key={i} variant="body" size="S" appearance="neutral">
              • {note}
            </Text>
          ))}
        </Container>
      )}
      <Container variant="full-bleed" layout="flex" gap="2">
        <div style={{ flex: 1 }}>
          <Input
            size="m"
            placeholder="Add a note, e.g. “make it feel more premium”"
            value={value}
            onChange={setValue}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <Button attention="medium" onClick={submit} disabled={!value.trim() || disabled}>
          Add
        </Button>
      </Container>
    </Container>
  );
}
