export type ValidationError = {
  // 'VALIDATION_ERROR';
  code: string;
  errors: {
    field: string;
    message: string;
  }[];
};

export class ObjectResult<T> {
  constructor(
    public readonly data: T | null,
    public readonly error: ValidationError | null,
  ) {}

  static success<T>(data: T): ObjectResult<T> {
    return new ObjectResult(data, null);
  }

  static failure(error: ValidationError): ObjectResult<null> {
    return new ObjectResult(null, error);
  }
}
