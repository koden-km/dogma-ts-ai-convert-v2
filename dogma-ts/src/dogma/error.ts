// NotSupportedError is the error thrown when a feature is not supported by a
// particular implementation.
//
// It may be thrown by:
//  - [AggregateMessageHandler].marshal() / [AggregateRoot].marshal()
//  - [AggregateMessageHandler].unmarshal() / [AggregateRoot].unmarshal()
//  - [ProjectionMessageHandler].reset()
export class NotSupportedError extends Error {
  constructor(message: string = "not supported") {
    super(message);
    this.name = "NotSupportedError";
  }
}

// EventObserverNotSatisfiedError is thrown when [withEventObserver] is used
// and the engine determines that no further relevant events can occur
// before any [EventObserver] returns satisfied === true.
//
// It may be thrown by:
//  - [CommandExecutor].executeCommand()
export class EventObserverNotSatisfiedError extends Error {
  constructor(message: string = "event observer not satisfied") {
    super(message);
    this.name = "EventObserverNotSatisfiedError";
  }
}

export const ErrNotSupported = new NotSupportedError();
export const ErrEventObserverNotSatisfied =
  new EventObserverNotSatisfiedError();
