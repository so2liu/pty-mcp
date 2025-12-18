export interface PtySessionOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export interface ScreenSnapshot {
  text: string;
  cursorPosition: { x: number; y: number };
  terminalSize: { cols: number; rows: number };
  activeBuffer: 'normal' | 'alternate';
  processTitle: string;
}

export interface SessionInfo {
  sessionId: string;
  command: string;
  pid: number;
  cols: number;
  rows: number;
  createdAt: string;
  isAlive: boolean;
}
