import type { DescMessage, MessageShape } from "@bufbuild/protobuf";
import { findAnyValue, setAnyValue } from "./any.js";
import type { Body, Envelope, Header } from "./envelope_pb.js";

/**
 * Returns the baggage value matching the given schema from an envelope's
 * baggage.
 *
 * Values in the envelope's body take precedence over those in its header. The
 * first matching value in each location wins; URL prefixes are ignored. A decode
 * failure does not fall back to another value. It returns `undefined` if no
 * baggage of the matching type is present.
 *
 * @throws {Error} If the baggage is present but cannot be decoded.
 */
export function tryGetBaggage<Desc extends DescMessage>(
  env: Envelope,
  schema: Desc,
): MessageShape<Desc> | undefined {
  return findAnyValue(schema, env.body?.baggage, env.header?.baggage);
}

/**
 * Returns the baggage value matching the given schema from an envelope.
 *
 * See {@link tryGetBaggage} for lookup precedence.
 *
 * @throws {Error} If the baggage value is absent or cannot be decoded.
 */
export function getBaggage<Desc extends DescMessage>(
  env: Envelope,
  schema: Desc,
): MessageShape<Desc> {
  const value = tryGetBaggage(env, schema);
  if (value === undefined) {
    throw new Error("baggage is not present");
  }
  return value;
}

/**
 * Sets value as a baggage value on target. If a baggage value of the same
 * message type is already present, it is replaced.
 */
export function setBaggage<Desc extends DescMessage>(
  target: Header | Body,
  schema: Desc,
  value: MessageShape<Desc>,
): void {
  setAnyValue(target.baggage, schema, value);
}
