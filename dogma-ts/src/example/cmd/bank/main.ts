import { createServer } from "node:http";
import { withCancel } from "@/dogma/index.ts";
import { fromApplication } from "@/enginekit/index.ts";
import { newApp } from "@/example/app.ts";
import { CommandName, createCommand } from "@/example/messages/index.ts";
import { mustNewDB, newUIHandler } from "@/example/ui/index.ts";
import {
  enableProjections,
  mustNewEngine,
  newCommandExecutor,
  newLogger,
  type OperationOption,
  run,
  withObserver,
} from "@/testkit/index.ts";

async function main() {
  const [ctx, cancel] = withCancel();

  const db = mustNewDB();
  const app = newApp(db);
  const e = mustNewEngine(fromApplication(app));

  const logger = newLogger((s) => {
    console.log(s);
  });

  const loggedFactKinds = new Set([
    "DispatchBegun",
    "HandlingBegun",
    "HandlingCompleted",
    "EventRecordedByAggregate",
    "EventRecordedByIntegration",
    "CommandExecutedByProcess",
    "DeadlineScheduledByProcess",
    "MessageLoggedByAggregate",
    "MessageLoggedByIntegration",
    "MessageLoggedByProcess",
    "MessageLoggedByProjection",
  ]);

  const opts: OperationOption[] = [
    enableProjections(true),
    withObserver({
      notify(f) {
        if (loggedFactKinds.has(f.kind)) {
          logger.notify(f);
        }
      },
    }),
  ];

  const commandExecutor = newCommandExecutor(e, ...opts);

  if (process.env.SEED_SAMPLE_DATA === "true") {
    await commandExecutor.executeCommand(
      ctx,
      createCommand(CommandName.OpenAccountForNewCustomer, {
        customerID: "c-anna",
        customerName: "Anna Smith",
        accountID: "100200300",
        accountName: "Savings",
      }),
    );
    await commandExecutor.executeCommand(
      ctx,
      createCommand(CommandName.Deposit, {
        transactionID: "t-seed-1",
        accountID: "100200300",
        amount: 250000n,
      }),
    );
    await commandExecutor.executeCommand(
      ctx,
      createCommand(CommandName.OpenAccountForNewCustomer, {
        customerID: "c-bob",
        customerName: "Bob Jones",
        accountID: "400500600",
        accountName: "Checking",
      }),
    );
  }

  // Run the engine in the background to process scheduled deadlines.
  void run(ctx, e, 0, ...opts).catch((err) => {
    console.error("engine error:", err);
  });

  const port = Number(process.env.PORT ?? 8080);
  const server = createServer(
    newUIHandler({
      db,
      commandExecutor,
    }),
  );

  const shutdown = () => {
    cancel();
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, () => {
    console.log(`Dogmatiq Bank is running at http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
