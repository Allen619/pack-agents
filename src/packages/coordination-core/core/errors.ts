// UTF-8
export class CoordinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordinationError';
  }
}

export class TimeoutError extends CoordinationError {
  constructor(message = 'Task timeout exceeded') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CancellationError extends CoordinationError {
  constructor(message = 'Task was canceled') {
    super(message);
    this.name = 'CancellationError';
  }
}

