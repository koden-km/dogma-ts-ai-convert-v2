import util from "node:util";
import {
  type AggregateCommandScope,
  type AggregateRoot,
  applyAggregateEvent,
  backgroundContext,
  type Command,
  type CommandExecutor as DogmaCommandExecutor,
  type Context,
  type Deadline,
  type Event,
  EventObserverNotSatisfiedError,
  type ExecuteCommandOption,
  type IntegrationCommandScope,
  type Message,
  NotSupportedError,
  type ProcessDeadlineScope,
  type ProcessEventScope,
  type ProcessRoot,
  type ProjectionCompactScope,
  type ProjectionEventScope,
  registeredMessageTypeOf,
  UnexpectedMessageError,
  validateMessage,
} from "@/dogma/index.ts";
import {
  type Aggregate,
  AggregateHandlerType,
  type Application,
  DeadlineKind,
  filterByMessageDirection,
  type Handler,
  type HandlerType,
  hasDirection,
  InboundDirection,
  type Integration,
  IntegrationHandlerType,
  OutboundDirection,
  type Process,
  ProcessHandlerType,
  type Projection,
  ProjectionHandlerType,
  switchByHandlerTypeOf,
  type Type,
  typeOf,
} from "@/enginekit/index.ts";
import {
  createMessageIDGenerator,
  deriveUUID,
  type Envelope,
  type MessageIDGenerator,
  newCommandEnvelope,
  newEventEnvelope,
} from "../envelope/index.ts";
import {
  createObserverGroup,
  type Fact,
  type HandlerSkipReason,
  HandlerTypeDisabled,
  IndividualHandlerDisabled,
  IndividualHandlerDisabledByConfiguration,
  type Observer,
} from "../fact/index.ts";

type MaybePromise<T> = T | Promise<T>;

function isPromise<T>(v: MaybePromise<T>): v is Promise<T> {
  return (
    v instanceof Promise ||
    (typeof v === "object" && v !== null && typeof (v as any).then === "function")
  );
}

function maybeThen<T, U>(
  v: MaybePromise<T>,
  fn: (val: T) => MaybePromise<U>,
): MaybePromise<U> {
  if (isPromise(v)) {
    return v.then(fn);
  }
  return fn(v);
}

function maybeCatch<T>(
  fn: () => MaybePromise<T>,
  onError: (err: Error) => MaybePromise<T>,
): MaybePromise<T> {
  try {
    const res = fn();
    if (isPromise(res)) {
      return res.catch((e) => onError(e instanceof Error ? e : new Error(String(e))));
    }
    return res;
  } catch (e) {
    return onError(e instanceof Error ? e : new Error(String(e)));
  }
}

function stripFunctions(obj: unknown): unknown {
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
    return obj.map(stripFunctions);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== "function") {
      out[k] = stripFunctions(v);
    }
  }
  return out;
}

function equalRootState(a: unknown, b: unknown): boolean {
  return util.isDeepStrictEqual(stripFunctions(a), stripFunctions(b));
}

function cloneDataInto(target: Record<string, any>, source: Record<string, any>): void {
  const cloned = structuredClone(stripFunctions(source)) as Record<string, any>;
  for (const k of Object.keys(target)) {
    if (typeof target[k] !== "function" && !(k in cloned)) {
      delete target[k];
    }
  }
  for (const [k, v] of Object.entries(cloned)) {
    target[k] = v;
  }
}

function enrichUnexpectedMessage<T>(
  handler: Handler,
  iface: string,
  method: string,
  message: Message,
  fn: () => T,
): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof UnexpectedMessageError) {
      const mt = typeOf(message);
      throw new Error(
        `unexpected ${mt.toString()} ${mt.kind} handled by ${handler.identity().name} (${iface}.${method})`,
      );
    }
    throw err;
  }
}

type Controller = {
  handlerConfig(): Handler;
  tick(
    ctx: Context,
    obs: Observer,
    now: Date,
  ): MaybePromise<{ envelopes: Envelope[]; error?: Error }>;
  handle(
    ctx: Context,
    obs: Observer,
    now: Date,
    env: Envelope,
  ): MaybePromise<{ envelopes: Envelope[]; error?: Error }>;
  reset(): void;
};

type AggregateInstance = {
  history: Envelope[];
  snapshotted: boolean;
  snapshot: string | Uint8Array | undefined;
  snapshotOffset: number;
};

