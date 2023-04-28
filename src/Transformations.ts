import os from 'os';
import { execSync } from 'child_process';
import phpfmt from 'use-phpfmt';
import type ITransformationItem from './ITransformationItem';

class Transformations {
  private readonly phpBin: string;

  public constructor(phpBin: string) {
    this.phpBin = phpBin;
  }

  private get baseCmd(): string {
    return `${this.phpBin} "${phpfmt.pharPath}"`;
  }

  public getTransformations(): ITransformationItem[] {
    const output: string = execSync(`${this.baseCmd} --list-simple`).toString();

    return output
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
  }

  public getExample(transformationItem: ITransformationItem): string {
    const output: string = execSync(
      `${this.baseCmd} --help-pass ${transformationItem.key}`
    ).toString();

    return output.toString().trim();
  }
}

export default Transformations;
