import { Text, Container } from '@jds4/oneui-react';
import styles from './ComponentSelector.module.css';

interface Option {
  label: string;
  value: string;
}

interface ComponentSelectorProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  error?: string;
  help?: string;
}

export function ComponentSelector({
  name,
  label,
  value,
  onChange,
  options,
  error,
  help,
}: ComponentSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="1" style={{ marginBottom: '16px' }}>
      <Text variant="label" size="S">
        {label}
      </Text>
      <select
        name={name}
        value={value}
        onChange={handleChange}
        className={styles.select}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <option value="">Choose an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <Text
          id={`${name}-error`}
          variant="label"
          size="XS"
          appearance="negative"
        >
          {error}
        </Text>
      )}
      {help && !error && (
        <Text variant="label" size="XS" appearance="neutral">
          {help}
        </Text>
      )}
    </Container>
  );
}
