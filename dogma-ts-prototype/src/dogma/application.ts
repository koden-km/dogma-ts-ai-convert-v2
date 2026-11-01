import { HandlerRoute } from "./handler-route.ts";

// An Application defines a collection of message handlers that work together to
// implement a specific business domain.
//
// An application in the general sense must provide at least one Dogma
// [Application] implementation.
export type Application = {
  // configure() declares the application's configuration by calling methods on
  // c.
  //
  // The configuration includes the application's identity and handler routes.
  //
  // The engine calls this method at least once during startup. It must
  // produce the same configuration each time it's called.
  configure(c: ApplicationConfigurer): void;
};

// ApplicationConfigurer is the interface an [Application] uses to declare its
// configuration.
//
// The engine provides the implementation to [Application].Configure during
// startup.
export type ApplicationConfigurer = {
  // identity() sets the application's unique identity.
  //
  // n is a short human-readable name displayed wherever the application's
  // identity appears, such as in logs and telemetry signals. The value must
  // be between 1 and 255 bytes in length, and contain only printable,
  // non-space UTF-8 characters. Changing the handler's name doesn't affect
  // its behavior.
  //
  // k is a key that uniquely identifies the application. The engine uses the
  // key to associate application state with the correct application instance
  // - it must not change. The value must be a canonical RFC 9562 UUID string,
  // such as "5195fe85-eb3f-4121-84b0-be72cbc5722f", and is case-insensitive.
  identity(n: string, k: string): void;

  // routes() adds handler routes that associate message types with handlers.
  //
  // It accepts routes created by [ViaAggregate], [ViaProcess],
  // [ViaIntegration], and [ViaProjection].
  //
  // The application doesn't declare routes for message types directly; it
  // inherits routes from the handlers it contains.
  routes(...routes: HandlerRoute[]): void;
};