function createAggregateController(
  config: Aggregate,
  messageIDs: MessageIDGenerator,
): Controller {
  let instances = new Map<string, AggregateInstance>();
  const handler = config.handler!;

  function marshalAggregate(root: AggregateRoot): {
    supported: boolean;
    data?: string | Uint8Array;
  } {
    try {
      if (typeof handler.marshal === "function") {
        return { supported: true, data: handler.marshal(root) };
      }
      return { supported: false };
    } catch (err) {
      if (err instanceof NotSupportedError) {
        return { supported: false };
      }
      throw err;
    }
  }

  function unmarshalAggregate(
    root: AggregateRoot,
    data: string | Uint8Array,
  ): void {
    handler.unmarshal?.(root, data);
  }

  return {
    handlerConfig(): Handler {
      return config;
    },

    tick(): { envelopes: Envelope[] } {
      return { envelopes: [] };
    },

    handle(
      _ctx: Context,
      obs: Observer,
      now: Date,
      env: Envelope,
    ): { envelopes: Envelope[]; error?: Error } {
      const mt = typeOf(env.message);
      if (!hasDirection(config.routeSet().directionOf(mt), InboundDirection)) {
        throw new Error(
          `${config.identity().toString()} does not handle ${mt.toString()} messages`,
        );
      }

      const id = enrichUnexpectedMessage(
        config,
        "AggregateMessageHandler",
        "routeCommandToInstance",
        env.message,
        () => handler.routeCommandToInstance(env.message as Command),
      );

      if (!id) {
        throw new Error(
          `${config.identity().name}: routed a command of type ${mt.toString()} to an empty ID`,
        );
      }

      const root = handler.newRoot();
      const shadowRoot = handler.newRoot();

      if (!root || !shadowRoot) {
        throw new Error(
          `${config.identity().name}: newRoot() returned a nil aggregate root`,
        );
      }

      let inst = instances.get(id);
      if (!inst) {
        obs.notify({
          kind: "AggregateInstanceNotFound",
          handler: config,
          instanceID: id,
          envelope: env,
        });
        inst = {
          history: [],
          snapshotted: false,
          snapshot: undefined,
          snapshotOffset: 0,
        };
      } else {
        for (const ev of inst.history) {
          enrichUnexpectedMessage(
            config,
            "AggregateRoot",
            "applyEvent",
            ev.message,
            () => applyAggregateEvent(handler, shadowRoot, ev.message as Event),
          );
        }

        if (inst.snapshotted && inst.snapshot !== undefined) {
          unmarshalAggregate(root, inst.snapshot);
        }

        for (const ev of inst.history.slice(inst.snapshotOffset)) {
          enrichUnexpectedMessage(
            config,
            "AggregateRoot",
            "applyEvent",
            ev.message,
            () => applyAggregateEvent(handler, root, ev.message as Event),
          );
        }

        obs.notify({
          kind: "AggregateInstanceLoaded",
          handler: config,
          instanceID: id,
          root,
          envelope: env,
          snapshotOffset: inst.snapshotOffset,
        });
      }

      if (inst.snapshotted && !equalRootState(root, shadowRoot)) {
        throw new Error(
          `${config.identity().name}: aggregate root state differs when built from events versus snapshot`,
        );
      }

      const events: Envelope[] = [];
      const streamID = deriveUUID(config.identity().key, id);
      let offset = BigInt(inst.history.length);
      let lastOp = "";

      const guardAgainstDirectMutation = (method: string) => {
        const thisOp = method ? `call to ${method}()` : "";
        if (!equalRootState(root, shadowRoot)) {
          let desc = "modified the aggregate root outside of applyEvent()";
          if (lastOp && thisOp) {
            desc += `, between ${lastOp} and ${thisOp}`;
          } else if (lastOp) {
            desc += `, after ${lastOp}`;
          } else if (thisOp) {
            desc += `, before ${thisOp}`;
          }
          throw new Error(`${config.identity().name}: ${desc}`);
        }
        lastOp = thisOp;
      };

      const scope: AggregateCommandScope = {
        instanceID(): string {
          guardAgainstDirectMutation("instanceID");
          return id;
        },
        recordEvent(m: Event): void {
          guardAgainstDirectMutation("recordEvent");
          const emt = typeOf(m);
          if (!hasDirection(config.routeSet().directionOf(emt), OutboundDirection)) {
            throw new Error(
              `${config.identity().name}: recorded an event of type ${emt.toString()}, which is not produced by this handler`,
            );
          }

          try {
            validateMessage(m);
          } catch (err) {
            throw new Error(
              `${config.identity().name}: recorded an invalid ${emt.toString()} event: ${(err as Error).message}`,
            );
          }

          if (offset === 0n) {
            obs.notify({
              kind: "AggregateInstanceCreated",
              handler: config,
              instanceID: id,
              root,
              envelope: env,
            });
          }

          enrichUnexpectedMessage(config, "AggregateRoot", "applyEvent", m, () =>
            applyAggregateEvent(handler, root, m),
          );
          enrichUnexpectedMessage(config, "AggregateRoot", "applyEvent", m, () =>
            applyAggregateEvent(handler, shadowRoot, m),
          );

          if (!equalRootState(root, shadowRoot)) {
            throw new Error(
              `${config.identity().name}: non-deterministic implementation of applyEvent detected`,
            );
          }

          const eventEnv = env.newEvent(
            messageIDs.next(),
            m,
            now,
            {
              handler: config,
              handlerType: AggregateHandlerType,
              instanceID: id,
            },
            streamID,
            offset,
          );

          events.push(eventEnv);
          offset++;

          obs.notify({
            kind: "EventRecordedByAggregate",
            handler: config,
            instanceID: id,
            root,
            envelope: env,
            eventEnvelope: eventEnv,
          });
        },
        now(): Date {
          guardAgainstDirectMutation("now");
          return new Date(now.getTime());
        },
        log(format: string, ...args: any[]): void {
          guardAgainstDirectMutation("log");
          obs.notify({
            kind: "MessageLoggedByAggregate",
            handler: config,
            instanceID: id,
            root,
            envelope: env,
            logFormat: format,
            logArguments: args,
          });
        },
      };

      enrichUnexpectedMessage(
        config,
        "AggregateMessageHandler",
        "handleCommand",
        env.message,
        () => handler.handleCommand(root, scope, env.message as Command),
      );

      guardAgainstDirectMutation("");

      if (events.length > 0) {
        instances.set(id, inst);
        inst.history.push(...events);
        const snap = marshalAggregate(root);
        if (snap.supported) {
          inst.snapshotted = true;
          inst.snapshot = snap.data;
          inst.snapshotOffset = inst.history.length;
        }
      }

      return { envelopes: events };
    },

    reset(): void {
      instances = new Map();
    },
  };
}

type ProcessInstance = {
  mutated: boolean;
  serialized?: string | Uint8Array;
  clonedData?: Record<string, any>;
  ended: boolean;
};

