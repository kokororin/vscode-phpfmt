import childProcess, { type ExecOptions } from 'node:child_process';
import fs, { type ObjectEncodingOptions } from 'node:fs';
import https from 'node:https';

export async function exec(
  command: string,
  options?: (ObjectEncodingOptions & ExecOptions) | undefined | null
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

export async function downloadFile(
  url: string,
  filePath: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    https
      .get(url, res => {
        const dest = fs.createWriteStream(filePath, {
          autoClose: true
        });
        res.pipe(dest).on('finish', () => {
          resolve();
        });
      })
      .on('error', err => {
        reject(err);
      });
  });
}
