import { describe, expect, test } from "bun:test";

import {
  cleanVtt,
  cleanSrt,
  cleanSubtitle,
  extractTimestamped,
  extractTimestampedSrt,
  extractTimestampedAuto,
  detectFormat,
  mergeIntoParagraphs,
  cleanAndMerge,
  joinLines,
  cleanAndJoin,
} from "./vtt";

// ============================================================================
// Test Data
// ============================================================================

const sampleVtt = `WEBVTT
Kind: captions
Language: en

00:00:01.000 --> 00:00:03.500
Hello world

00:00:03.500 --> 00:00:05.000
This is a test

00:00:05.000 --> 00:00:07.000
Hello world
`;

const sampleSrt = `1
00:00:00,000 --> 00:00:03,360
因为虽然Manus的宣传片

2
00:00:03,360 --> 00:00:04,400
基本是我出镜

3
00:00:04,400 --> 00:00:04,940
然后呢

4
00:00:04,940 --> 00:00:05,760
这时候呢

5
00:00:05,760 --> 00:00:07,120
自然有人支持

6
00:00:07,120 --> 00:00:07,920
有人骂对吧

7
00:00:07,920 --> 00:00:09,140
这就是这个事情的本质。

8
00:00:09,140 --> 00:00:11,000
那么接下来我们来看

9
00:00:11,000 --> 00:00:12,500
第二个问题是什么？
`;

const vttWithInlineTags = `WEBVTT

00:00:01.000 --> 00:00:03.000
<00:00:01.500>Hello <c>world</c>

00:00:03.000 --> 00:00:05.000 align:start position:0%
This is a test
`;

// ============================================================================
// Format Detection
// ============================================================================

describe("detectFormat", () => {
  test("detects VTT format", () => {
    expect(detectFormat(sampleVtt)).toBe("vtt");
  });

  test("detects SRT format", () => {
    expect(detectFormat(sampleSrt)).toBe("srt");
  });

  test("returns unknown for plain text", () => {
    expect(detectFormat("Hello world")).toBe("unknown");
  });
});

// ============================================================================
// VTT Cleaning
// ============================================================================

describe("cleanVtt", () => {
  test("removes header and metadata", () => {
    const lines = cleanVtt(sampleVtt);
    expect(lines).not.toContain("WEBVTT");
    expect(lines).not.toContain("Kind: captions");
  });

  test("removes timestamps", () => {
    const lines = cleanVtt(sampleVtt);
    expect(lines.some((l) => l.includes("-->"))).toBe(false);
  });

  test("deduplicates consecutive identical lines", () => {
    const lines = cleanVtt(sampleVtt);
    // "Hello world" appears twice but not consecutively, so both should remain
    expect(lines.filter((l) => l === "Hello world").length).toBe(2);
  });

  test("removes inline tags", () => {
    const lines = cleanVtt(vttWithInlineTags);
    expect(lines[0]).toBe("Hello world");
    expect(lines[1]).toBe("This is a test");
  });

  test("returns correct line count", () => {
    const lines = cleanVtt(sampleVtt);
    expect(lines.length).toBe(3);
  });
});

// ============================================================================
// SRT Cleaning
// ============================================================================

describe("cleanSrt", () => {
  test("removes sequence numbers", () => {
    const lines = cleanSrt(sampleSrt);
    expect(lines.some((l) => /^\d+$/.test(l))).toBe(false);
  });

  test("removes timestamps", () => {
    const lines = cleanSrt(sampleSrt);
    expect(lines.some((l) => l.includes("-->"))).toBe(false);
  });

  test("extracts all text lines", () => {
    const lines = cleanSrt(sampleSrt);
    expect(lines.length).toBe(9);
    expect(lines[0]).toBe("因为虽然Manus的宣传片");
  });
});

// ============================================================================
// cleanSubtitle (auto-detect)
// ============================================================================

describe("cleanSubtitle", () => {
  test("handles VTT", () => {
    const lines = cleanSubtitle(sampleVtt);
    expect(lines.length).toBe(3);
  });

  test("handles SRT", () => {
    const lines = cleanSubtitle(sampleSrt);
    expect(lines.length).toBe(9);
  });
});

// ============================================================================
// Timestamped Extraction
// ============================================================================

