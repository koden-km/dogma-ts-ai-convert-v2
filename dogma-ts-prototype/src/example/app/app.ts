// package example

// import (
//   "database/sql"

//   "github.com/dogmatiq/dogma"
//   "github.com/dogmatiq/example/domain"
//   "github.com/dogmatiq/example/projections"
//   "github.com/dogmatiq/projectionkit/sqlprojection"
// )

import { ApplicationConfigurer } from "@/dogma/application.ts";

// NOTE(KM): or maybe like this?
//   import * as domain from "./domain/index.ts"
// Then use it like:
//   domain.AccountHandler
import {
  // Aggregates...
  AccountHandler,
  // CustomerHandler;
  // DailyDebitLimitHandler;
  // TransactionHandler;
  //
  // // Processes...
  // DepositProcessHandler;
  // OpenAccountForNewCustomerProcessHandler;
  // TransferProcessHandler;
  // WithdrawalProcessHandler;
  //
  // // Projections...
  // AccountProjectionHandler;
  // CustomerProjectionHandler;
} from "./domain/index.ts";
import { viaAggregate } from "@/dogma/handler-route.ts";

// AppKey is the example application's identity key.
export const AppKey = "22028264-0bca-43e1-8d9d-cd094efb10b7";

// App is a dogma.Application implementation for the example "bank" domain.
export type App = {
  // Aggregates...
  accountAggregate: typeof AccountHandler;
  // CustomerAggregate: domain.CustomerHandler;
  // DailyDebitLimitAggregate: domain.DailyDebitLimitHandler;
  // TransactionAggregate: domain.TransactionHandler;
  //
  // // Processes...
  // DepositProcess: domain.DepositProcessHandler;
  // OpenAccountForNewCustomerProcess: domain.OpenAccountForNewCustomerProcessHandler;
  // TransferProcess: domain.TransferProcessHandler;
  // WithdrawalProcess: domain.WithdrawalProcessHandler;
  //
  // // Projections...
  // AccountProjection: projections.AccountProjectionHandler;
  // CustomerProjection: projections.CustomerProjectionHandler;
  //
  // // ReadDB is the database to use for read-models. If it is nil the
  // // projection message handlers are omitted from the application
  // // configuration.
  //ReadDB *sql.DB
};

// Configure configures the Dogma engine for this application.
function configure(a: App, c: ApplicationConfigurer) {
  c.identity("bank", AppKey);

  c.routes(
    viaAggregate(a.accountAggregate),
    // viaAggregate(a.customerAggregate),
    // viaAggregate(a.dailyDebitLimitAggregate),
    // viaAggregate(a.transactionAggregate),

    // viaProcess(a.depositProcess),
    // viaProcess(a.openAccountForNewCustomerProcess),
    // viaProcess(a.transferProcess),
    // viaProcess(a.withdrawalProcess),

    // viaIntegration(a.thirdPartyBank),

    // viaProjection(sqlprojection.New(a.ReadDB, sqlprojection.SQLiteDriver, a.accountProjection)),
    // viaProjection(sqlprojection.New(a.ReadDB, sqlprojection.SQLiteDriver, a.customerProjection)),
  );
}
