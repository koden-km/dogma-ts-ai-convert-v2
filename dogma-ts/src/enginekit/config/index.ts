import {
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type AggregateRoute,
  type Application as DogmaApplication,
  type ApplicationConfigurer,
  type ConcurrencyPreference,
  type DisableOption,
  type HandlerRoute,
  type IntegrationConfigurer,
  type IntegrationMessageHandler,
  type IntegrationRoute,
  MaximizeConcurrency,
  MinimizeConcurrency,
  type MessageRoute,
  normalizeUUID,
  type ProcessConfigurer,
  type ProcessMessageHandler,
  type ProcessRoot,
  type ProcessRoute,
  type ProjectionConfigurer,
  type ProjectionMessageHandler,
  type ProjectionRoute,
  unwrapHandler,
} from "@/dogma/index.ts";
import {
  CommandKind,
  DeadlineKind,
  EventKind,
  type Kind as MessageKind,
  type Type as MessageType,
  typeFromRegistered,
} from "../message/index.ts";
import { none, type Optional, some } from "../optional/index.ts";

// IdentityValue represents a resolved entity identity (name and UUID key).
export type IdentityValue = {
  readonly name: string;
  readonly key: string;
  getName(): string;
  getKey(): string;
  toString(): string;
};

export function createIdentityValue(name: string, key: string): IdentityValue {
  return {
    name,
    key,
    getName() {
      return name;
    },
    getKey() {
      return key;
    },
    toString() {
      return `${name}/${key}`;
    },
  };
}

// RouteDirection is a bit-field of the directions in which a message flows.
export type RouteDirection = number;
export const InboundDirection: RouteDirection = 1 << 0;
export const OutboundDirection: RouteDirection = 1 << 1;

export function hasDirection(
  d: RouteDirection,
  target: RouteDirection,
): boolean {
  return (d & target) !== 0;
}

// RouteType is an enumeration of the types of message routes.
export type RouteType =
  | typeof HandlesCommandRouteType
  | typeof HandlesEventRouteType
  | typeof ExecutesCommandRouteType
  | typeof RecordsEventRouteType
  | typeof SchedulesDeadlineRouteType;

export const HandlesCommandRouteType = "handles-command" as const;
export const HandlesEventRouteType = "handles-event" as const;
export const ExecutesCommandRouteType = "executes-command" as const;
export const RecordsEventRouteType = "records-event" as const;
export const SchedulesDeadlineRouteType = "schedules-deadline" as const;

export function routeTypes(): RouteType[] {
  return [
    HandlesCommandRouteType,
    HandlesEventRouteType,
    ExecutesCommandRouteType,
    RecordsEventRouteType,
    SchedulesDeadlineRouteType,
  ];
}

export function routeDirection(rt: RouteType): RouteDirection {
  switch (rt) {
    case HandlesCommandRouteType:
    case HandlesEventRouteType:
      return InboundDirection;
    case ExecutesCommandRouteType:
    case RecordsEventRouteType:
      return OutboundDirection;
    case SchedulesDeadlineRouteType:
      return InboundDirection | OutboundDirection;
  }
}

export function routeMessageKind(rt: RouteType): MessageKind {
  switch (rt) {
    case HandlesCommandRouteType:
    case ExecutesCommandRouteType:
      return CommandKind;
    case HandlesEventRouteType:
    case RecordsEventRouteType:
      return EventKind;
    case SchedulesDeadlineRouteType:
      return DeadlineKind;
  }
}

// HandlerType is an enumeration of the types of message handlers.
export type HandlerType =
  | typeof AggregateHandlerType
  | typeof ProcessHandlerType
  | typeof IntegrationHandlerType
  | typeof ProjectionHandlerType;

export const AggregateHandlerType = "aggregate" as const;
export const ProcessHandlerType = "process" as const;
export const IntegrationHandlerType = "integration" as const;
export const ProjectionHandlerType = "projection" as const;

export function handlerTypes(): HandlerType[] {
  return [
    AggregateHandlerType,
    ProcessHandlerType,
    IntegrationHandlerType,
    ProjectionHandlerType,
  ];
}

export type RouteCapability = "disallowed" | "allowed" | "required";

