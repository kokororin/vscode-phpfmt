import * as os from 'os';
import { execSync } from 'child_process';
import phpfmt from 'phpfmt';
import ITransformationItem from './ITransformationItem';

class Transformations {
  private phpBin: string;

  public constructor(phpBin: string) {
    this.phpBin = phpBin;
  }

  private get baseCmd() {
    return `${this.phpBin} "${phpfmt.pharPath}"`;
  }

  public getTransformations(): Array<ITransformationItem> {
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
