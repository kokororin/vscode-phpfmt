import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import ITransformationItem from './ITransformationItem';

class Transformations {
  public static getTransformations(
    extensionPath: string,
    phpBin: string
  ): Array<ITransformationItem> {
    const output: string = execSync(
      phpBin + ' ' + path.join(extensionPath, 'fmt.phar') + ' --list-simple'
    ).toString();

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
}

export default Transformations;