export function routeCapabilities(
  ht: HandlerType,
): Record<RouteType, RouteCapability> {
  switch (ht) {
    case AggregateHandlerType:
      return {
        [HandlesCommandRouteType]: "required",
        [RecordsEventRouteType]: "required",
        [HandlesEventRouteType]: "disallowed",
        [ExecutesCommandRouteType]: "disallowed",
        [SchedulesDeadlineRouteType]: "disallowed",
      };
    case ProcessHandlerType:
      return {
        [HandlesEventRouteType]: "required",
        [ExecutesCommandRouteType]: "required",
        [SchedulesDeadlineRouteType]: "allowed",
        [HandlesCommandRouteType]: "disallowed",
        [RecordsEventRouteType]: "disallowed",
      };
    case IntegrationHandlerType:
      return {
        [HandlesCommandRouteType]: "required",
        [RecordsEventRouteType]: "allowed",
        [HandlesEventRouteType]: "disallowed",
        [ExecutesCommandRouteType]: "disallowed",
        [SchedulesDeadlineRouteType]: "disallowed",
      };
    case ProjectionHandlerType:
      return {
        [HandlesEventRouteType]: "required",
        [HandlesCommandRouteType]: "disallowed",
        [RecordsEventRouteType]: "disallowed",
        [ExecutesCommandRouteType]: "disallowed",
        [SchedulesDeadlineRouteType]: "disallowed",
      };
  }
}

export type IdentityComponent = {
  readonly name: Optional<string>;
  readonly key: Optional<string>;
};

export type Route = {
  readonly routeType: Optional<RouteType>;
  readonly messageTypeID: Optional<string>;
  readonly messageTypeName: Optional<string>;
  readonly messageType: Optional<MessageType>;
  toString(): string;
};

export type RouteSetFilter = {
  testRoute?: (r: Route) => boolean;
  testMessage?: (mt: MessageType, routes: Map<RouteType, Map<Handler, Route>>) => boolean;
};

export function filterByRouteType(...types: RouteType[]): RouteSetFilter {
  return {
    testRoute(r: Route) {
      return r.routeType.isPresent() && types.includes(r.routeType.get());
    },
  };
}

export function filterByRouteDirection(
  ...directions: RouteDirection[]
): RouteSetFilter {
  return {
    testRoute(r: Route) {
      if (!r.routeType.isPresent()) return false;
      const dir = routeDirection(r.routeType.get());
      return directions.some((d) => hasDirection(d, dir));
    },
  };
}

export function filterByMessageKind(...kinds: MessageKind[]): RouteSetFilter {
  return {
    testRoute(r: Route) {
      return (
        r.messageType.isPresent() &&
        kinds.includes(r.messageType.get().kind)
      );
    },
  };
}

export function filterByMessageDirection(
  ...directions: RouteDirection[]
): RouteSetFilter {
  return {
    testMessage(_mt: MessageType, routes: Map<RouteType, Map<Handler, Route>>) {
      let combined: RouteDirection = 0;
      for (const rt of routes.keys()) {
        combined |= routeDirection(rt);
      }
      return directions.some((d) => hasDirection(d, combined));
    },
  };
}

export type RouteSet = {
  readonly byMessageType: Map<MessageType, Map<RouteType, Map<Handler, Route>>>;
  routes(): IterableIterator<[Route, Handler]>;
  messageTypes(): Map<MessageType, RouteDirection>;
  directionOf(t: MessageType): RouteDirection;
  hasMessageType(t: MessageType): boolean;
  filter(...filters: RouteSetFilter[]): RouteSet;
};

