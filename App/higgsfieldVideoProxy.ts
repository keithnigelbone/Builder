import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Dev-only local proxy to Higgsfield's video generation, via the `higgsfield`
 * CLI (there is no REST API). Requires the CLI installed and `higgsfield auth
 * login` already run in a terminal; this proxy does not manage installation
 * or authentication.
 *
 * The client posts { prompt: string, startImageDataUrl?: string } to
 * /api/higgsfield-video; this middleware shells out to `higgsfield generate
 * create seedance_2_0 ... --wait --json`, optionally passing the decoded
 * startImageDataUrl as a temp-file --start-image, and returns the resulting
 * video URL. Errors (CLI missing, not authenticated, generation failure) come
 * back as a JSON error the client already treats as "no video" — it never
 * throws, the UI just shows the error message.
 *
 * This only runs under `vite dev` (App/vite.config.ts), same constraint as
 * aiServerPlugin.ts's Claude proxy and geminiImageProxy.ts.
 */

const execFileAsync = promisify(execFile);

interface VideoRequestBody {
  prompt: string;
  startImageDataUrl?: string;
}

function readJsonBody(req: IncomingMessage): Promise<VideoRequestBody> {
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

/**
 * Decode a data URL (e.g. "data:image/jpeg;base64,...") to a temp file path.
 * Higgsfield's --start-image flag takes a local file path or upload UUID, not
 * raw base64, so the in-memory hero image has to be written to disk first.
 */
async function writeDataUrlToTempFile(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('startImageDataUrl is not a recognized data URL');
  const [, ext, base64] = match;
  const filePath = path.join(tmpdir(), `higgsfield-start-${randomUUID()}.${ext}`);
  await writeFile(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

/**
 * The exact JSON shape of a completed job was not confirmed from
 * documentation alone. This tries several plausible shapes; if none match,
 * the raw JSON is included in the thrown error so a real response can be
 * inspected and this function adjusted, rather than failing silently.
 */
function extractVideoUrl(jobResult: unknown): string {
  const job = Array.isArray(jobResult) ? jobResult[0] : jobResult;
  const j = job as Record<string, any> | null | undefined;
  const candidates = [j?.output_url, j?.output?.url, j?.result?.url, j?.url, j?.results?.[0]?.url];
  const found = candidates.find((c) => typeof c === 'string' && c.length > 0);
  if (!found) {
    throw new Error(`Could not find a video URL in the Higgsfield response. Raw job: ${JSON.stringify(jobResult).slice(0, 500)}`);
  }
  return found;
}

export function higgsfieldVideoProxy(): Plugin {
  return {
    name: 'reliance-builder-higgsfield-video-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/higgsfield-video', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        let tempFilePath: string | undefined;

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          if (body.startImageDataUrl) {
            tempFilePath = await writeDataUrlToTempFile(body.startImageDataUrl);
          }

          const args = ['generate', 'create', 'seedance_2_0', '--prompt', body.prompt];
          if (tempFilePath) args.push('--start-image', tempFilePath);
          args.push('--wait', '--json');

          const { stdout } = await execFileAsync('higgsfield', args, {
            timeout: 25 * 60 * 1000,
            maxBuffer: 10 * 1024 * 1024,
          });

          const jobResult = JSON.parse(stdout);
          const videoUrl = extractVideoUrl(jobResult);
          sendJson(res, 200, { result: { videoUrl } });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error calling Higgsfield';

          if (message.includes('ENOENT')) {
            sendJson(res, 503, {
              error:
                'The higgsfield CLI is not installed. Install it: curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh',
            });
            return;
          }

          if (message.includes('Session expired') || message.includes('Not authenticated')) {
            sendJson(res, 503, {
              error: 'Higgsfield session expired or not authenticated. Run `higgsfield auth login` in a terminal, then try again.',
            });
            return;
          }

          sendJson(res, 502, { error: message.slice(0, 500) });
        } finally {
          if (tempFilePath) {
            await unlink(tempFilePath).catch(() => {});
          }
        }
      });
    },
  };
}
