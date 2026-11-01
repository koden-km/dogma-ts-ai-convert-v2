export function normalizeUUID(id: string): string {
  const size = 36;

  if (id.length !== size) {
    throw new Error(
      `${JSON.stringify(id)} is not a canonical RFC 9562 UUID: expected 36 characters`,
    );
  }

  let normalized = "";
  let isNil = true;

  for (let i = 0; i < size; i++) {
    const c = id[i];

    if (i === 8 || i === 13 || i === 18 || i === 23) {
      if (c !== "-") {
        throw new Error(
          `${JSON.stringify(id)} is not a canonical RFC 9562 UUID: expected hyphen at position ${i}`,
        );
      }
      normalized += c;
    } else {
      if (c === "0") {
        normalized += c;
      } else if (c >= "1" && c <= "9") {
        isNil = false;
        normalized += c;
      } else if (c >= "a" && c <= "f") {
        isNil = false;
        normalized += c;
      } else if (c >= "A" && c <= "F") {
        isNil = false;
        normalized += c.toLowerCase();
      } else {
        throw new Error(
          `${JSON.stringify(id)} is not a canonical RFC 9562 UUID: expected hex digit at position ${i}`,
        );
      }
    }
  }

  if (isNil) {
    throw new Error(
      `${JSON.stringify(id)} is not a canonical RFC 9562 UUID: the "nil" UUID is not supported`,
    );
  }

  return normalized;
}
