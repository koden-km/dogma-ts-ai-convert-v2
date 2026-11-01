import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  backgroundContext,
  type Context,
  type Event,
  type ProjectionCompactScope,
  type ProjectionConfigurer,
  type ProjectionEventScope,
  type ProjectionMessageHandler,
  type ProjectionResetScope,
} from "@/dogma/index.ts";
import {
  createProjectionCompactScopeStub,
  createProjectionEventScopeStub,
  createProjectionResetScopeStub,
  EventA1,
} from "@/enginekit/index.ts";
import {
  type MessageHandler,
  newSQLProjection,
  NoCompactBehavior,
  SQLiteDriver,
} from "./index.ts";

describe("sqlprojection", () => {
  let db: DatabaseSync;
  let handler: MessageHandler & {
    handleEventFunc?: (
      ctx: Context,
      tx: DatabaseSync,
      s: ProjectionEventScope,
      m: Event,
    ) => void;
    compactFunc?: (
      ctx: Context,
      db: DatabaseSync,
      s: ProjectionCompactScope,
    ) => void;
    resetFunc?: (
      ctx: Context,
      tx: DatabaseSync,
      s: ProjectionResetScope,
    ) => void;
  };
  let adaptor: ProjectionMessageHandler;

  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    await SQLiteDriver.createSchema(backgroundContext(), db);

    handler = {
      configure(c: ProjectionConfigurer) {
        c.identity("<projection>", "6d1e805f-1760-409f-b1eb-e14983ec3f68");
      },
      handleEvent(ctx, tx, s, m) {
        this.handleEventFunc?.(ctx, tx, s, m);
      },
      compact(ctx, d, s) {
        if (this.compactFunc) {
          this.compactFunc(ctx, d, s);
          return;
        }
        NoCompactBehavior.compact(ctx, d, s);
      },
      reset(ctx, tx, s) {
        this.resetFunc?.(ctx, tx, s);
      },
    };

    adaptor = newSQLProjection(db, SQLiteDriver, handler);
  });

  afterEach(() => {
    db.close();
  });

  it("applies events and updates checkpoint offsets with OCC", async () => {
    const streamID = "6d1e805f-1760-409f-b1eb-e14983ec3f68";
    expect(await adaptor.checkpointOffset(backgroundContext(), streamID)).toBe(
      0n,
    );

    const cp1 = await adaptor.handleEvent(
      backgroundContext(),
      createProjectionEventScopeStub({
        streamIDFunc: () => streamID,
        offsetFunc: () => 0n,
        checkpointOffsetFunc: () => 0n,
      }),
      EventA1,
    );
    expect(cp1).toBe(1n);
    expect(await adaptor.checkpointOffset(backgroundContext(), streamID)).toBe(
      1n,
    );

    // OCC mismatch returns current stored offset (1n) without applying event
    let calledOnMismatch = false;
    handler.handleEventFunc = () => {
      calledOnMismatch = true;
    };
    const cpMismatch = await adaptor.handleEvent(
      backgroundContext(),
      createProjectionEventScopeStub({
        streamIDFunc: () => streamID,
        offsetFunc: () => 5n,
        checkpointOffsetFunc: () => 0n,
      }),
      EventA1,
    );
    expect(cpMismatch).toBe(1n);
    expect(calledOnMismatch).toBe(false);

    // Next sequential event succeeds
    const cp2 = await adaptor.handleEvent(
      backgroundContext(),
      createProjectionEventScopeStub({
        streamIDFunc: () => streamID,
        offsetFunc: () => 1n,
        checkpointOffsetFunc: () => 1n,
      }),
      EventA1,
    );
    expect(cp2).toBe(2n);

    // Reset clears checkpoints
    await adaptor.reset(backgroundContext(), createProjectionResetScopeStub());
    expect(await adaptor.checkpointOffset(backgroundContext(), streamID)).toBe(
      0n,
    );
  });

  it("rolls back transaction if handleEvent throws", async () => {
    const streamID = "6d1e805f-1760-409f-b1eb-e14983ec3f68";
    handler.handleEventFunc = () => {
      throw new Error("<error>");
    };

    expect(() =>
      adaptor.handleEvent(
        backgroundContext(),
        createProjectionEventScopeStub({
          streamIDFunc: () => streamID,
          offsetFunc: () => 0n,
          checkpointOffsetFunc: () => 0n,
        }),
        EventA1,
      ),
    ).toThrow("<error>");

    expect(await adaptor.checkpointOffset(backgroundContext(), streamID)).toBe(
      0n,
    );
  });

  it("supports idempotent createSchema and dropSchema", async () => {
    await SQLiteDriver.createSchema(backgroundContext(), db);
    await SQLiteDriver.createSchema(backgroundContext(), db);
    await SQLiteDriver.dropSchema(backgroundContext(), db);
    await SQLiteDriver.dropSchema(backgroundContext(), db);
  });
});
