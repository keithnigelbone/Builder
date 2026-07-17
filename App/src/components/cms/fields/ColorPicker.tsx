import { useMemo } from 'react';
import { Text, Container } from '@jds4/oneui-react';
import { TextField } from './TextField';
import styles from './ColorPicker.module.css';

const RELIANCE_TOKENS: Record<string, string> = {
  'Reliance Navy': '#1a2640',
  'Reliance Gold': '#d4a574',
  'Reliance Sky': '#87ceeb',
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
  name: string;
  label: string;
  value: string;
  onChange: (color: string) => void;
  error?: string;
  help?: string;
}

/**
 * Validates that a value is either a well-formed 6-digit hex color or a
 * known Reliance brand token (matched by hex value or by token name).
 * Returns an error message, or null when the value is valid (or empty —
 * emptiness is a required-field concern, not a format concern).
 */
function validateColor(color: string): string | null {
  if (!color) return null;
  if (HEX_PATTERN.test(color)) return null;
  const lower = color.toLowerCase();
  if (Object.values(RELIANCE_TOKENS).some((hex) => hex.toLowerCase() === lower)) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(RELIANCE_TOKENS, color)) return null;
  return 'Enter a valid hex color (e.g., #1a2640)';
}

export function ColorPicker({
  name,
  label,
  value,
  onChange,
  error,
  help,
}: ColorPickerProps) {
  const formatError = useMemo(() => validateColor(value), [value]);
  const displayError = error ?? formatError ?? undefined;
  const swatchColor = HEX_PATTERN.test(value) ? value : '#ffffff';

  const handleChange = (newColor: string) => {
    // Normalize hex codes to lowercase; leave non-hex values (e.g. token
    // names) untouched so exact-name matching in validateColor still works.
    const normalized = HEX_PATTERN.test(newColor) ? newColor.toLowerCase() : newColor;
    onChange(normalized);
  };

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="2"
      style={{ marginBottom: '16px' }}
    >
      <Container variant="full-bleed" layout="flex" align="center" gap="2">
        <Text variant="label" size="S">
          {label}
        </Text>
        <div
          className={styles.swatch}
          style={{ backgroundColor: swatchColor }}
          role="img"
          aria-label={`Color preview: ${value}`}
        />
      </Container>

      <input
        type="color"
        name={name}
        value={swatchColor}
        onChange={(e) => handleChange(e.target.value)}
        className={styles.nativeInput}
        aria-label={`${label} color picker`}
      />

      <TextField
        name={`${name}-hex`}
        label="Hex Code"
        value={value}
        onChange={handleChange}
        placeholder="#1a2640"
        maxLength={7}
        error={displayError}
        help={help}
      />

      <Container variant="full-bleed" layout="flex" direction="column" gap="1">
        <Text variant="label" size="XS">
          Brand Tokens
        </Text>
        <Container variant="full-bleed" layout="flex" gap="1" wrap>
          {Object.entries(RELIANCE_TOKENS).map(([tokenName, hex]) => (
            <button
              key={hex}
              type="button"
              className={styles.tokenButton}
              style={{ backgroundColor: hex }}
              onClick={() => handleChange(hex)}
              title={tokenName}
              aria-label={tokenName}
            />
          ))}
        </Container>
      </Container>
    </Container>
  );
}
