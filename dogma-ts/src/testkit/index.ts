import util from "node:util";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";
import {
  type Application as DogmaApplication,
  backgroundContext,
  type Command,
  type CommandExecutor as DogmaCommandExecutor,
  type Context,
  type Event,
  type ExecuteCommandOption,
  type Message,
  type RegisteredMessageType,
  validateMessage,
} from "@/dogma/index.ts";

export type MessageTypeSpec<M extends Message = Message> =
  | GenMessage<M>
  | M["$typeName"]
  | RegisteredMessageType<any>
  | Type;
import {
  AggregateHandlerType,
  type Application,
  CommandKind,
  DeadlineKind,
  EventKind,
  fromApplication,
  type HandlerType,
  handlerTypes,
  hasDirection,
  IntegrationHandlerType,
  type Kind,
  OutboundDirection,
  ProcessHandlerType,
  type Type,
  typeFor,
  typeOf,
} from "@/enginekit/index.ts";
import {
  type Engine,
  enableHandler,
  enableIntegrations,
  enableProjectionCompactionDuringHandling,
  enableProjections,
  mustNewEngine,
  newCommandExecutor,
  type OperationOption,
  withCurrentTime,
  withObserver,
} from "./engine/index.ts";
import type { Envelope } from "./envelope/index.ts";
import { type Fact, newLogger, type Observer } from "./fact/index.ts";

export * from "./engine/index.ts";
export * from "./envelope/index.ts";
export * from "./fact/index.ts";

export type TestingT = {
  log(...args: any[]): void;
  error?(...args: any[]): void;
  failNow(): void;
  fatal?(...args: any[]): void;
  helper?(): void;
};

function createDefaultTestingT(): TestingT & { logs: string[] } {
  const logs: string[] = [];
  return {
    logs,
    log(...args: any[]) {
      logs.push(util.format(...args));
    },
    error(...args: any[]) {
      logs.push(util.format(...args));
    },
    failNow() {
      const output = logs.join("\n");
      throw new Error(`Testkit expectation failed:\n${output}`);
    },
    fatal(...args: any[]) {
      logs.push(util.format(...args));
      const err = args[0] instanceof Error ? args[0] : new Error(util.format(...args));
      throw err;
    },
    helper() {},
  };
}

export type MessageComparator = (a: Message, b: Message) => boolean;

function stripFunctionsForCompare(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (obj instanceof Uint8Array) {
    return new Uint8Array(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(stripFunctionsForCompare);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "function" && v !== undefined) {
      out[k] = stripFunctionsForCompare(v);
    }
  }
  return out;
}

export const defaultMessageComparator: MessageComparator = (
  a: Message,
  b: Message,
): boolean => {
  return util.isDeepStrictEqual(
    stripFunctionsForCompare(a),
    stripFunctionsForCompare(b),
  );
};

export type PredicateOptions = {
  messageComparator: MessageComparator;
  matchDispatchCycleStartedFacts: boolean;
};

export type PredicateScope = {
  app: Application;
  options: PredicateOptions;
};

export type ReportSection = {
  name: string;
  items: string[];
  content: string[];
};

export type Report = {
  treeOk: boolean;
  ok: boolean;
  criteria: string;
  outcome?: string;
  explanation?: string;
  sections: Map<string, ReportSection>;
  children: Report[];
  section(name: string): ReportSection;
  append(child: Report): void;
  format(indent?: string): string;
};

export function createReport(props: {
  treeOk: boolean;
  ok: boolean;
  criteria: string;
  outcome?: string;
  explanation?: string;
}): Report {
  const sections = new Map<string, ReportSection>();
  const children: Report[] = [];

  const rep: Report = {
    treeOk: props.treeOk,
    ok: props.ok,
    criteria: props.criteria,
    outcome: props.outcome,
    explanation: props.explanation,
    sections,
    children,
    section(name: string): ReportSection {
      let s = sections.get(name);
      if (!s) {
        s = { name, items: [], content: [] };
        sections.set(name, s);
      }
      return s;
    },
    append(child: Report): void {
      children.push(child);
    },
    format(indent = ""): string {
      const icon = rep.ok ? "✓" : "✗";
      let line = `${indent}${icon} ${rep.criteria}`;
      if (rep.outcome) {
        line += ` (${rep.outcome})`;
      }
      const lines = [line];
      if (rep.explanation) {
        lines.push(`${indent}    |`);
        lines.push(`${indent}    | EXPLANATION`);
        lines.push(`${indent}    |     ${rep.explanation}`);
      }
      for (const s of sections.values()) {
        lines.push(`${indent}    |`);
        lines.push(`${indent}    | ${s.name.toUpperCase()}`);
        for (const item of s.items) {
          lines.push(`${indent}    |     • ${item}`);
        }
        for (const c of s.content) {
          for (const cl of c.split("\n")) {
            lines.push(`${indent}    |     ${cl}`);
          }
        }
      }
      for (const child of children) {
        lines.push(child.format(`${indent}    `));
      }
      return lines.join("\n");
    },
  };

  return rep;
}

export type ReportGenerationContext = {
  treeOk: boolean;
  isInverted: boolean;
};

export type Predicate = Observer & {
  ok(): boolean;
  done(): void;
  report(ctx: ReportGenerationContext): Report;
};

export type Expectation = {
  caption(): string;
  predicate(s: PredicateScope): Predicate;
};

export type CommandExecutorInterceptor = (
  ctx: Context,
  m: Command,
  options: ExecuteCommandOption[],
  executor: DogmaCommandExecutor,
) => Promise<void> | void;

export type TestCommandExecutor = DogmaCommandExecutor & {
  bind(eng: Engine, options: OperationOption[]): void;
  unbind(): void;
  intercept(
    fn: CommandExecutorInterceptor | undefined,
  ): CommandExecutorInterceptor | undefined;
};

