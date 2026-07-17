import { Container } from '@jds4/oneui-react';
import { TextField } from '../fields/TextField';
import { ImageUpload } from '../fields/ImageUpload';
import { ColorPicker } from '../fields/ColorPicker';
import { ComponentSelector } from '../fields/ComponentSelector';
import { APP_SCREEN_SCHEMA } from '../../../services/cmsEditorSchemas';
import type { CmsEdits } from '../../../types';

interface AppScreenEditorProps {
  edits: CmsEdits;
  onChange: (edits: CmsEdits) => void;
  onSave: (label: string) => Promise<void>;
}

export function AppScreenEditor({ edits, onChange }: AppScreenEditorProps) {
  const schema = APP_SCREEN_SCHEMA;

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...edits,
      [fieldName]: value,
    });
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3">
      {schema.fields.map((field) => {
        const value = edits[field.name] ?? '';

        switch (field.type) {
          case 'text':
            return (
              <TextField
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(value)}
                onChange={(v) => handleFieldChange(field.name, v)}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                help={field.help}
                validation={field.validation}
              />
            );

          case 'textarea':
            return (
              <TextField
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(value)}
                onChange={(v) => handleFieldChange(field.name, v)}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                help={field.help}
              />
            );

          case 'image':
            return (
              <ImageUpload
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(value)}
                onChange={(v) => handleFieldChange(field.name, v)}
                help={field.help}
              />
            );

          case 'color':
            return (
              <ColorPicker
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(value)}
                onChange={(v) => handleFieldChange(field.name, v)}
                help={field.help}
              />
            );

          case 'dropdown':
            return (
              <ComponentSelector
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(value)}
                onChange={(v) => handleFieldChange(field.name, v)}
                options={field.options || []}
                help={field.help}
              />
            );

          default:
            return null;
        }
      })}
    </Container>
  );
}
