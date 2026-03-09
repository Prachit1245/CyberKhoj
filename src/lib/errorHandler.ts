/**
 * Central error handler — never leaks sensitive info in production.
 * All user-facing error messages are generic and safe.
 */

const isDev = import.meta.env.DEV;

/** Log errors only in development */
export function devError(context: string, error: unknown) {
  if (isDev) {
    console.error(`[${context}]`, error);
  }
}

/** Log warnings only in development */
export function devWarn(context: string, ...args: unknown[]) {
  if (isDev) {
    console.warn(`[${context}]`, ...args);
  }
}

/** Log debug info only in development */
export function devLog(context: string, ...args: unknown[]) {
  if (isDev) {
    console.debug(`[${context}]`, ...args);
  }
}

/** Convert any API/network error into a safe, user-friendly message */
export function handleAPIError(error: unknown): string {
  if (!navigator.onLine) {
    return "No internet connection detected.";
  }

  if (error && typeof error === "object") {
    const status = (error as any).status ?? (error as any).code;

    if (status === 401) {
      return "API key invalid or expired. Please update your key.";
    }
    if (status === 429) {
      return "Rate limit reached. Wait a moment and try again.";
    }
    if (status === 403) {
      return "Access forbidden. Check your API key permissions.";
    }
    if (status === 500 || status === 502 || status === 503) {
      return "Groq service error. Try again in a few seconds.";
    }

    // GeminiError — already has safe messages
    if ((error as any).name === "GeminiError") {
      return (error as any).message || "Something went wrong. Please try again.";
    }
  }

  if (error instanceof Error) {
    // Don't leak raw error messages — they might contain response bodies with key info
    const msg = error.message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return "Network error. Check your connection and try again.";
    }
    if (msg.includes("aborted") || msg.includes("AbortError")) {
      return "Request was cancelled.";
    }
  }

  return "Something went wrong. Please try again.";
}

/** Sanitize an error for display — ensures no raw objects or stack traces leak */
export function safeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    // Don't return strings that look like they contain keys or tokens
    if (/gsk_|Bearer |authorization/i.test(error)) {
      return "Something went wrong. Please try again.";
    }
    return error.slice(0, 200);
  }
  return handleAPIError(error);
}