function createProcessController(
  config: Process,
  messageIDs: MessageIDGenerator,
): Controller {
  let instances = new Map<string, ProcessInstance>();
  let deadlines: Envelope[] = [];
  const handler = config.handler!;

  function saveProcessState(
    root: ProcessRoot,
    inst: ProcessInstance,
  ): void {
    if (typeof handler.marshal === "function") {
      inst.serialized = handler.marshal(root);
      inst.mutated = true;
      return;
    }
    inst.clonedData = structuredClone(
      stripFunctions(root),
    ) as Record<string, any>;
    inst.mutated = true;
  }

  function restoreProcessState(
    root: ProcessRoot,
    inst: ProcessInstance,
  ): void {
    if (!inst.mutated) return;
    if (inst.serialized !== undefined) {
      handler.unmarshal?.(root, inst.serialized);
      return;
    }
    if (inst.clonedData !== undefined) {
      cloneDataInto(root, inst.clonedData);
    }
  }

  function cancelDeadlines(id: string): void {
    deadlines = deadlines.filter((d) => d.origin?.instanceID !== id);
  }

  return {
    handlerConfig(): Handler {
      return config;
    },

    tick(
      _ctx: Context,
      _obs: Observer,
      now: Date,
    ): { envelopes: Envelope[] } {
      let i = 0;
      for (const env of deadlines) {
        if (env.scheduledFor!.getTime() > now.getTime()) {
          break;
        }
        i++;
      }
      const ready = deadlines.slice(0, i);
      deadlines = deadlines.slice(i);
      return { envelopes: ready };
    },

    handle(
      ctx: Context,
      obs: Observer,
      now: Date,
      env: Envelope,
    ): MaybePromise<{ envelopes: Envelope[]; error?: Error }> {
      const mt = typeOf(env.message);
      if (!hasDirection(config.routeSet().directionOf(mt), InboundDirection)) {
        throw new Error(
          `${config.identity().toString()} does not handle ${mt.toString()} messages`,
        );
      }

      const routeMessage = (): MaybePromise<{
        id: string;
        ok: boolean;
        error?: Error;
      }> => {
        if (mt.kind === DeadlineKind) {
          const id = env.origin?.instanceID ?? "";
          const inst = instances.get(id);
          if (inst && !inst.ended) {
            return { id, ok: true };
          }
          obs.notify({
            kind: "ProcessDeadlineRoutedToEndedInstance",
            handler: config,
            instanceID: id,
            envelope: env,
          });
          return { id: "", ok: false };
        }

        const m = env.message as Event;
        return maybeCatch(
          () =>
            maybeThen(
              enrichUnexpectedMessage(
                config,
                "ProcessMessageHandler",
                "routeEventToInstance",
                m,
                () => handler.routeEventToInstance(ctx, m),
              ),
              (res) => {
                let id = "";
                let ok = false;
                if (Array.isArray(res)) {
                  [id, ok] = res;
                } else if (typeof res === "string") {
                  id = res;
                  ok = true;
                }

                if (!ok) {
                  obs.notify({
                    kind: "ProcessEventIgnored",
                    handler: config,
                    envelope: env,
                  });
                  return { id: "", ok: false };
                }

                if (!id) {
                  throw new Error(
                    `${config.identity().name}: routed an event of type ${mt.toString()} to an empty ID`,
                  );
                }

                const inst = instances.get(id);
                if (inst && inst.ended) {
                  obs.notify({
                    kind: "ProcessEventRoutedToEndedInstance",
                    handler: config,
                    instanceID: id,
                    envelope: env,
                  });
                  return { id: "", ok: false };
                }

                return { id, ok: true };
              },
            ),
          (error) => ({ id: "", ok: false, error }),
        );
      };

      return maybeThen(routeMessage(), (routed) => {
        if (routed.error) {
          return { envelopes: [], error: routed.error };
        }
        if (!routed.ok) {
          return { envelopes: [] };
        }

        const id = routed.id;
        const root = handler.newRoot();
        const shadowRoot = handler.newRoot();

        if (!root || !shadowRoot) {
          throw new Error(
            `${config.identity().name}: newRoot() returned a nil process root`,
          );
        }

        let inst = instances.get(id);
        if (!inst) {
          obs.notify({
            kind: "ProcessInstanceNotFound",
            handler: config,
            instanceID: id,
            envelope: env,
          });
          inst = { mutated: false, ended: false };
          instances.set(id, inst);
          obs.notify({
            kind: "ProcessInstanceBegun",
            handler: config,
            instanceID: id,
            root,
            envelope: env,
          });
        } else {
          restoreProcessState(root, inst);
          restoreProcessState(shadowRoot, inst);
          obs.notify({
            kind: "ProcessInstanceLoaded",
            handler: config,
            instanceID: id,
            root,
            envelope: env,
          });
        }

        const handleMethod =
          mt.kind === DeadlineKind ? "handleDeadline" : "handleEvent";
        let mutated = false;
        let lastOp = "";
        const commands: Envelope[] = [];
        const ready: Envelope[] = [];
        const pending: Envelope[] = [];

        const guardAgainstDirectMutation = (method: string) => {
          const thisOp = method ? `call to ${method}()` : "";
          if (!equalRootState(root, shadowRoot)) {
            let desc = "modified the process root outside of mutate()";
            if (lastOp && thisOp) {
              desc += `, between ${lastOp} and ${thisOp}`;
            } else if (lastOp) {
              desc += `, after ${lastOp}`;
            } else if (thisOp) {
              desc += `, before ${thisOp}`;
            }
            throw new Error(`${config.identity().name}: ${desc}`);
          }
          lastOp = thisOp;
        };

        const scope: ProcessEventScope & ProcessDeadlineScope = {
          instanceID(): string {
            guardAgainstDirectMutation("instanceID");
            return id;
          },
          end(): void {
            guardAgainstDirectMutation("end");
            if (inst!.ended) {
              return;
            }
            inst!.ended = true;
            obs.notify({
              kind: "ProcessInstanceEnded",
              handler: config,
              instanceID: id,
              root,
              envelope: env,
            });
          },
          mutate(fn: (r: ProcessRoot) => void): void {
            guardAgainstDirectMutation("mutate");
            if (inst!.ended) {
              throw new Error(
                `${config.identity().name}: mutated an ended process instance`,
              );
            }
            mutated = true;
            fn(root);
            fn(shadowRoot);
            if (!equalRootState(root, shadowRoot)) {
              throw new Error(
                `${config.identity().name}: non-deterministic implementation of mutate() callback detected`,
              );
            }
          },
          executeCommand(m: Command): void {
            guardAgainstDirectMutation("executeCommand");
            const cmt = typeOf(m);
            if (!hasDirection(config.routeSet().directionOf(cmt), OutboundDirection)) {
              throw new Error(
                `${config.identity().name}: executed a command of type ${cmt.toString()}, which is not produced by this handler`,
              );
            }
            if (inst!.ended) {
              throw new Error(
                `${config.identity().name}: executed a command of type ${cmt.toString()} on an ended process`,
              );
            }
            try {
              validateMessage(m);
            } catch (err) {
              throw new Error(
                `${config.identity().name}: executed an invalid ${cmt.toString()} command: ${(err as Error).message}`,
              );
            }

            const cmdEnv = env.newCommand(messageIDs.next(), m, now, {
              handler: config,
              handlerType: ProcessHandlerType,
              instanceID: id,
            });
            commands.push(cmdEnv);

            obs.notify({
              kind: "CommandExecutedByProcess",
              handler: config,
              instanceID: id,
              root,
              envelope: env,
              commandEnvelope: cmdEnv,
            });
          },
          scheduleDeadline(m: Deadline, t: Date): void {
            guardAgainstDirectMutation("scheduleDeadline");
            const dmt = typeOf(m);
            if (!hasDirection(config.routeSet().directionOf(dmt), OutboundDirection)) {
              throw new Error(
                `${config.identity().name}: scheduled a deadline of type ${dmt.toString()}, which is not produced by this handler`,
              );
            }
            if (inst!.ended) {
              throw new Error(
                `${config.identity().name}: scheduled a deadline of type ${dmt.toString()} on an ended process`,
              );
            }
            try {
              validateMessage(m);
            } catch (err) {
              throw new Error(
                `${config.identity().name}: scheduled an invalid ${dmt.toString()} deadline: ${(err as Error).message}`,
              );
            }

            const dlEnv = env.newDeadline(messageIDs.next(), m, now, t, {
              handler: config,
              handlerType: ProcessHandlerType,
              instanceID: id,
            });

            if (t.getTime() > now.getTime()) {
              pending.push(dlEnv);
            } else {
              ready.push(dlEnv);
            }

            obs.notify({
              kind: "DeadlineScheduledByProcess",
              handler: config,
              instanceID: id,
              root,
              envelope: env,
              deadlineEnvelope: dlEnv,
            });
          },
          recordedAt(): Date {
            guardAgainstDirectMutation("recordedAt");
            return new Date(env.createdAt.getTime());
          },
          scheduledFor(): Date {
            guardAgainstDirectMutation("scheduledFor");
            return new Date(env.scheduledFor!.getTime());
          },
          now(): Date {
            guardAgainstDirectMutation("now");
            return new Date(now.getTime());
          },
          log(format: string, ...args: any[]): void {
            guardAgainstDirectMutation("log");
            obs.notify({
              kind: "MessageLoggedByProcess",
              handler: config,
              instanceID: id,
              root,
              ended: inst!.ended,
              envelope: env,
              logFormat: format,
              logArguments: args,
            });
          },
        };

        const invokeHandler = (): MaybePromise<Error | undefined> =>
          maybeCatch(
            () =>
              maybeThen(
                enrichUnexpectedMessage(
                  config,
                  "ProcessMessageHandler",
                  handleMethod,
                  env.message,
                  () =>
                    mt.kind === DeadlineKind
                      ? handler.handleDeadline(
                          ctx,
                          root,
                          scope,
                          env.message as Deadline,
                        )
                      : handler.handleEvent(
                          ctx,
                          root,
                          scope,
                          env.message as Event,
                        ),
                ),
                () => undefined,
              ),
            (err) => {
              if (
                err.message.startsWith("unexpected ") &&
                err.message.includes("ProcessMessageHandler.")
              ) {
                throw err;
              }
              return err;
            },
          );

        return maybeThen(invokeHandler(), (err) => {
          guardAgainstDirectMutation("");

          if (err) {
            return { envelopes: [], error: err };
          }

          if (inst!.ended) {
            cancelDeadlines(id);
            return { envelopes: commands };
          }

          if (mutated) {
            saveProcessState(root, inst!);
          }

          if (pending.length > 0) {
            deadlines.push(...pending);
            deadlines.sort(
              (a, b) =>
                a.scheduledFor!.getTime() - b.scheduledFor!.getTime(),
            );
          }

          return { envelopes: [...commands, ...ready] };
        });
      });
    },

    reset(): void {
      instances = new Map();
      deadlines = [];
    },
  };
}

