export class PHPFmtError extends Error {
  public constructor(message: string) {
    super(`phpfmt: ${message}`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PHPFmtIgnoreError extends PHPFmtError {
  public constructor() {
    super(PHPFmtIgnoreError.name);
  }
}
