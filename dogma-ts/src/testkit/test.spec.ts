import { beforeEach, describe, expect, it } from "vitest";
import {
  type Application,
  EventObserverNotSatisfiedError,
  executesCommand,
  handlesCommand,
  handlesEvent,
  NoCompactBehavior,
  NoResetBehavior,
  NoSnapshotBehavior,
  recordsEvent,
  schedulesDeadline,
  viaAggregate,
  viaIntegration,
  viaProcess,
  viaProjection,
  withEventObserver,
  withIdempotencyKey,
} from "@/dogma/index.ts";
import {
  type CommandStub,
  createCommandStub,
  createDeadlineStub,
  createEventStub,
  type DeadlineStub,
  type EventStub,
  registerStubMessages,
} from "@/enginekit/enginetest/stubs/index.ts";
import {
  advanceTime,
  allOf,
  anyOf,
  begin,
  byDuration,
  call,
  executeCommand,
  IgnoreMessage,
  noneOf,
  not,
  recordEvent,
  startTimeAt,
  toExecuteCommand,
  toExecuteCommandMatching,
  toExecuteCommandOfType,
  toExecuteCommandType,
  toOnlyExecuteCommandsMatching,
  toOnlyRecordEventsMatching,
  toRecordEvent,
  toRecordEventMatching,
  toRecordEventOfType,
  toRecordEventType,
  toRepeatedly,
  toSatisfy,
  toTime,
} from "./index.ts";

function buildTestApp(state?: { projectedEvents: string[] }): Application {
  type AggRoot = { count: number };
  type ProcRoot = { target?: string };

  return {
    configure(c) {
      c.identity("test-app", "22028264-0bca-43e1-8d9d-cd094efb10b7");

      c.routes(
        viaAggregate<AggRoot>({
          ...NoSnapshotBehavior,
          configure(hc) {
            hc.identity("agg", "fcce9a78-23a3-4211-b608-ecbe21ea446f");
            hc.routes(
              handlesCommand<CommandStub>("CommandStub[A]"),
              recordsEvent<EventStub>("EventStub[A]"),
            );
          },
          newRoot: () => ({ count: 0 }),
          routeCommandToInstance: () => "inst-1",
          applyEvent(r) {
            r.count++;
          },
          handleCommand(r, s, m) {
            const cmd = m as CommandStub;
            if (cmd.content === "noop") {
              s.log("ignoring noop");
              return;
            }
            s.recordEvent(
              createEventStub("EventStub[A]", `${cmd.content}:${r.count}`),
            );
          },
        }),

        viaProcess<ProcRoot>({
          configure(hc) {
            hc.identity("proc", "89b39176-a57f-4071-afad-e0db62137fd3");
            hc.routes(
              handlesEvent<EventStub>("EventStub[A]"),
              executesCommand<CommandStub>("CommandStub[B]"),
              schedulesDeadline<DeadlineStub>("DeadlineStub[A]"),
            );
          },
          newRoot: () => ({}),
          routeEventToInstance(_ctx, m) {
            const ev = m as EventStub;
            if (ev.content.startsWith("ignore")) {
              return ["", false];
            }
            return [`proc-${ev.content}`, true];
          },
          handleEvent(_ctx, _r, s, m) {
            const ev = m as EventStub;
            if (ev.content.startsWith("delay:")) {
              s.mutate((root) => {
                root.target = ev.content;
              });
              s.scheduleDeadline(
                createDeadlineStub("DeadlineStub[A]", ev.content),
                new Date(s.now().getTime() + 60_000),
              );
              return;
            }
            s.executeCommand(
              createCommandStub("CommandStub[B]", `from-proc:${ev.content}`),
            );
            s.end();
          },
          handleDeadline(_ctx, r, s) {
            s.executeCommand(
              createCommandStub("CommandStub[B]", `deadline:${r.target}`),
            );
            s.end();
          },
        }),

        viaIntegration({
          configure(hc) {
            hc.identity("integ", "f2a7e4b1-9c3d-4f8a-b6e5-1d0c2a9f7e3b");
            hc.routes(
              handlesCommand<CommandStub>("CommandStub[B]"),
              recordsEvent<EventStub>("EventStub[B]"),
            );
          },
          handleCommand(_ctx, s, m) {
            const cmd = m as CommandStub;
            s.recordEvent(
              createEventStub("EventStub[B]", `integ:${cmd.content}`),
            );
          },
        }),

        viaProjection({
          ...NoCompactBehavior,
          ...NoResetBehavior,
          configure(hc) {
            hc.identity("proj", "70b58269-931a-46d6-b745-286a670fb6f7");
            hc.routes(
              handlesEvent<EventStub>("EventStub[A]"),
              handlesEvent<EventStub>("EventStub[B]"),
            );
          },
          handleEvent(_ctx, s, m) {
            state?.projectedEvents.push(`${m.$typeName}:${(m as EventStub).content}`);
            return s.offset() + 1n;
          },
          checkpointOffset() {
            return 0n;
          },
        }),
      );
    },
  };
}

