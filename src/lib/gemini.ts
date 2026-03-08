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

export const callGemini = async (prompt: string): Promise<string> => {
  const key = getApiKey();
  if (!key) throw new Error("Gemini API key not set");

  const { incrementUsage, isOverLimit, DAILY_LIMIT } = await import("./usage");

  if (isOverLimit()) {
    throw new Error(`Daily limit of ${DAILY_LIMIT} analyses reached. Resets at midnight.`);
  }

  const response = await fetch(`${MODEL_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const count = incrementUsage();

  // Warn at thresholds
  if (count === 900 || count === 950 || count === 990) {
    const { toast } = await import("@/hooks/use-toast");
    toast({
      title: "Usage Warning",
      description: `You've used ${count} / ${DAILY_LIMIT} analyses today.`,
      variant: "destructive",
    });
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
};
