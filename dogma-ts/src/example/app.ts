import type { DatabaseSync } from "node:sqlite";
import {
  type Application,
  type ApplicationConfigurer,
  viaAggregate,
  viaIntegration,
  viaProcess,
  viaProjection,
} from "@/dogma/index.ts";
import {
  AccountHandler,
  CustomerHandler,
  DailyDebitLimitHandler,
  DepositProcessHandler,
  OpenAccountForNewCustomerProcessHandler,
  TransactionHandler,
  TransferProcessHandler,
  WithdrawalProcessHandler,
} from "@/example/domain/index.ts";
import { ThirdPartyBankIntegrationHandler } from "@/example/integrations/index.ts";
import {
  CustomerProjectionHandler,
  LedgerProjectionHandler,
  mustNewDB,
} from "@/example/ui/projections/index.ts";
import {
  newSQLProjection,
  SQLiteDriver,
} from "@/projectionkit/sqlprojection/index.ts";

// AppKey is the example application's identity key.
export const AppKey = "22028264-0bca-43e1-8d9d-cd094efb10b7";

export type AppOptions = {
  readDB?: DatabaseSync;
};

// newApp returns a Dogma Application implementation for the example "bank" domain.
export function newApp(options?: DatabaseSync | AppOptions): Application {
  const readDB =
    options && "prepare" in options
      ? options
      : (options?.readDB ?? mustNewDB());

  return {
    configure(c: ApplicationConfigurer): void {
      c.identity("bank", AppKey);

      c.routes(
        viaAggregate(AccountHandler),
        viaAggregate(CustomerHandler),
        viaAggregate(DailyDebitLimitHandler),
        viaAggregate(TransactionHandler),

        viaProcess(DepositProcessHandler),
        viaProcess(OpenAccountForNewCustomerProcessHandler),
        viaProcess(TransferProcessHandler),
        viaProcess(WithdrawalProcessHandler),

        viaIntegration(ThirdPartyBankIntegrationHandler),

        viaProjection(
          newSQLProjection(readDB, SQLiteDriver, CustomerProjectionHandler),
        ),
        viaProjection(
          newSQLProjection(readDB, SQLiteDriver, LedgerProjectionHandler),
        ),
      );
    },
  };
}