describe("testkit", () => {
  beforeEach(() => {
    registerStubMessages();
  });

  it("supports executeCommand, prepare, and toRecordEvent / toRecordEventOfType", () => {
    const app = buildTestApp();

    begin(app)
      .prepare(executeCommand(createCommandStub("CommandStub[A]", "hello")))
      .expect(
        executeCommand(createCommandStub("CommandStub[A]", "world")),
        allOf(
          toRecordEvent(createEventStub("EventStub[A]", "world:1")),
          toRecordEventOfType("EventStub[A]"),
          toRecordEventType("EventStub[A]"),
          toExecuteCommand(
            createCommandStub("CommandStub[B]", "from-proc:world:1"),
          ),
          toExecuteCommandOfType("CommandStub[B]"),
          toExecuteCommandType("CommandStub[B]"),
        ),
      );
  });

  it("supports noneOf and not expectations", () => {
    const app = buildTestApp();

    begin(app).expect(
      executeCommand(createCommandStub("CommandStub[A]", "noop")),
      allOf(
        noneOf(toRecordEventOfType("EventStub[A]")),
        not(toRecordEventOfType("EventStub[A]")),
      ),
    );
  });

  it("supports process deadlines with startTimeAt and advanceTime", () => {
    const app = buildTestApp();
    const start = new Date("2025-01-01T00:00:00Z");

    begin(app, startTimeAt(start))
      .expect(
        executeCommand(createCommandStub("CommandStub[A]", "delay:later")),
        noneOf(toExecuteCommandOfType("CommandStub[B]")),
      )
      .expect(
        advanceTime(byDuration(30_000)),
        noneOf(toExecuteCommandOfType("CommandStub[B]")),
      )
      .expect(
        advanceTime(toTime(new Date("2025-01-01T00:01:00Z"))),
        toExecuteCommand(
          createCommandStub("CommandStub[B]", "deadline:delay:later:0"),
        ),
      );
  });

  it("supports enableHandlers for integrations and projections", () => {
    const projectedEvents: string[] = [];
    const app = buildTestApp({ projectedEvents });

    begin(app)
      .enableHandlers("integ", "proj")
      .expect(
        executeCommand(createCommandStub("CommandStub[A]", "hi")),
        toRecordEvent(
          createEventStub("EventStub[B]", "integ:from-proc:hi:0"),
        ),
      );

    expect(projectedEvents).toEqual([
      "EventStub[A]:hi:0",
      "EventStub[B]:integ:from-proc:hi:0",
    ]);
  });

  it("supports matching predicates, toRepeatedly, and toSatisfy", () => {
    const app = buildTestApp();

    begin(app).expect(
      recordEvent(createEventStub("EventStub[A]", "direct")),
      allOf(
        anyOf(
          toExecuteCommandMatching<CommandStub>(
            (m) => m.content === "from-proc:direct",
            "CommandStub[B]",
          ),
        ),
        toOnlyExecuteCommandsMatching<CommandStub>((m) => {
          if (m.$typeName !== "CommandStub[B]") return IgnoreMessage;
          return m.content.startsWith("from-proc:");
        }),
        toRepeatedly("check command execution", 2, () =>
          toExecuteCommandOfType("CommandStub[B]"),
        ),
        toSatisfy("custom satisfaction check", (t) => {
          expect(t.facts.length).toBeGreaterThan(0);
        }),
      ),
    );
  });

  it("supports call action with commandExecutor, idempotencyKey, and eventObserver", () => {
    const app = buildTestApp();
    const test = begin(app);
    const executor = test.commandExecutor();

    let observedEvent: EventStub | undefined;

    test.expect(
      call(() => {
        executor.executeCommand(
          createCommandStub("CommandStub[A]", "via-executor"),
          withIdempotencyKey("key-1"),
          withEventObserver<EventStub>("EventStub[A]", (_ctx, ev) => {
            observedEvent = ev;
            return true;
          }),
        );

        // Duplicate idempotency key is deduplicated
        executor.executeCommand(
          createCommandStub("CommandStub[A]", "via-executor"),
          withIdempotencyKey("key-1"),
        );
      }),
      allOf(
        toRecordEventMatching<EventStub>(
          (ev) => ev.content === "via-executor:0",
          "EventStub[A]",
        ),
        toOnlyRecordEventsMatching<EventStub>(
          (ev) => ev.content === "via-executor:0",
          "EventStub[A]",
        ),
      ),
    );

    expect(observedEvent?.content).toBe("via-executor:0");

    // Unsatisfied event observer throws EventObserverNotSatisfiedError
    let caughtError: unknown;
    test.prepare(
      call(() => {
        try {
          executor.executeCommand(
            createCommandStub("CommandStub[A]", "noop"),
            withEventObserver<EventStub>("EventStub[A]", () => false),
          );
        } catch (err) {
          caughtError = err;
        }
      }),
    );
    expect(caughtError).toBeInstanceOf(EventObserverNotSatisfiedError);
  });
});
