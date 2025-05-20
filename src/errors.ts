export class XmasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmasError';
  }
}

export class XmasAuthError extends XmasError {
  constructor(message: string) {
    super(message);
    this.name = 'XmasAuthError';
  }
}

export class XmasApiError extends XmasError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = 'XmasApiError';
  }
}