function createIntegrationController(
  config: Integration,
  messageIDs: MessageIDGenerator,
): Controller {
  let offset = 0n;
  const handler = config.handler!;

  return {
    handlerConfig(): Handler {
      return config;
    },

    tick(): { envelopes: Envelope[] } {
      return { envelopes: [] };
    },

    handle(
      ctx: Context,
      obs: Observer,
      now: Date,
      env: Envelope,
    ): MaybePromise<{ envelopes: Envelope[]; error?: Error }> {
      const mt = typeOf(env.message);
      if (!hasDirection(config.routeSet().directionOf(mt), InboundDirection)) {
        throw new Error(
          `${config.identity().toString()} does not handle ${mt.toString()} messages`,
        );
      }

      const events: Envelope[] = [];
      const streamID = config.identity().key;
      let currentOffset = offset;

      const scope: IntegrationCommandScope = {
        recordEvent(m: Event): void {
          const emt = typeOf(m);
          if (!hasDirection(config.routeSet().directionOf(emt), OutboundDirection)) {
            throw new Error(
              `${config.identity().name}: recorded an event of type ${emt.toString()}, which is not produced by this handler`,
            );
          }

          try {
            validateMessage(m);
          } catch (err) {
            throw new Error(
              `${config.identity().name}: recorded an invalid ${emt.toString()} event: ${(err as Error).message}`,
            );
          }

          const eventEnv = env.newEvent(
            messageIDs.next(),
            m,
            now,
            {
              handler: config,
              handlerType: IntegrationHandlerType,
              instanceID: "",
            },
            streamID,
            currentOffset,
          );

          events.push(eventEnv);
          currentOffset++;

          obs.notify({
            kind: "EventRecordedByIntegration",
            handler: config,
            envelope: env,
            eventEnvelope: eventEnv,
          });
        },
        now(): Date {
          return new Date(now.getTime());
        },
        log(format: string, ...args: any[]): void {
          obs.notify({
            kind: "MessageLoggedByIntegration",
            handler: config,
            envelope: env,
            logFormat: format,
            logArguments: args,
          });
        },
      };

      const invokeHandler = (): MaybePromise<Error | undefined> =>
        maybeCatch(
          () =>
            maybeThen(
              enrichUnexpectedMessage(
                config,
                "IntegrationMessageHandler",
                "handleCommand",
                env.message,
                () =>
                  handler.handleCommand(ctx, scope, env.message as Command),
              ),
              () => undefined,
            ),
          (err) => {
            if (
              err.message.startsWith("unexpected ") &&
              err.message.includes("IntegrationMessageHandler.")
            ) {
              throw err;
            }
            return err;
          },
        );

      return maybeThen(invokeHandler(), (err) => {
        if (!err) {
          offset = currentOffset;
        }
        return { envelopes: events, error: err };
      });
    },

    reset(): void {},
  };
}

