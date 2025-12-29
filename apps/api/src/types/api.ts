export type ApiSuccess<T> = {
  success: true;
  code?: string;
  message?: string;
  data: T;
};

export type ApiError = {
  success: false;
  code?: string;
  message?: string;
  error: string | Record<string, unknown>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