function createTestCommandExecutor(): TestCommandExecutor {
  let boundEngine: Engine | undefined;
  let boundOptions: OperationOption[] = [];
  let interceptor: CommandExecutorInterceptor | undefined;

  const self: TestCommandExecutor = {
    bind(eng: Engine, options: OperationOption[]) {
      boundEngine = eng;
      boundOptions = options;
    },
    unbind() {
      boundEngine = undefined;
      boundOptions = [];
    },
    intercept(fn) {
      const prev = interceptor;
      interceptor = fn;
      return prev;
    },
    executeCommand(
      ctxOrCommand: Context | Command,
      commandOrOpt?: Command | ExecuteCommandOption,
      ...restOpts: ExecuteCommandOption[]
    ): Promise<void> | void {
      if (!boundEngine) {
        throw new Error("executeCommand(): cannot be called outside of a test");
      }

      let ctx: Context;
      let m: Command;
      let opts: ExecuteCommandOption[];

      if (
        commandOrOpt &&
        typeof commandOrOpt === "object" &&
        "$typeName" in commandOrOpt
      ) {
        ctx = ctxOrCommand as Context;
        m = commandOrOpt as Command;
        opts = restOpts;
      } else {
        ctx = backgroundContext();
        m = ctxOrCommand as Command;
        opts = commandOrOpt
          ? [commandOrOpt as ExecuteCommandOption, ...restOpts]
          : restOpts;
      }

      const next = newCommandExecutor(boundEngine, boundOptions);
      if (interceptor) {
        return interceptor(ctx, m, opts, next);
      }
      return next.executeCommand(ctx, m, ...opts);
    },
  };

  return self;
}

export type ActionScope = {
  app: Application;
  getVirtualClock(): Date;
  setVirtualClock(t: Date): void;
  engine: Engine;
  executor: TestCommandExecutor;
  operationOptions: OperationOption[];
};

export type Action = {
  caption(): string;
  configurePredicate(o: PredicateOptions): void;
  do(ctx: Context, s: ActionScope): Promise<Error | undefined> | Error | undefined;
};

export type TestOption = {
  applyTestOption(t: TestState): void;
};

export type CallOption = {
  applyCallOption(a: CallActionState): void;
};

type CallActionState = {
  onExecute?: CommandExecutorInterceptor;
};

type Annotation = {
  value: unknown;
  text: string;
};

export type TestState = {
  ctx: Context;
  testingT: TestingT;
  app: Application;
  virtualClock: Date;
  engine: Engine;
  executor: TestCommandExecutor;
  predicateOptions: PredicateOptions;
  operationOptions: OperationOption[];
  annotations: Annotation[];
};

export function startTimeAt(st: Date): TestOption {
  return {
    applyTestOption(t: TestState) {
      t.virtualClock = new Date(st.getTime());
    },
  };
}

export function withUnsafeOperationOptions(
  ...options: OperationOption[]
): TestOption {
  return {
    applyTestOption(t: TestState) {
      t.operationOptions.push(...options);
    },
  };
}

export function withMessageComparator(comp: MessageComparator): TestOption {
  if (!comp) {
    throw new Error("withMessageComparator(<nil>): comparator must not be nil");
  }
  return {
    applyTestOption(t: TestState) {
      t.predicateOptions.messageComparator = comp;
    },
  };
}

export function interceptCommandExecutor(
  fn: CommandExecutorInterceptor,
): TestOption & CallOption {
  if (!fn) {
    throw new Error(
      "interceptCommandExecutor(<nil>): function must not be nil",
    );
  }
  return {
    applyTestOption(t: TestState) {
      t.executor.intercept(fn);
    },
    applyCallOption(a: CallActionState) {
      a.onExecute = fn;
    },
  };
}

export type Test = {
  readonly engine: Engine;
  readonly app: Application;
  prepare(...actions: Action[]): Test;
  expect(act: Action, e: Expectation): Test;
  commandExecutor(): DogmaCommandExecutor;
  annotate(v: unknown, text: string): Test;
  enableHandlers(...names: string[]): Test;
  disableHandlers(...names: string[]): Test;
  enableHandlersLike(...patterns: Array<string | RegExp>): Test;
  disableHandlersLike(...patterns: Array<string | RegExp>): Test;
};

function isDogmaApplication(v: unknown): v is DogmaApplication {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as DogmaApplication).configure === "function"
  );
}

export function begin(
  tOrApp: TestingT | DogmaApplication,
  appOrOpt?: DogmaApplication | TestOption,
  ...restOptions: TestOption[]
): Test {
  return beginContext(backgroundContext(), tOrApp, appOrOpt, ...restOptions);
}

