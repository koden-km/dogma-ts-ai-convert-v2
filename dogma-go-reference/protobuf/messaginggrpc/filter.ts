import { validateUUID } from "../uuidpb/uuid.js";
import type { MessageFilter } from "./filter_pb.js";

/**
 * Throws an error if x matches no message types or contains an invalid message
 * type ID.
 */
export function validateMessageFilter(x: MessageFilter | undefined): void {
  const types = x?.types;
  if (types?.case === "all") {
    return;
  }
  const ids = types?.case === "specific" ? types.value.ids : [];
  if (ids.length === 0) {
    throw new Error(
      "message filter must match all message types or at least one specific type",
    );
  }
  ids.forEach((id, i) => {
    try {
      validateUUID(id);
    } catch (cause) {
      throw new Error(
        `invalid message type ID at index ${i}: ${(cause as Error).message}`,
        { cause },
      );
    }
  });
}
