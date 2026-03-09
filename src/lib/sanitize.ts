import DOMPurify from "dompurify";

/** Sanitize user input to prevent XSS. Strips all HTML tags. */
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/** Sanitize but allow basic markdown-safe HTML (no scripts/events). */
export function sanitizeMarkdown(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "code", "pre", "br", "p", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "span", "table", "thead", "tbody", "tr", "th", "td"],
    ALLOWED_ATTR: ["href", "title", "class"],
  });
}

/** Input length limits */
export const INPUT_LIMITS = {
  URL: 2000,
  BATCH_MAX_URLS: 50,
  BATCH_URL_LENGTH: 2000,
  NOTES: 5000,
  PAYLOAD: 1000,
  HTTP_REQUEST: 10000,
  JWT_TOKEN: 5000,
} as const;

/** Truncate input to a max length */
export function enforceLimit(value: string, max: number): string {
  return value.slice(0, max);
}
