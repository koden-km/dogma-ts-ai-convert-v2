// For UUID's use `crypto.randomUUID()` or add `uuid` package and then use it
// like: `import { v4 as randomUUID } from "uuid";`

const dashIndices = [9, 14, 19, 24];

export function normalizeUUID(id: string): string {
  if (id.length !== 36) {
    throw new Error(
      `${id} is not a canonical RFC 9562 UUID: expected 36 characters`,
    );
  }

  let normalized = id.toLowerCase();
  let isZero = true;

  for (let i = 0; i < 36; i++) {
    const c = normalized[i];
    if (dashIndices.includes(i)) {
      if (c !== "-") {
        throw new Error(
          `${id} is not a canonical RFC 9562 UUID: expected hyphen at position ${i}`,
        );
      }
    } else if (c.match(/[0-9a-f]/) === null) {
      throw new Error(
        `${id} is not a canonical RFC 9562 UUID: expected hex digit at position ${i}`,
      );
    }
    if (c.match(/[1-9a-f]/) === null) {
      isZero = false;
    }
  }

  if (isZero) {
    throw new Error(
      `${id} is not a canonical RFC 9562 UUID: the "zero" UUID is not supported`,
    );
  }

  return normalized;
}
