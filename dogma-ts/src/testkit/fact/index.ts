import util from "node:util";
import {
  type AggregateRoot,
  describeAggregateInstance,
  describeMessage,
  describeProcessInstance,
  type ProcessRoot,
} from "@/dogma/index.ts";
import {
  type Aggregate,
  type Handler,
  type HandlerType,
  handlerTypes,
  type Integration,
  kindSymbol,
  type Process,
  type Projection,
  typeOf,
} from "@/enginekit/index.ts";
import type { Envelope } from "../envelope/index.ts";

export type HandlerSkipReason =
  | typeof HandlerTypeDisabled
  | typeof IndividualHandlerDisabled
  | typeof IndividualHandlerDisabledByConfiguration;

export const HandlerTypeDisabled = "HandlerTypeDisabled" as const;
export const IndividualHandlerDisabled = "IndividualHandlerDisabled" as const;
export const IndividualHandlerDisabledByConfiguration =
  "IndividualHandlerDisabledByConfiguration" as const;

export type DispatchCycleBegun = {
  readonly kind: "DispatchCycleBegun";
  readonly envelope: Envelope;
  readonly engineTime: Date;
  readonly enabledHandlerTypes: Map<HandlerType, boolean>;
  readonly enabledHandlers: Map<string, boolean>;
};

export type DispatchCycleCompleted = {
  readonly kind: "DispatchCycleCompleted";
  readonly envelope: Envelope;
  readonly error?: Error;
  readonly enabledHandlerTypes: Map<HandlerType, boolean>;
  readonly enabledHandlers: Map<string, boolean>;
};

export type DispatchBegun = {
  readonly kind: "DispatchBegun";
  readonly envelope: Envelope;
};

export type DispatchCompleted = {
  readonly kind: "DispatchCompleted";
  readonly envelope: Envelope;
  readonly error?: Error;
};

export type HandlingBegun = {
  readonly kind: "HandlingBegun";
  readonly handler: Handler;
  readonly envelope: Envelope;
};

export type HandlingCompleted = {
  readonly kind: "HandlingCompleted";
  readonly handler: Handler;
  readonly envelope: Envelope;
  readonly error?: Error;
};

export type HandlingSkipped = {
  readonly kind: "HandlingSkipped";
  readonly handler: Handler;
  readonly envelope: Envelope;
  readonly reason: HandlerSkipReason;
};

export type CommandDeduplicated = {
  readonly kind: "CommandDeduplicated";
  readonly envelope: Envelope;
  readonly key: string;
};

export type TickCycleBegun = {
  readonly kind: "TickCycleBegun";
  readonly engineTime: Date;
  readonly enabledHandlerTypes: Map<HandlerType, boolean>;
  readonly enabledHandlers: Map<string, boolean>;
};

export type TickCycleCompleted = {
  readonly kind: "TickCycleCompleted";
  readonly error?: Error;
  readonly enabledHandlerTypes: Map<HandlerType, boolean>;
  readonly enabledHandlers: Map<string, boolean>;
};

export type TickBegun = {
  readonly kind: "TickBegun";
  readonly handler: Handler;
};

export type TickCompleted = {
  readonly kind: "TickCompleted";
  readonly handler: Handler;
  readonly error?: Error;
};

export type TickSkipped = {
  readonly kind: "TickSkipped";
  readonly handler: Handler;
  readonly reason: HandlerSkipReason;
};

export type AggregateInstanceLoaded = {
  readonly kind: "AggregateInstanceLoaded";
  readonly handler: Aggregate;
  readonly instanceID: string;
  readonly root: AggregateRoot;
  readonly envelope: Envelope;
  readonly snapshotOffset: number;
};

export type AggregateInstanceNotFound = {
  readonly kind: "AggregateInstanceNotFound";
  readonly handler: Aggregate;
  readonly instanceID: string;
  readonly envelope: Envelope;
};

export type AggregateInstanceCreated = {
  readonly kind: "AggregateInstanceCreated";
  readonly handler: Aggregate;
  readonly instanceID: string;
  readonly root: AggregateRoot;
  readonly envelope: Envelope;
};

export type EventRecordedByAggregate = {
  readonly kind: "EventRecordedByAggregate";
  readonly handler: Aggregate;
  readonly instanceID: string;
  readonly root: AggregateRoot;
  readonly envelope: Envelope;
  readonly eventEnvelope: Envelope;
};

export type MessageLoggedByAggregate = {
  readonly kind: "MessageLoggedByAggregate";
  readonly handler: Aggregate;
  readonly instanceID: string;
  readonly root: AggregateRoot;
  readonly envelope: Envelope;
  readonly logFormat: string;
  readonly logArguments: any[];
};

export type ProcessInstanceLoaded = {
  readonly kind: "ProcessInstanceLoaded";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly envelope: Envelope;
};

export type ProcessEventIgnored = {
  readonly kind: "ProcessEventIgnored";
  readonly handler: Process;
  readonly envelope: Envelope;
};