export function createRouteSet(
  byMessageType = new Map<MessageType, Map<RouteType, Map<Handler, Route>>>(),
): RouteSet {
  return {
    byMessageType,
    *routes(): IterableIterator<[Route, Handler]> {
      for (const byRouteType of byMessageType.values()) {
        for (const byHandler of byRouteType.values()) {
          for (const [h, r] of byHandler.entries()) {
            yield [r, h];
          }
        }
      }
    },
    messageTypes(): Map<MessageType, RouteDirection> {
      const types = new Map<MessageType, RouteDirection>();
      for (const [mt, byRouteType] of byMessageType.entries()) {
        let dir: RouteDirection = 0;
        for (const rt of byRouteType.keys()) {
          dir |= routeDirection(rt);
        }
        types.set(mt, dir);
      }
      return types;
    },
    directionOf(t: MessageType): RouteDirection {
      const byRouteType = byMessageType.get(t);
      if (!byRouteType) return 0;
      let dir: RouteDirection = 0;
      for (const rt of byRouteType.keys()) {
        dir |= routeDirection(rt);
      }
      return dir;
    },
    hasMessageType(t: MessageType): boolean {
      return byMessageType.has(t);
    },
    filter(...filters: RouteSetFilter[]): RouteSet {
      const filtered = new Map<
        MessageType,
        Map<RouteType, Map<Handler, Route>>
      >();
      for (const [mt, byRouteType] of byMessageType.entries()) {
        const rtFiltered = new Map<RouteType, Map<Handler, Route>>();
        for (const [rt, byHandler] of byRouteType.entries()) {
          const hFiltered = new Map<Handler, Route>();
          for (const [h, r] of byHandler.entries()) {
            if (filters.every((f) => !f.testRoute || f.testRoute(r))) {
              hFiltered.set(h, r);
            }
          }
          if (hFiltered.size > 0) {
            rtFiltered.set(rt, hFiltered);
          }
        }
        if (
          rtFiltered.size > 0 &&
          filters.every(
            (f) => !f.testMessage || f.testMessage(mt, rtFiltered),
          )
        ) {
          filtered.set(mt, rtFiltered);
        }
      }
      return createRouteSet(filtered);
    },
  };
}

export type HandlerCommon = {
  readonly identityComponents: IdentityComponent[];
  readonly routeComponents: Route[];
  readonly disabledFlags: boolean[];
  identity(): IdentityValue;
  routeSet(): RouteSet;
  isDisabled(): boolean;
  toString(): string;
};

export type Aggregate = HandlerCommon & {
  readonly kind: "aggregate";
  readonly source: Optional<AggregateMessageHandler<AggregateRoot>>;
  handlerType(): typeof AggregateHandlerType;
  interface(): AggregateMessageHandler<AggregateRoot>;
  implementation(): AggregateMessageHandler<any>;
};

export type Process = HandlerCommon & {
  readonly kind: "process";
  readonly source: Optional<ProcessMessageHandler<ProcessRoot>>;
  handlerType(): typeof ProcessHandlerType;
  interface(): ProcessMessageHandler<ProcessRoot>;
  implementation(): ProcessMessageHandler<any>;
};

export type Integration = HandlerCommon & {
  readonly kind: "integration";
  readonly source: Optional<IntegrationMessageHandler>;
  readonly concurrencyPreferences: ConcurrencyPreference[];
  handlerType(): typeof IntegrationHandlerType;
  concurrencyPreference(): ConcurrencyPreference;
  interface(): IntegrationMessageHandler;
  implementation(): IntegrationMessageHandler;
};

export type Projection = HandlerCommon & {
  readonly kind: "projection";
  readonly source: Optional<ProjectionMessageHandler>;
  readonly concurrencyPreferences: ConcurrencyPreference[];
  handlerType(): typeof ProjectionHandlerType;
  concurrencyPreference(): ConcurrencyPreference;
  interface(): ProjectionMessageHandler;
  implementation(): ProjectionMessageHandler;
};

export type Handler = Aggregate | Process | Integration | Projection;

export function switchByHandlerTypeOf(
  h: Handler,
  cases: {
    aggregate?: (h: Aggregate) => void;
    process?: (h: Process) => void;
    integration?: (h: Integration) => void;
    projection?: (h: Projection) => void;
  },
): void {
  switch (h.kind) {
    case "aggregate":
      if (!cases.aggregate)
        throw new Error("no case function was provided for Aggregate");
      cases.aggregate(h);
      break;
    case "process":
      if (!cases.process)
        throw new Error("no case function was provided for Process");
      cases.process(h);
      break;
    case "integration":
      if (!cases.integration)
        throw new Error("no case function was provided for Integration");
      cases.integration(h);
      break;
    case "projection":
      if (!cases.projection)
        throw new Error("no case function was provided for Projection");
      cases.projection(h);
      break;
  }
}

export type Application = {
  readonly kind: "application";
  readonly identityComponents: IdentityComponent[];
  readonly handlerComponents: Handler[];
  readonly source: Optional<DogmaApplication>;
  identity(): IdentityValue;
  handlers(): Handler[];
  handlerByName(name: string): Handler | undefined;
  routeSet(): RouteSet;
  interface(): DogmaApplication;
  toString(): string;
};

