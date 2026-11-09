# Post Port Notes

## Oddities to look into more

- [ ] `doc.go` files were not ported. It might be good to turn those into
  `README.md` files, or even keep them as just `doc.ts` with a comment like I
  was doing in the original port?
  It would also be good to convert all the function docs into JSDoc so docs
  pop-up on hover.
  Actually, it seems none of the `README.md` files were ported?!

- [x] Is the `untypedAggregateMessageHandler` things needed in Typescript?
  Answer: No!
  It was only to stay close to the original Go version (
  `dogma.UntypedAggregateMessageHandler.`, `dogma.UntypedProcessMessageHandler`,
  and `dogma.UnwrapHandler`). In Typescript, they are not actually needed!

- [ ] There are a lot of `any` types being used, and some `unknown`'s. I think
  that was required for Go to be more dynamic, but probably not required for
  Typescript?

- [x] Should `message.ts` `Message`.`type` be renamed to `kind`? That seems to be
  how it is referenced elsewhere. It also avoids the common "type" word and is
  still short.
  Similar to this, the `Message`.`name` could be renamed to `type`? But that
  puts the common "type" word back into use, and also could get confusing after
  having changed the other one.
  _Update:_
  These extra metadata parameters will likely be removed when moving to
  protobuf versions of messages, which is now possible with the newer
  protobuf-es package.

- [ ] There are a few references to "In idiomatic Typescript" (dogma: aggregate.ts
  and process.ts)

- [x] The `dogma/error.ts` constant types (`ErrNotSupported`,
  `ErrEventObserverNotSatisfied`) are never used. The errors are always just
  thrown directly. Possibly just another Go quirk since it needed special cases
  for error recovery?
  _Update:_
  Not needed and will be removed along with other Go'isms.

- [x] `src/example/cmd/bank/main.ts` has errors in VSCode for the use of `process`.
  > "Cannot find name 'process'. Do you need to install type definitions for
  > node? Try `npm i --save-dev @types/node` and then add 'node' to the types
  > field in your tsconfig."

## Ideas to improve things

- [ ] See the list of notes/todos that I had in my original manual porting attempt.
  I think some of those ideas got ported over as it picked up the intent. Not
  sure if they were good ideas though. I might need to query Gemini on it?

- [x] Functions for event creation?
  I wonder if adding extra functions for event creation is worth it. It could
  make the business logic more readable, but it is extra boilerplate work.

  Update: I did this in branch `prototype-readability`. It seems mostly good
  but slightly tricky to name some of them.

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

- [x] Switch to protobuf based message
  This will bring compatibility with the Go version.
  There is a new `https://github.com/dogmatiq/protobuf` package that handles the
  base engine protobuf types.
  There is a new `https://github.com/bufbuild/protobuf-es` package that is a
  good protobuf implementation for Node/Typescript
  Update: See output in section below.

---

# Port from plain message types to Protobuf message types

(2026-11-08)

## Output

