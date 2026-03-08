const STORAGE_KEY = "hackmind_gemini_key";
const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

export const saveApiKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEY, key);
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(STORAGE_KEY);
};

export const removeApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasApiKey = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY);
};

/* ─── Typed error codes for UI handling ─── */
export type GeminiErrorCode =
  | "NO_KEY"
  | "NETWORK_ERROR"
  | "INVALID_KEY"
  | "RATE_LIMIT"
  | "DAILY_LIMIT"
  | "FORBIDDEN"
  | "PARSE_ERROR"
  | "API_ERROR";

export class GeminiError extends Error {
  code: GeminiErrorCode;
  status?: number;

  constructor(code: GeminiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.status = status;
  }
}

export const callGemini = async (prompt: string): Promise<string> => {
  const key = getApiKey();
  if (!key) {
    throw new GeminiError("NO_KEY", "No API key set. Add one in Settings to start analyzing.");
  }

  const { incrementUsage, isOverLimit, DAILY_LIMIT } = await import("./usage");

  if (isOverLimit()) {
    throw new GeminiError(
      "DAILY_LIMIT",
      `Daily limit of ${DAILY_LIMIT} analyses reached. Resets at midnight. Come back tomorrow!`
    );
  }

  let response: Response;
  try {
    response = await fetch(`${MODEL_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
  } catch (err) {
    // Network failure — no internet, DNS error, CORS, etc.
    throw new GeminiError(
      "NETWORK_ERROR",
      "No internet connection. Check your connection and try again."
    );
  }

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch {
      // Ignore text parse failure
    }

    if (response.status === 400 && errText.includes("API_KEY_INVALID")) {
      throw new GeminiError(
        "INVALID_KEY",
        "Your API key is invalid. Please update it in Settings.",
        400
      );
    }

    if (response.status === 401) {
      throw new GeminiError(
        "INVALID_KEY",
        "Your API key is invalid or expired. Please update it in Settings.",
        401
      );
    }

    if (response.status === 403) {
      throw new GeminiError(
        "FORBIDDEN",
        "API key is restricted or Gemini API is not enabled for this project. Check API key settings in Google AI Studio.",
        403
      );
    }

    if (response.status === 429) {
      throw new GeminiError(
        "RATE_LIMIT",
        "Rate limit hit. Too many requests — wait a moment and try again, or upgrade your quota in Google AI Studio.",
        429
      );
    }

    throw new GeminiError(
      "API_ERROR",
      `Gemini API error (${response.status}): ${errText.slice(0, 200)}`,
      response.status
    );
  }

  const count = incrementUsage();

  // Warn at thresholds
  if (count === 900 || count === 950 || count === 990) {
    const { toast } = await import("@/components/Toast");
    toast.warning(`You've used ${count} / ${DAILY_LIMIT} analyses today.`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GeminiError(
      "PARSE_ERROR",
      "AI returned an unexpected response. Try again."
    );
  }

  const text =
    (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new GeminiError(
      "PARSE_ERROR",
      "AI returned an empty response. Try rephrasing your input or try again."
    );
  }

  return text;
};
