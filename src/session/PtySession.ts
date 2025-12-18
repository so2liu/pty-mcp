import * as pty from 'node-pty';
import xtermHeadless from '@xterm/headless';
import xtermSerialize from '@xterm/addon-serialize';
import { v4 as uuidv4 } from 'uuid';
import type { PtySessionOptions, ScreenSnapshot } from '../types.js';

const { Terminal } = xtermHeadless;
const { SerializeAddon } = xtermSerialize;

export class PtySession {
  public readonly id: string;
  public readonly command: string;
  public readonly createdAt: Date;

  private ptyProcess: pty.IPty;
  private terminal: InstanceType<typeof Terminal>;
  private serializeAddon: InstanceType<typeof SerializeAddon>;
  private cols: number;
  private rows: number;
  private exitCode: number | null = null;
  private exitSignal: number | null = null;
  private _isAlive: boolean = true;

  constructor(options: PtySessionOptions) {
    this.id = uuidv4();
    this.command = options.command;
    this.createdAt = new Date();
    this.cols = options.cols ?? 80;
    this.rows = options.rows ?? 24;

    // Initialize xterm-headless terminal
    this.terminal = new Terminal({
      cols: this.cols,
      rows: this.rows,
      allowProposedApi: true,
    });

    // Load serialize addon for screen export
    this.serializeAddon = new SerializeAddon();
    this.terminal.loadAddon(this.serializeAddon);

    // Spawn PTY process
    this.ptyProcess = pty.spawn(options.command, options.args ?? [], {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env } as Record<string, string>,
    });

    // Pipe PTY output to xterm terminal
    this.ptyProcess.onData((data: string) => {
      this.terminal.write(data);
    });

    // Handle process exit
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.exitCode = exitCode;
      this.exitSignal = signal ?? null;
      this._isAlive = false;
    });
  }

  // Write input to PTY
  write(data: string): void {
    if (!this._isAlive) {
      throw new Error('Session is no longer alive');
    }
    this.ptyProcess.write(data);
  }

  // Get screen snapshot
  getSnapshot(includeScrollback: boolean = false): ScreenSnapshot {
    const buffer = this.terminal.buffer.active;

    // Build text representation line by line
    const lines: string[] = [];
    const startLine = includeScrollback ? 0 : buffer.viewportY;
    const endLine = includeScrollback
      ? buffer.length
      : buffer.viewportY + this.rows;

    for (let i = startLine; i < endLine && i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true)); // trimRight=true
      }
    }

    return {
      text: this.formatScreenText(lines),
      cursorPosition: { x: buffer.cursorX, y: buffer.cursorY },
      terminalSize: { cols: this.cols, rows: this.rows },
      activeBuffer: buffer.type === 'alternate' ? 'alternate' : 'normal',
      processTitle: this.ptyProcess.process,
    };
  }

  // Format screen with line numbers and borders
  private formatScreenText(lines: string[]): string {
    const lineNumWidth = String(lines.length).length;
    const separator = '-'.repeat(this.cols + lineNumWidth + 3);

    const formattedLines = lines.map((line, i) => {
      const lineNum = String(i + 1).padStart(lineNumWidth, ' ');
      const paddedLine = line.padEnd(this.cols, ' ');
      return `${lineNum} |${paddedLine}|`;
    });

    return [separator, ...formattedLines, separator].join('\n');
  }

  // Get ANSI serialized output
  getAnsiSnapshot(): string {
    return this.serializeAddon.serialize();
  }

  // Resize terminal
  resize(cols: number, rows: number): { cols: number; rows: number } {
    const previous = { cols: this.cols, rows: this.rows };
    this.cols = cols;
    this.rows = rows;
    this.ptyProcess.resize(cols, rows);
    this.terminal.resize(cols, rows);
    return previous;
  }

  // Close session
  close(
    signal: NodeJS.Signals = 'SIGTERM'
  ): { exitCode: number | null; signal: number | null } {
    if (this._isAlive) {
      this.ptyProcess.kill(signal);
    }
    this.terminal.dispose();
    return { exitCode: this.exitCode, signal: this.exitSignal };
  }

  // Getters
  get pid(): number {
    return this.ptyProcess.pid;
  }

  get isAlive(): boolean {
    return this._isAlive;
  }

  get size(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }
}
