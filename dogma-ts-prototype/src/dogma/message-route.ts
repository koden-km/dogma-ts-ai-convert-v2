import { RegisteredMessageType } from "./message-type-registry.ts";

// HandlesCommand configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a consumer of [Command] messages of type T.
//
// It panics if T isn't in the message registry, see [RegisterCommand].
//
// Pass the returned [MessageRoute] to [AggregateConfigurer].Routes or
// [IntegrationConfigurer].Routes.
//
// The engine panics if the application has multiple handlers that handle T.
// export function HandlesCommand[T Command](...HandlesCommandOption) interface {
// 	AggregateRoute
// 	IntegrationRoute
// } {
// 	return HandlesCommandRoute{typ: registeredMessageTypeFor[T]()}
// }

// export function handlesCommand(options: ...HandlesCommandOption[]) interface {
// 	AggregateRoute
// 	IntegrationRoute
// } {
// 	return HandlesCommandRoute{typ: registeredMessageTypeFor[T]()}
// }

// ExecutesCommand configures a [ProcessMessageHandler] as a producer of
// [Command] messages of type T.
//
// It panics if T isn't in the message registry, see [RegisterCommand].
//
// Pass the returned [MessageRoute] to [ProcessConfigurer].Routes.
//
// The application may have multiple handlers that execute T.
// func ExecutesCommand[T Command](...ExecutesCommandOption) interface {
// 	ProcessRoute
// } {
// 	return ExecutesCommandRoute{typ: registeredMessageTypeFor[T]()}
// }

// RecordsEvent configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a producer of [Event] messages of type T.
//
// It panics if T isn't in the message registry, see [RegisterEvent].
//
// Pass the returned [MessageRoute] to [AggregateConfigurer].Routes or
// [IntegrationConfigurer].Routes.
//
// The engine panics if the application has multiple handlers that record T.
// func RecordsEvent[T Event](...RecordsEventOption) interface {
// 	AggregateRoute
// 	IntegrationRoute
// } {
// 	return RecordsEventRoute{typ: registeredMessageTypeFor[T]()}
// }

// HandlesEvent configures a [ProcessMessageHandler] or [ProjectionMessageHandler] as a
// consumer of [Event] messages of type T.
//
// It panics if T isn't in the message registry, see [RegisterEvent].
//
// Pass the returned [MessageRoute] to [ProcessConfigurer].Routes or
// [ProjectionConfigurer].Routes.
//
// An application may have multiple handlers that handle T.
// func HandlesEvent[T Event](...HandlesEventOption) interface {
// 	ProcessRoute
// 	ProjectionRoute
// } {
// 	return HandlesEventRoute{typ: registeredMessageTypeFor[T]()}
// }

// SchedulesDeadline configures a [ProcessMessageHandler] as a scheduler of
// [Deadline] messages of type T.
//
// It panics if T isn't in the message registry, see [RegisterDeadline].
//
// Pass the returned [MessageRoute] to [ProcessConfigurer].Routes.
//
// The application may have multiple handlers that schedule T.
// func SchedulesDeadline[T Deadline](...SchedulesDeadlineOption) interface {
// 	ProcessRoute
// } {
// 	return SchedulesDeadlineRoute{typ: registeredMessageTypeFor[T]()}
// }

// MessageRoute is an interface for types that describe a relationship between a
// message handler and a specific message type.
export type MessageRoute = {
  isMessageRoute(): void;

  type(): RegisteredMessageType;
};

// HandlesCommandRoute is a [HandlerRoute] that represents a handler's
// ability to handle [Command] messages of a specific type.
//
// Use [HandlesCommand] to construct values of this type.
export type HandlesCommandRoute = {
  typ: RegisteredMessageType;
};

// ExecutesCommandRoute is a [HandlerRoute] that represents a handler's
// ability to execute [Command] messages of a specific type.
//
// Use [ExecutesCommand] to construct values of this type.
export type ExecutesCommandRoute = {
  typ: RegisteredMessageType;
};

// HandlesEventRoute is a [HandlerRoute] that represents a handler's
// ability to handle [Event] messages of a specific type.
//
// Use [HandlesEvent] to construct values of this type.
export type HandlesEventRoute = {
  typ: RegisteredMessageType;
};

// RecordsEventRoute is a [HandlerRoute] that represents a handler's
// ability to record [Event] messages of a specific type.
//
// Use [RecordsEvent] to construct values of this type.
export type RecordsEventRoute = {
  typ: RegisteredMessageType;
};

// SchedulesDeadlineRoute is a [HandlerRoute] that represents a handler's
// ability to schedule [Deadline] messages of a specific type.
//
// Use [SchedulesDeadline] to construct values of this type.
export type SchedulesDeadlineRoute = {
  typ: RegisteredMessageType;
};

// HandlesCommandOption is an option that modifies the behavior of
// [HandlesCommand].
//
// This type exists for forward-compatibility.
export type HandlesCommandOption = {
  // futureHandlesCommandOption()
};

// ExecutesCommandOption is an option that modifies the behavior of
// [ExecutesCommand].
//
// This type exists for forward-compatibility.
export type ExecutesCommandOption = {
  // futureExecutesCommandOption()
};

// HandlesEventOption is an option that modifies the behavior of
// [HandlesEvent].
//
// This type exists for forward-compatibility.
export type HandlesEventOption = {
  // futureHandlesEventOption()
};

// RecordsEventOption is an option that modifies the behavior of
// [RecordsEvent].
//
// This type exists for forward-compatibility.
export type RecordsEventOption = {
  // futureRecordsEventOption()
};

// SchedulesDeadlineOption is an option that modifies the behavior of
// [SchedulesDeadline].
//
// This type exists for forward-compatibility.
export type SchedulesDeadlineOption = {
  // futureSchedulesDeadlineOption()
};

// // Type returns the [RegisteredMessageType] for r.
// function (r HandlesCommandRoute) Type() RegisteredMessageType {
// 	return r.typ;
// }

// // Type returns the [RegisteredMessageType] for r.
// function (r ExecutesCommandRoute) Type() RegisteredMessageType {
// 	return r.typ;
// }

// // Type returns the [RegisteredMessageType] for r.
// function (r HandlesEventRoute) Type() RegisteredMessageType {
// 	return r.typ;
// }

// // Type returns the [RegisteredMessageType] for r.
// function (r RecordsEventRoute) Type() RegisteredMessageType {
// 	return r.typ;
// }

// // Type returns the [RegisteredMessageType] for r.
// function (r SchedulesDeadlineRoute) Type() RegisteredMessageType {
// 	return r.typ;
// }
