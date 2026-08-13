export type DomainErrorCode =
  | 'BATHROOM_CLOSED'
  | 'ALREADY_IN_QUEUE'
  | 'NOT_AT_FRONT'
  | 'NO_WAITING_PASS'
  | 'PASS_NOT_ACTIVE'
  | 'CALLED_PASS_EXISTS'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'RESPONSE_WINDOW_EXPIRED';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly statusCode: number;

  constructor(code: DomainErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class BathroomClosedError extends DomainError {
  constructor(message = 'Bathroom is currently closed for new queue entries.') {
    super('BATHROOM_CLOSED', message, 400);
  }
}

export class AlreadyInQueueError extends DomainError {
  constructor(message = 'Guest already has an active pass in this venue.') {
    super('ALREADY_IN_QUEUE', message, 409);
  }
}

export class NotAtFrontError extends DomainError {
  constructor(message = 'Only the earliest waiting pass can be called.') {
    super('NOT_AT_FRONT', message, 400);
  }
}

export class NoWaitingPassError extends DomainError {
  constructor(message = 'There are no waiting passes in the queue for this bathroom.') {
    super('NO_WAITING_PASS', message, 404);
  }
}

export class PassNotActiveError extends DomainError {
  constructor(message = 'Pass is no longer active.') {
    super('PASS_NOT_ACTIVE', message, 400);
  }
}

export class CalledPassExistsError extends DomainError {
  constructor(message = 'A guest is already called for this bathroom. Complete or skip them first.') {
    super('CALLED_PASS_EXISTS', message, 409);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden action.') {
    super('FORBIDDEN', message, 403);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Requested entity was not found.') {
    super('NOT_FOUND', message, 404);
  }
}
