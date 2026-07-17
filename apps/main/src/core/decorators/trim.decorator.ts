import { Transform, TransformFnParams } from 'class-transformer';

export const Trim = () =>
  Transform(({ value }: TransformFnParams): unknown => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });

export const TrimArray = () =>
  Transform(({ value }: TransformFnParams): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item: string) => String(item).trim());
  });
