// ANSI escape sequences for special keys
export const SPECIAL_KEYS: Record<string, string> = {
  // Basic keys
  enter: '\r',
  tab: '\t',
  'shift+tab': '\x1b[Z',
  escape: '\x1b',
  backspace: '\x7f',
  delete: '\x1b[3~',
  space: ' ',
  insert: '\x1b[2~',

  // Arrow keys
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',

  // Shift + Arrow keys
  'shift+up': '\x1b[1;2A',
  'shift+down': '\x1b[1;2B',
  'shift+right': '\x1b[1;2C',
  'shift+left': '\x1b[1;2D',

  // Alt + Arrow keys
  'alt+up': '\x1b[1;3A',
  'alt+down': '\x1b[1;3B',
  'alt+right': '\x1b[1;3C',
  'alt+left': '\x1b[1;3D',

  // Ctrl + Arrow keys
  'ctrl+up': '\x1b[1;5A',
  'ctrl+down': '\x1b[1;5B',
  'ctrl+right': '\x1b[1;5C',
  'ctrl+left': '\x1b[1;5D',

  // Navigation
  home: '\x1b[H',
  end: '\x1b[F',
  pageup: '\x1b[5~',
  pagedown: '\x1b[6~',

  // Control combinations
  'ctrl+a': '\x01',
  'ctrl+b': '\x02',
  'ctrl+c': '\x03',
  'ctrl+d': '\x04',
  'ctrl+e': '\x05',
  'ctrl+f': '\x06',
  'ctrl+g': '\x07',
  'ctrl+h': '\x08',
  'ctrl+i': '\x09',
  'ctrl+j': '\x0a',
  'ctrl+k': '\x0b',
  'ctrl+l': '\x0c',
  'ctrl+m': '\x0d',
  'ctrl+n': '\x0e',
  'ctrl+o': '\x0f',
  'ctrl+p': '\x10',
  'ctrl+q': '\x11',
  'ctrl+r': '\x12',
  'ctrl+s': '\x13',
  'ctrl+t': '\x14',
  'ctrl+u': '\x15',
  'ctrl+v': '\x16',
  'ctrl+w': '\x17',
  'ctrl+x': '\x18',
  'ctrl+y': '\x19',
  'ctrl+z': '\x1a',

  // Alt combinations (ESC + key)
  'alt+a': '\x1ba',
  'alt+b': '\x1bb',
  'alt+c': '\x1bc',
  'alt+d': '\x1bd',
  'alt+e': '\x1be',
  'alt+f': '\x1bf',
  'alt+g': '\x1bg',
  'alt+h': '\x1bh',
  'alt+i': '\x1bi',
  'alt+j': '\x1bj',
  'alt+k': '\x1bk',
  'alt+l': '\x1bl',
  'alt+m': '\x1bm',
  'alt+n': '\x1bn',
  'alt+o': '\x1bo',
  'alt+p': '\x1bp',
  'alt+q': '\x1bq',
  'alt+r': '\x1br',
  'alt+s': '\x1bs',
  'alt+t': '\x1bt',
  'alt+u': '\x1bu',
  'alt+v': '\x1bv',
  'alt+w': '\x1bw',
  'alt+x': '\x1bx',
  'alt+y': '\x1by',
  'alt+z': '\x1bz',

  // Function keys
  f1: '\x1bOP',
  f2: '\x1bOQ',
  f3: '\x1bOR',
  f4: '\x1bOS',
  f5: '\x1b[15~',
  f6: '\x1b[17~',
  f7: '\x1b[18~',
  f8: '\x1b[19~',
  f9: '\x1b[20~',
  f10: '\x1b[21~',
  f11: '\x1b[23~',
  f12: '\x1b[24~',
};

export type SpecialKey = keyof typeof SPECIAL_KEYS;

export function resolveKey(key: string): string {
  return SPECIAL_KEYS[key.toLowerCase()] ?? key;
}

export function isSpecialKey(key: string): key is SpecialKey {
  return key.toLowerCase() in SPECIAL_KEYS;
}
