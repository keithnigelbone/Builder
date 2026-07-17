import { useState } from 'react';
import { Container, Button, Text, Modal } from '@jds4/oneui-react';
import { AppScreenEditor } from './editors/AppScreenEditor';
import { VideoEditor } from './editors/VideoEditor';
import { SocialEditor } from './editors/SocialEditor';
import { MotionEditor } from './editors/MotionEditor';
import { SlideEditor } from './editors/SlideEditor';
import { TextField } from './fields/TextField';
import { getDefaultEditsForContentType } from '../../data/cmsDefaults';
import type { BuildRequest, CmsEdits, ContentTypeId } from '../../types';

interface CMSEditorProps {
  buildRequest: BuildRequest;
  contentType: ContentTypeId;
  onSave: (label: string, edits: CmsEdits) => Promise<void>;
}

const EDITORS: Record<ContentTypeId, typeof AppScreenEditor> = {
  appscreen: AppScreenEditor,
  video: VideoEditor,
  social: SocialEditor,
  motion: MotionEditor,
  slide: SlideEditor,
};

/** Main CMS editor form: owns edit state, renders the content-type-specific
 * field editor, and drives the labeled-save modal flow. */
export function CMSEditor({ buildRequest: _buildRequest, contentType, onSave }: CMSEditorProps) {
  const [edits, setEdits] = useState<CmsEdits>(() => getDefaultEditsForContentType(contentType));
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  const handleEditChange = (newEdits: CmsEdits) => {
    setEdits(newEdits);
    setUnsavedChanges(true);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveLabel.trim()) return;

    setIsSaving(true);
    try {
      await onSave(saveLabel, edits);
      setUnsavedChanges(false);
      setShowSaveModal(false);
      setSaveLabel('');
    } catch (error) {
      console.error('Save failed:', error);
      window.alert('Failed to save version. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (unsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    setEdits(getDefaultEditsForContentType(contentType));
    setUnsavedChanges(false);
  };

  const EditorComponent = EDITORS[contentType] || AppScreenEditor;

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3">
      <EditorComponent edits={edits} onChange={handleEditChange} onSave={async () => {}} />

      <Container variant="full-bleed" layout="flex" gap="2">
        <Button attention="high" onClick={handleSaveClick} disabled={isSaving || !unsavedChanges}>
          {isSaving ? 'Saving...' : 'Save Version'}
        </Button>
        <Button attention="low" onClick={handleDiscard} disabled={isSaving}>
          Discard
        </Button>
      </Container>

      {unsavedChanges && (
        <Text variant="label" size="S" appearance="neutral">
          ● Unsaved changes
        </Text>
      )}

      <Modal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        title="Save Version"
        footerEnd={
          <>
            <Button attention="low" onClick={() => setShowSaveModal(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              attention="high"
              onClick={handleConfirmSave}
              disabled={isSaving || !saveLabel.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <TextField
          name="save-label"
          label="Version Label"
          value={saveLabel}
          onChange={setSaveLabel}
          placeholder="e.g., Hero section – color refinement"
          help="Describe this version (required)"
        />
      </Modal>
    </Container>
  );
}