Ran install protobuf dependencies in dogma-ts · Exited with code 1
Ran install protobuf dependencies in dogma-ts
Analyzed package.json:L1-24
Created Makefile
Analyzed Makefile:L1-8
Analyzed package.json:L1-24
Analyzed package.json:L1-77
Analyzed Makefile:L1-18
Ran check for .makefiles in dogma-go-reference
Ran fetch .makefiles via make
Analyzing Makefile
Analyzing Makefile
Analyzing with-npm.mk
Analyzing with-tsc.mk
Ran list dogma-ts/.makefiles directory · Exited with code 1
Ran fetch .makefiles via make
Analyzed Makefile:L1-194
Analyzed Makefile:L1-161
Analyzed with-npm.mk:L1-39
Analyzed with-tsc.mk:L1-52
Ran list files in .makefiles/pkg/protobuf/v2
Analyzed with-primo.mk:L1-15
Ran check protobuf scripts and reference repo
Analyzed README.md:L1-96
Analyzed package.test.ts:L1-104
Ran check git log in dogma-go-reference/protobuf
Ran check git log for makefiles.dev in protobuf repo
Analyzed generate-go-include-paths:L1-17
Analyzed Makefile:L1-273
Analyzing .gitignore
Analyzed .gitignore:L1-5
Analyzed .gitignore:L1-24
Analyzed git-find:L1-37
Edited .gitignore
Edited Makefile
Edited package.json
Analyzed identity.proto:L1-27
Analyzed envelope.proto:L1-148
Analyzed identity_pb.ts:L1-56
Analyzed account.ts:L1-196
Analyzed transaction.ts:L1-71
Analyzed daily-debit-limit.ts:L1-78
Analyzed deposit.ts:L1-87
Analyzed third-party-credit.ts:L1-59
Analyzed transfer.ts:L1-213
Analyzed withdrawal.ts:L1-136
Analyzed account.ts:L1-204
Analyzed customer.ts:L1-60
Analyzed dailydebitlimit.ts:L1-159
Analyzed deposit.ts:L1-93
Analyzed third-party-credit.ts:L1-105
Analyzed transfer.ts:L1-230
Analyzed withdrawal.ts:L1-146
Analyzed transfer.ts:L1-344
Created transaction.proto
Created account.proto
Created daily-debit-limit.proto
Created deposit.proto
Created third-party-credit.proto
Created transfer.proto
Created withdrawal.proto
Created account.proto
Created customer.proto
Created dailydebitlimit.proto
Created deposit.proto
Created third-party-credit.proto
Created transfer.proto
Created withdrawal.proto
Created transfer.proto
Ran generate protobuf TypeScript files via make
Analyzed account_pb.ts:L1-155
Analyzed transaction_pb.ts:L1-71
Analyzed loader.mjs:L1-27
Analyzed tsconfig.json:L1-26
Edited loader.mjs
Analyzed message.ts:L1-363
Analyzed message-type-registry.ts:L1-234
Analyzed message-route.ts:L1-111
Analyzed executor.ts:L1-82
Analyzed index.ts:L1-15
Analyzed index.ts:L1-152
Analyzed index.ts:L1-488
Analyzed index.ts:L1-800
Analyzed index.ts:L1-800
Analyzed index.ts:L801-1600
Analyzed index.ts:L801-1600
Analyzed index.ts:L1601-1837
Analyzed index.ts:L1601-1880
Ran search for message .name and .type references
Ran search for stub usage across dogma-ts/src
Ran find spec files in dogma, enginekit, testkit
Analyzed executor.spec.ts:L1-68
Analyzed message-route.spec.ts:L1-95
Analyzed message-type-registry.spec.ts:L1-146
Analyzed message.spec.ts:L1-49
Analyzed test.spec.ts:L1-330
Edited message.ts
Edited message-type-registry.ts
Edited message-route.ts
Edited executor.ts
Edited index.ts
Edited index.ts
Edited index.ts
Edited index.ts
Edited index.ts
Edited index.ts
Edited index.ts
Edited executor.spec.ts
Edited message-type-registry.spec.ts
Edited message.spec.ts
Edited test.spec.ts
Edited test.spec.ts
Ran run tests for dogma, enginekit, and testkit · Exited with code 1
Ran run tests for dogma, enginekit, and testkit
Ran list all non-generated TypeScript files in src/example
Analyzed index.ts:L1-4
Analyzed commands.ts:L1-91
Analyzed events.ts:L1-102
Edited transaction.ts
Edited account.ts
Edited daily-debit-limit.ts
Edited deposit.ts
Edited third-party-credit.ts
Edited transfer.ts
Edited withdrawal.ts
Edited commands.ts
Edited account.ts
Edited customer.ts
Edited dailydebitlimit.ts
Edited deposit.ts
Edited third-party-credit.ts
Edited transfer.ts
Edited withdrawal.ts
Edited events.ts
Analyzed account.ts:L1-194
Analyzed customer.ts:L1-96
Analyzed daily-debit-limit.ts:L1-121
Analyzed deposit.ts:L1-95
Analyzed open-account.ts:L1-72
Analyzed transaction.ts:L1-261
Analyzed withdrawal.ts:L1-173
Edited account.ts
Edited customer.ts
Edited daily-debit-limit.ts
Edited deposit.ts
Edited open-account.ts
Edited transaction.ts
Edited transfer.ts
Edited withdrawal.ts
Analyzed third-party-bank.ts:L1-66
Analyzed customer.ts:L1-63
Analyzed ledger.ts:L1-214
Analyzed handler.ts:L800-1400
Analyzed handler.ts:L1-50
Analyzed handler.ts:L1401-1576
Analyzed third-party-bank.ts:L1-66
Analyzed customer.ts:L1-63
Analyzed ledger.ts:L1-214
Analyzed handler.ts:L1-800
Analyzed handler.ts:L801-1576
Edited third-party-bank.ts
Edited customer.ts
Edited ledger.ts
Edited handler.ts
Edited handler.ts
Edited handler.ts
Edited handler.ts
Analyzed account.spec.ts:L1-63
Analyzed customer.spec.ts:L1-58
Analyzed deposit.spec.ts:L1-60
Analyzed transfer.spec.ts:L1-405
Analyzed withdrawal.spec.ts:L1-333
Analyzed third-party-bank.spec.ts:L1-93
Analyzed customer.spec.ts:L1-43
Analyzed ledger.spec.ts:L1-307
Edited account.spec.ts
Edited customer.spec.ts
Edited deposit.spec.ts
Edited transfer.spec.ts
Edited withdrawal.spec.ts
Edited third-party-bank.spec.ts
Edited customer.spec.ts
Edited ledger.spec.ts
Ran typeScript type check build · Exited with code 1
Ran full test suite execution
Analyzed main.ts:L1-116
Analyzed executor.ts:L1-83
Analyzed message-route.ts:L1-112
Analyzed message-type-registry.ts:L1-277
Edited message-type-registry.ts
Edited main.ts
Edited main.ts
Ran typeScript type check build
Ran full test suite execution
Ran protobuf code generation check
Ran git status check

