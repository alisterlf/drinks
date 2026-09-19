export class GoogleApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export class GoogleAuthRequiredError extends Error {
  constructor(message = 'Google sign-in is required.') {
    super(message);
    this.name = 'GoogleAuthRequiredError';
  }
}

export class GoogleNotConfiguredError extends Error {
  constructor(message = 'Google sync is not configured: missing OAuth client ID.') {
    super(message);
    this.name = 'GoogleNotConfiguredError';
  }
}

export class GoogleSignInCancelledError extends Error {
  constructor(message = 'Google sign-in was cancelled.') {
    super(message);
    this.name = 'GoogleSignInCancelledError';
  }
}