describe("extractTimestamped", () => {
  test("extracts VTT timestamps", () => {
    const entries = extractTimestamped(sampleVtt);
    expect(entries.length).toBe(3);
    expect(entries[0]).toEqual({ time: "00:00:01.000", text: "Hello world" });
  });

  test("deduplicates consecutive identical text", () => {
    const vttWithDupes = `WEBVTT

00:00:01.000 --> 00:00:02.000
Hello

00:00:02.000 --> 00:00:03.000
Hello

00:00:03.000 --> 00:00:04.000
World
`;
    const entries = extractTimestamped(vttWithDupes);
    expect(entries.length).toBe(2);
    expect(entries[0]?.text).toBe("Hello");
    expect(entries[1]?.text).toBe("World");
  });
});

describe("extractTimestampedSrt", () => {
  test("extracts SRT timestamps", () => {
    const entries = extractTimestampedSrt(sampleSrt);
    expect(entries.length).toBe(9);
    expect(entries[0]).toEqual({
      time: "00:00:00",
      text: "因为虽然Manus的宣传片",
    });
  });
});

describe("extractTimestampedAuto", () => {
  test("auto-detects VTT", () => {
    const entries = extractTimestampedAuto(sampleVtt);
    expect(entries.length).toBe(3);
  });

  test("auto-detects SRT", () => {
    const entries = extractTimestampedAuto(sampleSrt);
    expect(entries.length).toBe(9);
  });
});

// ============================================================================
// Paragraph Merging
// ============================================================================

describe("mergeIntoParagraphs", () => {
  test("merges until sentence end (Chinese)", () => {
    const lines = [
      "因为虽然Manus的宣传片",
      "基本是我出镜",
      "然后呢",
      "这就是这个事情的本质。",
      "那么接下来我们来看",
    ];
    const paragraphs = mergeIntoParagraphs(lines);
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toBe(
      "因为虽然Manus的宣传片基本是我出镜然后呢这就是这个事情的本质。",
    );
    expect(paragraphs[1]).toBe("那么接下来我们来看");
  });

  test("merges until sentence end (English)", () => {
    const lines = ["Hello", "world.", "This is", "a test."];
    const paragraphs = mergeIntoParagraphs(lines);
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toBe("Hello world.");
    expect(paragraphs[1]).toBe("This is a test.");
  });

  test("respects maxLength", () => {
    const lines = ["a".repeat(100), "b".repeat(100), "c".repeat(100)];
    const paragraphs = mergeIntoParagraphs(lines, 150);
    expect(paragraphs.length).toBe(3);
  });

  test("adds space between English words", () => {
    const lines = ["Hello", "world"];
    const paragraphs = mergeIntoParagraphs(lines);
    expect(paragraphs[0] ?? "").toBe("Hello world");
  });

  test("no space between CJK characters", () => {
    const lines = ["你好", "世界"];
    const paragraphs = mergeIntoParagraphs(lines);
    expect(paragraphs[0] ?? "").toBe("你好世界");
  });
});

describe("cleanAndMerge", () => {
  test("cleans SRT and merges", () => {
    const paragraphs = cleanAndMerge(sampleSrt);
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toContain("这就是这个事情的本质。");
    expect(paragraphs[1]).toContain("第二个问题是什么？");
  });
});

// ============================================================================
// Join Lines
// ============================================================================

describe("joinLines", () => {
  test("joins and wraps at width", () => {
    const lines = ["Hello", "world", "this", "is", "a", "test"];
    const result = joinLines(lines, 10);
    expect(result[0]).toBe("Helloworld");
    expect(result[1]).toBe("thisisates");
    expect(result[2]).toBe("t");
  });

  test("handles CJK characters", () => {
    const lines = ["你好", "世界", "这是", "测试"];
    const result = joinLines(lines, 6);
    expect(result[0]).toBe("你好世界这是");
    expect(result[1]).toBe("测试");
  });

  test("default width is 80", () => {
    const lines = ["a".repeat(100)];
    const result = joinLines(lines);
    expect(result[0]?.length).toBe(80);
    expect(result[1]?.length).toBe(20);
  });
});

describe("cleanAndJoin", () => {
  test("cleans and joins SRT", () => {
    const result = cleanAndJoin(sampleSrt, 50);
    // All content joined into lines of ~50 chars
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.length).toBeLessThanOrEqual(50);
  });
});