export function beginContext(
  ctx: Context,
  tOrApp: TestingT | DogmaApplication,
  appOrOpt?: DogmaApplication | TestOption,
  ...restOptions: TestOption[]
): Test {
  let testingT: TestingT;
  let app: DogmaApplication;
  let options: TestOption[];

  if (isDogmaApplication(tOrApp)) {
    testingT = createDefaultTestingT();
    app = tOrApp;
    options = appOrOpt ? [appOrOpt as TestOption, ...restOptions] : restOptions;
  } else {
    testingT = tOrApp;
    app = appOrOpt as DogmaApplication;
    options = restOptions;
  }

  const cfg = fromApplication(app);
  const eng = mustNewEngine(
    cfg,
    enableProjectionCompactionDuringHandling(true),
  );

  const state: TestState = {
    ctx,
    testingT,
    app: cfg,
    virtualClock: new Date(),
    engine: eng,
    executor: createTestCommandExecutor(),
    predicateOptions: {
      messageComparator: defaultMessageComparator,
      matchDispatchCycleStartedFacts: false,
    },
    operationOptions: [
      enableProjections(false),
      enableIntegrations(false),
      withObserver(
        newLogger((s) => {
          testingT.log(s);
        }),
      ),
    ],
    annotations: [],
  };

  for (const opt of options) {
    opt.applyTestOption(state);
  }

  function runAction(
    act: Action,
    ...extraOpts: OperationOption[]
  ): Error | undefined {
    const opts: OperationOption[] = [
      withCurrentTime(state.virtualClock),
      ...state.operationOptions,
      ...extraOpts,
    ];
    const scope: ActionScope = {
      app: state.app,
      getVirtualClock: () => state.virtualClock,
      setVirtualClock: (next: Date) => {
        state.virtualClock = next;
      },
      engine: state.engine,
      executor: state.executor,
      operationOptions: opts,
    };

    const res = act.do(state.ctx, scope);
    if (res instanceof Promise) {
      throw new Error(
        "Asynchronous action returned a Promise in synchronous test runner; ensure test handlers execute synchronously.",
      );
    }
    return res;
  }

  function failFatal(err: Error): void {
    if (state.testingT.fatal) {
      state.testingT.fatal(err);
    } else {
      if (state.testingT.error) {
        state.testingT.error(err);
      } else {
        state.testingT.log(err.message);
      }
      state.testingT.failNow();
    }
  }

  function enableHandlersInternal(names: string[], enable: boolean): Test {
    for (const n of names) {
      const h = state.app.handlerByName(n);
      if (!h) {
        throw new Error(
          `the "${state.app.identity().name}" application does not have a handler named "${n}"`,
        );
      }
      if (enable && h.isDisabled()) {
        const ht = h.handlerType();
        const cap = ht.charAt(0).toUpperCase() + ht.slice(1);
        throw new Error(
          `cannot enable the "${n}" handler, it has been disabled by a call to ${cap}Configurer.disable()`,
        );
      }
      state.operationOptions.push(enableHandler(n, enable));
    }
    return testObj;
  }

  function enableHandlersLikeInternal(
    patterns: Array<string | RegExp>,
    enable: boolean,
  ): Test {
    const names = new Set<string>();
    for (const p of patterns) {
      const re = typeof p === "string" ? new RegExp(p) : p;
      let matched = false;
      for (const h of state.app.handlers()) {
        const name = h.identity().name;
        if (!h.isDisabled() && re.test(name)) {
          names.add(name);
          matched = true;
        }
      }
      if (!matched) {
        throw new Error(
          `the "${state.app.identity().name}" application does not have any handlers with names that match the regular expression (${p}), or all such handlers have been disabled`,
        );
      }
    }
    for (const n of names) {
      state.operationOptions.push(enableHandler(n, enable));
    }
    return testObj;
  }

  const testObj: Test = {
    engine: state.engine,
    app: state.app,

    prepare(...actions: Action[]): Test {
      state.testingT.helper?.();
      for (const act of actions) {
        state.testingT.log(`--- ${act.caption()} ---`);
        const err = runAction(act);
        if (err) {
          failFatal(err);
          return testObj;
        }
      }
      return testObj;
    },

    expect(act: Action, e: Expectation): Test {
      state.testingT.helper?.();
      const s: PredicateScope = {
        app: state.app,
        options: { ...state.predicateOptions },
      };
      act.configurePredicate(s.options);

      state.testingT.log(`--- expect ${act.caption()} ${e.caption()} ---`);

      const p = e.predicate(s);
      let err: Error | undefined;
      try {
        err = runAction(act, withObserver(p));
      } finally {
        p.done();
      }

      if (err) {
        failFatal(err);
        return testObj;
      }

      const treeOk = p.ok();
      const rep = p.report({
        treeOk,
        isInverted: false,
      });

      state.testingT.log(`--- TEST REPORT ---\n\n${rep.format()}\n`);

      if (!treeOk) {
        state.testingT.failNow();
      }

      return testObj;
    },

    commandExecutor(): DogmaCommandExecutor {
      return state.executor;
    },

    annotate(v: unknown, text: string): Test {
      state.annotations.push({ value: v, text });
      return testObj;
    },

    enableHandlers(...names: string[]): Test {
      return enableHandlersInternal(names, true);
    },

    disableHandlers(...names: string[]): Test {
      return enableHandlersInternal(names, false);
    },

    enableHandlersLike(...patterns: Array<string | RegExp>): Test {
      return enableHandlersLikeInternal(patterns, true);
    },

    disableHandlersLike(...patterns: Array<string | RegExp>): Test {
      return enableHandlersLikeInternal(patterns, false);
    },
  };

  return testObj;
}

// --- Actions ---

function inflectKind(kind: Kind, template: string): string {
  const isCmd = kind === CommandKind;
  return template
    .replaceAll("<producing>", isCmd ? "executing" : "recording")
    .replaceAll("<produce>", isCmd ? "execute" : "record")
    .replaceAll("<produced>", isCmd ? "executed" : "recorded")
    .replaceAll("<message>", isCmd ? "command" : "event")
    .replaceAll("<messages>", isCmd ? "commands" : "events")
    .replaceAll(
      "<dispatcher>",
      isCmd ? "dogma.CommandExecutor" : "dogma.EventRecorder",
    );
}

export function executeCommand(m: Command): Action {
  if (!m) {
    throw new Error("executeCommand(<nil>): message must not be nil");
  }
  const mt = typeOf(m);
  try {
    validateMessage(m);
  } catch (err) {
    throw new Error(
      `executeCommand(${mt.toString()}): ${(err as Error).message}`,
    );
  }

  return createDispatchAction(m);
}

export function recordEvent(m: Event): Action {
  if (!m) {
    throw new Error("recordEvent(<nil>): message must not be nil");
  }
  const mt = typeOf(m);
  try {
    validateMessage(m);
  } catch (err) {
    throw new Error(`recordEvent(${mt.toString()}): ${(err as Error).message}`);
  }

  return createDispatchAction(m);
}

