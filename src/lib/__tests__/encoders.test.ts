import { describe, it, expect } from "vitest";
import { runEncoder } from "../encoders";

describe("encoders", () => {
  it("base64 round-trips unicode", () => {
    const e = runEncoder("base64", "encode", "नमस्ते <x>").output;
    expect(runEncoder("base64", "decode", e).output).toBe("नमस्ते <x>");
  });
  it("html encodes script tag", () => {
    expect(runEncoder("html", "encode", "<script>").output).toBe("&lt;script&gt;");
  });
  it("hex encodes", () => {
    expect(runEncoder("hex", "encode", "AB").output).toBe("41 42");
  });
  it("double url encodes", () => {
    expect(runEncoder("doubleUrl", "encode", "<").output).toBe("%253C");
  });
  it("decodes jwt payload", () => {
    const t = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig";
    expect(runEncoder("jwt", "decode", t).output).toContain('"sub": "123"');
  });
  it("reports bad input", () => {
    expect(runEncoder("hex", "decode", "abc").error).toBeTruthy();
  });
});
