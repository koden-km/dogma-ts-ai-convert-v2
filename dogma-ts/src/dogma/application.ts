import type { HandlerRoute } from "./handler-route.ts";

// An Application defines a collection of message handlers that work together to
// implement a specific business domain.
export type Application = {
  // configure() declares the application's configuration by calling methods on
  // c.
  configure(c: ApplicationConfigurer): void;
};

// ApplicationConfigurer is the interface an [Application] uses to declare its
// configuration.
export type ApplicationConfigurer = {
  // identity() sets the application's unique identity.
  identity(n: string, k: string): void;

  // routes() adds handler routes that associate message types with handlers.
  routes(...routes: HandlerRoute[]): void;
};