export type ProcessEventRoutedToEndedInstance = {
  readonly kind: "ProcessEventRoutedToEndedInstance";
  readonly handler: Process;
  readonly instanceID: string;
  readonly envelope: Envelope;
};

export type ProcessDeadlineRoutedToEndedInstance = {
  readonly kind: "ProcessDeadlineRoutedToEndedInstance";
  readonly handler: Process;
  readonly instanceID: string;
  readonly envelope: Envelope;
};

export type ProcessInstanceNotFound = {
  readonly kind: "ProcessInstanceNotFound";
  readonly handler: Process;
  readonly instanceID: string;
  readonly envelope: Envelope;
};

export type ProcessInstanceBegun = {
  readonly kind: "ProcessInstanceBegun";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly envelope: Envelope;
};

export type ProcessInstanceEnded = {
  readonly kind: "ProcessInstanceEnded";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly envelope: Envelope;
};

export type CommandExecutedByProcess = {
  readonly kind: "CommandExecutedByProcess";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly envelope: Envelope;
  readonly commandEnvelope: Envelope;
};

export type DeadlineScheduledByProcess = {
  readonly kind: "DeadlineScheduledByProcess";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly envelope: Envelope;
  readonly deadlineEnvelope: Envelope;
};

export type MessageLoggedByProcess = {
  readonly kind: "MessageLoggedByProcess";
  readonly handler: Process;
  readonly instanceID: string;
  readonly root: ProcessRoot;
  readonly ended: boolean;
  readonly envelope: Envelope;
  readonly logFormat: string;
  readonly logArguments: any[];
};

export type EventRecordedByIntegration = {
  readonly kind: "EventRecordedByIntegration";
  readonly handler: Integration;
  readonly envelope: Envelope;
  readonly eventEnvelope: Envelope;
};

export type MessageLoggedByIntegration = {
  readonly kind: "MessageLoggedByIntegration";
  readonly handler: Integration;
  readonly envelope: Envelope;
  readonly logFormat: string;
  readonly logArguments: any[];
};

export type ProjectionCompactionBegun = {
  readonly kind: "ProjectionCompactionBegun";
  readonly handler: Projection;
};

export type ProjectionCompactionCompleted = {
  readonly kind: "ProjectionCompactionCompleted";
  readonly handler: Projection;
  readonly error?: Error;
};

export type MessageLoggedByProjection = {
  readonly kind: "MessageLoggedByProjection";
  readonly handler: Projection;
  readonly envelope?: Envelope;
  readonly logFormat: string;
  readonly logArguments: any[];
};

export type Fact =
  | DispatchCycleBegun
  | DispatchCycleCompleted
  | DispatchBegun
  | DispatchCompleted
  | HandlingBegun
  | HandlingCompleted
  | HandlingSkipped
  | CommandDeduplicated
  | TickCycleBegun
  | TickCycleCompleted
  | TickBegun
  | TickCompleted
  | TickSkipped
  | AggregateInstanceLoaded
  | AggregateInstanceNotFound
  | AggregateInstanceCreated
  | EventRecordedByAggregate
  | MessageLoggedByAggregate
  | ProcessInstanceLoaded
  | ProcessEventIgnored
  | ProcessEventRoutedToEndedInstance
  | ProcessDeadlineRoutedToEndedInstance
  | ProcessInstanceNotFound
  | ProcessInstanceBegun
  | ProcessInstanceEnded
  | CommandExecutedByProcess
  | DeadlineScheduledByProcess
  | MessageLoggedByProcess
  | EventRecordedByIntegration
  | MessageLoggedByIntegration
  | ProjectionCompactionBegun
  | ProjectionCompactionCompleted
  | MessageLoggedByProjection;

export type Observer = {
  notify(f: Fact): void;
};

export function createObserverGroup(observers: Observer[]): Observer {
  return {
    notify(f: Fact) {
      for (const o of observers) {
        o.notify(f);
      }
    },
  };
}

export type Buffer = Observer & {
  facts(): Fact[];
};

export function createBuffer(): Buffer {
  const list: Fact[] = [];
  return {
    notify(f: Fact) {
      list.push(f);
    },
    facts(): Fact[] {
      return [...list];
    },
  };
}

export const Ignore: Observer = {
  notify(_f: Fact) {},
};

function formatMessageID(id: string | undefined): string {
  if (!id) return "--";
  return id.padStart(2, "0");
}

function formatEnabledHandlers(
  byType: Map<HandlerType, boolean>,
  byName: Map<string, boolean>,
): string {
  let s = "";
  for (const ht of handlerTypes()) {
    if (byType.get(ht)) {
      s += ` +${ht}s`;
    }
  }
  const sorted = [...byName.keys()].sort();
  for (const n of sorted) {
    s += byName.get(n) ? ` +${n}` : ` -${n}`;
  }
  return `enabled:${s}`;
}