function isPrintableNonSpace(s: string): boolean {
  if (s.length === 0 || Buffer.byteLength(s, "utf8") > 255) {
    return false;
  }
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (/\s/u.test(ch) || code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      return false;
    }
  }
  return true;
}

function validateIdentityComponent(
  entityDesc: string,
  identities: IdentityComponent[],
): IdentityValue {
  if (identities.length === 0) {
    throw new Error(`${entityDesc} is invalid: no identity specified`);
  }
  if (identities.length > 1) {
    throw new Error(`${entityDesc} is invalid: multiple identities specified`);
  }
  const id = identities[0];
  if (!id.name.isPresent()) {
    throw new Error(`${entityDesc} is invalid: identity name is unavailable`);
  }
  if (!id.key.isPresent()) {
    throw new Error(`${entityDesc} is invalid: identity key is unavailable`);
  }
  const name = id.name.get();
  const rawKey = id.key.get();

  if (!isPrintableNonSpace(name)) {
    throw new Error(
      `${entityDesc} is invalid: invalid name (${JSON.stringify(name)}), expected a non-empty, printable UTF-8 string with no whitespace`,
    );
  }
  let normalizedKey: string;
  try {
    normalizedKey = normalizeUUID(rawKey);
  } catch {
    throw new Error(
      `${entityDesc} is invalid: invalid key (${JSON.stringify(rawKey)}), expected an RFC 4122/9562 UUID`,
    );
  }
  return createIdentityValue(name, normalizedKey);
}

function validateHandlerInternal(h: Handler): void {
  const id = validateIdentityComponent(h.toString(), h.identityComponents);
  const ht = h.handlerType();
  const caps = routeCapabilities(ht);
  const missing = new Set<RouteType>();

  for (const [rt, cap] of Object.entries(caps) as [
    RouteType,
    RouteCapability,
  ][]) {
    if (cap === "required") {
      missing.add(rt);
    }
  }

  const seenRoutes = new Set<string>();

  for (const r of h.routeComponents) {
    if (!r.routeType.isPresent()) {
      throw new Error(`${h.toString()} is invalid: route type is unavailable`);
    }
    if (!r.messageTypeName.isPresent()) {
      throw new Error(
        `${h.toString()} is invalid: message type name is unavailable`,
      );
    }
    const rt = r.routeType.get();
    const mn = r.messageTypeName.get();

    if (caps[rt] === "disallowed") {
      throw new Error(
        `${h.toString()} is invalid: unsupported ${rt} route for ${mn}`,
      );
    }
    missing.delete(rt);

    if (r.messageType.isPresent()) {
      const mt = r.messageType.get();
      if (routeMessageKind(rt) !== mt.kind) {
        throw new Error(
          `${h.toString()} is invalid: unexpected message kind: ${mn} is a ${mt.kind}, expected a ${routeMessageKind(rt)}`,
        );
      }
    }

    const routeKey = `${rt}:${mn}`;
    if (seenRoutes.has(routeKey)) {
      throw new Error(
        `${h.toString()} is invalid: multiple ${rt} routes for ${mn}`,
      );
    }
    seenRoutes.add(routeKey);
  }

  if (missing.size > 0) {
    const firstMissing = missing.values().next().value!;
    throw new Error(`${h.toString()} (${id.name}) is invalid: no ${firstMissing} routes`);
  }

  if (h.kind === "integration" || h.kind === "projection") {
    if (h.concurrencyPreferences.length > 1) {
      throw new Error(
        `${h.toString()} is invalid: multiple concurrency preferences specified`,
      );
    }
    for (const pref of h.concurrencyPreferences) {
      if (pref !== MaximizeConcurrency && pref !== MinimizeConcurrency) {
        throw new Error(
          `${h.toString()} is invalid: invalid concurrency preference ${String(pref)}`,
        );
      }
    }
  }
}