export const CompactIntervalMs = 60 * 60 * 1000; // 1 hour

function createProjectionController(
  config: Projection,
  compactDuringHandling: boolean,
): Controller {
  let lastCompact = new Date(0);
  const handler = config.handler!;

  return {
    handlerConfig(): Handler {
      return config;
    },

    tick(
      ctx: Context,
      obs: Observer,
      now: Date,
    ): MaybePromise<{ envelopes: Envelope[]; error?: Error }> {
      if (now.getTime() - lastCompact.getTime() >= CompactIntervalMs) {
        lastCompact = new Date(now.getTime());

        obs.notify({
          kind: "ProjectionCompactionBegun",
          handler: config,
        });

        const scope: ProjectionCompactScope = {
          now(): Date {
            return new Date(now.getTime());
          },
          log(format: string, ...args: any[]): void {
            obs.notify({
              kind: "MessageLoggedByProjection",
              handler: config,
              logFormat: format,
              logArguments: args,
            });
          },
        };

        return maybeThen(
          maybeCatch(
            () => maybeThen(handler.compact(ctx, scope), () => undefined),
            (err) => err,
          ),
          (err) => {
            obs.notify({
              kind: "ProjectionCompactionCompleted",
              handler: config,
              error: err,
            });
            return { envelopes: [], error: err };
          },
        );
      }

      return { envelopes: [] };
    },

    handle(
      ctx: Context,
      obs: Observer,
      now: Date,
      env: Envelope,
    ): MaybePromise<{ envelopes: Envelope[]; error?: Error }> {
      const mt = typeOf(env.message);
      if (!hasDirection(config.routeSet().directionOf(mt), InboundDirection)) {
        throw new Error(
          `${config.identity().toString()} does not handle ${mt.toString()} messages`,
        );
      }

      return maybeThen(
        maybeCatch<{ cp: bigint; error: Error | undefined }>(
          () =>
            maybeThen(
              handler.checkpointOffset(ctx, env.eventStreamID),
              (cp) => ({ cp, error: undefined }),
            ),
          (error) => ({ cp: 0n, error }),
        ),
        (cpRes) => {
          if (cpRes.error) {
            return { envelopes: [], error: cpRes.error };
          }

          if (cpRes.cp > env.eventStreamOffset) {
            return { envelopes: [] };
          }

          const eventScope: ProjectionEventScope = {
            recordedAt(): Date {
              return new Date(env.createdAt.getTime());
            },
            streamID(): string {
              return env.eventStreamID;
            },
            offset(): bigint {
              return env.eventStreamOffset;
            },
            checkpointOffset(): bigint {
              return cpRes.cp;
            },
            now(): Date {
              return new Date(now.getTime());
            },
            log(format: string, ...args: any[]): void {
              obs.notify({
                kind: "MessageLoggedByProjection",
                handler: config,
                envelope: env,
                logFormat: format,
                logArguments: args,
              });
            },
          };

          const runCompactIfEnabled = (): MaybePromise<Error | undefined> => {
            if (!compactDuringHandling) {
              return undefined;
            }
            obs.notify({
              kind: "ProjectionCompactionBegun",
              handler: config,
            });
            const compactScope: ProjectionCompactScope = {
              now(): Date {
                return new Date(now.getTime());
              },
              log(format: string, ...args: any[]): void {
                obs.notify({
                  kind: "MessageLoggedByProjection",
                  handler: config,
                  logFormat: format,
                  logArguments: args,
                });
              },
            };
            return maybeThen(
              maybeCatch(
                () =>
                  maybeThen(handler.compact(ctx, compactScope), () => undefined),
                (err) => err,
              ),
              (compactErr) => {
                obs.notify({
                  kind: "ProjectionCompactionCompleted",
                  handler: config,
                  error: compactErr,
                });
                return compactErr;
              },
            );
          };

          return maybeThen(runCompactIfEnabled(), (compactErr) =>
            maybeThen(
              maybeCatch<{ newCp: bigint; error: Error | undefined }>(
                () =>
                  maybeThen(
                    enrichUnexpectedMessage(
                      config,
                      "ProjectionMessageHandler",
                      "handleEvent",
                      env.message,
                      () =>
                        handler.handleEvent(
                          ctx,
                          eventScope,
                          env.message as Event,
                        ),
                    ),
                    (newCp) => ({ newCp, error: undefined }),
                  ),
                (err) => {
                  if (
                    err.message.startsWith("unexpected ") &&
                    err.message.includes("ProjectionMessageHandler.")
                  ) {
                    throw err;
                  }
                  return { newCp: 0n, error: err };
                },
              ),
              (handleRes) => {
                if (handleRes.error) {
                  return { envelopes: [], error: handleRes.error };
                }

                const expectCp = env.eventStreamOffset + 1n;
                if (handleRes.newCp !== expectCp) {
                  return {
                    envelopes: [],
                    error: new Error(
                      `optimistic concurrency conflict when handling event at offset ${env.eventStreamOffset} of stream ${env.eventStreamID}: expected checkpoint offset of ${expectCp}, handler returned ${handleRes.newCp}`,
                    ),
                  };
                }

                return { envelopes: [], error: compactErr };
              },
            ),
          );
        },
      );
    },

    reset(): void {},
  };
}

