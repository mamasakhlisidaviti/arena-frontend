import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { type NextFunction, type Request, type Response } from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const apiOrigin = (process.env['API_INTERNAL_URL'] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');

const PROXY_PREFIXES = ['/api', '/uploads', '/sitemap.xml', '/robots.txt'];
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
]);

const app = express();
const allowedHosts = (process.env['ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.disable('x-powered-by');

function shouldProxy(path: string): boolean {
  return PROXY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function readBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Forwards API, media and crawler files to the Express backend. */
async function proxyToApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!shouldProxy(req.path)) {
    next();
    return;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (key === 'host' || key === 'connection' || key === 'content-length') {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);

  try {
    const upstream = await fetch(`${apiOrigin}${req.originalUrl}`, {
      method,
      headers,
      body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });

    res.status(upstream.status);
    for (const cookie of upstream.headers.getSetCookie?.() ?? []) {
      res.append('set-cookie', cookie);
    }
    upstream.headers.forEach((value, key) => {
      if (key === 'set-cookie' || HOP_BY_HOP.has(key)) {
        return;
      }
      res.setHeader(key, value);
    });

    if (upstream.body) {
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
    }
    res.end();
  } catch {
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: { code: 'PROXY_UNAVAILABLE', message: 'The API server is unreachable.' },
      });
    } else {
      res.end();
    }
  }
}

app.use(proxyToApi);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