The migration of `dogma-ts` messages to Protocol Buffers (`@bufbuild/protobuf` v2, `@bufbuild/protoc-gen-es` v2, `@dogmatiq/protobuf`, and `makefiles.dev`) is complete.

### Summary of Changes

1. **Build & Protobuf Generation Setup**
   - Added `@bufbuild/protobuf`, `@dogmatiq/protobuf`, and `@bufbuild/protoc-gen-es` to [package.json](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/package.json), along with `"proto": "make generate"` and `makefiles.dev` configuration.
   - Configured [Makefile](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/Makefile) using `makefiles.dev` (`protobuf/v2` and `js/v1`) and [`.clang-format`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/.clang-format).
   - Updated [loader.mjs](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/loader.mjs) to resolve relative `.js` imports emitted by `protoc-gen-es` in generated `*_pb.ts` files when running under Node's TypeScript loader.

2. **Core Dogma, Enginekit & Testkit Schema-First API**
   - Updated [`Message`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/message.ts) to align with `@bufbuild/protobuf`'s `Message` type (`$typeName: string` with top-level fields, dropping `{ type, name, data }`) and re-exported `create` from `@bufbuild/protobuf`.
   - Updated [`registerCommand`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/message-type-registry.ts#L140-L150), [`registerEvent`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/message-type-registry.ts#L154-L164), [`registerDeadline`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/message-type-registry.ts#L168-L178), route builders in [message-route.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/message-route.ts), [`withEventObserver`](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/dogma/executor.ts#L64-L83), and expectation helpers in [testkit/index.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/testkit/index.ts) to accept `GenMessage<T>` schema objects directly.
   - Updated [testkit/engine/index.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/testkit/engine/index.ts) to clone protobuf messages via `clone(schema, msg)` when a schema is registered.

3. **`.proto` Definitions & Generated `*_pb.ts` Files**
   - Created 15 Edition 2024 `.proto` files alongside their companion `.ts` files in `src/example/messages/` and `src/example/domain/` and generated their corresponding `*_pb.ts` files via `npm run proto`:
     - Shared enums: [transaction.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/transaction.proto) ([transaction_pb.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/transaction_pb.ts))
     - Commands: [account.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/account.proto), [daily-debit-limit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/daily-debit-limit.proto), [deposit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/deposit.proto), [third-party-credit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/third-party-credit.proto), [transfer.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/transfer.proto), [withdrawal.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/commands/withdrawal.proto)
     - Events: [account.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/account.proto), [customer.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/customer.proto), [dailydebitlimit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/dailydebitlimit.proto), [deposit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/deposit.proto), [third-party-credit.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/third-party-credit.proto), [transfer.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/transfer.proto), [withdrawal.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/messages/events/withdrawal.proto)
     - Deadline: [transfer.proto](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/domain/transfer.proto)

4. **Example Application & Tests**
   - Updated all message companion modules (`validate` / `describe` registrations), domain handlers (`src/example/domain/*`), integration handler ([third-party-bank.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/integrations/third-party-bank.ts)), SQL projections ([customer.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/ui/projections/customer.ts), [ledger.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/ui/projections/ledger.ts)), UI handler ([handler.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/ui/handler.ts)), entrypoint ([main.ts](file:///Users/kevin/Downloads/Temp/dogma-ts-ai-convert-v2/dogma-ts/src/example/cmd/bank/main.ts)), and all test suites to construct messages with `create(Schema, { ... })` and switch on `m.$typeName`.

### Verification
- `npm run proto` (`make generate`): Succeeded cleanly.
- `npm run build` (`tsc`): Passed with 0 errors.
- `npm test` (`vitest run`): All 22 test files (101 tests) passed.

## Oddities to look into with these Changes

- [ ] Is the marshal/unmarshal valid since the protobuf change? I think protobuf-es has some tools for that?

- [ ] Are the `<message-name>Schema` really required? I guess because they provide full path allowing naming conflicts?

  It looks like some things can work without the Schema, see here how `m` is
  actually the type `OpenAccount` and can be passed in. Internally it does use
  the Schema again though.
  ```typescript
    handleCommand(
    r: Account,
    s: AggregateCommandScope<Account>,
    c: Command,
  ): void {
    const m = c as DomainCommand;
    switch (m.$typeName) {
      case OpenAccountSchema.typeName:
        return openAccount(r, s, m);
  // ...

  function openAccount(
    r: Account,
    s: AggregateCommandScope<Account>,
    m: OpenAccount,
  ) {
    // ...
 
    s.recordEvent(
      create(AccountOpenedSchema, {
        customerId: m.customerId,
        accountId: m.accountId,
        accountName: m.accountName,
      }),
    );
  }
  ```

---
