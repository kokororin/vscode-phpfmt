import childProcess, { type ExecOptions } from 'node:child_process';
import type { ObjectEncodingOptions } from 'node:fs';

export async function exec(
  command: string,
  options?: (ObjectEncodingOptions & ExecOptions) | null
): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}> {
  return await new Promise((resolve, reject) => {
    const child = childProcess.exec(
      command,
      options,
      (error, stdout, stderr) => {
        if (error != null) {
          reject(error);
        } else {
          resolve({
            stdout: String(stdout),
            stderr: String(stderr),
            code: child.exitCode
          });
        }
      }
    );

    child.on('error', reject);
  });
}
