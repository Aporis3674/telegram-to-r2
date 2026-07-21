import {
  createExecutionContext,
  env,
  SELF,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Telegram to R2 worker", () => {
  it("returns camouflage HTML page for root GET (unit style)", async () => {
    const request = new IncomingRequest("http://example.com");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    const text = await response.text();
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(text).toContain("Welcome");
    expect(text).toContain("<!DOCTYPE html>");
  });

  it("returns camouflage HTML page for root GET (integration style)", async () => {
    const response = await SELF.fetch("https://example.com");
    const text = await response.text();
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(text).toContain("Welcome");
    expect(text).toContain("<!DOCTYPE html>");
  });

  it("returns camouflage for unknown paths", async () => {
    const response = await SELF.fetch("https://example.com/random/path");
    const text = await response.text();
    expect(text).toContain("Welcome");
  });

  it("returns 404 for file path with empty key", async () => {
    const response = await SELF.fetch("https://example.com/file/");
    expect(response.status).toBe(404);
  });
});
