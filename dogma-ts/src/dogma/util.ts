// Context carries cancellation signals and deadlines across API boundaries,
// analogous to Go's context.Context.
export type Context = {
  readonly signal?: AbortSignal;
};

// backgroundContext returns an empty, non-cancelled Context.
export function backgroundContext(): Context {
  return {};
}

// withCancel returns a new Context and a cancel function.
export function withCancel(parent?: Context): [Context, () => void] {
  const controller = new AbortController();
  if (parent?.signal) {
    if (parent.signal.aborted) {
      controller.abort(parent.signal.reason);
    } else {
      parent.signal.addEventListener(
        "abort",
        () => controller.abort(parent.signal?.reason),
        { once: true },
      );
    }
  }
  return [{ signal: controller.signal }, () => controller.abort()];
}