function buildHandlerRouteSet(h: Handler): RouteSet {
  validateHandlerInternal(h);
  const byMessageType = new Map<
    MessageType,
    Map<RouteType, Map<Handler, Route>>
  >();

  for (const r of h.routeComponents) {
    if (!r.routeType.isPresent() || !r.messageType.isPresent()) continue;
    const rt = r.routeType.get();
    const mt = r.messageType.get();

    let byRouteType = byMessageType.get(mt);
    if (!byRouteType) {
      byRouteType = new Map();
      byMessageType.set(mt, byRouteType);
    }
    let byHandler = byRouteType.get(rt);
    if (!byHandler) {
      byHandler = new Map();
      byRouteType.set(rt, byHandler);
    }
    byHandler.set(h, r);
  }

  return createRouteSet(byMessageType);
}

function validateApplicationInternal(app: Application): void {
  const appId = validateIdentityComponent(
    app.toString(),
    app.identityComponents,
  );

  const byName = new Map<string, string[]>();
  const byKey = new Map<string, string[]>();
  byKey.set(appId.key, [app.toString()]);

  const routeOwners = new Map<string, Handler[]>();

  for (const h of app.handlerComponents) {
    validateHandlerInternal(h);
    const hId = h.identity();

    const existingName = byName.get(hId.name) ?? [];
    existingName.push(h.toString());
    byName.set(hId.name, existingName);

    const existingKey = byKey.get(hId.key) ?? [];
    existingKey.push(h.toString());
    byKey.set(hId.key, existingKey);

    for (const r of h.routeComponents) {
      if (r.routeType.isPresent() && r.messageTypeName.isPresent()) {
        const rt = r.routeType.get();
        const mn = r.messageTypeName.get();
        if (
          rt === HandlesCommandRouteType ||
          rt === RecordsEventRouteType
        ) {
          const rk = `${rt}:${mn}`;
          const owners = routeOwners.get(rk) ?? [];
          if (!owners.includes(h)) {
            owners.push(h);
            routeOwners.set(rk, owners);
          }
        }
      }
    }
  }

  for (const [name, entities] of byName.entries()) {
    if (entities.length > 1) {
      throw new Error(
        `${app.toString()} is invalid: identity name ${JSON.stringify(name)} is shared by ${entities.length} entities`,
      );
    }
  }

  for (const [key, entities] of byKey.entries()) {
    if (entities.length > 1) {
      throw new Error(
        `${app.toString()} is invalid: identity key ${JSON.stringify(key)} is shared by ${entities.length} entities`,
      );
    }
  }

  for (const [rk, handlers] of routeOwners.entries()) {
    if (handlers.length > 1) {
      const [rt, mn] = rk.split(":");
      throw new Error(
        `${app.toString()} is invalid: ${rt} route for ${mn} is shared by ${handlers.length} handlers`,
      );
    }
  }
}

export type ValidateOption = {
  forExecution?: boolean;
};

export function forExecution(): ValidateOption {
  return { forExecution: true };
}

export function validate(
  c: Application | Handler,
  ..._options: ValidateOption[]
): void {
  if (c.kind === "application") {
    validateApplicationInternal(c);
  } else {
    validateHandlerInternal(c);
  }
}

// Runtimeconfig builders

function convertDogmaRoute(r: MessageRoute): Route {
  let rt: RouteType;
  switch (r.kind) {
    case "HandlesCommand":
      rt = HandlesCommandRouteType;
      break;
    case "ExecutesCommand":
      rt = ExecutesCommandRouteType;
      break;
    case "RecordsEvent":
      rt = RecordsEventRouteType;
      break;
    case "HandlesEvent":
      rt = HandlesEventRouteType;
      break;
    case "SchedulesDeadline":
      rt = SchedulesDeadlineRouteType;
      break;
  }
  const reg = r.type();
  const mt = typeFromRegistered(reg);
  return {
    routeType: some(rt),
    messageTypeID: some(reg.id),
    messageTypeName: some(reg.name),
    messageType: some(mt),
    toString() {
      return `route:${rt}:${reg.name}`;
    },
  };
}

