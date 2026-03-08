const STORAGE_KEY = "hackmind_gemini_key";
const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

const IS_DEV = import.meta.env.DEV;
const MIN_REQUEST_INTERVAL_MS = 1200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  | "ABORTED"
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

/* ─── Active request tracking for deduplication ─── */
let activeController: AbortController | null = null;
let lastRequestAt = 0;

/** Abort any in-flight Gemini request */
export const abortGeminiRequest = (): void => {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
};

/* ─── Core fetch helper (single attempt) ─── */
const fetchGeminiOnce = async (prompt: string, key: string, signal?: AbortSignal): Promise<Response> => {
  try {
    return await fetch(`${MODEL_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new GeminiError("ABORTED", "Request was cancelled.");
    }
    throw new GeminiError(
      "NETWORK_ERROR",
      "No internet connection. Check your connection and try again."
    );
  }
};

const parseGeminiResponse = async (response: Response): Promise<string> => {
  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch { /* ignore */ }

    if (response.status === 400 && errText.includes("API_KEY_INVALID")) {
      throw new GeminiError("INVALID_KEY", "Your API key is invalid. Please update it in Settings.", 400);
    }
    if (response.status === 401) {
      throw new GeminiError("INVALID_KEY", "Your API key is invalid or expired. Please update it in Settings.", 401);
    }
    if (response.status === 403) {
      throw new GeminiError("FORBIDDEN", "API key is restricted or Gemini API is not enabled for this project.", 403);
    }
    if (response.status === 429) {
      // Throw a special marker so the retry loop can catch it
      const err = new GeminiError("RATE_LIMIT", errText, 429);
      throw err;
    }
    throw new GeminiError("API_ERROR", `Gemini API error (${response.status}): ${errText.slice(0, 200)}`, response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GeminiError("PARSE_ERROR", "AI returned an unexpected response. Try again.");
  }

  const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new GeminiError("PARSE_ERROR", "AI returned an empty response. Try again.");
  }

  return text;
};

/* ─── Fetch with automatic retry on 429 (exponential backoff) ─── */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 4000; // 4s, 8s, 16s

const fetchGemini = async (prompt: string, key: string, signal?: AbortSignal): Promise<string> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetchGeminiOnce(prompt, key, signal);

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        // Final attempt failed — throw a user-friendly error
        let errText = "";
        try { errText = (await response.text()).toLowerCase(); } catch { /* ignore */ }
        const quotaLike =
          errText.includes("quota") ||
          errText.includes("resource_exhausted") ||
          errText.includes("exceeded") ||
          errText.includes("per day");

        throw new GeminiError(
          "RATE_LIMIT",
          quotaLike
            ? "Gemini quota exhausted for this key. Try again in a few minutes, or check your quota at aistudio.google.com."
            : "Gemini rate limit reached. The app retried automatically but the API is still busy. Wait 1–2 minutes and try again.",
          429
        );
      }

      // Exponential backoff: 4s → 8s → 16s
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      if (IS_DEV) {
        console.warn(`[HackMind] 429 on attempt ${attempt + 1}, retrying in ${delayMs}ms…`);
      }
      await sleep(delayMs);
      continue;
    }

    return parseGeminiResponse(response);
  }

  // Should never reach here
  throw new GeminiError("API_ERROR", "Unexpected retry loop exit.");
};

/* ─── JSON helpers ─── */
const stripCodeFences = (text: string): string =>
  text.trim().replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();

const looksLikeJson = (text: string): boolean => {
  const trimmed = stripCodeFences(text);
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

const extractLikelyJson = (text: string): string | null => {
  const cleaned = stripCodeFences(text);
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) return cleaned;

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  return null;
};

/* ─── Main API call (with pacing + single request) ─── */
export const callGemini = async (prompt: string, expectJson = false): Promise<string> => {
  const key = getApiKey();
  if (!key) {
    throw new GeminiError("NO_KEY", "No API key set. Add one in Settings to start analyzing.");
  }

  const { incrementUsage, isOverLimit, DAILY_LIMIT } = await import("./usage");

  if (isOverLimit()) {
    throw new GeminiError(
      "DAILY_LIMIT",
      `Daily limit of ${DAILY_LIMIT} analyses reached. Resets at midnight.`
    );
  }

  // Abort any previous in-flight request (deduplication)
  abortGeminiRequest();
  const controller = new AbortController();
  activeController = controller;

  if (IS_DEV) {
    console.group("[HackMind] Gemini Request");
    console.log("Prompt length:", prompt.length);
    console.log("Expect JSON:", expectJson);
    console.log("Prompt (first 500 chars):", prompt.slice(0, 500));
    console.groupEnd();
  }

  let text: string;
  try {
    // Pace calls to reduce 429 bursts, especially in fast repeated actions.
    const elapsed = Date.now() - lastRequestAt;
    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
    if (waitMs > 0) await sleep(waitMs);
    lastRequestAt = Date.now();

    text = await fetchGemini(prompt, key, controller.signal);

    if (IS_DEV) {
      console.group("[HackMind] Gemini Response");
      console.log("Response length:", text.length);
      console.log("Response (first 500 chars):", text.slice(0, 500));
      console.groupEnd();
    }

    // Avoid a second API call; extract JSON locally when model wraps output in prose/fences.
    if (expectJson && !looksLikeJson(text)) {
      const extracted = extractLikelyJson(text);
      if (extracted) {
        text = extracted;
      }
    }
  } finally {
    // Clear the active controller if it's still ours
    if (activeController === controller) {
      activeController = null;
    }
  }

  const count = incrementUsage();

  // Warn at thresholds
  if (count === 900 || count === 950 || count === 990) {
    const { toast } = await import("@/components/Toast");
    toast.warning(`You've used ${count} / ${DAILY_LIMIT} analyses today.`);
  }

  return text;
};
