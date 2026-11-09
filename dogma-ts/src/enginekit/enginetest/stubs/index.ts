import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Application,
  type ApplicationConfigurer,
  type Command,
  type Context,
  type Deadline,
  type Event,
  type IntegrationCommandScope,
  type IntegrationConfigurer,
  type IntegrationMessageHandler,
  type ProcessConfigurer,
  type ProcessDeadlineScope,
  type ProcessEventScope,
  type ProcessMessageHandler,
  type ProcessRoot,
  type ProjectionCompactScope,
  type ProjectionConfigurer,
  type ProjectionEventScope,
  type ProjectionMessageHandler,
  type ProjectionResetScope,
  registerCommand,
  registerDeadline,
  registerEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";

export type CommandStub<T = string> = Command & {
  $typeName: string;
  content: T;
  validationError?: string;
  validate?(): void;
  messageDescription?(): string;
};

export type EventStub<T = string> = Event & {
  $typeName: string;
  content: T;
  validationError?: string;
  validate?(): void;
  messageDescription?(): string;
};

export type DeadlineStub<T = string> = Deadline & {
  $typeName: string;
  content: T;
  validationError?: string;
  validate?(): void;
  messageDescription?(): string;
};

export function createCommandStub<T = string>(
  name: string,
  content: T,
  validationError = "",
): CommandStub<T> {
  return {
    $typeName: name,
    content,
    validationError: validationError || undefined,
    validate() {
      if (this.validationError) {
        throw new Error(this.validationError);
      }
    },
    messageDescription() {
      const validity = this.validationError
        ? `invalid: ${this.validationError}`
        : "valid";
      return `command(${name}:${String(this.content)}, ${validity})`;
    },
  };
}

export function createEventStub<T = string>(
  name: string,
  content: T,
  validationError = "",
): EventStub<T> {
  return {
    $typeName: name,
    content,
    validationError: validationError || undefined,
    validate() {
      if (this.validationError) {
        throw new Error(this.validationError);
      }
    },
    messageDescription() {
      const validity = this.validationError
        ? `invalid: ${this.validationError}`
        : "valid";
      return `event(${name}:${String(this.content)}, ${validity})`;
    },
  };
}

