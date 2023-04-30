import os from 'os';
import phpfmt from 'use-phpfmt';
import type { TransformationItem } from './types';
import { exec } from './utils';

export class Transformation {
  public constructor(private readonly phpBin: string) {}

  private get baseCmd(): string {
    return `${this.phpBin} "${phpfmt.pharPath}"`;
  }

  private static transformations: TransformationItem[] = [];

  public async getTransformations(): Promise<TransformationItem[]> {
    if (Transformation.transformations.length > 0) {
      return Transformation.transformations;
    }

    try {
      const { stdout } = await exec(`${this.baseCmd} --list-simple`);

      Transformation.transformations = stdout
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
      return Transformation.transformations;
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
}