export function fromAggregate(
  h: AggregateMessageHandler<any>,
): Aggregate {
  const identityComponents: IdentityComponent[] = [];
  const routeComponents: Route[] = [];
  const disabledFlags: boolean[] = [];

  if (h) {
    const configurer: AggregateConfigurer = {
      identity(name: string, key: string) {
        identityComponents.push({ name: some(name), key: some(key) });
      },
      routes(...routes: AggregateRoute[]) {
        for (const r of routes) {
          routeComponents.push(convertDogmaRoute(r));
        }
      },
      disable(..._options: DisableOption[]) {
        disabledFlags.push(true);
      },
    };
    h.configure(configurer);
  }

  const agg: Aggregate = {
    kind: "aggregate",
    identityComponents,
    routeComponents,
    disabledFlags,
    source: h ? some(h) : none(),
    identity() {
      return validateIdentityComponent(this.toString(), identityComponents);
    },
    handlerType() {
      return AggregateHandlerType;
    },
    routeSet() {
      return buildHandlerRouteSet(this);
    },
    isDisabled() {
      return disabledFlags.length > 0
        ? disabledFlags[disabledFlags.length - 1]
        : false;
    },
    interface() {
      return this.source.get();
    },
    implementation() {
      return unwrapHandler(this.source.get());
    },
    toString() {
      const name =
        identityComponents.length > 0 && identityComponents[0].name.isPresent()
          ? identityComponents[0].name.get()
          : "?";
      return `aggregate:${name}`;
    },
  };
  return agg;
}

export function fromProcess(h: ProcessMessageHandler<any>): Process {
  const identityComponents: IdentityComponent[] = [];
  const routeComponents: Route[] = [];
  const disabledFlags: boolean[] = [];

  if (h) {
    const configurer: ProcessConfigurer = {
      identity(name: string, key: string) {
        identityComponents.push({ name: some(name), key: some(key) });
      },
      routes(...routes: ProcessRoute[]) {
        for (const r of routes) {
          routeComponents.push(convertDogmaRoute(r));
        }
      },
      disable(..._options: DisableOption[]) {
        disabledFlags.push(true);
      },
    };
    h.configure(configurer);
  }

  const proc: Process = {
    kind: "process",
    identityComponents,
    routeComponents,
    disabledFlags,
    source: h ? some(h) : none(),
    identity() {
      return validateIdentityComponent(this.toString(), identityComponents);
    },
    handlerType() {
      return ProcessHandlerType;
    },
    routeSet() {
      return buildHandlerRouteSet(this);
    },
    isDisabled() {
      return disabledFlags.length > 0
        ? disabledFlags[disabledFlags.length - 1]
        : false;
    },
    interface() {
      return this.source.get();
    },
    implementation() {
      return unwrapHandler(this.source.get());
    },
    toString() {
      const name =
        identityComponents.length > 0 && identityComponents[0].name.isPresent()
          ? identityComponents[0].name.get()
          : "?";
      return `process:${name}`;
    },
  };
  return proc;
}

export function fromIntegration(h: IntegrationMessageHandler): Integration {
  const identityComponents: IdentityComponent[] = [];
  const routeComponents: Route[] = [];
  const disabledFlags: boolean[] = [];
  const concurrencyPreferences: ConcurrencyPreference[] = [];

  if (h) {
    const configurer: IntegrationConfigurer = {
      identity(name: string, key: string) {
        identityComponents.push({ name: some(name), key: some(key) });
      },
      routes(...routes: IntegrationRoute[]) {
        for (const r of routes) {
          routeComponents.push(convertDogmaRoute(r));
        }
      },
      disable(..._options: DisableOption[]) {
        disabledFlags.push(true);
      },
      concurrencyPreference(p: ConcurrencyPreference) {
        concurrencyPreferences.push(p);
      },
    };
    h.configure(configurer);
  }

  const integ: Integration = {
    kind: "integration",
    identityComponents,
    routeComponents,
    disabledFlags,
    concurrencyPreferences,
    source: h ? some(h) : none(),
    identity() {
      return validateIdentityComponent(this.toString(), identityComponents);
    },
    handlerType() {
      return IntegrationHandlerType;
    },
    routeSet() {
      return buildHandlerRouteSet(this);
    },
    isDisabled() {
      return disabledFlags.length > 0
        ? disabledFlags[disabledFlags.length - 1]
        : false;
    },
    concurrencyPreference() {
      return concurrencyPreferences.length > 0
        ? concurrencyPreferences[concurrencyPreferences.length - 1]
        : MaximizeConcurrency;
    },
    interface() {
      return this.source.get();
    },
    implementation() {
      return unwrapHandler(this.source.get());
    },
    toString() {
      const name =
        identityComponents.length > 0 && identityComponents[0].name.isPresent()
          ? identityComponents[0].name.get()
          : "?";
      return `integration:${name}`;
    },
  };
  return integ;
}

