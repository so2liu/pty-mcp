import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SessionManager } from './session/SessionManager.js';
import { resolveKey } from './utils/keys.js';

export function createServer(): McpServer {
  const sessionManager = new SessionManager();

  const server = new McpServer({
    name: 'pty-debug-server',
    version: '1.0.0',
  });

  // spawn_session tool
  server.tool(
    'spawn_session',
    'Spawn a TUI program in a new pseudo-terminal session',
    {
      command: z.string().describe('Command to execute (e.g., vim, htop, bash)'),
      args: z.array(z.string()).optional().describe('Command arguments'),
      cwd: z.string().optional().describe('Working directory'),
      env: z.record(z.string()).optional().describe('Additional environment variables'),
      cols: z.number().min(10).max(500).default(80).describe('Terminal width'),
      rows: z.number().min(5).max(200).default(24).describe('Terminal height'),
    },
    async ({ command, args, cwd, env, cols, rows }) => {
      try {
        const session = sessionManager.create({ command, args, cwd, env, cols, rows });

        // Wait a bit for initial output
        await new Promise((resolve) => setTimeout(resolve, 200));

        const snapshot = session.getSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId: session.id,
                  pid: session.pid,
                  cols: session.size.cols,
                  rows: session.size.rows,
                  initialSnapshot: snapshot.text,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // send_input tool
  server.tool(
    'send_input',
    'Send keyboard input (text or special keys) to a PTY session',
    {
      sessionId: z.string().uuid().describe('Session ID'),
      input: z.string().optional().describe('Text to send'),
      specialKey: z
        .string()
        .optional()
        .describe('Special key to send (e.g., enter, tab, shift+tab, ctrl+c, alt+f, f1-f12, arrow keys with modifiers like shift+up)'),
      waitMs: z
        .number()
        .min(0)
        .max(10000)
        .default(100)
        .describe('Wait time after input'),
    },
    async ({ sessionId, input, specialKey, waitMs }) => {
      try {
        const session = sessionManager.getOrThrow(sessionId);

        if (specialKey) {
          session.write(resolveKey(specialKey));
        } else if (input !== undefined) {
          session.write(input);
        } else {
          throw new Error('Either input or specialKey must be provided');
        }

        await new Promise((resolve) => setTimeout(resolve, waitMs));

        const snapshot = session.getSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  snapshot: snapshot.text,
                  cursorPosition: snapshot.cursorPosition,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_snapshot tool
  server.tool(
    'get_snapshot',
    'Get current terminal screen state',
    {
      sessionId: z.string().uuid().describe('Session ID'),
      includeScrollback: z
        .boolean()
        .default(false)
        .describe('Include scrollback buffer'),
      format: z
        .enum(['text', 'ansi', 'detailed'])
        .default('text')
        .describe('Output format'),
    },
    async ({ sessionId, includeScrollback, format }) => {
      try {
        const session = sessionManager.getOrThrow(sessionId);

        if (format === 'ansi') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ansiData: session.getAnsiSnapshot(),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const snapshot = session.getSnapshot(includeScrollback);

        if (format === 'detailed') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(snapshot, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  screen: snapshot.text,
                  cursorPosition: snapshot.cursorPosition,
                  terminalSize: snapshot.terminalSize,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // resize_terminal tool
  server.tool(
    'resize_terminal',
    'Resize the terminal dimensions',
    {
      sessionId: z.string().uuid().describe('Session ID'),
      cols: z.number().min(10).max(500).describe('New width'),
      rows: z.number().min(5).max(200).describe('New height'),
    },
    async ({ sessionId, cols, rows }) => {
      try {
        const session = sessionManager.getOrThrow(sessionId);
        const previousSize = session.resize(cols, rows);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const snapshot = session.getSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  previousSize,
                  newSize: session.size,
                  snapshot: snapshot.text,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // list_sessions tool
  server.tool(
    'list_sessions',
    'List all active PTY sessions',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                sessions: sessionManager.list(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // close_session tool
  server.tool(
    'close_session',
    'Close a PTY session',
    {
      sessionId: z.string().uuid().describe('Session ID'),
      signal: z
        .enum(['SIGTERM', 'SIGKILL', 'SIGHUP'])
        .default('SIGTERM')
        .describe('Signal to send'),
    },
    async ({ sessionId, signal }) => {
      try {
        const result = sessionManager.close(sessionId, signal as NodeJS.Signals);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  exitCode: result.exitCode,
                  signal: result.signal,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: true,
                  message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Cleanup on server shutdown
  const cleanup = () => {
    sessionManager.closeAll();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return server;
}
