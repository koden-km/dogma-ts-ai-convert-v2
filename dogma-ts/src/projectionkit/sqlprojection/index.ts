import { DatabaseSync } from "node:sqlite";
import {
  type Context,
  type Event,
  normalizeUUID,
  NotSupportedError,
  type ProjectionCompactScope,
  type ProjectionConfigurer,
  type ProjectionEventScope,
  type ProjectionMessageHandler,
  type ProjectionResetScope,
} from "@/dogma/index.ts";
import { fromProjection } from "@/enginekit/index.ts";

export { DatabaseSync };

function uuidToBytes(uuid: string): Uint8Array {
  const hex = normalizeUUID(uuid).replace(/-/g, "");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

// Driver is an interface for database-specific projection drivers.
export type Driver = {
  createSchema(ctx: Context, db: DatabaseSync): Promise<void> | void;
  dropSchema(ctx: Context, db: DatabaseSync): Promise<void> | void;
  queryCheckpointOffset(
    ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
    s: Uint8Array,
  ): Promise<bigint> | bigint;
  updateCheckpointOffset(
    ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
    s: Uint8Array,
    c: bigint,
    n: bigint,
  ): Promise<boolean> | boolean;
  deleteCheckpointOffsets(
    ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
  ): Promise<void> | void;
};

// MessageHandler is a specialization of [ProjectionMessageHandler] that
// persists to an SQL database.
export type MessageHandler = {
  configure(c: ProjectionConfigurer): void;
  handleEvent(
    ctx: Context,
    tx: DatabaseSync,
    s: ProjectionEventScope,
    m: Event,
  ): Promise<void> | void;
  compact(
    ctx: Context,
    db: DatabaseSync,
    s: ProjectionCompactScope,
  ): Promise<void> | void;
  reset(
    ctx: Context,
    tx: DatabaseSync,
    s: ProjectionResetScope,
  ): Promise<void> | void;
};

export const NoCompactBehavior = {
  compact(
    _ctx: Context,
    _db: DatabaseSync,
    _s: ProjectionCompactScope,
  ): void {},
};

export const NoResetBehavior = {
  reset(
    _ctx: Context,
    _tx: DatabaseSync,
    _s: ProjectionResetScope,
  ): never {
    throw new NotSupportedError();
  },
};

// SQLiteDriver is a [Driver] for SQLite using Node's built-in `node:sqlite`.
export const SQLiteDriver: Driver = {
  createSchema(_ctx: Context, db: DatabaseSync): void {
    db.exec(`CREATE TABLE IF NOT EXISTS projection_checkpoint (
      handler           BLOB NOT NULL,
      stream            BLOB NOT NULL,
      checkpoint_offset INTEGER NOT NULL,
      PRIMARY KEY (handler, stream)
    )`);
  },

  dropSchema(_ctx: Context, db: DatabaseSync): void {
    db.exec(`DROP TABLE IF EXISTS projection_checkpoint`);
  },

  queryCheckpointOffset(
    _ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
    s: Uint8Array,
  ): bigint {
    const stmt = db.prepare(
      `SELECT checkpoint_offset
       FROM projection_checkpoint
       WHERE handler = ?
       AND stream = ?`,
    );
    stmt.setReadBigInts(true);
    const row = stmt.get(h, s) as { checkpoint_offset: bigint } | undefined;
    if (!row) {
      return 0n;
    }
    return BigInt(row.checkpoint_offset);
  },

  updateCheckpointOffset(
    _ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
    s: Uint8Array,
    c: bigint,
    n: bigint,
  ): boolean {
    if (c === 0n) {
      const stmt = db.prepare(
        `INSERT INTO projection_checkpoint (
          handler,
          stream,
          checkpoint_offset
        ) VALUES (?, ?, ?)
        ON CONFLICT DO NOTHING`,
      );
      const res = stmt.run(h, s, n);
      return Number(res.changes) === 1;
    }

    const stmt = db.prepare(
      `UPDATE projection_checkpoint SET
        checkpoint_offset = ?
      WHERE handler = ?
      AND stream = ?
      AND checkpoint_offset = ?`,
    );
    const res = stmt.run(n, h, s, c);
    return Number(res.changes) !== 0;
  },

  deleteCheckpointOffsets(
    _ctx: Context,
    db: DatabaseSync,
    h: Uint8Array,
  ): void {
    const stmt = db.prepare(
      `DELETE FROM projection_checkpoint WHERE handler = ?`,
    );
    stmt.run(h);
  },
};

function resolveHandlerKeyBytes(h: MessageHandler): Uint8Array {
  const cfg = fromProjection({
    configure(c) {
      h.configure(c);
    },
    handleEvent: () => 0n,
    checkpointOffset: () => 0n,
    compact() {},
    reset() {},
  });
  return uuidToBytes(cfg.identity().key);
}

function maybeThen<T, U>(
  val: Promise<T> | T,
  fn: (v: T) => Promise<U> | U,
): Promise<U> | U {
  if (val instanceof Promise) {
    return val.then(fn);
  }
  return fn(val);
}

// newSQLProjection returns a new [ProjectionMessageHandler] that binds an
// SQL-specific [MessageHandler] to an SQL database.
export function newSQLProjection(
  db: DatabaseSync,
  driver: Driver,
  handler: MessageHandler,
): ProjectionMessageHandler {
  const handlerKey = resolveHandlerKeyBytes(handler);

  return {
    configure(c: ProjectionConfigurer) {
      handler.configure(c);
    },

    handleEvent(
      ctx: Context,
      s: ProjectionEventScope,
      m: Event,
    ): Promise<bigint> | bigint {
      const streamBytes = uuidToBytes(s.streamID());
      const cp = s.offset() + 1n;

      db.exec("BEGIN");
      let committed = false;
      const rollbackIfNeeded = () => {
        if (!committed) {
          try {
            db.exec("ROLLBACK");
          } catch {
            // ignore rollback errors
          }
        }
      };

      try {
        const res = maybeThen(
          driver.updateCheckpointOffset(
            ctx,
            db,
            handlerKey,
            streamBytes,
            s.checkpointOffset(),
            cp,
          ),
          (ok): Promise<bigint> | bigint => {
            if (ok) {
              return maybeThen(handler.handleEvent(ctx, db, s, m), () => {
                db.exec("COMMIT");
                committed = true;
                return cp;
              });
            }
            rollbackIfNeeded();
            return driver.queryCheckpointOffset(
              ctx,
              db,
              handlerKey,
              streamBytes,
            );
          },
        );

        if (res instanceof Promise) {
          return res.finally(rollbackIfNeeded);
        }
        rollbackIfNeeded();
        return res;
      } catch (err) {
        rollbackIfNeeded();
        throw err;
      }
    },

    checkpointOffset(ctx: Context, id: string): Promise<bigint> | bigint {
      return driver.queryCheckpointOffset(
        ctx,
        db,
        handlerKey,
        uuidToBytes(id),
      );
    },

    compact(ctx: Context, s: ProjectionCompactScope): Promise<void> | void {
      return handler.compact(ctx, db, s);
    },

    reset(ctx: Context, s: ProjectionResetScope): Promise<void> | void {
      db.exec("BEGIN");
      let committed = false;
      const rollbackIfNeeded = () => {
        if (!committed) {
          try {
            db.exec("ROLLBACK");
          } catch {
            // ignore rollback errors
          }
        }
      };

      try {
        const res = maybeThen(handler.reset(ctx, db, s), () =>
          maybeThen(driver.deleteCheckpointOffsets(ctx, db, handlerKey), () => {
            db.exec("COMMIT");
            committed = true;
          }),
        );
        if (res instanceof Promise) {
          return res.finally(rollbackIfNeeded);
        }
        rollbackIfNeeded();
        return res;
      } catch (err) {
        rollbackIfNeeded();
        throw err;
      }
    },
  };
}
