import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as cmsFileService from './src/services/cmsFileService';
import type { CmsEdits, ContentTypeId, SavedVersion, VersionMetadata } from './src/types';
import type { BuildPlan } from './src/ai/schema';

/**
 * Dev-only local endpoint that fronts cmsFileService's Node.js file I/O +
 * git-commit logic (App/src/services/cmsFileService.ts). That module imports
 * node:fs/node:child_process/node:util directly, so it can never be imported
 * from browser code — Vite fails to bundle Node built-ins for the browser.
 * This plugin is the only place that imports cmsFileService now; App.tsx and
 * VersionHistory.tsx talk to it over these two small JSON POST routes
 * instead of calling it in-process.
 *
 * This only runs under `vite dev` (App/vite.config.ts). `vite build`
 * produces static files with no server — saving/browsing CMS versions is a
 * local-authoring workflow, not something a production deploy needs to
 * serve.
 */

interface SaveRequestBody {
  buildId: string;
  contentType: ContentTypeId;
  label: string;
  edits: CmsEdits;
  originalPlan: BuildPlan;
  refinements: string[];
}

interface VersionsRequestBody {
  buildId: string;
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function cmsServicePlugin(): Plugin {
  return {
    name: 'reliance-builder-cms-service',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/cms/save', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        try {
          const body = await readJsonBody<SaveRequestBody>(req);
          if (!body.buildId || !body.label || !body.edits || !body.originalPlan) {
            sendJson(res, 400, { error: 'Missing required fields: buildId, label, edits, originalPlan' });
            return;
          }

          const metadata: VersionMetadata = {
            buildId: body.buildId,
            contentType: body.contentType,
            label: body.label,
            timestamp: new Date().toISOString(),
          };
          const original: SavedVersion['original'] = { plan: body.originalPlan, refinements: body.refinements ?? [] };

          await cmsFileService.saveVersionToFile(metadata, body.edits, original);

          const version: SavedVersion = { metadata, edits: body.edits, original };
          sendJson(res, 200, { success: true, version });
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'Unknown error saving CMS version' });
        }
      });

      server.middlewares.use('/api/cms/versions', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        try {
          const body = await readJsonBody<VersionsRequestBody>(req);
          if (!body.buildId) {
            sendJson(res, 400, { error: 'Missing required field: buildId' });
            return;
          }

          const versions = await cmsFileService.getVersionHistory(body.buildId);
          sendJson(res, 200, versions);
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'Unknown error loading CMS versions' });
        }
      });
    },
  };
}