function createDispatchAction(m: Message): Action {
  const mt = typeOf(m);
  return {
    caption(): string {
      return inflectKind(mt.kind, `<producing> ${mt.toString()} <message>`);
    },
    configurePredicate(): void {},
    do(ctx: Context, s: ActionScope) {
      if (!s.app.routeSet().hasMessageType(mt)) {
        return new Error(
          inflectKind(
            mt.kind,
            `cannot <produce> <message>, ${mt.toString()} is not a recognized message type`,
          ),
        );
      }
      return s.engine.dispatch(ctx, m, ...s.operationOptions);
    },
  };
}

export type TimeAdjustment = {
  description(): string;
  step(current: Date): Date;
};

export function toTime(t: Date): TimeAdjustment {
  return {
    description(): string {
      return `to ${t.toISOString()}`;
    },
    step(): Date {
      return new Date(t.getTime());
    },
  };
}

export function byDuration(durationMs: number): TimeAdjustment {
  if (durationMs < 0) {
    throw new Error(
      `byDuration(${durationMs}): duration must not be negative`,
    );
  }
  return {
    description(): string {
      return `by ${durationMs}ms`;
    },
    step(before: Date): Date {
      return new Date(before.getTime() + durationMs);
    },
  };
}

export function advanceTime(adj: TimeAdjustment): Action {
  if (!adj) {
    throw new Error("advanceTime(<nil>): adjustment must not be nil");
  }
  return {
    caption(): string {
      return `advancing time ${adj.description()}`;
    },
    configurePredicate(): void {},
    do(ctx: Context, s: ActionScope) {
      const current = s.getVirtualClock();
      const now = adj.step(current);
      if (now.getTime() < current.getTime()) {
        return new Error(
          `adjusting the clock ${adj.description()} would reverse time`,
        );
      }
      s.setVirtualClock(now);
      const opts = [...s.operationOptions, withCurrentTime(now)];
      return s.engine.tick(ctx, ...opts);
    },
  };
}

export function call(
  fn: () => Promise<void> | void,
  ...options: CallOption[]
): Action {
  if (!fn) {
    throw new Error("call(<nil>): function must not be nil");
  }
  const state: CallActionState = {};
  for (const opt of options) {
    opt.applyCallOption(state);
  }

  return {
    caption(): string {
      return "calling user-defined function";
    },
    configurePredicate(o: PredicateOptions): void {
      o.matchDispatchCycleStartedFacts = true;
    },
    do(_ctx: Context, s: ActionScope) {
      s.executor.bind(s.engine, s.operationOptions);
      let prev: CommandExecutorInterceptor | undefined;
      if (state.onExecute) {
        prev = s.executor.intercept(state.onExecute);
      }
      try {
        const res = fn();
        if (res instanceof Promise) {
          return res.then(
            () => {
              if (state.onExecute) s.executor.intercept(prev);
              s.executor.unbind();
              return undefined;
            },
            (err) => {
              if (state.onExecute) s.executor.intercept(prev);
              s.executor.unbind();
              return err instanceof Error ? err : new Error(String(err));
            },
          );
        }
      } finally {
        if (state.onExecute) {
          s.executor.intercept(prev);
        }
        s.executor.unbind();
      }
      return undefined;
    },
  };
}

// --- Expectations & Tracker ---

type Tracker = {
  kind: Kind;
  options: PredicateOptions;
  cycleBegun: boolean;
  total: number;
  produced: number;
  engagedOrder: string[];
  engagedType: Map<string, HandlerType>;
  enabled: Map<HandlerType, boolean>;
  notify(f: Fact): Envelope | undefined;
};

function handlerTypeProducesKind(ht: HandlerType, kind: Kind): boolean {
  switch (ht) {
    case AggregateHandlerType:
    case IntegrationHandlerType:
      return kind === EventKind;
    case ProcessHandlerType:
      return kind === CommandKind || kind === DeadlineKind;
    default:
      return false;
  }
}

function createTracker(kind: Kind, options: PredicateOptions): Tracker {
  const engagedOrder: string[] = [];
  const engagedType = new Map<string, HandlerType>();

  function updateEngaged(n: string, ht: HandlerType) {
    if (handlerTypeProducesKind(ht, kind)) {
      if (!engagedType.has(n)) {
        engagedOrder.push(n);
        engagedType.set(n, ht);
      }
    }
  }

  function messageProduced(env: Envelope) {
    tracker.total++;
    if (typeOf(env.message).kind === kind) {
      tracker.produced++;
    }
  }

  const tracker: Tracker = {
    kind,
    options,
    cycleBegun: false,
    total: 0,
    produced: 0,
    engagedOrder,
    engagedType,
    enabled: new Map(),
    notify(f: Fact): Envelope | undefined {
      switch (f.kind) {
        case "DispatchCycleBegun":
          tracker.cycleBegun = true;
          tracker.enabled = f.enabledHandlerTypes;
          if (options.matchDispatchCycleStartedFacts) {
            messageProduced(f.envelope);
            return f.envelope;
          }
          break;
        case "HandlingBegun":
          updateEngaged(f.handler.identity().name, f.handler.handlerType());
          break;
        case "EventRecordedByAggregate":
          messageProduced(f.eventEnvelope);
          return f.eventEnvelope;
        case "EventRecordedByIntegration":
          messageProduced(f.eventEnvelope);
          return f.eventEnvelope;
        case "CommandExecutedByProcess":
          messageProduced(f.commandEnvelope);
          return f.commandEnvelope;
        case "DeadlineScheduledByProcess":
          messageProduced(f.deadlineEnvelope);
          return f.deadlineEnvelope;
      }
      return undefined;
    },
  };

  return tracker;
}

