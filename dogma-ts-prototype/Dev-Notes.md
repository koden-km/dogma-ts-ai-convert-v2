# Dev Notes

## Optional Pattern To Consider

Reference file: `example/src/app/domain/account.ts`

When discussing classes vs objects and pure functions Gemini suggested this could be more pure like a reducer instead of objects and functions.

> _Begin Snippet ...8<..._

**Option 2: Pure Functional / Reducer Pattern (Requires Changing Core Interfaces)**

If you want to go fully functional (meaning no `this` bindings and strictly immutable state updates like Redux), you would need to change the Dogma interfaces.

Currently, `AggregateRoot` requires an `applyEvent` property. If you drop that, `AggregateRoot` just becomes a data interface.

```typescript
// Pure data, no methods
export type Account = {
  opened: boolean;
  balance: bigint;
};
```

To support this, the engine's `AggregateMessageHandler` interface in `src/dogma/aggregate.ts` would need to be updated to a Reducer style, where `applyEvent` lives on the _Handler_ rather than the _Root_:

```typescript
export type AggregateMessageHandler<TState> = {
  newRoot(): TState;

  // Takes the old state and the event, returns the new state
  applyEvent(state: TState, e: Event): TState;

  handleCommand(state: TState, s: AggregateCommandScope, c: Command): void;
  // ...
};
```

Then your `applyEvent` function in `account.ts` would look like this:

```typescript
function applyEvent(state: Account, m: Event): Account {
  const e = m as DomainEvent;
  switch (e.name) {
    case EventName.AccountOpened:
      return { ...state, opened: true };
    case EventName.AccountCredited:
      return { ...state, balance: state.balance + e.data.amount };
    case EventName.AccountDebited:
      return { ...state, balance: state.balance - e.data.amount };
    default:
      return state;
  }
}
```

**Summary of options:**

1. **Classes:** Most accurately mirrors Go's struct + pointer receivers pattern.
2. **Factory Functions (Option 1):** Achieves the exact same thing as classes but feels slightly more native to JS/TS object composition.
3. **Reducers (Option 2):** Takes full advantage of functional TypeScript patterns, but requires you to diverge slightly from the original Dogma Go engine design.

> _End Snippet ...8<..._

## Aggregate State

In reference to `src/example/app/domain/account.ts`...

It might be good to make the current `Account` type be `AccountRoot` and have just the state type itself be `Account` (or `AccountState`)?
That clarifies the usage of what you are given, as the root is only used by outer parts and the state used internally.

`src/example/app/domain/account.ts`

```ts
// Account is the aggregate root for a bank account.
export type Account = AggregateRoot & {
  // Name is the account name.
  name: string;

  // Balance is the current account balance, in cents.
  balance: bigint;
};

// ----- 8< ----- much later ----- 8< -----

  newRoot(): Account {
    return {
      name: "",
      balance: 0n,

      // ----------------------------------------
      // NOTE(KM): Not sure if these functions should be created in every
      // instance of the AggregateRoot type (eg. Account) or as separate
      // functions that take the instance to read/write.
      // Separate could be safer/pure?
      // I probably need to wait until I convert the thing that calls this...
      //
      // Example, predefine function outside this block and take the instance to mutate:
      //   function applyEvent(r: Account, e: Event): void {
      //     const m = e as DomainEvent;
      //     switch (m.name) {
      //       case EventName.AccountOpened:
      //         r.name = m.data.accountName;
      //         break;
      //       case EventName.AccountCredited:
      //         r.balance += m.data.amount;
      //         break;
      //   ...
      //
      // The `newRoot()` returned object will still need the functions assigned to satisfy type, but that is simpler
      //   newRoot(): Account {
      //     return {
      //       name: "",
      //       balance: 0n,
      //
      //       aggregateInstanceDescription,
      //       applyEvent,
      //       marshal,
      //       unmarshal,
      //   }
      // ----------------------------------------
```

## Messages as part of API

It would be good to separate the _Messages_ modules. The _Commands_ should be internal to the domain and the _Events_ should be part of the public API.
