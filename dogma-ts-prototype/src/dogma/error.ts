// NotSupportedError is the error thrown when a feature is not supported by a
// particular implementation.
//
// It may be thrown by:
//  - [AggregateRoot].marshal()
//  - [AggregateRoot].unmarshal()
//  - [ProjectionMessageHandler].reset()
export class NotSupportedError extends Error {
  constructor(message: string = "Not supported") {
    super(message);
  }
}

// EventObserverNotSatisfiedError is thrown when [WithEventObserver] is used
// and the engine determines that no further relevant events can occur
// before any [EventObserver] returns satisfied === true.
//
// It may be returned by:
//  - [CommandExecutor].executeCommand()
export class EventObserverNotSatisfiedError extends Error {
  constructor(message: string = "Event observer not satisfied") {
    super(message);
  }
}