function reportImpossible(
  rep: Report,
  app: Application,
  options: PredicateOptions,
  t: Type,
): boolean {
  if (!app.routeSet().hasMessageType(t)) {
    rep.explanation = inflectKind(
      t.kind,
      `a <message> of type ${t.toString()} can never be <produced>, the application does not use this message type`,
    );
    rep
      .section("Suggestions")
      .items.push(
        `add a route for ${t.toString()} to the application's configuration`,
      );
    return true;
  }

  if (!options.matchDispatchCycleStartedFacts) {
    if (!hasDirection(app.routeSet().directionOf(t), OutboundDirection)) {
      rep.explanation = inflectKind(
        t.kind,
        `no handlers <produce> <messages> of type ${t.toString()}, it is only ever consumed`,
      );
      rep
        .section("Suggestions")
        .items.push(
          `add an outbound route for ${t.toString()} to a handler in the application's configuration`,
        );
      return true;
    }
  }

  return false;
}

function reportNoMatch(rep: Report, t: Tracker): void {
  const s = rep.section("Suggestions");
  let allDisabled = true;
  const relevant: string[] = [];

  if (t.cycleBegun) {
    for (const ht of handlerTypes()) {
      const e = t.enabled.get(ht) ?? false;
      if (handlerTypeProducesKind(ht, t.kind)) {
        relevant.push(ht);
        if (e) {
          allDisabled = false;
        } else {
          s.items.push(`enable ${ht} handlers`);
        }
      }
    }

    if (!t.options.matchDispatchCycleStartedFacts) {
      if (allDisabled) {
        rep.explanation = "no relevant handler types were enabled";
        return;
      }
      if (t.engagedOrder.length === 0) {
        rep.explanation = `no relevant handlers (${relevant.join(" or ")}) were engaged`;
        s.items.push("check the application's routing configuration");
        return;
      }
    }
  }

  if (t.total === 0) {
    rep.explanation = "no messages were produced at all";
  } else if (t.produced === 0) {
    rep.explanation = inflectKind(t.kind, "no <messages> were <produced> at all");
  } else if (t.options.matchDispatchCycleStartedFacts) {
    rep.explanation = inflectKind(
      t.kind,
      "nothing <produced> a matching <message>",
    );
  } else {
    rep.explanation = inflectKind(
      t.kind,
      "none of the engaged handlers <produced> a matching <message>",
    );
  }

  for (const n of t.engagedOrder) {
    s.items.push(
      `verify the logic within the '${n}' ${t.engagedType.get(n)} message handler`,
    );
  }
}

export function toExecuteCommand(m: Command): Expectation {
  if (!m) {
    throw new Error("toExecuteCommand(<nil>): message must not be nil");
  }
  const mt = typeOf(m);
  try {
    validateMessage(m);
  } catch (err) {
    throw new Error(
      `toExecuteCommand(${mt.toString()}): ${(err as Error).message}`,
    );
  }
  return createMessageExpectation(m);
}

export function toRecordEvent(m: Event): Expectation {
  if (!m) {
    throw new Error("toRecordEvent(<nil>): message must not be nil");
  }
  const mt = typeOf(m);
  try {
    validateMessage(m);
  } catch (err) {
    throw new Error(
      `toRecordEvent(${mt.toString()}): ${(err as Error).message}`,
    );
  }
  return createMessageExpectation(m);
}

function createMessageExpectation(expectedMessage: Message): Expectation {
  const mt = typeOf(expectedMessage);

  return {
    caption(): string {
      return inflectKind(
        mt.kind,
        `to <produce> a specific '${mt.toString()}' <message>`,
      );
    },
    predicate(s: PredicateScope): Predicate {
      const tracker = createTracker(mt.kind, s.options);
      let isOk = false;
      let bestMatch: Envelope | undefined;
      const isEqual = s.options.messageComparator ?? defaultMessageComparator;

      return {
        notify(f: Fact): void {
          if (isOk) return;
          const env = tracker.notify(f);
          if (!env) return;
          if (typeOf(env.message) !== mt) return;
          bestMatch = env;
          isOk = isEqual(env.message, expectedMessage);
        },
        ok(): boolean {
          return isOk;
        },
        done(): void {},
        report(ctx: ReportGenerationContext): Report {
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok: isOk,
            criteria: inflectKind(
              mt.kind,
              `<produce> a specific '${mt.toString()}' <message>`,
            ),
          });

          if (isOk || ctx.treeOk || ctx.isInverted) {
            return rep;
          }

          if (!bestMatch) {
            if (!reportImpossible(rep, s.app, tracker.options, mt)) {
              reportNoMatch(rep, tracker);
            }
            return rep;
          }

          if (!bestMatch.origin) {
            rep.explanation = inflectKind(
              mt.kind,
              "a similar <message> was <produced> via a <dispatcher>",
            );
          } else {
            rep.explanation = inflectKind(
              mt.kind,
              `a similar <message> was <produced> by the '${bestMatch.origin.handler.identity().name}' ${bestMatch.origin.handlerType} message handler`,
            );
          }

          rep.section("Suggestions").items.push("check the content of the message");
          rep.section("Message Diff").content.push(
            `expected: ${util.inspect(expectedMessage, { depth: 5 })}\nactual:   ${util.inspect(bestMatch.message, { depth: 5 })}`,
          );
          return rep;
        },
      };
    },
  };
}

function resolveTypeSpec<T extends Message>(
  arg: T | MessageTypeSpec<T>,
  funcName: string,
): Type {
  if (!arg) {
    throw new Error(`${funcName}(<nil>): message or type must not be nil`);
  }
  if (typeof arg === "object" && "$typeName" in arg) {
    return typeOf(arg as T);
  }
  return typeFor(arg as MessageTypeSpec<T>);
}

