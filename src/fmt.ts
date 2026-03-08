import { encode } from "@toon-format/toon";

export type Format = "toon" | "json";

export function print(content: unknown, format: Format = "toon"): void {
  if (format === "json") {
    console.log(JSON.stringify(content, null, 2));
    return;
  }

  console.log(encode(content));
}

