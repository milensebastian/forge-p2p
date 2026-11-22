export interface KeyCombo {
  key: string; // Lowercase key name, e.g. "enter", "p", "b", "`", "s", "k", "z", "f", "n", "?"
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface KeybindingDef {
  id: string;
  label: string;
  category: 'General' | 'Execution' | 'Editing' | 'Navigation';
  defaultCombo: KeyCombo;
  combo: KeyCombo;
  isCustom?: boolean;
}

const STORAGE_KEY = 'forge_custom_keybindings';

export const DEFAULT_KEYBINDINGS: Omit<KeybindingDef, 'combo' | 'isCustom'>[] = [
  {
    id: 'runProgram',
    label: 'Run current program (Compile & Execute)',
    category: 'Execution',
    defaultCombo: { key: 'enter', ctrl: true, meta: true },
  },
  {
    id: 'compileProgram',
    label: 'Build / Compile current program (Syntax & flags check)',
    category: 'Execution',
    defaultCombo: { key: 'b', ctrl: true, meta: true, shift: true },
  },
  {
    id: 'quickOpen',
    label: 'Quick Open (fuzzy file search)',
    category: 'Navigation',
    defaultCombo: { key: 'p', ctrl: true, meta: true },
  },
  {
    id: 'toggleSidebar',
    label: 'Toggle File Explorer sidebar',
    category: 'General',
    defaultCombo: { key: 'b', ctrl: true, meta: true },
  },
  {
    id: 'toggleTerminal',
    label: 'Toggle Output Terminal / Console',
    category: 'Execution',
    defaultCombo: { key: '`', ctrl: true, meta: true },
  },
  {
    id: 'save',
    label: 'Save & sync workspace',
    category: 'General',
    defaultCombo: { key: 's', ctrl: true, meta: true },
  },
  {
    id: 'newFile',
    label: 'Create new document',
    category: 'General',
    defaultCombo: { key: 'n', ctrl: true, meta: true, shift: true },
  },
  {
    id: 'openShortcuts',
    label: 'Open Keyboard Shortcuts settings',
    category: 'General',
    defaultCombo: { key: '?', ctrl: true, meta: true },
  },
  {
    id: 'toggleWordWrap',
    label: 'Toggle word wrap',
    category: 'Editing',
    defaultCombo: { key: 'z', alt: true },
  },
  {
    id: 'formatDocument',
    label: 'Format document',
    category: 'Editing',
    defaultCombo: { key: 'f', shift: true, alt: true },
  },
  {
    id: 'deleteLine',
    label: 'Delete current line',
    category: 'Editing',
    defaultCombo: { key: 'k', ctrl: true, meta: true, shift: true },
  },
  {
    id: 'commentLine',
    label: 'Toggle line comment',
    category: 'Editing',
    defaultCombo: { key: '/', ctrl: true, meta: true },
  },
  {
    id: 'find',
    label: 'Find in file',
    category: 'Navigation',
    defaultCombo: { key: 'f', ctrl: true, meta: true },
  },
  {
    id: 'replace',
    label: 'Find and replace',
    category: 'Navigation',
    defaultCombo: { key: 'h', ctrl: true, meta: true },
  },
  {
    id: 'gotoLine',
    label: 'Go to line number',
    category: 'Navigation',
    defaultCombo: { key: 'g', ctrl: true, meta: true },
  },
];

export function loadKeybindings(): KeybindingDef[] {
  let saved: Record<string, KeyCombo> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // Ignore parse errors
    }
  }

  return DEFAULT_KEYBINDINGS.map((def) => {
    const custom = saved[def.id];
    return {
      ...def,
      combo: custom || def.defaultCombo,
      isCustom: Boolean(custom),
    };
  });
}

export function saveKeybinding(id: string, newCombo: KeyCombo): KeybindingDef[] {
  const current = loadKeybindings();
  const savedMap: Record<string, KeyCombo> = {};

  current.forEach((k) => {
    if (k.isCustom && k.id !== id) {
      savedMap[k.id] = k.combo;
    }
  });

  savedMap[id] = newCombo;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMap));
    window.dispatchEvent(new Event('forge-keybindings-updated'));
  }

  return loadKeybindings();
}

export function resetKeybinding(id: string): KeybindingDef[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        delete saved[id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        window.dispatchEvent(new Event('forge-keybindings-updated'));
      }
    } catch {
      // Ignore
    }
  }
  return loadKeybindings();
}

export function resetAllKeybindings(): KeybindingDef[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('forge-keybindings-updated'));
  }
  return loadKeybindings();
}

export function formatKeyCombo(combo: KeyCombo, isMac = false): string[] {
  const keys: string[] = [];
  const mod = isMac ? '⌘' : 'Ctrl';
  const alt = isMac ? '⌥' : 'Alt';

  if (combo.ctrl || combo.meta) keys.push(mod);
  if (combo.alt) keys.push(alt);
  if (combo.shift) keys.push('Shift');

  const keyDisplay: Record<string, string> = {
    enter: 'Enter',
    escape: 'Esc',
    backquote: '`',
    '`': '`',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    ' ': 'Space',
    space: 'Space',
  };

  const keyUpper = keyDisplay[combo.key.toLowerCase()] || combo.key.toUpperCase();
  keys.push(keyUpper);

  return keys;
}

export function matchesKeybinding(e: KeyboardEvent, combo: KeyCombo): boolean {
  const eventKey = e.key.toLowerCase();
  const targetKey = combo.key.toLowerCase();

  const keyMatches =
    eventKey === targetKey ||
    (targetKey === '?' && (eventKey === '?' || (e.shiftKey && eventKey === '/'))) ||
    (targetKey === '`' && (eventKey === '`' || eventKey === '~')) ||
    (targetKey === 'enter' && eventKey === 'enter');

  if (!keyMatches) return false;

  const requiresMod = Boolean(combo.ctrl || combo.meta);
  const hasMod = e.ctrlKey || e.metaKey;
  if (requiresMod !== hasMod) return false;

  const requiresAlt = Boolean(combo.alt);
  if (requiresAlt !== e.altKey) return false;

  const requiresShift = Boolean(combo.shift);
  // Exception for '?' which naturally has shift
  if (targetKey !== '?' && requiresShift !== e.shiftKey) return false;

  return true;
}
