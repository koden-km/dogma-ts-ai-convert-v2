# Post Port Notes

## Oddities to look ino more

- `doc.go` files were not ported. It might be good to turn those into
  `README.md` files, or even keep them as just `doc.ts` with a comment like I
  was doing in the original port?
  Actually, it seems none of the `README.md` files were ported?!

- Is the `untypedAggregateMessageHandler` things needed in TypeScript?

- There are a lot of `any` types being used. I think that was required for Go
  to be more dynamic, but probably not required for TypeScript?

- Should `message.ts` `Message`.`type` be renamed to `kind`? That seems to be
  how it is referenced elsewhere. It also avoids the common "type" word and is
  still short.
  Similar to this, the `Message`.`name` could be renamed to `type`? But that
  puts the common "type" word back into use, and also could get confusing after
  having changed the other one.

- There are a few references to "In idiomatic TypeScript" (dogma: aggreate.ts
  and process.ts)

- The `dogma/error.ts` constant types (`ErrNotSupported`,
  `ErrEventObserverNotSatisfied`) are never used. The errors are always just
  thrown directly. Possibly just another Go quirk since it needed special cases
  for error recovery?

- `src/example/cmd/bank/main.ts` has errors in VSCode for the use of `process`.
  > "Cannot find name 'process'. Do you need to install type definitions for
  > node? Try `npm i --save-dev @types/node` and then add 'node' to the types
  > field in your tsconfig."

## Ideas to improve things

- See the list of notes/todos that I had in my original manual porting attempt.
  I think some of those ideas got ported over as it picked up the intent. Not
  sure if they were good ideas though. I might need to query Gemini on it?

- Functions for event creation?
  I wonder if adding extra functions for event creation is worth it. It could
  make the business logic more readable, but it is extra boilerplate work.

  Example Before (business logic has noise):
```typescript
function debitAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  { data: m }: DebitAccount,
) {
  if (hasSufficientFunds(r, m.amount)) {
    s.recordEvent(
      createEvent(EventName.AccountDebited, {
        transactionID: m.transactionID,
        accountID: m.accountID,
        transactionType: m.transactionType,
        amount: m.amount,
        scheduledTime: m.scheduledTime,
      }),
    );
  } else {
    s.recordEvent(
      createEvent(EventName.AccountDebitDeclined, {
        transactionID: m.transactionID,
        accountID: m.accountID,
        transactionType: m.transactionType,
        amount: m.amount,
        reason: DebitFailureReason.InsufficientFunds,
      }),
    );
  }
}
```

  Example After (recording is split out, business logic reads clear):
```typescript
function debitAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  { data: m }: DebitAccount,
) {
  if (hasSufficientFunds(r, m.amount)) {
    recordAccountDebited(s, m);
  } else {
    recordAccountDebitDeclined(s, m, DebitFailureReason.InsufficientFunds);
  }
}

function recordAccountDebited(s, m) {
  s.recordEvent(
    createEvent(EventName.AccountDebited, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: m.transactionType,
      amount: m.amount,
      scheduledTime: m.scheduledTime,
    }),
  );
}
  
function recordAccountDebitDeclined(s, m, reason) {
  s.recordEvent(
    createEvent(EventName.AccountDebitDeclined, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: m.transactionType,
      amount: m.amount,
      reason,
    }),
  );
}
```