export function toExecuteCommandType<T extends Command>(
  spec: T | MessageTypeSpec<T>,
): Expectation {
  return createMessageTypeExpectation(
    resolveTypeSpec(spec, "toExecuteCommandType"),
  );
}

export function toExecuteCommandOfType<T extends Command>(
  mOrSpec: T | MessageTypeSpec<T>,
): Expectation {
  return createMessageTypeExpectation(
    resolveTypeSpec(mOrSpec, "toExecuteCommandOfType"),
  );
}

export function toRecordEventType<T extends Event>(
  spec: T | MessageTypeSpec<T>,
): Expectation {
  return createMessageTypeExpectation(
    resolveTypeSpec(spec, "toRecordEventType"),
  );
}

export function toRecordEventOfType<T extends Event>(
  mOrSpec: T | MessageTypeSpec<T>,
): Expectation {
  return createMessageTypeExpectation(
    resolveTypeSpec(mOrSpec, "toRecordEventOfType"),
  );
}

function createMessageTypeExpectation(expectedType: Type): Expectation {
  return {
    caption(): string {
      return inflectKind(
        expectedType.kind,
        `to <produce> a <message> of type ${expectedType.toString()}`,
      );
    },
    predicate(s: PredicateScope): Predicate {
      const tracker = createTracker(expectedType.kind, s.options);
      let isOk = false;

      return {
        notify(f: Fact): void {
          if (isOk) return;
          const env = tracker.notify(f);
          if (env) {
            isOk = typeOf(env.message) === expectedType;
          }
        },
        ok(): boolean {
          return isOk;
        },
        done(): void {},
        report(ctx: ReportGenerationContext): Report {
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok: isOk,
            criteria: inflectKind(
              expectedType.kind,
              `<produce> any '${expectedType.toString()}' <message>`,
            ),
          });

          if (isOk || ctx.treeOk || ctx.isInverted) {
            return rep;
          }

          if (!reportImpossible(rep, s.app, tracker.options, expectedType)) {
            reportNoMatch(rep, tracker);
          }

          return rep;
        },
      };
    },
  };
}

export const IgnoreMessage = new Error(
  "this message does not need to be inspected by the predicate",
);

export type MessageMatchPredicateFn<T extends Message> = (
  m: T,
) => Error | boolean | undefined | void;

export function toExecuteCommandMatching<T extends Command = Command>(
  pred: MessageMatchPredicateFn<T>,
  spec?: MessageTypeSpec<T>,
): Expectation {
  if (!pred) {
    throw new Error("toExecuteCommandMatching(<nil>): function must not be nil");
  }
  return createMessageMatchExpectation(
    CommandKind,
    pred,
    false,
    spec ? typeFor(spec) : undefined,
  );
}

export function toOnlyExecuteCommandsMatching<T extends Command = Command>(
  pred: MessageMatchPredicateFn<T>,
  spec?: MessageTypeSpec<T>,
): Expectation {
  if (!pred) {
    throw new Error(
      "toOnlyExecuteCommandsMatching(<nil>): function must not be nil",
    );
  }
  return createMessageMatchExpectation(
    CommandKind,
    pred,
    true,
    spec ? typeFor(spec) : undefined,
  );
}

export function toRecordEventMatching<T extends Event = Event>(
  pred: MessageMatchPredicateFn<T>,
  spec?: MessageTypeSpec<T>,
): Expectation {
  if (!pred) {
    throw new Error("toRecordEventMatching(<nil>): function must not be nil");
  }
  return createMessageMatchExpectation(
    EventKind,
    pred,
    false,
    spec ? typeFor(spec) : undefined,
  );
}

export function toOnlyRecordEventsMatching<T extends Event = Event>(
  pred: MessageMatchPredicateFn<T>,
  spec?: MessageTypeSpec<T>,
): Expectation {
  if (!pred) {
    throw new Error(
      "toOnlyRecordEventsMatching(<nil>): function must not be nil",
    );
  }
  return createMessageMatchExpectation(
    EventKind,
    pred,
    true,
    spec ? typeFor(spec) : undefined,
  );
}

function createMessageMatchExpectation<T extends Message>(
  kind: Kind,
  pred: MessageMatchPredicateFn<T>,
  exhaustive: boolean,
  expectedType?: Type,
): Expectation {
  return {
    caption(): string {
      if (exhaustive) {
        return inflectKind(
          kind,
          "to only <produce> <messages> that match the predicate",
        );
      }
      return inflectKind(
        kind,
        "to <produce> a <message> that matches the predicate",
      );
    },
    predicate(s: PredicateScope): Predicate {
      const tracker = createTracker(kind, s.options);
      const failures: Array<{
        messageType: Type;
        error: string;
        count: number;
      }> = [];
      let matched = 0;
      let ignored = 0;
      let isOk = false;

      return {
        notify(f: Fact): void {
          if (isOk) return;
          const env = tracker.notify(f);
          if (!env) return;

          const producedType = typeOf(env.message);
          if (producedType.kind !== kind) return;

          let err: Error | undefined;
          if (expectedType && producedType !== expectedType) {
            if (exhaustive) {
              err = new Error(
                `predicate function expected ${expectedType.toString()}`,
              );
            } else {
              err = IgnoreMessage;
            }
          } else {
            try {
              const res = pred(env.message as T);
              if (res instanceof Error) {
                err = res;
              } else if (res === false) {
                err = new Error("predicate returned false");
              }
            } catch (thrown) {
              err =
                thrown instanceof Error ? thrown : new Error(String(thrown));
            }
          }

          if (!err) {
            matched++;
            if (!exhaustive) {
              isOk = true;
              failures.length = 0;
            }
            return;
          }

          if (err === IgnoreMessage) {
            ignored++;
            return;
          }

          const existing = failures.find(
            (x) => x.messageType === producedType && x.error === err!.message,
          );
          if (existing) {
            existing.count++;
          } else {
            failures.push({
              messageType: producedType,
              error: err.message,
              count: 1,
            });
          }
        },
        ok(): boolean {
          return isOk;
        },
        done(): void {
          if (exhaustive && failures.length === 0) {
            isOk = true;
          }
        },
        report(ctx: ReportGenerationContext): Report {
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok: isOk,
            criteria: exhaustive
              ? inflectKind(
                  kind,
                  "only <produce> <messages> that match the predicate",
                )
              : inflectKind(
                  kind,
                  "<produce> a <message> that matches the predicate",
                ),
          });

          if (isOk || ctx.treeOk || ctx.isInverted) {
            return rep;
          }

          if (
            !exhaustive &&
            expectedType &&
            reportImpossible(rep, s.app, tracker.options, expectedType)
          ) {
            return rep;
          }

          if (failures.length > 0) {
            const fm = rep.section("Failed Matches");
            for (const f of failures) {
              if (f.count > 1) {
                fm.items.push(
                  `${f.messageType.toString()}: ${f.error} (repeated ${f.count} times)`,
                );
              } else {
                fm.items.push(`${f.messageType.toString()}: ${f.error}`);
              }
            }
          }

          reportNoMatch(rep, tracker);

          if (exhaustive) {
            const totalRelevant = tracker.produced - ignored;
            const matchedDesc =
              matched === 0
                ? `none of the ${totalRelevant}`
                : `only ${matched} of ${totalRelevant}`;
            rep.explanation = inflectKind(
              kind,
              `${matchedDesc} relevant <messages> matched the predicate`,
            );
          }

          return rep;
        },
      };
    },
  };
}