export type EngineOptions = {
  resetters: Array<() => void>;
  compactDuringHandling: boolean;
};

export type Option = (opts: EngineOptions) => void;

export function withResetter(fn: () => void): Option {
  if (!fn) {
    throw new Error("fn must not be nil");
  }
  return (opts) => {
    opts.resetters.push(fn);
  };
}

export function enableProjectionCompactionDuringHandling(
  enabled: boolean,
): Option {
  return (opts) => {
    opts.compactDuringHandling = enabled;
  };
}

export type OperationOptions = {
  now: Date;
  observers: Observer[];
  enabledHandlerTypes: Map<HandlerType, boolean>;
  enabledHandlers: Map<string, boolean>;
  idempotencyKey: string;
};

export type OperationOption = (engine: Engine, opts: OperationOptions) => void;

export function withObserver(o: Observer): OperationOption {
  if (!o) {
    throw new Error("observer must not be nil");
  }
  return (_e, oo) => {
    oo.observers.push(o);
  };
}

export function enableAggregates(enabled: boolean): OperationOption {
  return (_e, oo) => {
    oo.enabledHandlerTypes.set(AggregateHandlerType, enabled);
  };
}

export function enableProcesses(enabled: boolean): OperationOption {
  return (_e, oo) => {
    oo.enabledHandlerTypes.set(ProcessHandlerType, enabled);
  };
}

export function enableIntegrations(enabled: boolean): OperationOption {
  return (_e, oo) => {
    oo.enabledHandlerTypes.set(IntegrationHandlerType, enabled);
  };
}

export function enableProjections(enabled: boolean): OperationOption {
  return (_e, oo) => {
    oo.enabledHandlerTypes.set(ProjectionHandlerType, enabled);
  };
}

export function enableHandler(name: string, enabled: boolean): OperationOption {
  return (e, oo) => {
    if (!e.hasHandler(name)) {
      throw new Error(`the application does not have a handler named "${name}"`);
    }
    oo.enabledHandlers.set(name, enabled);
  };
}

export function withCurrentTime(t: Date): OperationOption {
  return (_e, oo) => {
    oo.now = new Date(t.getTime());
  };
}

export function withIdempotencyKey(key: string): OperationOption {
  return (_e, oo) => {
    oo.idempotencyKey = key;
  };
}

export type Engine = {
  hasHandler(name: string): boolean;
  reset(): void;
  tick(
    ctx: Context,
    ...options: OperationOption[]
  ): MaybePromise<Error | undefined>;
  dispatch(
    ctx: Context,
    m: Message,
    ...options: OperationOption[]
  ): MaybePromise<Error | undefined>;
};