export function createDeadlineStub<T = string>(
  name: string,
  content: T,
  validationError = "",
): DeadlineStub<T> {
  return {
    $typeName: name,
    content,
    validationError: validationError || undefined,
    validate() {
      if (this.validationError) {
        throw new Error(this.validationError);
      }
    },
    messageDescription() {
      const validity = this.validationError
        ? `invalid: ${this.validationError}`
        : "valid";
      return `deadline(${name}:${String(this.content)}, ${validity})`;
    },
  };
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function registerStubMessages(): void {
  for (let i = 0; i < LETTERS.length; i++) {
    const letter = LETTERS[i];
    const hex = (0xa + i).toString(16).padStart(12, "0");
    registerCommand(`CommandStub[${letter}]`, `c0000000-0000-4000-8000-${hex}`, {
      allowIdempotent: true,
    });
    registerEvent(`EventStub[${letter}]`, `e0000000-0000-4000-8000-${hex}`, {
      allowIdempotent: true,
    });
    registerDeadline(
      `DeadlineStub[${letter}]`,
      `d0000000-0000-4000-8000-${hex}`,
      { allowIdempotent: true },
    );
  }
}

registerStubMessages();

export const CommandA1 = createCommandStub("CommandStub[A]", "A1");
export const CommandA2 = createCommandStub("CommandStub[A]", "A2");
export const CommandA3 = createCommandStub("CommandStub[A]", "A3");
export const CommandB1 = createCommandStub("CommandStub[B]", "B1");
export const CommandB2 = createCommandStub("CommandStub[B]", "B2");
export const CommandB3 = createCommandStub("CommandStub[B]", "B3");
export const CommandC1 = createCommandStub("CommandStub[C]", "C1");
export const CommandC2 = createCommandStub("CommandStub[C]", "C2");
export const CommandC3 = createCommandStub("CommandStub[C]", "C3");

export const EventA1 = createEventStub("EventStub[A]", "A1");
export const EventA2 = createEventStub("EventStub[A]", "A2");
export const EventA3 = createEventStub("EventStub[A]", "A3");
export const EventB1 = createEventStub("EventStub[B]", "B1");
export const EventB2 = createEventStub("EventStub[B]", "B2");
export const EventB3 = createEventStub("EventStub[B]", "B3");
export const EventC1 = createEventStub("EventStub[C]", "C1");
export const EventC2 = createEventStub("EventStub[C]", "C2");
export const EventC3 = createEventStub("EventStub[C]", "C3");

export const DeadlineA1 = createDeadlineStub("DeadlineStub[A]", "A1");
export const DeadlineA2 = createDeadlineStub("DeadlineStub[A]", "A2");
export const DeadlineA3 = createDeadlineStub("DeadlineStub[A]", "A3");
export const DeadlineB1 = createDeadlineStub("DeadlineStub[B]", "B1");
export const DeadlineB2 = createDeadlineStub("DeadlineStub[B]", "B2");
export const DeadlineB3 = createDeadlineStub("DeadlineStub[B]", "B3");
export const DeadlineC1 = createDeadlineStub("DeadlineStub[C]", "C1");
export const DeadlineC2 = createDeadlineStub("DeadlineStub[C]", "C2");
export const DeadlineC3 = createDeadlineStub("DeadlineStub[C]", "C3");

export type ApplicationStub = Application & {
  configureFunc?: (c: ApplicationConfigurer) => void;
};

export function createApplicationStub(
  init?: Partial<ApplicationStub>,
): ApplicationStub {
  return {
    configureFunc: init?.configureFunc,
    configure(c: ApplicationConfigurer) {
      this.configureFunc?.(c);
    },
  };
}

export type AggregateRootStub = AggregateRoot & {
  appliedEvents: Event[];
};

export function createAggregateRootStub(
  init?: Partial<AggregateRootStub>,
): AggregateRootStub {
  return {
    appliedEvents: init?.appliedEvents ?? [],
  };
}

export type AggregateMessageHandlerStub<
  R extends AggregateRoot = AggregateRootStub,
> = AggregateMessageHandler<R> & {
  newFunc?: () => R;
  configureFunc?: (c: AggregateConfigurer) => void;
  routeCommandToInstanceFunc?: (c: Command) => string;
  handleCommandFunc?: (r: R, s: AggregateCommandScope<R>, c: Command) => void;
  applyEventFunc?: (r: R, e: Event) => void;
  describeInstanceFunc?: (r: R) => string;
};

export function createAggregateMessageHandlerStub<
  R extends AggregateRoot = AggregateRootStub,
>(
  init?: Partial<AggregateMessageHandlerStub<R>>,
): AggregateMessageHandlerStub<R> {
  return {
    newFunc: init?.newFunc,
    configureFunc: init?.configureFunc,
    routeCommandToInstanceFunc: init?.routeCommandToInstanceFunc,
    handleCommandFunc: init?.handleCommandFunc,
    applyEventFunc: init?.applyEventFunc,
    describeInstanceFunc: init?.describeInstanceFunc,
    configure(c: AggregateConfigurer) {
      this.configureFunc?.(c);
    },
    newRoot(): R {
      if (this.newFunc) return this.newFunc();
      return createAggregateRootStub() as unknown as R;
    },
    routeCommandToInstance(c: Command): string {
      if (!this.routeCommandToInstanceFunc) {
        throw new UnexpectedMessageError();
      }
      return this.routeCommandToInstanceFunc(c);
    },
    handleCommand(r: R, s: AggregateCommandScope<R>, c: Command) {
      this.handleCommandFunc?.(r, s, c);
    },
    applyEvent(r: R, e: Event) {
      if (Array.isArray((r as any).appliedEvents)) {
        (r as any).appliedEvents.push(e);
      }
      this.applyEventFunc?.(r, e);
    },
    describeInstance(r: R): string {
      return this.describeInstanceFunc?.(r) ?? "";
    },
  };
}

export type ProcessRootStub = ProcessRoot & {
  value?: any;
};

export function createProcessRootStub(
  init?: Partial<ProcessRootStub>,
): ProcessRootStub {
  return {
    value: init?.value,
  };
}

export type ProcessMessageHandlerStub<R extends ProcessRoot = ProcessRootStub> =
  ProcessMessageHandler<R> & {
    newFunc?: () => R;
    configureFunc?: (c: ProcessConfigurer) => void;
    routeEventToInstanceFunc?: (
      ctx: Context,
      e: Event,
    ) => Promise<{ id: string; ok: boolean }> | { id: string; ok: boolean };
    handleEventFunc?: (
      ctx: Context,
      r: R,
      s: ProcessEventScope<R>,
      e: Event,
    ) => Promise<void> | void;
    handleDeadlineFunc?: (
      ctx: Context,
      r: R,
      s: ProcessDeadlineScope<R>,
      d: Deadline,
    ) => Promise<void> | void;
    describeInstanceFunc?: (r: R, ended: boolean) => string;
  };

export function createProcessMessageHandlerStub<
  R extends ProcessRoot = ProcessRootStub,
>(init?: Partial<ProcessMessageHandlerStub<R>>): ProcessMessageHandlerStub<R> {
  return {
    newFunc: init?.newFunc,
    configureFunc: init?.configureFunc,
    routeEventToInstanceFunc: init?.routeEventToInstanceFunc,
    handleEventFunc: init?.handleEventFunc,
    handleDeadlineFunc: init?.handleDeadlineFunc,
    describeInstanceFunc: init?.describeInstanceFunc,
    configure(c: ProcessConfigurer) {
      this.configureFunc?.(c);
    },
    newRoot(): R {
      if (this.newFunc) return this.newFunc();
      return createProcessRootStub() as unknown as R;
    },
    routeEventToInstance(ctx: Context, e: Event) {
      if (!this.routeEventToInstanceFunc) {
        throw new UnexpectedMessageError();
      }
      return this.routeEventToInstanceFunc(ctx, e);
    },
    handleEvent(ctx: Context, r: R, s: ProcessEventScope<R>, e: Event) {
      return this.handleEventFunc?.(ctx, r, s, e);
    },
    handleDeadline(ctx: Context, r: R, s: ProcessDeadlineScope<R>, d: Deadline) {
      return this.handleDeadlineFunc?.(ctx, r, s, d);
    },
    describeInstance(r: R, ended: boolean): string {
      return this.describeInstanceFunc?.(r, ended) ?? "";
    },
  };
}

export type IntegrationMessageHandlerStub = IntegrationMessageHandler & {
  configureFunc?: (c: IntegrationConfigurer) => void;
  handleCommandFunc?: (
    ctx: Context,
    s: IntegrationCommandScope,
    c: Command,
  ) => Promise<void> | void;
};

export function createIntegrationMessageHandlerStub(
  init?: Partial<IntegrationMessageHandlerStub>,
): IntegrationMessageHandlerStub {
  return {
    configureFunc: init?.configureFunc,
    handleCommandFunc: init?.handleCommandFunc,
    configure(c: IntegrationConfigurer) {
      this.configureFunc?.(c);
    },
    handleCommand(ctx: Context, s: IntegrationCommandScope, c: Command) {
      return this.handleCommandFunc?.(ctx, s, c);
    },
  };
}

export type ProjectionMessageHandlerStub = ProjectionMessageHandler & {
  configureFunc?: (c: ProjectionConfigurer) => void;
  handleEventFunc?: (
    ctx: Context,
    s: ProjectionEventScope,
    e: Event,
  ) => Promise<bigint> | bigint;
  checkpointOffsetFunc?: (
    ctx: Context,
    id: string,
  ) => Promise<bigint> | bigint;
  compactFunc?: (
    ctx: Context,
    s: ProjectionCompactScope,
  ) => Promise<void> | void;
  resetFunc?: (ctx: Context, s: ProjectionResetScope) => Promise<void> | void;
};

export function createProjectionMessageHandlerStub(
  init?: Partial<ProjectionMessageHandlerStub>,
): ProjectionMessageHandlerStub {
  return {
    configureFunc: init?.configureFunc,
    handleEventFunc: init?.handleEventFunc,
    checkpointOffsetFunc: init?.checkpointOffsetFunc,
    compactFunc: init?.compactFunc,
    resetFunc: init?.resetFunc,
    configure(c: ProjectionConfigurer) {
      this.configureFunc?.(c);
    },
    handleEvent(ctx: Context, s: ProjectionEventScope, e: Event) {
      if (this.handleEventFunc) {
        return this.handleEventFunc(ctx, s, e);
      }
      return s.offset() + 1n;
    },
    checkpointOffset(ctx: Context, id: string) {
      if (this.checkpointOffsetFunc) {
        return this.checkpointOffsetFunc(ctx, id);
      }
      return 0n;
    },
    compact(ctx: Context, s: ProjectionCompactScope) {
      return this.compactFunc?.(ctx, s);
    },
    reset(ctx: Context, s: ProjectionResetScope) {
      return this.resetFunc?.(ctx, s);
    },
  };
}

export type ProjectionEventScopeStub = ProjectionEventScope & {
  nowFunc?: () => Date;
  logFunc?: (format: string, ...args: any[]) => void;
  recordedAtFunc?: () => Date;
  streamIDFunc?: () => string;
  offsetFunc?: () => bigint;
  checkpointOffsetFunc?: () => bigint;
};

export function createProjectionEventScopeStub(
  init?: Partial<ProjectionEventScopeStub>,
): ProjectionEventScopeStub {
  return {
    nowFunc: init?.nowFunc,
    logFunc: init?.logFunc,
    recordedAtFunc: init?.recordedAtFunc,
    streamIDFunc: init?.streamIDFunc,
    offsetFunc: init?.offsetFunc,
    checkpointOffsetFunc: init?.checkpointOffsetFunc,
    now() {
      return this.nowFunc?.() ?? new Date();
    },
    log(format: string, ...args: any[]) {
      this.logFunc?.(format, ...args);
    },
    recordedAt() {
      return this.recordedAtFunc?.() ?? new Date();
    },
    streamID() {
      return (
        this.streamIDFunc?.() ?? "6d1e805f-1760-409f-b1eb-e14983ec3f68"
      );
    },
    offset() {
      return this.offsetFunc?.() ?? 0n;
    },
    checkpointOffset() {
      return this.checkpointOffsetFunc?.() ?? 0n;
    },
  };
}

export type ProjectionCompactScopeStub = ProjectionCompactScope & {
  nowFunc?: () => Date;
  logFunc?: (format: string, ...args: any[]) => void;
};

export function createProjectionCompactScopeStub(
  init?: Partial<ProjectionCompactScopeStub>,
): ProjectionCompactScopeStub {
  return {
    nowFunc: init?.nowFunc,
    logFunc: init?.logFunc,
    now() {
      return this.nowFunc?.() ?? new Date();
    },
    log(format: string, ...args: any[]) {
      this.logFunc?.(format, ...args);
    },
  };
}

export type ProjectionResetScopeStub = ProjectionResetScope & {
  nowFunc?: () => Date;
  logFunc?: (format: string, ...args: any[]) => void;
};

export function createProjectionResetScopeStub(
  init?: Partial<ProjectionResetScopeStub>,
): ProjectionResetScopeStub {
  return {
    nowFunc: init?.nowFunc,
    logFunc: init?.logFunc,
    now() {
      return this.nowFunc?.() ?? new Date();
    },
    log(format: string, ...args: any[]) {
      this.logFunc?.(format, ...args);
    },
  };
}
