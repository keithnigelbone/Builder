import { Text, Container } from '@jds4/oneui-react';
import styles from './TextField.module.css';

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  error?: string;
  validation?: (value: string) => string | null;
  help?: string;
}

export function TextField({
  name,
  label,
  value,
  onChange,
  maxLength = 255,
  placeholder = '',
  error,
  validation,
  help,
}: TextFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="1" style={{ marginBottom: '16px' }}>
      <Text variant="label" size="S">
        {label}
      </Text>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        placeholder={placeholder}
        className={styles.input}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
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
      {maxLength && (
        <Text variant="label" size="XS" appearance="neutral">
          {value.length} / {maxLength}
        </Text>
      )}
    </Container>
  );
}
