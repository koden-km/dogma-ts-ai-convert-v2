// A HandlerConfigurer is the interface a handler uses to declare its
// configuration. It defines configuration methods common to all handler types.
//
// Each handler type has a corresponding configurer type that extends this
// interface.
//
// See:
//   - [AggregateConfigurer]
//   - [ProcessConfigurer]
//   - [IntegrationConfigurer]
//   - [ProjectionConfigurer].
export type HandlerConfigurer = {
  // identity() sets the handler's unique identity.
  //
  // n is a short human-readable name displayed wherever the handler's
  // identity appears, such as in logs and telemetry signals. The value must
  // be between 1 and 255 bytes in length, and contain only printable,
  // non-space UTF-8 characters. Changing the handler's name doesn't affect
  // its behavior. Each handler within an application must have a unique name.
  //
  // k is a key that uniquely identifies the handler. The engine uses the key
  // to associate handler state with the correct handler instance - it must
  // not change. The value must be a canonical RFC 9562 UUID string, such as
  // "3a6da031-aa6c-406a-8453-73762f71f917", and is case-insensitive.
  identity(n: string, k: string): void;

  // disable() excludes the handler from the application's runtime without
  // removing it from the application's configuration.
  //
  // Disabling a handler is appropriate when it cannot function in the current
  // execution environment but should still be present for documentation,
  // static analysis, and route discovery purposes.
  //
  // Prefer conditionally disabling a handler over conditionally adding it to
  // the application.
  disable(...options: DisableOption[]): void;
};

// DisableOption is an option that modifies the behavior of the
// [HandlerConfigurer].disable method.
//
// This type exists for forward-compatibility.
export type DisableOption = {
  readonly _futureDisableOption?: "DisableOption";
};

// HandlerScope represents the context within which the engine invokes a message
// handler.
//
// Each operation that a handler performs has a corresponding scope type that
// extends this interface:
//
//   - [AggregateCommandScope]
//   - [ProcessEventScope]
//   - [ProcessDeadlineScope]
//   - [IntegrationCommandScope]
//   - [ProjectionEventScope]
//   - [ProjectionCompactScope]
export type HandlerScope = {
  // now() returns the current local time according to the engine.
  //
  // Use this method in preference to `new Date()`; its return value may differ
  // in certain situations, such as when executing tests or when compensating
  // for clock skew in a distributed system.
  now(): Date;

  // log() records an informational message using printf-style formatting or
  // plain arguments.
  //
  // The message should be clear and relevant to developers and non-technical
  // stakeholders familiar with the application's domain. It's not intended
  // for display to end users.
  //
  // Use lowercase sentences with no trailing punctuation and omit sensitive
  // information.
  log(format: string, ...args: any[]): void;
};

// unwrapHandler returns the innermost handler wrapped by h.
export function unwrapHandler(h: any): any {
  let curr = h;
  while (curr && typeof curr.unwrapHandler === "function") {
    curr = curr.unwrapHandler();
  }
  return curr;
}
