// ConcurrencyPreference is a hint to the engine as to the best way to handle
// concurrent messages for a message handler.
//
// [IntegrationMessageHandler] and [ProjectionMessageHandler] support
// configuring their concurrency preference via their respective configurer
// interfaces.
export type ConcurrencyPreference =
  | typeof MaximizeConcurrency
  | typeof MinimizeConcurrency;

// MaximizeConcurrency instructs the engine to process as many messages
// concurrently as possible, maximizing throughput.
export const MaximizeConcurrency = 0 as const;

// MinimizeConcurrency instructs the engine to attempt to process
// messages one at a time, minimizing conflicts and/or contention.
export const MinimizeConcurrency = 1 as const;