function formatLine(
  env: Envelope | undefined,
  icons: [string, string, string],
  ...text: string[]
): string {
  const mid = formatMessageID(env?.messageID);
  const cid = formatMessageID(env?.causationID);
  const rid = formatMessageID(env?.correlationID);
  const filtered = text.filter((t) => t !== "");
  const iconStr = icons.map((ic) => ic || " ").join(" ");
  return `═ ${mid} ◄ ${cid} ▲ ${rid}  ${iconStr}  ${filtered.join(" ● ")}`;
}

// newLogger returns a new observer that logs human-readable descriptions of
// facts to the given log function.
export function newLogger(logFn: (msg: string) => void): Observer {
  return {
    notify(f: Fact) {
      switch (f.kind) {
        case "DispatchCycleBegun":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "⚙️", ""],
              "dispatching",
              f.engineTime.toISOString(),
              formatEnabledHandlers(f.enabledHandlerTypes, f.enabledHandlers),
            ),
          );
          break;
        case "DispatchBegun": {
          const mt = typeOf(f.envelope.message);
          logFn(
            formatLine(
              f.envelope,
              ["▼", "⚙️", ""],
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              describeMessage(f.envelope.message),
            ),
          );
          break;
        }
        case "CommandDeduplicated": {
          const mt = typeOf(f.envelope.message);
          logFn(
            formatLine(
              f.envelope,
              ["↻", "⚙️", ""],
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              `command ignored because its idempotency key ${JSON.stringify(f.key)} has already been used`,
            ),
          );
          break;
        }
        case "HandlingCompleted":
          if (f.error) {
            logFn(
              formatLine(
                f.envelope,
                ["✕", "⚙️", "✖"],
                f.handler.identity().name,
                f.error.message,
              ),
            );
          }
          break;
        case "AggregateInstanceLoaded":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "📦", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeAggregateInstance(f.handler.interface(), f.root),
              "loaded an existing instance",
            ),
          );
          break;
        case "AggregateInstanceNotFound":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "📦", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              "instance does not yet exist",
            ),
          );
          break;
        case "AggregateInstanceCreated":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "📦", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeAggregateInstance(f.handler.interface(), f.root),
              "instance created",
            ),
          );
          break;
        case "EventRecordedByAggregate": {
          const mt = typeOf(f.eventEnvelope.message);
          logFn(
            formatLine(
              f.eventEnvelope,
              ["▲", "📦", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeAggregateInstance(f.handler.interface(), f.root),
              "recorded an event",
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              describeMessage(f.eventEnvelope.message),
            ),
          );
          break;
        }
        case "MessageLoggedByAggregate":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "📦", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeAggregateInstance(f.handler.interface(), f.root),
              util.format(f.logFormat, ...f.logArguments),
            ),
          );
          break;
        case "ProcessInstanceBegun":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "⚙️", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeProcessInstance(f.handler.interface(), f.root, false),
              "instance begun",
            ),
          );
          break;
        case "ProcessInstanceEnded":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "⚙️", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeProcessInstance(f.handler.interface(), f.root, true),
              "instance ended",
            ),
          );
          break;
        case "CommandExecutedByProcess": {
          const mt = typeOf(f.commandEnvelope.message);
          logFn(
            formatLine(
              f.commandEnvelope,
              ["▲", "⚙️", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeProcessInstance(f.handler.interface(), f.root, false),
              "executed a command",
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              describeMessage(f.commandEnvelope.message),
            ),
          );
          break;
        }
        case "DeadlineScheduledByProcess": {
          const mt = typeOf(f.deadlineEnvelope.message);
          logFn(
            formatLine(
              f.deadlineEnvelope,
              ["▲", "⚙️", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeProcessInstance(f.handler.interface(), f.root, false),
              `scheduled a deadline for ${f.deadlineEnvelope.scheduledFor?.toISOString()}`,
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              describeMessage(f.deadlineEnvelope.message),
            ),
          );
          break;
        }
        case "MessageLoggedByProcess":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "⚙️", ""],
              `${f.handler.identity().name} ${f.instanceID}`,
              describeProcessInstance(f.handler.interface(), f.root, f.ended),
              util.format(f.logFormat, ...f.logArguments),
            ),
          );
          break;
        case "EventRecordedByIntegration": {
          const mt = typeOf(f.eventEnvelope.message);
          logFn(
            formatLine(
              f.eventEnvelope,
              ["▲", "🔌", ""],
              f.handler.identity().name,
              "recorded an event",
              `${mt.toString()}${kindSymbol(mt.kind)}`,
              describeMessage(f.eventEnvelope.message),
            ),
          );
          break;
        }
        case "MessageLoggedByIntegration":
          logFn(
            formatLine(
              f.envelope,
              ["▼", "🔌", ""],
              f.handler.identity().name,
              util.format(f.logFormat, ...f.logArguments),
            ),
          );
          break;
        case "MessageLoggedByProjection":
          logFn(
            formatLine(
              f.envelope,
              [f.envelope ? "▼" : "", "📊", ""],
              f.handler.identity().name,
              util.format(f.logFormat, ...f.logArguments),
            ),
          );
          break;
      }
    },
  };
}
