import os from 'os';
import type { TransformationItem } from './types';
import { exec } from './utils';

export class Transformation {
  public constructor(
    private readonly phpBin: string,
    private readonly pharPath: string
  ) {}

  private get baseCmd(): string {
    return `${this.phpBin} "${this.pharPath}"`;
  }

  private static transformations: Record<string, TransformationItem[]> = {};

  public async getTransformations(): Promise<TransformationItem[]> {
    if (Transformation.transformations[this.pharPath]?.length > 0) {
      return Transformation.transformations[this.pharPath];
    }

    try {
      const { stdout } = await exec(`${this.baseCmd} --list-simple`);

      Transformation.transformations[this.pharPath] = stdout
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
      return Transformation.transformations[this.pharPath];
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
