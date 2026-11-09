import {
  fromBinary,
  type DescMessage,
  type MessageShape,
} from "@bufbuild/protobuf";
import { anyPack, type Any } from "@bufbuild/protobuf/wkt";

/**
 * Returns the first value matching the given schema from the given sets of
 * {@link Any} values, searching each set in order.
 *
 * @throws {Error} If a matching value is present but cannot be decoded.
 */
export function findAnyValue<Desc extends DescMessage>(
  schema: Desc,
  ...sets: (Any[] | undefined)[]
): MessageShape<Desc> | undefined {
  for (const values of sets) {
    for (const v of values ?? []) {
      if (isType(v, schema)) {
        return fromBinary(schema, v.value);
      }
    }
  }

  return undefined;
}

/**
 * Packs value into an {@link Any} and replaces the value in values of the same
 * message type, or appends it if there is none.
 *
 * Only the message name at the end of the type URL is compared, so values
 * packed with different type URL prefixes are the same type.
 */
export function setAnyValue<Desc extends DescMessage>(
  values: Any[],
  schema: Desc,
  value: MessageShape<Desc>,
): void {
  const packed = anyPack(schema, value);
  const index = values.findIndex((v) => isType(v, schema));

  if (index === -1) {
    values.push(packed);
  } else {
    values[index] = packed;
  }
}

// isType returns true if v contains a message of the given type.
//
// Like Go's anypb.Any.MessageIs(), it compares the message name at the end of
// the type URL. Unlike anyIs() from protobuf-es, it doesn't throw if a type URL
// has no message name, so a malformed value doesn't prevent other values from
// being found.
function isType(v: Any, schema: DescMessage): boolean {
  const name = v.typeUrl.slice(v.typeUrl.lastIndexOf("/") + 1);
  return name === schema.typeName;
}
