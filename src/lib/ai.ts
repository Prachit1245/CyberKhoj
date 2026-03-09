import CryptoJS from 'crypto-js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const STORAGE_KEY = 'cyberkhoj_groq_key';

/* ─── Device fingerprint for encryption ─── */
function getDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
  ].join('|');
  return CryptoJS.SHA256(raw).toString();
}

/* ─── Key management (AES-encrypted) ─── */

export function saveApiKey(key: string) {
  const encrypted = CryptoJS.AES.encrypt(key, getDeviceFingerprint()).toString();
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function getApiKey(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(stored, getDeviceFingerprint());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      // Decryption failed (different device / corrupted) — clear it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return decrypted;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function removeApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

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

/** Abort any in-flight AI request */
export const abortGeminiRequest = (): void => {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
};

/* ─── Safe JSON parser ─── */
export function safeParseJSON(text: string) {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI response:', text);
    throw new Error('AI returned unexpected format. Please try again.');
  }
}

/* ─── Core AI call via Groq ─── */
async function callAIRaw(prompt: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an elite bug bounty hunter and security researcher. Always respond with valid JSON only. No markdown. No explanation. No code blocks. Just raw JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        max_tokens: 2048,
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new GeminiError("ABORTED", "Request was cancelled.");
    }
    throw new GeminiError("NETWORK_ERROR", "No internet connection. Check your connection and try again.");
  }

  if (!response.ok) {
    let errText = "";
    try {
      const errData = await response.json();
      errText = errData.error?.message || JSON.stringify(errData);
    } catch {
      errText = await response.text().catch(() => "");
    }

    if (response.status === 401) {
      throw new GeminiError("INVALID_KEY", "Invalid Groq API key. Get a fresh one at console.groq.com", 401);
    }
    if (response.status === 403) {
      throw new GeminiError("FORBIDDEN", "API key is restricted.", 403);
    }
    if (response.status === 429) {
      throw new GeminiError("RATE_LIMIT", "Daily limit reached. Groq gives 1000 free requests per day. Resets at midnight.", 429);
    }
    throw new GeminiError("API_ERROR", `Groq API error (${response.status}): ${errText.slice(0, 200)}`, response.status);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new GeminiError("PARSE_ERROR", "AI returned an empty response. Try again.");
  }
  return text;
}

/* ─── Main API call (with usage tracking) ─── */
export const callGemini = async (prompt: string, _expectJson = false): Promise<string> => {
  const key = getApiKey();
  if (!key) {
    throw new GeminiError("NO_KEY", "No API key set. Add one in Settings to start analyzing.");
  }

  const { incrementUsage, isOverLimit, DAILY_LIMIT } = await import("./usage");

  if (isOverLimit()) {
    throw new GeminiError("DAILY_LIMIT", `Daily limit of ${DAILY_LIMIT} analyses reached. Resets at midnight.`);
  }

  abortGeminiRequest();
  const controller = new AbortController();
  activeController = controller;

  let text: string;
  try {
    text = await callAIRaw(prompt, key, controller.signal);
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }

  const count = incrementUsage();
  if (count === 900 || count === 950 || count === 990) {
    const { toast } = await import("@/components/Toast");
    toast.warning(`You've used ${count} / ${DAILY_LIMIT} analyses today.`);
  }

  return text;
};

/* ─── Validate a Groq API key ─── */
export async function validateApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      }),
    });

    if (res.status === 401) return { ok: false, error: "Invalid API key." };
    if (res.status === 429) return { ok: true }; // Key is valid, just rate limited
    if (!res.ok) return { ok: false, error: `Validation failed (${res.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Groq API. Check your connection." };
  }
}
