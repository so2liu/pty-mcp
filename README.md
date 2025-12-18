# PTY Debug MCP Server

MCP server for debugging PTY/TTY/TUI programs. Enables Claude Code to spawn, interact with, and capture screen output from any terminal-based program.

## Use Case: TUI Debugging

This MCP server allows **Claude Code to control Claude Code itself**, vim, top, and other TUI programs. This enables:

- Automated TUI testing
- Debugging terminal applications
- Screen scraping from interactive programs
- CI/CD integration for TUI apps

### Demo: Claude Code controlling Claude Code

```
1. spawn_session({ command: "claude" })
2. send_input({ specialKey: "shift+tab" })  // cycle modes
3. send_input({ input: "what is 1+1?" })
4. send_input({ specialKey: "enter" })
5. get_snapshot()  // see Claude's response
```

### Demo: Claude Code controlling vim

```
1. spawn_session({ command: "vim", args: ["test.txt"] })
2. send_input({ input: "i" })              // enter INSERT mode
3. send_input({ input: "Hello World!" })   // type text
4. send_input({ specialKey: "escape" })    // exit INSERT mode
5. send_input({ input: ":wq" })            // save command
6. send_input({ specialKey: "enter" })     // execute
```

## Installation

```bash
bun install
bun run build
```

## Configuration

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "pty-debug": {
      "command": "node",
      "args": ["/path/to/pyt-mcp/dist/index.js"]
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `spawn_session` | Start a TUI program in a PTY |
| `send_input` | Send text or special keys |
| `get_snapshot` | Capture current screen state |
| `resize_terminal` | Change terminal dimensions |
| `list_sessions` | List active sessions |
| `close_session` | Terminate a session |

## Special Keys

Supports all common shortcuts:

- Basic: `enter`, `tab`, `shift+tab`, `escape`, `backspace`, `delete`
- Arrows: `up`, `down`, `left`, `right`
- With modifiers: `shift+up`, `ctrl+right`, `alt+left`, etc.
- Control: `ctrl+a` to `ctrl+z`
- Alt: `alt+a` to `alt+z`
- Function: `f1` to `f12`
- Navigation: `home`, `end`, `pageup`, `pagedown`

## Screen Snapshot Format

```
-------------------------------------------------------------------------------------
 1 |Processes: 643 total, 3 running, 640 sleeping                          17:57:23 |
 2 |Load Avg: 2.38, 2.75, 2.88  CPU usage: 13.13% user, 4.49% sys                    |
 3 |...                                                                              |
-------------------------------------------------------------------------------------
```

## Tech Stack

- Node.js (runtime)
- TypeScript
- node-pty (PTY spawning)
- @xterm/headless (terminal emulation)
- @modelcontextprotocol/sdk (MCP server)
