import { PtySession } from './PtySession.js';
import type { PtySessionOptions, SessionInfo } from '../types.js';

export class SessionManager {
  private sessions: Map<string, PtySession> = new Map();
  private maxSessions: number;

  constructor(maxSessions: number = 10) {
    this.maxSessions = maxSessions;
  }

  create(options: PtySessionOptions): PtySession {
    if (this.sessions.size >= this.maxSessions) {
      // Clean up dead sessions first
      this.cleanupDeadSessions();

      if (this.sessions.size >= this.maxSessions) {
        throw new Error(`Maximum sessions (${this.maxSessions}) reached`);
      }
    }

    const session = new PtySession(options);
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  getOrThrow(sessionId: string): PtySession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  list(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => ({
      sessionId: session.id,
      command: session.command,
      pid: session.pid,
      cols: session.size.cols,
      rows: session.size.rows,
      createdAt: session.createdAt.toISOString(),
      isAlive: session.isAlive,
    }));
  }

  close(
    sessionId: string,
    signal?: NodeJS.Signals
  ): { exitCode: number | null; signal: number | null } {
    const session = this.getOrThrow(sessionId);
    const result = session.close(signal);
    this.sessions.delete(sessionId);
    return result;
  }

  closeAll(): void {
    for (const session of this.sessions.values()) {
      session.close();
    }
    this.sessions.clear();
  }

  private cleanupDeadSessions(): void {
    for (const [id, session] of this.sessions.entries()) {
      if (!session.isAlive) {
        session.close();
        this.sessions.delete(id);
      }
    }
  }
}
