import { asMultiEnvelope, tryAppendEnvelope } from "./envelope.js";
import type { Envelope, MultiEnvelope } from "./envelope_pb.js";

/**
 * Groups consecutive envelopes with equivalent headers into multi-envelopes,
 * preserving message order. Header equivalence is the same as for
 * {@link tryAppendEnvelope}, including unknown fields.
 *
 * The iterator is lazy. It reads one envelope ahead to find each group boundary
 * and stops reading when iteration stops. Empty input yields nothing.
 *
 * A group is emitted when the header changes or the input ends. All bodies in
 * the current group are held in memory; an endless input with equivalent
 * headers keeps growing that group without emitting it.
 *
 * Each output has a new bodies array but shares its header and bodies with the
 * input. Inputs are not modified and must not be mutated during iteration.
 *
 * If the bodies share a header that is already known, prefer constructing a
 * multi-envelope directly with `create(MultiEnvelopeSchema, { header, bodies })`.
 * This avoids allocating temporary envelopes and comparing headers for each
 * body.
 *
 * @example
 * // Envelopes that already exist:
 * const batches = [...asMultiEnvelopes(envelopes)];
 *
 * // A packer with a known header can build a batch directly:
 * const batch = create(MultiEnvelopeSchema, { header, bodies });
 *
 * @throws {Error} During iteration if an envelope has no body. No other
 * validation or metadata transformation is performed.
 */
export function* asMultiEnvelopes(
  envelopes: Iterable<Envelope>,
): Generator<MultiEnvelope, void, unknown> {
  let group: MultiEnvelope | undefined;
  for (const env of envelopes) {
    if (!env.body) {
      throw new Error("envelope must have a body");
    }
    if (group) {
      if (tryAppendEnvelope(group, env)) {
        continue;
      }
      yield group;
    }
    group = asMultiEnvelope(env);
  }
  if (group) {
    yield group;
  }
}
