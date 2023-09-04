export class PHPFmtError extends Error {
  public constructor(message: string) {
    super(`phpfmt: ${message}`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PHPFmtSkipError extends PHPFmtError {
  public constructor() {
    super(PHPFmtSkipError.name);
  }
}