export function newEngine(app: Application, ...options: Option[]): Engine {
  const opts: EngineOptions = {
    resetters: [],
    compactDuringHandling: false,
  };
  for (const opt of options) {
    opt(opts);
  }

  const messageIDs = createMessageIDGenerator();
  const controllers = new Map<string, Controller>();
  const routes = new Map<Type, Controller[]>();
  const idempotencyKeys = new Set<string>();

  const registerCtrl = (ctrl: Controller) => {
    const cfg = ctrl.handlerConfig();
    controllers.set(cfg.identity().name, ctrl);
    const inbound = cfg
      .routeSet()
      .filter(filterByMessageDirection(InboundDirection));
    for (const [mt] of inbound.messageTypes()) {
      const existing = routes.get(mt) ?? [];
      existing.push(ctrl);
      routes.set(mt, existing);
    }
  };

  for (const h of app.handlers()) {
    switchByHandlerTypeOf(h, {
      aggregate: (agg) =>
        registerCtrl(createAggregateController(agg, messageIDs)),
      process: (proc) =>
        registerCtrl(createProcessController(proc, messageIDs)),
      integration: (integ) =>
        registerCtrl(createIntegrationController(integ, messageIDs)),
      projection: (proj) =>
        registerCtrl(
          createProjectionController(proj, opts.compactDuringHandling),
        ),
    });
  }

  function skipHandler(
    h: Handler,
    oo: OperationOptions,
  ): { skip: boolean; reason: HandlerSkipReason } {
    const byName = oo.enabledHandlers.get(h.identity().name);
    if (byName !== undefined) {
      return { skip: !byName, reason: IndividualHandlerDisabled };
    }
    if (h.isDisabled()) {
      return {
        skip: true,
        reason: IndividualHandlerDisabledByConfiguration,
      };
    }
    const byType = oo.enabledHandlerTypes.get(h.handlerType()) ?? true;
    return { skip: !byType, reason: HandlerTypeDisabled };
  }

  function appendError(
    existing: Error | undefined,
    next: Error | undefined,
  ): Error | undefined {
    if (!next) return existing;
    if (!existing) return next;
    return new Error(`${existing.message}; ${next.message}`);
  }

  function handleEnvelope(
    ctx: Context,
    oo: OperationOptions,
    obs: Observer,
    env: Envelope,
    ctrl: Controller,
  ): MaybePromise<{ envelopes: Envelope[]; error?: Error }> {
    const { skip, reason } = skipHandler(ctrl.handlerConfig(), oo);
    if (skip) {
      obs.notify({
        kind: "HandlingSkipped",
        handler: ctrl.handlerConfig(),
        envelope: env,
        reason,
      });
      return { envelopes: [] };
    }

    obs.notify({
      kind: "HandlingBegun",
      handler: ctrl.handlerConfig(),
      envelope: env,
    });

    return maybeThen(ctrl.handle(ctx, obs, oo.now, env), (res) => {
      obs.notify({
        kind: "HandlingCompleted",
        handler: ctrl.handlerConfig(),
        envelope: env,
        error: res.error,
      });
      return res;
    });
  }

  function dispatchQueue(
    ctx: Context,
    oo: OperationOptions,
    obs: Observer,
    queue: Envelope[],
  ): MaybePromise<Error | undefined> {
    let totalErr: Error | undefined;

    const processNext = (): MaybePromise<Error | undefined> => {
      if (queue.length === 0) {
        return totalErr;
      }
      if (ctx.signal?.aborted) {
        return new Error("context canceled");
      }

      const env = queue.shift()!;
      const mt = typeOf(env.message);
      let ctrls: Controller[];

      if (mt.kind === DeadlineKind) {
        const originCtrl = controllers.get(
          env.origin!.handler.identity().name,
        );
        ctrls = originCtrl ? [originCtrl] : [];
      } else {
        ctrls = routes.get(mt) ?? [];
      }

      obs.notify({
        kind: "DispatchBegun",
        envelope: env,
      });

      let derr: Error | undefined;
      let ctrlIdx = 0;

      const processCtrls = (): MaybePromise<void> => {
        if (ctrlIdx >= ctrls.length) {
          return;
        }
        const c = ctrls[ctrlIdx++];
        return maybeThen(handleEnvelope(ctx, oo, obs, env, c), (res) => {
          queue.push(...res.envelopes);
          if (res.error) {
            const wrapped = new Error(
              `${c.handlerConfig().identity().name} ${c.handlerConfig().handlerType()}: ${res.error.message}`,
            );
            derr = appendError(derr, wrapped);
          }
          return processCtrls();
        });
      };

      return maybeThen(processCtrls(), () => {
        obs.notify({
          kind: "DispatchCompleted",
          envelope: env,
          error: derr,
        });
        totalErr = appendError(totalErr, derr);
        return processNext();
      });
    };

    return processNext();
  }

  const engine: Engine = {
    hasHandler(name: string): boolean {
      return controllers.has(name);
    },

    reset(): void {
      messageIDs.reset();
      idempotencyKeys.clear();
      for (const c of controllers.values()) {
        c.reset();
      }
      for (const fn of opts.resetters) {
        fn();
      }
    },

    tick(
      ctx: Context,
      ...options: OperationOption[]
    ): MaybePromise<Error | undefined> {
      const oo = buildOperationOptions(engine, options);
      const obs = createObserverGroup(oo.observers);

      obs.notify({
        kind: "TickCycleBegun",
        engineTime: oo.now,
        enabledHandlerTypes: oo.enabledHandlerTypes,
        enabledHandlers: oo.enabledHandlers,
      });

      let err: Error | undefined;
      const queue: Envelope[] = [];
      const ctrlList = [...controllers.values()];
      let idx = 0;

      const tickNext = (): MaybePromise<Error | undefined> => {
        if (idx >= ctrlList.length) {
          return maybeThen(dispatchQueue(ctx, oo, obs, queue), (derr) =>
            appendError(err, derr),
          );
        }
        const c = ctrlList[idx++];
        const { skip, reason } = skipHandler(c.handlerConfig(), oo);
        if (skip) {
          obs.notify({
            kind: "TickSkipped",
            handler: c.handlerConfig(),
            reason,
          });
          return tickNext();
        }

        obs.notify({
          kind: "TickBegun",
          handler: c.handlerConfig(),
        });

        return maybeThen(c.tick(ctx, obs, oo.now), (res) => {
          queue.push(...res.envelopes);
          if (res.error) {
            const wrapped = new Error(
              `${c.handlerConfig().identity().name} ${c.handlerConfig().handlerType()}: ${res.error.message}`,
            );
            err = appendError(err, wrapped);
          }
          obs.notify({
            kind: "TickCompleted",
            handler: c.handlerConfig(),
            error: res.error,
          });
          if (ctx.signal?.aborted) {
            return new Error("context canceled");
          }
          return tickNext();
        });
      };

      return maybeThen(tickNext(), (finalErr) => {
        obs.notify({
          kind: "TickCycleCompleted",
          error: finalErr,
          enabledHandlerTypes: oo.enabledHandlerTypes,
          enabledHandlers: oo.enabledHandlers,
        });
        return finalErr;
      });
    },

    dispatch(
      ctx: Context,
      m: Message,
      ...options: OperationOption[]
    ): MaybePromise<Error | undefined> {
      const mt = typeOf(m);
      const id = messageIDs.next();
      const oo = buildOperationOptions(engine, options);
      const obs = createObserverGroup(oo.observers);

      let env: Envelope | undefined;
      switch (mt.kind) {
        case "command": {
          const cmd = m as Command;
          try {
            validateMessage(cmd);
          } catch (err) {
            throw new Error(
              `cannot dispatch invalid ${mt.toString()} message: ${(err as Error).message}`,
            );
          }
          env = newCommandEnvelope(id, cmd, oo.now);
          break;
        }
        case "event": {
          const ev = m as Event;
          try {
            validateMessage(ev);
          } catch (err) {
            throw new Error(
              `cannot dispatch invalid ${mt.toString()} message: ${(err as Error).message}`,
            );
          }
          env = newEventEnvelope(id, ev, oo.now);
          break;
        }
        default:
          throw new Error(`cannot dispatch ${mt.toString()} deadline message`);
      }

      if (!routes.has(mt)) {
        throw new Error(
          `the ${mt.toString()} message type is not consumed by any handlers`,
        );
      }

      obs.notify({
        kind: "DispatchCycleBegun",
        envelope: env!,
        engineTime: oo.now,
        enabledHandlerTypes: oo.enabledHandlerTypes,
        enabledHandlers: oo.enabledHandlers,
      });

      const runDispatch = (): MaybePromise<Error | undefined> => {
        if (oo.idempotencyKey !== "") {
          if (idempotencyKeys.has(oo.idempotencyKey)) {
            obs.notify({
              kind: "CommandDeduplicated",
              envelope: env!,
              key: oo.idempotencyKey,
            });
            return undefined;
          }
          idempotencyKeys.add(oo.idempotencyKey);
        }
        return dispatchQueue(ctx, oo, obs, [env!]);
      };

      return maybeThen(runDispatch(), (err) => {
        obs.notify({
          kind: "DispatchCycleCompleted",
          envelope: env!,
          error: err,
          enabledHandlerTypes: oo.enabledHandlerTypes,
          enabledHandlers: oo.enabledHandlers,
        });
        return err;
      });
    },
  };

  return engine;
}

