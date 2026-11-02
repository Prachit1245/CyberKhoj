export type EncoderId =
  | "base64"
  | "base64url"
  | "url"
  | "urlFull"
  | "html"
  | "hex"
  | "unicode"
  | "binary"
  | "rot13"
  | "jwt"
  | "doubleUrl";

export interface EncoderDef {
  id: EncoderId;
  label: string;
  encode?: (s: string) => string;
  decode: (s: string) => string;
}

const utf8Bytes = (s: string) => new TextEncoder().encode(s);
const fromBytes = (b: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(b);

export const b64Encode = (s: string) => {
  let bin = "";
  utf8Bytes(s).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

export const b64Decode = (s: string) => {
  const clean = s.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return fromBytes(bytes);
};

const HTML_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const htmlDecode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const hexEncode = (s: string) =>
  Array.from(utf8Bytes(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");

const hexDecode = (s: string) => {
  const clean = s.replace(/0x/gi, "").replace(/[^0-9a-f]/gi, "");
  if (clean.length % 2 !== 0) throw new Error("Hex string has an odd number of digits");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  return fromBytes(bytes);
};

const unicodeEncode = (s: string) =>
  Array.from(s)
    .map((c) => {
      const cp = c.codePointAt(0)!;
      return cp > 0xffff
        ? c
            .split("")
            .map((u) => "\\u" + u.charCodeAt(0).toString(16).padStart(4, "0"))
            .join("")
        : "\\u" + cp.toString(16).padStart(4, "0");
    })
    .join("");

const unicodeDecode = (s: string) =>
  s
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

const binaryEncode = (s: string) =>
  Array.from(utf8Bytes(s))
    .map((b) => b.toString(2).padStart(8, "0"))
    .join(" ");

const binaryDecode = (s: string) => {
  const clean = s.replace(/[^01]/g, "");
  if (clean.length % 8 !== 0) throw new Error("Binary length must be a multiple of 8");
  const bytes = new Uint8Array(clean.length / 8);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 8, 8), 2);
  return fromBytes(bytes);
};

const rot13 = (s: string) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

const percentAll = (s: string) =>
  Array.from(utf8Bytes(s))
    .map((b) => "%" + b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");

export const jwtDecode = (s: string) => {
  const parts = s.trim().split(".");
  if (parts.length < 2) throw new Error("Not a JWT (expected header.payload.signature)");
  const pretty = (p: string) => JSON.stringify(JSON.parse(b64Decode(p)), null, 2);
  return `// HEADER\n${pretty(parts[0])}\n\n// PAYLOAD\n${pretty(parts[1])}\n\n// SIGNATURE\n${parts[2] ?? "(none — unsigned token)"}`;
};

export const ENCODERS: EncoderDef[] = [
  { id: "base64", label: "Base64", encode: b64Encode, decode: b64Decode },
  {
    id: "base64url",
    label: "Base64URL",
    encode: (s) => b64Encode(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    decode: b64Decode,
  },
  { id: "url", label: "URL (component)", encode: encodeURIComponent, decode: (s) => decodeURIComponent(s.replace(/\+/g, " ")) },
  { id: "urlFull", label: "URL (all chars %XX)", encode: percentAll, decode: (s) => decodeURIComponent(s) },
  { id: "doubleUrl", label: "Double URL", encode: (s) => encodeURIComponent(encodeURIComponent(s)), decode: (s) => decodeURIComponent(decodeURIComponent(s)) },
  { id: "html", label: "HTML entities", encode: (s) => s.replace(/[&<>"']/g, (c) => HTML_MAP[c]), decode: htmlDecode },
  { id: "hex", label: "Hex", encode: hexEncode, decode: hexDecode },
  { id: "unicode", label: "Unicode \\uXXXX", encode: unicodeEncode, decode: unicodeDecode },
  { id: "binary", label: "Binary", encode: binaryEncode, decode: binaryDecode },
  { id: "rot13", label: "ROT13", encode: rot13, decode: rot13 },
  { id: "jwt", label: "JWT (decode only)", decode: jwtDecode },
];

export function runEncoder(id: EncoderId, mode: "encode" | "decode", input: string): { output: string; error?: string } {
  const enc = ENCODERS.find((e) => e.id === id);
  if (!enc) return { output: "", error: "Unknown encoder" };
  try {
    const fn = mode === "encode" ? enc.encode : enc.decode;
    if (!fn) return { output: "", error: `${enc.label} supports decode only` };
    return { output: fn(input) };
  } catch (e) {
    return { output: "", error: e instanceof Error ? e.message : "Conversion failed" };
  }
}
