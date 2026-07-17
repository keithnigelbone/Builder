import { useState } from 'react';
import { Container, Button, Text, Modal } from '@jds4/oneui-react';
import { AppScreenEditor } from './editors/AppScreenEditor';
import { VideoEditor } from './editors/VideoEditor';
import { SocialEditor } from './editors/SocialEditor';
import { MotionEditor } from './editors/MotionEditor';
import { SlideEditor } from './editors/SlideEditor';
import { TextField } from './fields/TextField';
import { VersionHistory } from './VersionHistory';
import { getDefaultEditsForContentType } from '../../data/cmsDefaults';
import { deriveBuildId } from '../../services/cmsFileService';
import type { BuildRequest, CmsEdits, ContentTypeId } from '../../types';

interface CMSEditorProps {
  buildRequest: BuildRequest;
  contentType: ContentTypeId;
  onSave: (label: string, edits: CmsEdits) => Promise<void>;
  /** Fired with the full edit set on every field change (and on discard).
   * Optional and additive — lets a parent (e.g. App) mirror the live edits
   * elsewhere, such as feeding BuildPreview for a real-time preview. */
  onEditsChange?: (edits: CmsEdits) => void;
  /** Fired whenever the unsaved-changes flag changes. Optional and additive
   * — lets a parent (e.g. App) guard navigation/close actions with a
   * confirmation when the user has edits that haven't been saved yet. */
  onUnsavedChangesChange?: (unsaved: boolean) => void;
}

const EDITORS: Record<ContentTypeId, typeof AppScreenEditor> = {
  appscreen: AppScreenEditor,
  video: VideoEditor,
  social: SocialEditor,
  motion: MotionEditor,
  slide: SlideEditor,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Main CMS editor form: owns edit state, renders the content-type-specific
 * field editor, and drives the labeled-save modal flow. */
export function CMSEditor({ buildRequest, contentType, onSave, onEditsChange, onUnsavedChangesChange }: CMSEditorProps) {
  const [edits, setEdits] = useState<CmsEdits>(() => getDefaultEditsForContentType(contentType));
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const setUnsaved = (value: boolean) => {
    setUnsavedChanges(value);
    onUnsavedChangesChange?.(value);
  };

  const handleEditChange = (newEdits: CmsEdits) => {
    setEdits(newEdits);
    setUnsaved(true);
    onEditsChange?.(newEdits);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const attemptSave = async () => {
    setIsSaving(true);
    try {
      await onSave(saveLabel, edits);
      setUnsaved(false);
      setShowSaveModal(false);
      setSaveLabel('');
      setSaveError(null);
    } catch (error) {
      console.error('Save failed:', error);
      // Hide the label modal in favor of the error modal below — retrying
      // or discarding doesn't need the label field visible underneath it.
      setShowSaveModal(false);
      setSaveError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!saveLabel.trim()) return;
    await attemptSave();
  };

  const handleRetrySave = async () => {
    await attemptSave();
  };

  const handleDiscardAfterError = () => {
    const defaults = getDefaultEditsForContentType(contentType);
    setEdits(defaults);
    setUnsaved(false);
    setSaveError(null);
    setShowSaveModal(false);
    setSaveLabel('');
    onEditsChange?.(defaults);
  };

  const handleDiscard = () => {
    if (unsavedChanges && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    const defaults = getDefaultEditsForContentType(contentType);
    setEdits(defaults);
    setUnsaved(false);
    // Mirror the reset too, so a parent holding a lifted copy (e.g. App's
    // cmsEdits state feeding BuildPreview) doesn't keep stale field values
    // around after the user discards.
    onEditsChange?.(defaults);
  };

  const handleLoadVersion = (loadedEdits: CmsEdits) => {
    // Replace wholesale, never merge with the currently in-progress edits —
    // otherwise loading an older version could silently splice in fields
    // from whatever the user had typed since the last save.
    setEdits(loadedEdits);
    setUnsaved(true);
    onEditsChange?.(loadedEdits);
  };

  const EditorComponent = EDITORS[contentType] || AppScreenEditor;
  const buildId = deriveBuildId(buildRequest);

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
        <Button attention="low" onClick={() => setShowVersionHistory((prev) => !prev)}>
          {showVersionHistory ? 'Hide Version History' : 'Version History'}
        </Button>
      </Container>

      {unsavedChanges && (
        <Text variant="label" size="S" appearance="neutral">
          ● Unsaved changes
        </Text>
      )}

      {showVersionHistory && <VersionHistory buildId={buildId} onLoadVersion={handleLoadVersion} />}

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

      <Modal
        open={saveError !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setSaveError(null);
        }}
        title="Save Failed"
        footerEnd={
          <>
            <Button attention="low" onClick={handleDiscardAfterError} disabled={isSaving}>
              Discard
            </Button>
            <Button attention="high" onClick={handleRetrySave} disabled={isSaving}>
              {isSaving ? 'Retrying...' : 'Retry'}
            </Button>
          </>
        }
      >
        <Text variant="body" size="S">
          Failed to save version. Error: {saveError}
        </Text>
      </Modal>
    </Container>
  );
}
