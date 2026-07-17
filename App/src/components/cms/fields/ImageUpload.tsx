import { useMemo, useRef, useState } from 'react';
import { Button, Text, Container } from '@jds4/oneui-react';
import { TextField } from './TextField';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  name: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  help?: string;
}

/**
 * Validates that a value is a well-formed, HTTPS-only URL.
 * Returns an error message, or null when the value is valid (or empty —
 * emptiness is a required-field concern, not a format concern).
 */
function validateImageUrl(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Enter a valid URL';
  }

  if (parsed.protocol !== 'https:') {
    return 'Image URL must use HTTPS';
  }

  return null;
}

export function ImageUpload({
  name,
  label,
  value,
  onChange,
  error,
  help,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const formatError = useMemo(() => validateImageUrl(value), [value]);
  const displayError = error ?? formatError ?? undefined;
  const hasValidPreview = !!value && !formatError;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    // NOTE: Actual CDN upload is out of scope for this component. Wiring a
    // real upload service here should resolve to an HTTPS URL and call
    // onChange(url) once the file has finished uploading.
    setSelectedFileName(file.name);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="1"
      style={{ marginBottom: '16px' }}
    >
      <Text variant="label" size="S">
        {label}
      </Text>

      <div
        className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Button
          type="button"
          attention="medium"
          size="s"
          onPress={handleUploadClick}
          data-testid={`${name}-upload-button`}
        >
          Upload Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFileInput}
          onChange={handleFileInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
        {selectedFileName && (
          <Text variant="label" size="XS" appearance="neutral">
            Selected: {selectedFileName} — paste the uploaded HTTPS URL below
          </Text>
        )}
      </div>

      <TextField
        name={name}
        label="Or paste URL"
        value={value}
        onChange={onChange}
        placeholder="https://example.com/image.jpg"
        error={displayError}
        help={help}
      />

      {hasValidPreview && (
        <div className={styles.previewWrap}>
          <img
            src={value}
            alt={`${label} preview`}
            className={styles.previewImage}
            data-testid={`${name}-preview`}
          />
        </div>
      )}
    </Container>
  );
}