export function mustNewEngine(app: Application, ...options: Option[]): Engine {
  return newEngine(app, ...options);
}

function buildOperationOptions(
  e: Engine,
  options: OperationOption[],
): OperationOptions {
  const oo: OperationOptions = {
    now: new Date(),
    observers: [],
    enabledHandlerTypes: new Map<HandlerType, boolean>([
      [AggregateHandlerType, true],
      [ProcessHandlerType, true],
      [IntegrationHandlerType, true],
      [ProjectionHandlerType, true],
    ]),
    enabledHandlers: new Map<string, boolean>(),
    idempotencyKey: "",
  };
  for (const opt of options) {
    opt(e, oo);
  }
  return oo;
}

// CommandExecutor adapts an Engine to the dogma.CommandExecutor interface.
export type CommandExecutor = DogmaCommandExecutor & {
  engine?: Engine;
  options: OperationOption[];
};

export function newCommandExecutor(
  engine?: Engine,
  ...optionsOrArray: Array<OperationOption | OperationOption[]>
): CommandExecutor {
  const options: OperationOption[] = optionsOrArray.flat();
  const executor: CommandExecutor = {
    engine,
    options,
    executeCommand(
      ctxOrCommand: Context | Command,
      commandOrOpt?: Command | ExecuteCommandOption,
      ...restOpts: ExecuteCommandOption[]
    ): MaybePromise<void> {
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

      if (!executor.engine) {
        throw new Error("executeCommand(): cannot be called outside of a test");
      }

      const opOptions = [...executor.options];
      let observerSatisfied = false;
      let observerError: Error | undefined;
      let hasObservers = false;
      const pendingPromises: Promise<void>[] = [];

      for (const opt of opts) {
        if (opt.kind === "IdempotencyKey") {
          opOptions.push(withIdempotencyKey(opt.key));
        } else if (opt.kind === "EventObserver") {
          hasObservers = true;
          const observedID = opt.eventType.id;
          const observeFn = opt.observer;

          const adapted: Observer = {
            notify(f: Fact) {
              if (observerSatisfied || observerError) {
                return;
              }
              let ev: Event | undefined;
              if (f.kind === "EventRecordedByAggregate") {
                ev = f.eventEnvelope.message as Event;
              } else if (f.kind === "EventRecordedByIntegration") {
                ev = f.eventEnvelope.message as Event;
              } else {
                return;
              }

              const rmt = registeredMessageTypeOf(ev);
              if (!rmt || rmt.id !== observedID) {
                return;
              }

              try {
                const res = observeFn(ctx, ev);
                if (res instanceof Promise) {
                  pendingPromises.push(
                    res.then(
                      (sat) => {
                        if (sat) observerSatisfied = true;
                      },
                      (err) => {
                        observerError =
                          err instanceof Error ? err : new Error(String(err));
                      },
                    ),
                  );
                } else if (res) {
                  observerSatisfied = true;
                }
              } catch (err) {
                observerError =
                  err instanceof Error ? err : new Error(String(err));
              }
            },
          };

          opOptions.push(withObserver(adapted));
        }
      }

      const finish = (dispatchErr: Error | undefined): void => {
        if (dispatchErr) {
          throw dispatchErr;
        }
        if (!hasObservers) {
          return;
        }
        if (observerError) {
          throw observerError;
        }
        if (observerSatisfied) {
          return;
        }
        throw new EventObserverNotSatisfiedError();
      };

      return maybeThen(
        executor.engine.dispatch(ctx, m, ...opOptions),
        (dispatchErr): MaybePromise<void> => {
          if (pendingPromises.length > 0) {
            return Promise.all(pendingPromises).then(() => finish(dispatchErr));
          }
          finish(dispatchErr);
        },
      );
    },
  };

  return executor;
}

export const DefaultTickIntervalMs = 250;

export async function run(
  ctx: Context,
  e: Engine,
  intervalMs: number = DefaultTickIntervalMs,
  ...opts: OperationOption[]
): Promise<void> {
  return runTimeScaled(ctx, e, intervalMs, 1, undefined, ...opts);
}

export async function runTimeScaled(
  ctx: Context,
  e: Engine,
  intervalMs: number = DefaultTickIntervalMs,
  scaleFactor: number = 1,
  epochTime?: Date,
  ...opts: OperationOption[]
): Promise<void> {
  const start = Date.now();
  const baseTime = epochTime ? epochTime.getTime() : start;
  const tickInterval = intervalMs > 0 ? intervalMs : DefaultTickIntervalMs;

  while (!ctx.signal?.aborted) {
    const elapsed = (Date.now() - start) * scaleFactor;
    const current = new Date(baseTime + elapsed);
    const err = await e.tick(ctx, withCurrentTime(current), ...opts);
    if (err) {
      throw err;
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, tickInterval);
      ctx.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
