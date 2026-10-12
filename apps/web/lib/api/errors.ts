export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  path: string;
  timestamp: string;
}

/**
 * Normalised API error that every surface in the UI can read.
 * Unknown/network failures are represented as status 0 with a stable code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly path?: string;

  constructor(body: ApiErrorBody) {
    super(body.message || `Request failed (${body.statusCode})`);
    this.name = "ApiError";
    this.status = body.statusCode;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
    this.path = body.path;
  }

  static fromStatus(status: number, body: unknown): ApiError {
    if (body && typeof body === "object" && "statusCode" in body && typeof (body as { statusCode: unknown }).statusCode === "number") {
      return new ApiError(body as ApiErrorBody);
    }
    return new ApiError({
      statusCode: status,
      code: `HTTP_${status}`,
      message: `Request failed with status ${status}`,
      path: "",
      timestamp: new Date().toISOString(),
    });
  }

  static network(message = "Network error. Please check the API server."): ApiError {
    return new ApiError({
      statusCode: 0,
      code: "NETWORK_ERROR",
      message,
      path: "",
      timestamp: new Date().toISOString(),
    });
  }

  static timeout(message = "The request timed out."): ApiError {
    return new ApiError({
      statusCode: 0,
      code: "TIMEOUT",
      message,
      path: "",
      timestamp: new Date().toISOString(),
    });
  }

  /** True for client-side failures (no response from the API). */
  get isNetworkFailure(): boolean {
    return this.status === 0 && (this.code === "NETWORK_ERROR" || this.code === "TIMEOUT");
  }
}

export function messageForError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error. Please try again.";
}