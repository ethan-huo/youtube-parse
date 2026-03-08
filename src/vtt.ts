/**
 * VTT/SRT subtitle parsing utilities.
 */

export type TimestampedEntry = {
  time: string;
  text: string;
};

/**
 * Clean VTT content to plain text.
 * - Removes WEBVTT header and metadata
 * - Removes timestamps
 * - Removes inline tags (<c>, <00:00:00.000>)
 * - Deduplicates consecutive identical lines
 */
export function cleanVtt(content: string): string[] {
  const lines: string[] = [];

  for (let line of content.split("\n")) {
    line = line.trim();

    // Skip metadata lines
    if (
      !line ||
      line.startsWith("WEBVTT") ||
      line.startsWith("Kind:") ||
      line.startsWith("Language:") ||
      line.includes("-->") ||
      line.includes("align:")
    ) {
      continue;
    }

    // Clean inline timestamps and tags
    line = line.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "");
    line = line.replace(/<\/?c>/g, "");
    line = line.trim();

    if (line) {
      lines.push(line);
    }
  }

  // Deduplicate consecutive identical lines
  const dedupedLines: string[] = [];
  let prev = "";
  for (const line of lines) {
    if (line !== prev) {
      dedupedLines.push(line);
      prev = line;
    }
  }

  return dedupedLines;
}

/**
 * Extract timestamped entries from VTT content.
 */
export function extractTimestamped(content: string): TimestampedEntry[] {
  const timestampPattern =
    /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/;
  const entries: TimestampedEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const match = line.match(timestampPattern);
    if (!match) continue;

    const startTime = match[1] ?? "";
    i++;

    // Collect text until next timestamp or empty line
    const textParts: string[] = [];
    while (i < lines.length) {
      const currentLine = lines[i];
      if (
        !currentLine ||
        !currentLine.trim() ||
        timestampPattern.test(currentLine)
      ) {
        i--; // back up so outer loop can process this line
        break;
      }
      let text = currentLine.trim();
      // Clean inline tags
      text = text.replace(/<[^>]+>/g, "");
      if (text && !text.startsWith("align:")) {
        textParts.push(text);
      }
      i++;
    }

    if (textParts.length > 0) {
      entries.push({
        time: startTime,
        text: textParts.join(" "),
      });
    }
  }

  // Deduplicate consecutive identical text
  const dedupedEntries: TimestampedEntry[] = [];
  let prevText = "";
  for (const entry of entries) {
    if (entry.text !== prevText) {
      dedupedEntries.push(entry);
      prevText = entry.text;
    }
  }

  return dedupedEntries;
}

/**
 * Clean SRT content to plain text.
 * SRT format:
 * 1
 * 00:00:01,000 --> 00:00:03,500
 * Text content
 */
export function cleanSrt(content: string): string[] {
  const lines: string[] = [];
  const srtTimestamp = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;

  for (let line of content.split("\n")) {
    line = line.trim();

    // Skip empty, sequence numbers, and timestamp lines
    if (!line || /^\d+$/.test(line) || srtTimestamp.test(line)) {
      continue;
    }

    lines.push(line);
  }

  // Deduplicate consecutive identical lines
  const dedupedLines: string[] = [];
  let prev = "";
  for (const line of lines) {
    if (line !== prev) {
      dedupedLines.push(line);
      prev = line;
    }
  }

  return dedupedLines;
}

/**
 * Extract timestamped entries from SRT content.
 */
export function extractTimestampedSrt(content: string): TimestampedEntry[] {
  const timestampPattern =
    /^(\d{2}:\d{2}:\d{2}),\d{3} --> (\d{2}:\d{2}:\d{2}),\d{3}$/;
  const entries: TimestampedEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const match = line.trim().match(timestampPattern);
    if (!match) continue;

    const startTime = match[1] ?? "";
    i++;

    // Collect text until empty line
    const textParts: string[] = [];
    while (i < lines.length) {
      const currentLine = lines[i];
      if (!currentLine || !currentLine.trim()) {
        break;
      }
      textParts.push(currentLine.trim());
      i++;
    }

    if (textParts.length > 0) {
      entries.push({
        time: startTime,
        text: textParts.join(" "),
      });
    }
  }

  // Deduplicate
  const dedupedEntries: TimestampedEntry[] = [];
  let prevText = "";
  for (const entry of entries) {
    if (entry.text !== prevText) {
      dedupedEntries.push(entry);
      prevText = entry.text;
    }
  }

  return dedupedEntries;
}

/**
 * Detect subtitle format from content.
 */
export function detectFormat(content: string): "vtt" | "srt" | "unknown" {
  if (content.trimStart().startsWith("WEBVTT")) {
    return "vtt";
  }
  if (/^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3} -->/.test(content.trim())) {
    return "srt";
  }
  return "unknown";
}

/**
 * Clean subtitle content (auto-detect format).
 */
export function cleanSubtitle(content: string): string[] {
  const format = detectFormat(content);
  if (format === "vtt") {
    return cleanVtt(content);
  }
  if (format === "srt") {
    return cleanSrt(content);
  }
  // Unknown format, return lines as-is
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Extract timestamped entries (auto-detect format).
 */
export function extractTimestampedAuto(content: string): TimestampedEntry[] {
  const format = detectFormat(content);
  if (format === "vtt") {
    return extractTimestamped(content);
  }
  if (format === "srt") {
    return extractTimestampedSrt(content);
  }
  return [];
}

/**
 * Sentence-ending punctuation for CJK and Western languages.
 */
const SENTENCE_END = /[。！？.!?]/;

/**
 * Merge short lines into paragraphs.
 * - Joins lines until sentence-ending punctuation or max length
 * - Preserves natural sentence boundaries
 */
export function mergeIntoParagraphs(
  lines: string[],
  maxLength: number = 200,
): string[] {
  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    // If adding this line would exceed max length, flush current
    if (current && current.length + line.length > maxLength) {
      paragraphs.push(current);
      current = line;
    } else {
      // Append line (no space for CJK, space for Western)
      const needsSpace =
        current && /[a-zA-Z]$/.test(current) && /^[a-zA-Z]/.test(line);
      current = current + (needsSpace ? " " : "") + line;
    }

    // If current ends with sentence punctuation, flush
    if (SENTENCE_END.test(current)) {
      paragraphs.push(current);
      current = "";
    }
  }

  // Flush remaining
  if (current) {
    paragraphs.push(current);
  }

  return paragraphs;
}

/**
 * Clean and merge subtitle content into paragraphs.
 */
export function cleanAndMerge(content: string, maxLength?: number): string[] {
  const lines = cleanSubtitle(content);
  return mergeIntoParagraphs(lines, maxLength);
}

/**
 * Join all lines into continuous text, wrapped at specified width.
 */
export function joinLines(lines: string[], width: number = 80): string[] {
  // Join all lines into one continuous string
  const fullText = lines.join("");

  // Wrap at width
  const wrapped: string[] = [];
  let current = "";

  for (const char of fullText) {
    current += char;
    if (current.length >= width) {
      wrapped.push(current);
      current = "";
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

/**
 * Clean and join subtitle content into width-wrapped lines.
 */
export function cleanAndJoin(content: string, width?: number): string[] {
  const lines = cleanSubtitle(content);
  return joinLines(lines, width);
}
