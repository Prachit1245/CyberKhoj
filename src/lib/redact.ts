/**
 * Redact sensitive values from prompts before sending to AI.
 * Strips API keys, passwords, tokens, auth headers, cookies.
 */

const SENSITIVE_PARAMS_RE = /(token|key|secret|password|passwd|pwd|auth|api_key|apikey|access_token|bearer|client_secret|private_key|session|credential)=([^&\s]+)/gi;

const AUTHORIZATION_RE = /(Authorization:\s*)(Bearer\s+)?([^\n\r]+)/gi;
const COOKIE_RE = /(Cookie:\s*)([^\n\r]+)/gi;
const BEARER_INLINE_RE = /(Bearer\s+)([A-Za-z0-9._\-+=\/]{8,})/gi;

const isDev = import.meta.env.DEV;

function logRedaction(type: string) {
  if (isDev) {
    console.debug(`Redacted: ${type}`);
  }
}

/** Redact sensitive query parameter values in URLs */
function redactUrlParams(text: string): string {
  return text.replace(SENSITIVE_PARAMS_RE, (_match, paramName, _value) => {
    logRedaction(`${paramName} parameter`);
    return `${paramName}=[REDACTED]`;
  });
}

/** Redact Authorization header values */
function redactAuthHeaders(text: string): string {
  return text.replace(AUTHORIZATION_RE, (_match, prefix) => {
    logRedaction("Authorization header");
    return `${prefix}[REDACTED]`;
  });
}

/** Redact Cookie header values */
function redactCookieHeaders(text: string): string {
  return text.replace(COOKIE_RE, (_match, prefix) => {
    logRedaction("Cookie header");
    return `${prefix}[REDACTED]`;
  });
}

/** Redact inline Bearer tokens */
function redactBearerTokens(text: string): string {
  return text.replace(BEARER_INLINE_RE, (_match, prefix) => {
    logRedaction("Bearer token");
    return `${prefix}[REDACTED]`;
  });
}

/** Full redaction pipeline — call before sending any prompt to AI */
export function redactPrompt(prompt: string): string {
  let result = prompt;
  result = redactUrlParams(result);
  result = redactAuthHeaders(result);
  result = redactCookieHeaders(result);
  result = redactBearerTokens(result);
  return result;
}
