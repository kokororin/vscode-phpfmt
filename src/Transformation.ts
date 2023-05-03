import os from 'os';
import fs from 'fs';
import mem from 'mem';
import type { TransformationItem } from './types';
import { exec } from './utils';

export class Transformation {
  public constructor(
    private readonly phpBin: string,
    private readonly pharPath: string
  ) {
    this.getTransformations = mem(this.getTransformations, {
      cacheKey: this.getCacheKey
    });
    this.getPharContent = mem(this.getPharContent, {
      cacheKey: this.getCacheKey
    });
    this.isExists = mem(this.isExists, {
      cacheKey: this.getCacheKey
    });
  }

  private get baseCmd(): string {
    return `${this.phpBin} "${this.pharPath}"`;
  }

  private readonly getCacheKey = (args: any[]): string => {
    return JSON.stringify([this.pharPath, args]);
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
    } catch (err) {
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
    } catch (err) {
      return '';
    }
  }

  private async getPharContent(): Promise<string> {
    const content = String(await fs.promises.readFile(this.pharPath));
    return content;
  }

  public async isExists(name: string): Promise<boolean> {
    const regex = new RegExp(
      `class\\s+${name}\\s+extends\\s+(FormatterPass|AdditionalPass)\\s*\\{`
    );

    return regex.test(await this.getPharContent());
  }
}
