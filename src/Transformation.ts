import os from 'node:os';
import mem from 'mem';
import phpfmt, { type PHPFmt as IPHPFmt } from 'phpfmt';
import { exec } from './utils';

export interface TransformationItem {
  key: string;
  description: string;
}

export class Transformation {
  public constructor(
    private readonly phpBin: string,
    private readonly fmt: IPHPFmt
  ) {
    this.getTransformations = mem(this.getTransformations, {
      cacheKey: this.getCacheKey
    });
    this.getPasses = mem(this.getPasses, {
      cacheKey: this.getCacheKey
    });
    this.isExists = mem(this.isExists, {
      cacheKey: this.getCacheKey
    });
  }

  private get baseCmd(): string {
    return `${this.phpBin} -d "error_reporting=E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED" "${this.fmt.pharPath}"`;
  }

  private readonly getCacheKey = (args: any[]): string => {
    return JSON.stringify([this.fmt.pharPath, args]);
  };

  public async getTransformations(): Promise<TransformationItem[]> {
    try {
      const { stdout } = await exec(`${this.baseCmd} --list-simple`);

      return stdout
        .trim()
        .split(os.EOL)
        .map(v => {
          const splited = v.split(' ');

          return {
            key: splited[0],
            description: splited
              .filter((value, index) => value && index > 0)
              .join(' ')
              .trim()
          };
        });
    } catch {
      return [];
    }
  }

  public async getExample(
    transformationItem: TransformationItem
  ): Promise<string> {
    try {
      const { stdout } = await exec(
        `${this.baseCmd} --help-pass ${transformationItem.key}`
      );

      return stdout;
    } catch {
      return '';
    }
  }

  public getPasses(): string[] {
    return phpfmt.parser.getPasses(this.fmt, phpfmt.parser.MODE_REGEX);
  }

  public isExists(name: string): boolean {
    return this.getPasses().includes(name);
  }
}
