import {
  type Context,
  type Event,
  type ProjectionCompactScope,
  type ProjectionConfigurer,
  type ProjectionEventScope,
  type ProjectionMessageHandler,
  type ProjectionResetScope,
} from "@/dogma/index.ts";

// MessageHandler is a specialization of [ProjectionMessageHandler] that
// builds an in-memory projection represented by a value of type T.
export type MessageHandler<T> = {
  configure(c: ProjectionConfigurer): void;
  handleEvent(
    v: T,
    s: ProjectionEventScope,
    m: Event,
  ): Promise<T> | T;
  compact(v: T, s: ProjectionCompactScope): Promise<T> | T;
};

// NoCompactBehavior can be embedded in MessageHandler implementations to
// indicate that the projection does not require its data to be compacted.
export const NoCompactBehavior = {
  compact<T>(v: T, _s: ProjectionCompactScope): T {
    return v;
  },
};

export type Projection<
  T,
  H extends MessageHandler<T> = MessageHandler<T>,
> = ProjectionMessageHandler & {
  readonly handler: H;
  query<R>(fn: (v: T) => R): R;
};

function maybeThen<T, U>(
  val: Promise<T> | T,
  fn: (v: T) => Promise<U> | U,
): Promise<U> | U {
  if (val instanceof Promise) {
    return val.then(fn);
  }
  return fn(val);
}

// newProjection creates a new in-memory [Projection] that builds a value of type T.
export function newProjection<
  T,
  H extends MessageHandler<T> = MessageHandler<T>,
>(handler: H, initialValue: () => T): Projection<T, H> {
  let checkpoints: Map<string, bigint> | undefined;
  let value: T = initialValue();

  return {
    handler,
    query<R>(fn: (v: T) => R): R {
      return fn(value);
    },
    configure(c: ProjectionConfigurer) {
      handler.configure(c);
    },
    handleEvent(
      _ctx: Context,
      s: ProjectionEventScope,
      m: Event,
    ): Promise<bigint> | bigint {
      const id = s.streamID();
      const cp = checkpoints?.get(id) ?? 0n;

      if (s.checkpointOffset() !== cp) {
        return cp;
      }

      return maybeThen(handler.handleEvent(value, s, m), (nextValue) => {
        if (!checkpoints) {
          checkpoints = new Map();
        }

        const nextCp = s.offset() + 1n;
        checkpoints.set(id, nextCp);
        value = nextValue;

        return nextCp;
      });
    },
    checkpointOffset(_ctx: Context, id: string): bigint {
      return checkpoints?.get(id) ?? 0n;
    },
    compact(_ctx: Context, s: ProjectionCompactScope): Promise<void> | void {
      if (checkpoints !== undefined) {
        return maybeThen(handler.compact(value, s), (nextValue) => {
          value = nextValue;
        });
      }
    },
    reset(_ctx: Context, _s: ProjectionResetScope): void {
      checkpoints = undefined;
      value = initialValue();
    },
  };
}

// query queries a value of type T from p to produce a result of type R.
export function query<T, R, H extends MessageHandler<T> = MessageHandler<T>>(
  p: Projection<T, H>,
  q: (v: T) => R,
): R {
  return p.query(q);
}
