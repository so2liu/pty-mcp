import http from 'http';
import { SessionManager } from './session/SessionManager.js';
import { resolveKey } from './utils/keys.js';

const sessionManager = new SessionManager();

interface RequestBody {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  sessionId?: string;
  input?: string;
  specialKey?: string;
  waitMs?: number;
  includeScrollback?: boolean;
  format?: 'text' | 'ansi' | 'detailed';
  signal?: 'SIGTERM' | 'SIGKILL' | 'SIGHUP';
}

async function parseBody(req: http.IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function text(res: http.ServerResponse, data: string, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(data);
}

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/sessions') {
      return json(res, { sessions: sessionManager.list() });
    }

    if (req.method === 'POST' && path === '/spawn') {
      const body = await parseBody(req);
      const session = sessionManager.create({
        command: body.command || 'bash',
        args: body.args,
        cwd: body.cwd,
        env: body.env,
        cols: body.cols ?? 80,
        rows: body.rows ?? 24,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
      const snapshot = session.getSnapshot();

      return json(res, {
        sessionId: session.id,
        pid: session.pid,
        cols: session.size.cols,
        rows: session.size.rows,
        initialSnapshot: snapshot.text,
      });
    }

    if (req.method === 'POST' && path === '/input') {
      const body = await parseBody(req);
      if (!body.sessionId) {
        return json(res, { error: 'sessionId required' }, 400);
      }

      const session = sessionManager.getOrThrow(body.sessionId);

      if (body.specialKey) {
        session.write(resolveKey(body.specialKey));
      } else if (body.input !== undefined) {
        session.write(body.input);
      } else {
        return json(res, { error: 'input or specialKey required' }, 400);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, body.waitMs ?? 100)
      );
      const snapshot = session.getSnapshot();

      return json(res, {
        success: true,
        snapshot: snapshot.text,
        cursorPosition: snapshot.cursorPosition,
      });
    }

    if (req.method === 'POST' && path === '/snapshot') {
      const body = await parseBody(req);
      if (!body.sessionId) {
        return json(res, { error: 'sessionId required' }, 400);
      }

      const session = sessionManager.getOrThrow(body.sessionId);

      if (body.format === 'ansi') {
        // Return raw ANSI data
        return text(res, session.getAnsiSnapshot());
      }

      const snapshot = session.getSnapshot(body.includeScrollback ?? false);

      if (body.format === 'detailed') {
        return json(res, snapshot);
      }

      // Default: return raw screen text for better readability
      return text(res, snapshot.text);
    }

    if (req.method === 'POST' && path === '/resize') {
      const body = await parseBody(req);
      if (!body.sessionId || !body.cols || !body.rows) {
        return json(res, { error: 'sessionId, cols, rows required' }, 400);
      }

      const session = sessionManager.getOrThrow(body.sessionId);
      const previousSize = session.resize(body.cols, body.rows);

      await new Promise((resolve) => setTimeout(resolve, 100));
      const snapshot = session.getSnapshot();

      return json(res, {
        success: true,
        previousSize,
        newSize: session.size,
        snapshot: snapshot.text,
      });
    }

    if (req.method === 'POST' && path === '/close') {
      const body = await parseBody(req);
      if (!body.sessionId) {
        return json(res, { error: 'sessionId required' }, 400);
      }

      const result = sessionManager.close(
        body.sessionId,
        (body.signal ?? 'SIGTERM') as NodeJS.Signals
      );

      return json(res, {
        success: true,
        exitCode: result.exitCode,
        signal: result.signal,
      });
    }

    return json(res, { error: 'Not found' }, 404);
  } catch (error) {
    return json(
      res,
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

const PORT = parseInt(process.env.PORT || '3456', 10);

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`PTY Debug HTTP Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /sessions     - List all sessions');
  console.log('  POST /spawn        - Spawn a new session');
  console.log('  POST /input        - Send input to session');
  console.log('  POST /snapshot     - Get session snapshot');
  console.log('  POST /resize       - Resize session terminal');
  console.log('  POST /close        - Close session');
});

const cleanup = () => {
  sessionManager.closeAll();
  server.close();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
