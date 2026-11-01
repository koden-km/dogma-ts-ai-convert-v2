// Optional represents an optional value of type T.
export type Optional<T> = {
  readonly value: T | undefined;
  readonly ok: boolean;
  isPresent(): boolean;
  get(): T;
  tryGet(): [T | undefined, boolean];
  toString(): string;
};

// some returns an Optional<T> that contains the given value.
export function some<T>(v: T): Optional<T> {
  return {
    value: v,
    ok: true,
    isPresent() {
      return true;
    },
    get() {
      return v;
    },
    tryGet() {
      return [v, true];
    },
    toString() {
      return String(v);
    },
  };
}

// none returns an Optional<T> that does not contain a value.
export function none<T = never>(): Optional<T> {
  return {
    value: undefined,
    ok: false,
    isPresent() {
      return false;
    },
    get() {
      throw new Error("value is not present");
    },
    tryGet() {
      return [undefined, false];
    },
    toString() {
      return "optional.None()";
    },
  };
}

// transform applies fn to the value inside o if present, returning a new Optional.
export function transform<T, U>(
  o: Optional<T>,
  fn: (v: T) => U,
): Optional<U> {
  if (o.isPresent()) {
    return some(fn(o.get()));
  }
  return none<U>();
}
