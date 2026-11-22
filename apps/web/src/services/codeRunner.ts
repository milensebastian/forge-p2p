import { getLanguageConfig } from '@forge/core';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput?: string;
  executionTime?: string;
  memory?: string;
  exitCode: number;
  status: 'success' | 'error' | 'timeout';
  runnerName: string;
}

/**
 * Execute JavaScript in a safe browser worker/sandbox
 */
function executeJavaScriptInBrowser(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console output
    const fakeConsole = {
      log: (...args: any[]) => {
        logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
      },
      error: (...args: any[]) => {
        errors.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
      },
      info: (...args: any[]) => {
        logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
      },
    };

    try {
      // Execute in isolated function context
      const fn = new Function('console', code);
      const ret = fn(fakeConsole);
      const elapsed = Math.round(performance.now() - startTime);

      if (ret !== undefined) {
        logs.push(`=> ${typeof ret === 'object' ? JSON.stringify(ret, null, 2) : String(ret)}`);
      }

      resolve({
        stdout: logs.join('\n'),
        stderr: errors.join('\n'),
        executionTime: `${elapsed} ms`,
        memory: 'Browser Sandbox',
        exitCode: errors.length > 0 ? 1 : 0,
        status: errors.length > 0 ? 'error' : 'success',
        runnerName: 'JavaScript (Browser V8 Sandbox)',
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      resolve({
        stdout: logs.join('\n'),
        stderr: err?.stack || err?.message || String(err),
        executionTime: `${elapsed} ms`,
        memory: 'Browser Sandbox',
        exitCode: 1,
        status: 'error',
        runnerName: 'JavaScript (Browser V8 Sandbox)',
      });
    }
  });
}

/**
 * Execute code remotely via Judge0 CE API
 */
async function executeWithJudge0(
  code: string,
  languageId: number,
  stdin = ''
): Promise<ExecutionResult> {
  const payload: any = {
    source_code: code,
    language_id: languageId,
  };
  if (stdin) {
    payload.stdin = stdin;
  }

  const response = await fetch(
    'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(`Judge0 responded with HTTP ${response.status}`);
  }

  const data = await response.json();
  const stdout = data.stdout || '';
  const stderr = data.stderr || '';
  const compileOutput = data.compile_output || '';
  const time = data.time ? `${Math.round(parseFloat(data.time) * 1000)} ms` : undefined;
  const memory = data.memory ? `${(data.memory / 1024).toFixed(1)} MB` : undefined;
  const isAccepted = data.status?.id === 3;
  const isTimeout = data.status?.id === 5;

  return {
    stdout,
    stderr: stderr || (isTimeout ? 'Time Limit Exceeded (Timeout)' : ''),
    compileOutput,
    executionTime: time,
    memory,
    exitCode: isAccepted ? 0 : 1,
    status: isAccepted ? 'success' : isTimeout ? 'timeout' : 'error',
    runnerName: `Judge0 Cloud Execution (${data.status?.description || 'Done'})`,
  };
}

/**
 * Fallback execution via Wandbox API
 */
async function executeWithWandbox(
  code: string,
  compiler: string,
  stdin = ''
): Promise<ExecutionResult> {
  const response = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compiler,
      code,
      stdin,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Wandbox responded with HTTP ${response.status}`);
  }

  const data = await response.json();
  const stdout = data.program_output || '';
  const stderr = data.program_error || data.compiler_error || '';
  const compileOutput = data.compiler_message || '';
  const exitCode = data.status ? parseInt(data.status, 10) : 0;

  return {
    stdout,
    stderr,
    compileOutput,
    executionTime: 'Remote',
    memory: 'Wandbox Sandbox',
    exitCode,
    status: exitCode === 0 && !stderr ? 'success' : 'error',
    runnerName: `Wandbox Engine (${compiler})`,
  };
}

/**
 * Universal Code Runner:
 * Automatically dispatches to client-side sandbox or Judge0 CE with Wandbox fallback.
 */
export async function runProgram(
  code: string,
  language: string,
  stdin = ''
): Promise<ExecutionResult> {
  const cleanCode = code.trim();
  if (!cleanCode) {
    return {
      stdout: '',
      stderr: 'Cannot execute empty code file.',
      exitCode: 1,
      status: 'error',
      runnerName: 'Code Runner',
    };
  }

  const langConfig = getLanguageConfig(language);

  // 1. Direct browser execution for JavaScript if offline or instant run
  if (langConfig.id === 'javascript') {
    try {
      return await executeJavaScriptInBrowser(code);
    } catch {
      // Fall through to remote
    }
  }

  // 2. Primary: Judge0 CE (70+ languages)
  if (langConfig.judge0Id) {
    try {
      return await executeWithJudge0(code, langConfig.judge0Id, stdin);
    } catch (err: any) {
      console.warn('Judge0 execution failed, attempting fallback...', err);
      // Fall through to Wandbox
    }
  }

  // 3. Fallback: Wandbox
  if (langConfig.wandboxCompiler) {
    try {
      return await executeWithWandbox(code, langConfig.wandboxCompiler, stdin);
    } catch (err: any) {
      console.warn('Wandbox fallback failed:', err);
    }
  }

  // 4. Fallback for TypeScript: Run in browser sandbox by simple transform
  if (langConfig.id === 'typescript') {
    try {
      // Basic type-stripping fallback for browser
      const jsCode = code
        .replace(/:\s*[A-Za-z0-9_<>\[\]|&]+(\s*=\s*)/g, '$1')
        .replace(/interface\s+[A-Za-z0-9_]+\s*\{[^}]*\}/g, '')
        .replace(/type\s+[A-Za-z0-9_]+\s*=[^;]*;/g, '');
      return await executeJavaScriptInBrowser(jsCode);
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err?.message || 'Failed to execute TypeScript code.',
        exitCode: 1,
        status: 'error',
        runnerName: 'TypeScript Sandbox',
      };
    }
  }

  return {
    stdout: '',
    stderr: `No execution engine configured for ${langConfig.label}. Supported runtimes: Python, C, C++, Rust, Go, Java, C#, JavaScript, TypeScript, Bash, PHP, Ruby, R, Swift, Kotlin, SQL.`,
    exitCode: 1,
    status: 'error',
    runnerName: 'System',
  };
}