export function fromProjection(h: ProjectionMessageHandler): Projection {
  const identityComponents: IdentityComponent[] = [];
  const routeComponents: Route[] = [];
  const disabledFlags: boolean[] = [];
  const concurrencyPreferences: ConcurrencyPreference[] = [];

  if (h) {
    const configurer: ProjectionConfigurer = {
      identity(name: string, key: string) {
        identityComponents.push({ name: some(name), key: some(key) });
      },
      routes(...routes: ProjectionRoute[]) {
        for (const r of routes) {
          routeComponents.push(convertDogmaRoute(r));
        }
      },
      disable(..._options: DisableOption[]) {
        disabledFlags.push(true);
      },
      concurrencyPreference(p: ConcurrencyPreference) {
        concurrencyPreferences.push(p);
      },
    };
    h.configure(configurer);
  }

  const proj: Projection = {
    kind: "projection",
    identityComponents,
    routeComponents,
    disabledFlags,
    concurrencyPreferences,
    source: h ? some(h) : none(),
    identity() {
      return validateIdentityComponent(this.toString(), identityComponents);
    },
    handlerType() {
      return ProjectionHandlerType;
    },
    routeSet() {
      return buildHandlerRouteSet(this);
    },
    isDisabled() {
      return disabledFlags.length > 0
        ? disabledFlags[disabledFlags.length - 1]
        : false;
    },
    concurrencyPreference() {
      return concurrencyPreferences.length > 0
        ? concurrencyPreferences[concurrencyPreferences.length - 1]
        : MaximizeConcurrency;
    },
    interface() {
      return this.source.get();
    },
    implementation() {
      return unwrapHandler(this.source.get());
    },
    toString() {
      const name =
        identityComponents.length > 0 && identityComponents[0].name.isPresent()
          ? identityComponents[0].name.get()
          : "?";
      return `projection:${name}`;
    },
  };
  return proj;
}

export function fromApplication(app: DogmaApplication): Application {
  const identityComponents: IdentityComponent[] = [];
  const handlerComponents: Handler[] = [];

  if (app) {
    const configurer: ApplicationConfigurer = {
      identity(name: string, key: string) {
        identityComponents.push({ name: some(name), key: some(key) });
      },
      routes(...routes: HandlerRoute[]) {
        for (const r of routes) {
          switch (r.kind) {
            case "Aggregate":
              handlerComponents.push(fromAggregate(r.handler));
              break;
            case "Process":
              handlerComponents.push(fromProcess(r.handler));
              break;
            case "Integration":
              handlerComponents.push(fromIntegration(r.handler));
              break;
            case "Projection":
              handlerComponents.push(fromProjection(r.handler));
              break;
          }
        }
      },
    };
    app.configure(configurer);
  }

  const appConfig: Application = {
    kind: "application",
    identityComponents,
    handlerComponents,
    source: app ? some(app) : none(),
    identity() {
      return validateIdentityComponent(this.toString(), identityComponents);
    },
    handlers() {
      validateApplicationInternal(this);
      return handlerComponents;
    },
    handlerByName(name: string) {
      for (const h of this.handlers()) {
        if (h.identity().name === name) {
          return h;
        }
      }
      return undefined;
    },
    routeSet() {
      validateApplicationInternal(this);
      const merged = new Map<
        MessageType,
        Map<RouteType, Map<Handler, Route>>
      >();
      for (const h of handlerComponents) {
        const hs = h.routeSet();
        for (const [mt, byRT] of hs.byMessageType.entries()) {
          let targetByRT = merged.get(mt);
          if (!targetByRT) {
            targetByRT = new Map();
            merged.set(mt, targetByRT);
          }
          for (const [rt, byH] of byRT.entries()) {
            let targetByH = targetByRT.get(rt);
            if (!targetByH) {
              targetByH = new Map();
              targetByRT.set(rt, targetByH);
            }
            for (const [handler, route] of byH.entries()) {
              targetByH.set(handler, route);
            }
          }
        }
      }
      return createRouteSet(merged);
    },
    interface() {
      return this.source.get();
    },
    toString() {
      const name =
        identityComponents.length > 0 && identityComponents[0].name.isPresent()
          ? identityComponents[0].name.get()
          : "?";
      return `application:${name}`;
    },
  };
  return appConfig;
}
