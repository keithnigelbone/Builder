import { Container, Button, Text } from '@jds4/oneui-react';
import { CMSEditor } from './CMSEditor';
import type { BuildRequest, CmsEdits, ContentTypeId } from '../../types';
import styles from './CMSSidebar.module.css';

interface CMSSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  buildRequest: BuildRequest;
  contentType: ContentTypeId;
  onSave: (label: string, edits: CmsEdits) => Promise<void>;
  /** Forwarded straight through to CMSEditor — see its own doc comment.
   * Optional and additive. */
  onEditsChange?: (edits: CmsEdits) => void;
}

const CONTENT_TYPE_LABELS: Record<ContentTypeId, string> = {
  appscreen: 'App Screen',
  video: 'Video',
  social: 'Social Card',
  motion: 'Motion',
  slide: 'Slide',
};

/** Persistent left sidebar that hosts the CMS editor. Fixed-positioned,
 * toggled open/closed from the header, and stacks above app content. */
export function CMSSidebar({ isOpen, onToggle, buildRequest, contentType, onSave, onEditsChange }: CMSSidebarProps) {
  if (!isOpen) {
    return null;
  }

  const contentTypeLabel = CONTENT_TYPE_LABELS[contentType] ?? contentType;

  return (
    <Container variant="full-bleed" layout="flex" direction="column" className={styles.sidebar}>
      <Container
        variant="full-bleed"
        layout="flex"
        justify="space-between"
        align="center"
        className={styles.header}
      >
        <Container variant="full-bleed" layout="flex" direction="column" gap="0-5">
          <Text variant="title" size="S">
            CMS Editor
          </Text>
          <Text variant="label" size="XS" appearance="neutral">
            Editing: {contentTypeLabel}
          </Text>
        </Container>
        <Button attention="low" onClick={onToggle} aria-label="Close CMS editor">
          ×
        </Button>
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" className={styles.body}>
        <CMSEditor buildRequest={buildRequest} contentType={contentType} onSave={onSave} onEditsChange={onEditsChange} />
      </Container>

      <Container variant="full-bleed" className={styles.footer} />
    </Container>
  );
}
