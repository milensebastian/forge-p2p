export type KnownLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'cpp'
  | 'c'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'bash'
  | 'r'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'sql'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'lua'
  | 'scala'
  | 'perl'
  | 'markdown';

export type SupportedLanguage = KnownLanguage | (string & {});

export interface CompilerOptionPreset {
  label: string;
  flags: string;
}

export interface LanguageConfig {
  id: SupportedLanguage;
  label: string;
  category: 'Popular' | 'Systems' | 'Web' | 'Data / Scripts' | 'Other';
  extension: string;
  monacoLang: string;
  judge0Id?: number;
  wandboxCompiler?: string;
  canRunInBrowser?: boolean;
  isCompiled?: boolean;
  compilerName?: string;
  compilerVersion?: string;
  defaultCompilerFlags?: string;
  compilerPresets?: CompilerOptionPreset[];
  boilerplate: string;
}

export const LANGUAGE_REGISTRY: Record<string, LanguageConfig> = {
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    category: 'Popular',
    extension: '.ts',
    monacoLang: 'typescript',
    judge0Id: 101, // TypeScript (5.6.2)
    canRunInBrowser: true,
    isCompiled: true,
    compilerName: 'tsc (TypeScript Compiler)',
    compilerVersion: '5.6.2',
    defaultCompilerFlags: '--target es2020 --strict',
    compilerPresets: [
      { label: 'Strict ES2020', flags: '--target es2020 --strict' },
      { label: 'Modern (ESNext)', flags: '--target esnext' },
      { label: 'Relaxed Checks', flags: '--target es2020' },
    ],
    boilerplate: `// TypeScript Program\nconst greeting: string = "Hello from TypeScript!";\nconsole.log(greeting);\n\nfunction calculate(a: number, b: number): number {\n  return a * b + 42;\n}\n\nconsole.log("Result:", calculate(6, 7));\n`,
  },
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    category: 'Popular',
    extension: '.js',
    monacoLang: 'javascript',
    judge0Id: 102, // Node.js 22
    canRunInBrowser: true,
    isCompiled: false,
    compilerName: 'Node.js (V8 JIT Engine)',
    compilerVersion: '22.0.0',
    defaultCompilerFlags: '--harmony',
    compilerPresets: [
      { label: 'Default V8 JIT', flags: '' },
      { label: 'Strict Mode', flags: '--use-strict' },
    ],
    boilerplate: `// JavaScript (Node.js)\nconsole.log("Hello from JavaScript!");\n\nconst items = [1, 2, 3, 4, 5];\nconst squared = items.map(n => n ** 2);\nconsole.log("Squared items:", squared);\n`,
  },
  python: {
    id: 'python',
    label: 'Python 3',
    category: 'Popular',
    extension: '.py',
    monacoLang: 'python',
    judge0Id: 100, // Python (3.12.5)
    wandboxCompiler: 'cpython-3.15.2',
    isCompiled: false,
    compilerName: 'CPython (Bytecode Compiler / VM)',
    compilerVersion: '3.12.5',
    defaultCompilerFlags: '-O',
    compilerPresets: [
      { label: 'Standard Run', flags: '' },
      { label: 'Optimized Bytecode (-O)', flags: '-O' },
      { label: 'Strict Warnings (-W error)', flags: '-W error' },
    ],
    boilerplate: `# Python 3 Program\nimport sys\n\nprint("Hello from Python", sys.version.split()[0])\n\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint("First 10 Fibonacci numbers:", list(fibonacci(10)))\n`,
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    category: 'Systems',
    extension: '.cpp',
    monacoLang: 'cpp',
    judge0Id: 105, // C++ (GCC 14.1.0)
    wandboxCompiler: 'gcc-13.2.0',
    isCompiled: true,
    compilerName: 'G++ (GNU C++ Compiler)',
    compilerVersion: '14.1.0',
    defaultCompilerFlags: '-std=c++20 -O2 -Wall',
    compilerPresets: [
      { label: 'C++20 Release (-O2)', flags: '-std=c++20 -O2 -Wall' },
      { label: 'C++23 Modern (-O3)', flags: '-std=c++23 -O3 -Wall -Wextra' },
      { label: 'Debug Build (-g -O0)', flags: '-std=c++20 -O0 -g -Wall' },
      { label: 'Fast Math (-Ofast)', flags: '-std=c++20 -Ofast -march=native' },
    ],
    boilerplate: `// C++ 20 / GCC\n#include <iostream>\n#include <vector>\n#include <numeric>\n\nint main() {\n    std::cout << "Hello from C++20!" << std::endl;\n    std::vector<int> numbers = {10, 20, 30, 40};\n    int sum = std::accumulate(numbers.begin(), numbers.end(), 0);\n    std::cout << "Sum = " << sum << std::endl;\n    return 0;\n}\n`,
  },
  c: {
    id: 'c',
    label: 'C',
    category: 'Systems',
    extension: '.c',
    monacoLang: 'c',
    judge0Id: 103, // C (GCC 14.1.0)
    wandboxCompiler: 'gcc-13.2.0-c',
    isCompiled: true,
    compilerName: 'GCC (GNU C Compiler)',
    compilerVersion: '14.1.0',
    defaultCompilerFlags: '-O2 -Wall -std=c17',
    compilerPresets: [
      { label: 'C17 Release (-O2)', flags: '-std=c17 -O2 -Wall' },
      { label: 'C23 Strict (-Wall -Wextra)', flags: '-std=c2x -O2 -Wall -Wextra -Wpedantic' },
      { label: 'Debug Build (-g -O0)', flags: '-std=c17 -O0 -g -Wall' },
    ],
    boilerplate: `// C (GCC)\n#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    int a = 15, b = 27;\n    printf("Total: %d\\n", a + b);\n    return 0;\n}\n`,
  },
  rust: {
    id: 'rust',
    label: 'Rust',
    category: 'Systems',
    extension: '.rs',
    monacoLang: 'rust',
    judge0Id: 108, // Rust (1.85.0)
    isCompiled: true,
    compilerName: 'rustc (Rust Compiler)',
    compilerVersion: '1.85.0',
    defaultCompilerFlags: '--edition 2021 -O',
    compilerPresets: [
      { label: '2021 Edition Release (-O)', flags: '--edition 2021 -O' },
      { label: 'Maximum Optimization (-C opt-level=3)', flags: '--edition 2021 -C opt-level=3' },
      { label: 'Debug Checks', flags: '--edition 2021 -C debug-assertions=on' },
    ],
    boilerplate: `// Rust Program\nfn main() {\n    println!("Hello from Rust!");\n    let numbers = vec![1, 2, 3, 4, 5];\n    let sum: i32 = numbers.iter().sum();\n    println!("Sum of numbers: {}", sum);\n}\n`,
  },
  go: {
    id: 'go',
    label: 'Go',
    category: 'Systems',
    extension: '.go',
    monacoLang: 'go',
    judge0Id: 107, // Go (1.23.5)
    isCompiled: true,
    compilerName: 'go build (Go Toolchain)',
    compilerVersion: '1.23.5',
    defaultCompilerFlags: '',
    compilerPresets: [
      { label: 'Standard Build', flags: '' },
      { label: 'Strip Debug (-ldflags "-s -w")', flags: '-ldflags "-s -w"' },
    ],
    boilerplate: `// Go Program\npackage main\n\nimport (\n\t"fmt"\n\t"time"\n)\n\nfunc main() {\n\tfmt.Println("Hello from Go!")\n\tfmt.Printf("Current time: %s\\n", time.Now().Format(time.RFC1123))\n}\n`,
  },
  java: {
    id: 'java',
    label: 'Java',
    category: 'Popular',
    extension: '.java',
    monacoLang: 'java',
    judge0Id: 91, // Java (JDK 17)
    isCompiled: true,
    compilerName: 'javac (OpenJDK Compiler)',
    compilerVersion: '17.0.1',
    defaultCompilerFlags: '',
    compilerPresets: [
      { label: 'Default OpenJDK 17', flags: '' },
      { label: 'Lint Warnings (-Xlint:all)', flags: '-Xlint:all' },
    ],
    boilerplate: `// Java 17\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n        int result = 40 + 2;\n        System.out.println("Computed value: " + result);\n    }\n}\n`,
  },
  csharp: {
    id: 'csharp',
    label: 'C#',
    category: 'Popular',
    extension: '.cs',
    monacoLang: 'csharp',
    judge0Id: 51, // C# (Mono 6.6)
    isCompiled: true,
    compilerName: 'Mono C# Compiler (csc)',
    compilerVersion: '6.6.0',
    defaultCompilerFlags: '-optimize+',
    compilerPresets: [
      { label: 'Optimized Release (-optimize+)', flags: '-optimize+' },
      { label: 'Debug Build (-debug)', flags: '-debug' },
    ],
    boilerplate: `// C# Program\nusing System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine("Hello from C#!");\n        int[] numbers = { 1, 2, 3, 4, 5 };\n        Console.WriteLine($"Length: {numbers.Length}");\n    }\n}\n`,
  },
  php: {
    id: 'php',
    label: 'PHP',
    category: 'Web',
    extension: '.php',
    monacoLang: 'php',
    judge0Id: 98, // PHP 8.3
    isCompiled: false,
    compilerName: 'PHP Zend Engine',
    compilerVersion: '8.3.0',
    defaultCompilerFlags: '',
    boilerplate: `<?php\n// PHP 8.3 Script\necho "Hello from PHP!\\n";\n$data = ["status" => "ok", "timestamp" => time()];\necho json_encode($data, JSON_PRETTY_PRINT) . "\\n";\n`,
  },
  ruby: {
    id: 'ruby',
    label: 'Ruby',
    category: 'Data / Scripts',
    extension: '.rb',
    monacoLang: 'ruby',
    judge0Id: 72, // Ruby 2.7
    isCompiled: false,
    compilerName: 'Ruby YARV Engine',
    compilerVersion: '2.7.0',
    defaultCompilerFlags: '',
    boilerplate: `# Ruby Program\nputs "Hello from Ruby!"\n\nfruits = %w[apple banana cherry]\nfruits.each_with_index do |fruit, idx|\n  puts "#{idx + 1}: #{fruit.capitalize}"\nend\n`,
  },
  bash: {
    id: 'bash',
    label: 'Bash / Shell',
    category: 'Data / Scripts',
    extension: '.sh',
    monacoLang: 'shell',
    judge0Id: 46, // Bash 5.0
    isCompiled: false,
    compilerName: 'GNU Bash Shell',
    compilerVersion: '5.0.0',
    defaultCompilerFlags: '',
    boilerplate: `#!/usr/bin/env bash\necho "Hello from Bash shell!"\necho "Kernel / Arch: $(uname -m 2>/dev/null || echo unknown)"\nfor i in {1..3}; do\n  echo "Step $i"\ndone\n`,
  },
  r: {
    id: 'r',
    label: 'R',
    category: 'Data / Scripts',
    extension: '.r',
    monacoLang: 'r',
    judge0Id: 99, // R 4.4.1
    isCompiled: false,
    compilerName: 'R Interpreter',
    compilerVersion: '4.4.1',
    defaultCompilerFlags: '',
    boilerplate: `# R Statistics Program\ncat("Hello from R!\\n")\nx <- c(10, 20, 30, 40, 50)\ncat("Mean:", mean(x), "\\n")\ncat("StdDev:", sd(x), "\\n")\n`,
  },
  swift: {
    id: 'swift',
    label: 'Swift',
    category: 'Other',
    extension: '.swift',
    monacoLang: 'swift',
    judge0Id: 83, // Swift 5.2
    isCompiled: true,
    compilerName: 'swiftc (Swift Compiler)',
    compilerVersion: '5.2.3',
    defaultCompilerFlags: '-O',
    compilerPresets: [
      { label: 'Release (-O)', flags: '-O' },
      { label: 'Unoptimized (-Onone)', flags: '-Onone' },
    ],
    boilerplate: `// Swift Program\nprint("Hello from Swift!")\nlet numbers = [10, 20, 30]\nlet doubled = numbers.map { $0 * 2 }\nprint("Doubled: \\(doubled)")\n`,
  },
  kotlin: {
    id: 'kotlin',
    label: 'Kotlin',
    category: 'Other',
    extension: '.kt',
    monacoLang: 'kotlin',
    judge0Id: 111, // Kotlin 2.1
    isCompiled: true,
    compilerName: 'kotlinc (Kotlin Compiler)',
    compilerVersion: '2.1.0',
    defaultCompilerFlags: '',
    boilerplate: `// Kotlin Program\nfun main() {\n    println("Hello from Kotlin!")\n    val items = listOf("Alpha", "Beta", "Gamma")\n    println("Items: " + items.joinToString(", "))\n}\n`,
  },
  sql: {
    id: 'sql',
    label: 'SQL (SQLite)',
    category: 'Data / Scripts',
    extension: '.sql',
    monacoLang: 'sql',
    judge0Id: 82, // SQLite 3.27
    isCompiled: false,
    compilerName: 'SQLite Query Engine',
    compilerVersion: '3.27.2',
    defaultCompilerFlags: '',
    boilerplate: `-- SQLite SQL Script\nCREATE TABLE engineers (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  role TEXT\n);\n\nINSERT INTO engineers (name, role) VALUES ('Atlas', 'Architect');\nINSERT INTO engineers (name, role) VALUES ('Nova', 'Systems');\n\nSELECT * FROM engineers;\n`,
  },
  html: {
    id: 'html',
    label: 'HTML5',
    category: 'Web',
    extension: '.html',
    monacoLang: 'html',
    canRunInBrowser: true,
    isCompiled: false,
    compilerName: 'Browser DOM / HTML Parser',
    boilerplate: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Preview</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 2rem; background: #0c0d10; color: #f4f4f5; }\n    h1 { color: #818cf8; }\n    button { padding: 0.5rem 1rem; background: #181922; color: white; border: 1px solid #282a38; border-radius: 6px; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <h1>Interactive HTML Preview</h1>\n  <p>Live preview rendered directly in the workspace.</p>\n  <button onclick="alert('Hello from interactive preview!')">Click Me</button>\n</body>\n</html>\n`,
  },
  css: {
    id: 'css',
    label: 'CSS',
    category: 'Web',
    extension: '.css',
    monacoLang: 'css',
    canRunInBrowser: true,
    isCompiled: false,
    compilerName: 'Browser CSS Engine',
    boilerplate: `/* Stylesheet */\n:root {\n  --primary: #818cf8;\n  --background: #0c0d10;\n}\n\nbody {\n  margin: 0;\n  padding: 1rem;\n  font-family: sans-serif;\n  background-color: var(--background);\n}\n`,
  },
  json: {
    id: 'json',
    label: 'JSON',
    category: 'Data / Scripts',
    extension: '.json',
    monacoLang: 'json',
    canRunInBrowser: true,
    isCompiled: false,
    boilerplate: `{\n  "name": "forge-project",\n  "version": "1.0.0",\n  "description": "Collaborative P2P workspace",\n  "private": true\n}\n`,
  },
  yaml: {
    id: 'yaml',
    label: 'YAML',
    category: 'Data / Scripts',
    extension: '.yaml',
    monacoLang: 'yaml',
    isCompiled: false,
    boilerplate: `version: "3.9"\nservices:\n  app:\n    image: node:20-alpine\n    ports:\n      - "3000:3000"\n    environment:\n      NODE_ENV: production\n`,
  },
  lua: {
    id: 'lua',
    label: 'Lua',
    category: 'Other',
    extension: '.lua',
    monacoLang: 'lua',
    isCompiled: false,
    boilerplate: `-- Lua Program\nprint("Hello from Lua!")\nlocal sum = 0\nfor i = 1, 10 do\n  sum = sum + i\nend\nprint("Sum 1..10 = " .. sum)\n`,
  },
  markdown: {
    id: 'markdown',
    label: 'Markdown',
    category: 'Web',
    extension: '.md',
    monacoLang: 'markdown',
    boilerplate: `# New Markdown Document\n\nStart writing your document here...\n`,
  },
};

