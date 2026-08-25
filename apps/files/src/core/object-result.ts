export class ObjectResult<T> {
  constructor(
    public readonly data: T | null,
    public readonly error: string | null,
  ) {}

  static success<T>(data: T): ObjectResult<T> {
    return new ObjectResult(data, null);
  }

  static failure(error: string): ObjectResult<null> {
    return new ObjectResult(null, error);
  }
}