// --- Composite Expectations ---

export function allOf(...children: Expectation[]): Expectation {
  const n = children.length;
  if (n === 0) {
    throw new Error("allOf(): at least one child expectation must be provided");
  }
  if (n === 1) {
    return children[0];
  }
  return createCompositeExpectation(
    `to meet ${n} expectations`,
    "all of",
    children,
    (passed) => {
      if (passed === n) return { outcome: "", ok: true };
      return { outcome: `${n - passed} of the expectations failed`, ok: false };
    },
    false,
  );
}

export function anyOf(...children: Expectation[]): Expectation {
  const n = children.length;
  if (n === 0) {
    throw new Error("anyOf(): at least one child expectation must be provided");
  }
  if (n === 1) {
    return children[0];
  }
  return createCompositeExpectation(
    `to meet at least one of ${n} expectations`,
    "any of",
    children,
    (passed) => {
      if (passed > 0) return { outcome: "", ok: true };
      return { outcome: `all ${n} of the expectations failed`, ok: false };
    },
    false,
  );
}

export function noneOf(...children: Expectation[]): Expectation {
  const n = children.length;
  if (n === 0) {
    throw new Error(
      "noneOf(): at least one child expectation must be provided",
    );
  }
  const caption =
    n === 1
      ? `not ${children[0].caption()}`
      : `not to meet any of ${n} expectations`;

  return createCompositeExpectation(
    caption,
    "none of",
    children,
    (passed) => {
      if (passed === 0) return { outcome: "", ok: true };
      if (n === 1) {
        return { outcome: "the expectation passed unexpectedly", ok: false };
      }
      return {
        outcome: `${passed} of the expectations passed unexpectedly`,
        ok: false,
      };
    },
    true,
  );
}

export function not(expectation: Expectation): Expectation {
  return {
    caption(): string {
      return `not ${expectation.caption()}`;
    },
    predicate(s: PredicateScope): Predicate {
      const inner = expectation.predicate(s);
      return {
        notify(f: Fact) {
          inner.notify(f);
        },
        ok(): boolean {
          return !inner.ok();
        },
        done() {
          inner.done();
        },
        report(ctx: ReportGenerationContext): Report {
          const nextCtx = {
            ...ctx,
            isInverted: !ctx.isInverted,
          };
          const r = inner.report(nextCtx);
          return createReport({
            treeOk: ctx.treeOk,
            ok: !inner.ok(),
            criteria: `do not ${r.criteria}`,
          });
        },
      };
    },
  };
}

function createCompositeExpectation(
  caption: string,
  criteria: string,
  children: Expectation[],
  pred: (passed: number) => { outcome: string; ok: boolean },
  isInverted: boolean,
): Expectation {
  return {
    caption(): string {
      return caption;
    },
    predicate(s: PredicateScope): Predicate {
      const childPreds = children.map((c) => c.predicate(s));
      const checkOk = () => {
        let passed = 0;
        for (const c of childPreds) {
          if (c.ok()) passed++;
        }
        return pred(passed);
      };

      return {
        notify(f: Fact): void {
          for (const c of childPreds) {
            c.notify(f);
          }
        },
        ok(): boolean {
          return checkOk().ok;
        },
        done(): void {
          for (const c of childPreds) {
            c.done();
          }
        },
        report(ctx: ReportGenerationContext): Report {
          const nextCtx: ReportGenerationContext = {
            ...ctx,
            isInverted: isInverted ? !ctx.isInverted : ctx.isInverted,
          };
          const { outcome, ok } = checkOk();
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok,
            criteria,
            outcome: outcome || undefined,
          });
          for (const c of childPreds) {
            rep.append(c.report(nextCtx));
          }
          return rep;
        },
      };
    },
  };
}