export const SUPPORTED_LANGUAGES_LIST: LanguageConfig[] = Object.values(LANGUAGE_REGISTRY);

export function getLanguageConfig(langId: string): LanguageConfig {
  const normalized = langId.toLowerCase();
  return (
    LANGUAGE_REGISTRY[normalized] || {
      id: langId as SupportedLanguage,
      label: langId.toUpperCase(),
      category: 'Other',
      extension: `.${langId}`,
      monacoLang: normalized,
      boilerplate: `// ${langId} file\n`,
    }
  );
}

export function detectLanguageFromFilename(filename: string): { type: 'markdown' | 'code'; language: SupportedLanguage } {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return { type: 'markdown', language: 'markdown' };
    case 'ts':
    case 'tsx':
      return { type: 'code', language: 'typescript' };
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { type: 'code', language: 'javascript' };
    case 'py':
    case 'python':
      return { type: 'code', language: 'python' };
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'h':
      return { type: 'code', language: 'cpp' };
    case 'c':
      return { type: 'code', language: 'c' };
    case 'rs':
    case 'rust':
      return { type: 'code', language: 'rust' };
    case 'go':
      return { type: 'code', language: 'go' };
    case 'java':
      return { type: 'code', language: 'java' };
    case 'cs':
      return { type: 'code', language: 'csharp' };
    case 'php':
      return { type: 'code', language: 'php' };
    case 'rb':
    case 'ruby':
      return { type: 'code', language: 'ruby' };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { type: 'code', language: 'bash' };
    case 'r':
      return { type: 'code', language: 'r' };
    case 'swift':
      return { type: 'code', language: 'swift' };
    case 'kt':
    case 'kts':
      return { type: 'code', language: 'kotlin' };
    case 'dart':
      return { type: 'code', language: 'dart' };
    case 'sql':
      return { type: 'code', language: 'sql' };
    case 'html':
    case 'htm':
      return { type: 'code', language: 'html' };
    case 'css':
    case 'scss':
      return { type: 'code', language: 'css' };
    case 'json':
      return { type: 'code', language: 'json' };
    case 'yaml':
    case 'yml':
      return { type: 'code', language: 'yaml' };
    case 'lua':
      return { type: 'code', language: 'lua' };
    default:
      return { type: 'code', language: 'typescript' };
  }
}
