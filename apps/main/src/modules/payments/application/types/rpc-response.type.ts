/** Формат ответа на TCP-запрос между приложениями. */
export type RpcResponse<T> = {
  data: T | null;
  error: {
    code?: string;
    errors?: { field: string; message: string }[];
  } | null;
};