export function toRepeatedly(
  desc: string,
  n: number,
  factory: (i: number) => Expectation,
): Expectation {
  if (!factory) {
    throw new Error(
      `toRepeatedly(${JSON.stringify(desc)}, ${n}, <nil>): function must not be nil`,
    );
  }
  if (n < 1) {
    throw new Error(
      `toRepeatedly(${JSON.stringify(desc)}, ${n}, <func>): n must be 1 or greater`,
    );
  }
  if (!desc) {
    throw new Error(
      `toRepeatedly(${JSON.stringify(desc)}, ${n}, <func>): description must not be empty`,
    );
  }

  return {
    caption(): string {
      return `to ${desc}`;
    },
    predicate(s: PredicateScope): Predicate {
      const children: Predicate[] = [];
      for (let i = 0; i < n; i++) {
        const x = factory(i);
        if (!x) {
          throw new Error(
            `toRepeatedly(${JSON.stringify(desc)}, ${n}, <func>): factory returned a nil expectation on iteration ${i}`,
          );
        }
        children.push(x.predicate(s));
      }

      return {
        notify(f: Fact) {
          for (const c of children) {
            c.notify(f);
          }
        },
        ok(): boolean {
          return children.every((c) => c.ok());
        },
        done() {
          for (const c of children) {
            c.done();
          }
        },
        report(ctx: ReportGenerationContext): Report {
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok: true,
            criteria: desc,
          });
          let failureCount = 0;
          let failureShown = 0;
          for (let i = 0; i < children.length; i++) {
            const c = children[i];
            if (c.ok()) continue;
            failureCount++;
            if (failureCount === 1) {
              failureShown = i;
              rep.append(c.report(ctx));
            }
          }
          if (failureCount !== 0) {
            rep.ok = false;
            rep.outcome = `${failureCount} of ${children.length} iteration(s) failed, iteration #${failureShown} shown`;
          }
          return rep;
        },
      };
    },
  };
}

class AbortSentinel {}

export type SatisfyT = {
  readonly options: PredicateOptions;
  readonly facts: Fact[];
  cleanup(fn: () => void): void;
  error(...args: any[]): void;
  errorf(format: string, ...args: any[]): void;
  fail(): void;
  failNow(): never;
  failed(): boolean;
  fatal(...args: any[]): never;
  fatalf(format: string, ...args: any[]): never;
  helper(): void;
  log(...args: any[]): void;
  logf(format: string, ...args: any[]): void;
  name(): string;
  skip(...args: any[]): never;
  skipNow(): never;
  skipf(format: string, ...args: any[]): never;
  skipped(): boolean;
};

export function toSatisfy(
  desc: string,
  pred: (t: SatisfyT) => void,
): Expectation {
  if (!pred) {
    throw new Error(
      `toSatisfy(${JSON.stringify(desc)}, <nil>): function must not be nil`,
    );
  }
  if (!desc) {
    throw new Error(
      `toSatisfy(${JSON.stringify(desc)}, <func>): description must not be empty`,
    );
  }

  return {
    caption(): string {
      return `to ${desc}`;
    },
    predicate(s: PredicateScope): Predicate {
      const facts: Fact[] = [];
      const messages: string[] = [];
      const cleanups: Array<() => void> = [];
      let isSkipped = false;
      let isFailed = false;
      let explanation = "";

      const satisfyT: SatisfyT = {
        options: s.options,
        facts,
        cleanup(fn: () => void) {
          cleanups.push(fn);
        },
        error(...args: any[]) {
          messages.push(util.format(...args));
          isFailed = true;
          if (!explanation) explanation = "error() called";
        },
        errorf(format: string, ...args: any[]) {
          messages.push(util.format(format, ...args));
          isFailed = true;
          if (!explanation) explanation = "errorf() called";
        },
        fail() {
          isFailed = true;
          if (!explanation) explanation = "fail() called";
        },
        failNow(): never {
          isFailed = true;
          if (!explanation) explanation = "failNow() called";
          throw new AbortSentinel();
        },
        failed(): boolean {
          return isFailed;
        },
        fatal(...args: any[]): never {
          messages.push(util.format(...args));
          isFailed = true;
          if (!explanation) explanation = "fatal() called";
          throw new AbortSentinel();
        },
        fatalf(format: string, ...args: any[]): never {
          messages.push(util.format(format, ...args));
          isFailed = true;
          if (!explanation) explanation = "fatalf() called";
          throw new AbortSentinel();
        },
        helper() {},
        log(...args: any[]) {
          messages.push(util.format(...args));
        },
        logf(format: string, ...args: any[]) {
          messages.push(util.format(format, ...args));
        },
        name(): string {
          return desc;
        },
        skip(...args: any[]): never {
          messages.push(util.format(...args));
          isSkipped = true;
          if (!explanation) explanation = "skip() called";
          throw new AbortSentinel();
        },
        skipNow(): never {
          isSkipped = true;
          if (!explanation) explanation = "skipNow() called";
          throw new AbortSentinel();
        },
        skipf(format: string, ...args: any[]): never {
          messages.push(util.format(format, ...args));
          isSkipped = true;
          if (!explanation) explanation = "skipf() called";
          throw new AbortSentinel();
        },
        skipped(): boolean {
          return isSkipped;
        },
      };

      const checkOk = () => isSkipped || !isFailed;

      return {
        notify(f: Fact) {
          facts.push(f);
        },
        ok(): boolean {
          return checkOk();
        },
        done() {
          try {
            pred(satisfyT);
          } catch (err) {
            if (!(err instanceof AbortSentinel)) {
              throw err;
            }
          } finally {
            for (let i = cleanups.length - 1; i >= 0; i--) {
              cleanups[i]();
            }
          }
        },
        report(ctx: ReportGenerationContext): Report {
          const rep = createReport({
            treeOk: ctx.treeOk,
            ok: checkOk(),
            criteria: desc,
            outcome: isSkipped
              ? "the expectation was skipped"
              : isFailed
                ? "the expectation failed"
                : undefined,
            explanation: !checkOk() && !ctx.isInverted ? explanation : undefined,
          });
          if (messages.length > 0 && (checkOk() || !ctx.isInverted)) {
            rep.section("Log Messages").content.push(messages.join("\n"));
          }
          return rep;
        },
      };
    },
  };
}
