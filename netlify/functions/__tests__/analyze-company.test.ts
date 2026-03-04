import { describe, it, expect } from "vitest";
import { truncateTranscript, formatCurrency, pct } from "../analyze-company.mjs";

describe("formatCurrency", () => {
  it("formats billions", () => {
    expect(formatCurrency(1_500_000_000)).toBe("$1.5B");
    expect(formatCurrency(2_000_000_000)).toBe("$2.0B");
  });

  it("formats millions", () => {
    expect(formatCurrency(618_000_000)).toBe("$618M");
    expect(formatCurrency(1_200_000)).toBe("$1M");
  });

  it("formats thousands", () => {
    expect(formatCurrency(50_000)).toBe("$50K");
  });

  it("formats small values", () => {
    expect(formatCurrency(500)).toBe("$500");
  });

  it("handles negative values", () => {
    expect(formatCurrency(-2_000_000_000)).toBe("$-2.0B");
    expect(formatCurrency(-50_000_000)).toBe("$-50M");
  });
});

describe("pct", () => {
  it("formats decimal as percentage", () => {
    expect(pct(0.251)).toBe("25.1%");
    expect(pct(0.1)).toBe("10.0%");
    expect(pct(1)).toBe("100.0%");
  });

  it("handles negative values", () => {
    expect(pct(-0.05)).toBe("-5.0%");
  });
});

describe("truncateTranscript", () => {
  it("returns short content unchanged", () => {
    const short = "This is a short transcript.";
    expect(truncateTranscript(short, 4000)).toBe(short);
  });

  it("extracts Q&A section when markers are found", () => {
    // Build a transcript with prepared remarks then Q&A
    const prepared = "A".repeat(3000);
    const qa = "Question-and-Answer\n" + "Q: What about M&A?\nA: We are actively looking.";
    const content = prepared + "\n" + qa;

    const result = truncateTranscript(content, 500);
    expect(result).toContain("Question-and-Answer");
    expect(result).toContain("[...prepared remarks truncated");
  });

  it("falls back to beginning + end when no Q&A markers", () => {
    const content = "X".repeat(10000);
    const result = truncateTranscript(content, 2000);
    expect(result).toContain("[...truncated...]");
    expect(result.length).toBeLessThanOrEqual(2100); // some buffer for separator
  });

  it("respects custom budget parameter", () => {
    const content = "B".repeat(5000);
    const result = truncateTranscript(content, 1000);
    expect(result.length).toBeLessThanOrEqual(1100);
  });

  it("does not split Q&A marker that appears in first 25% of content", () => {
    // Q&A marker early in the transcript should be ignored (likely a false positive)
    const content = "Question-and-Answer section\n" + "Y".repeat(10000);
    const result = truncateTranscript(content, 2000);
    // Should fall back since marker is at position 0 which is < 25%
    expect(result).toContain("[...truncated...]");
  });
});
