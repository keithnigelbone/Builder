import { useEffect, useState } from 'react';
import { Container, Text } from '@jds4/oneui-react';
import type { CmsEdits, SavedVersion } from '../../types';
import styles from './VersionHistory.module.css';

interface VersionHistoryProps {
  buildId: string;
  onLoadVersion: (edits: CmsEdits) => void;
}

async function fetchVersionHistory(buildId: string): Promise<SavedVersion[]> {
  // cmsFileService (node:fs) can't be bundled into browser code — it runs
  // server-side, behind this endpoint, in App/cmsServicePlugin.ts.
  const response = await fetch('/api/cms/versions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ buildId }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/** Browses saved versions for a build (read from builds/ via the CMS service
 * endpoint) and lets the user load one back into the editor after confirming. */
export function VersionHistory({ buildId, onLoadVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchVersionHistory(buildId).then((result) => {
      if (!cancelled) {
        setVersions(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [buildId]);

  const handleRowClick = (version: SavedVersion) => {
    const label = version.metadata.label;
    if (window.confirm(`Replace current edits with version from ${label}?`)) {
      onLoadVersion(version.edits);
    }
  };

  if (isLoading) {
    return (
      <Container variant="full-bleed">
        <Text variant="label" size="S" appearance="neutral">
          Loading versions...
        </Text>
      </Container>
    );
  }

  if (versions.length === 0) {
    return (
      <Container variant="full-bleed">
        <Text variant="label" size="S" appearance="neutral">
          No saved versions yet.
        </Text>
      </Container>
    );
  }

  return (
    <Container variant="full-bleed" layout="flex" direction="column" className={styles.list}>
      {versions.map((version) => {
        const commit = version.metadata.git?.commit;
        return (
          <div
            key={`${version.metadata.timestamp}-${version.metadata.label}`}
            className={styles.row}
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(version)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleRowClick(version);
              }
            }}
          >
            <Container variant="full-bleed" layout="flex" direction="column" gap="0-5">
              <Text variant="body" size="S">
                {version.metadata.label}
              </Text>
              <Container variant="full-bleed" layout="flex" gap="1" align="center">
                <Text variant="label" size="XS" appearance="neutral">
                  {version.metadata.timestamp}
                </Text>
                {commit && (
                  <a
                    href={`#${commit}`}
                    className={styles.commitLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {commit.slice(0, 7)}
                  </a>
                )}
              </Container>
            </Container>
          </div>
        );
      })}
    </Container>
  );
}
