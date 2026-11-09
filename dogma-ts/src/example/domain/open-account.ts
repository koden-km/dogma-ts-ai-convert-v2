import {
  type Context,
  create,
  type Event,
  executesCommand,
  handlesEvent,
  NoDeadlineMessagesBehavior,
  type ProcessConfigurer,
  type ProcessEventScope,
  type ProcessMessageHandler,
  StatelessProcessBehavior,
  type StatelessProcessRoot,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CustomerAcquired,
  type DomainEvent,
  OpenAccount,
} from "../messages/index.ts";

// OpenAccountForNewCustomerProcessHandler manages the process of opening the
// initial account for a new customer.
export const OpenAccountForNewCustomerProcessHandler: ProcessMessageHandler<StatelessProcessRoot> =
  {
    ...StatelessProcessBehavior,
    ...NoDeadlineMessagesBehavior,

    configure(c: ProcessConfigurer): void {
      c.identity(
        "open-account-for-new-customer",
        "89b39176-a57f-4071-afad-e0db62137fd3",
      );

      c.routes(
        handlesEvent(CustomerAcquired),
        executesCommand(OpenAccount),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case CustomerAcquired.typeName:
          return [m.customerId, true];
        default:
          throw new UnexpectedMessageError();
      }
    },

    handleEvent(
      _ctx: Context,
      _r: StatelessProcessRoot,
      s: ProcessEventScope<StatelessProcessRoot>,
      e: Event,
    ): void {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case CustomerAcquired.typeName:
          s.executeCommand(
            create(OpenAccount, {
              customerId: m.customerId,
              accountId: m.accountId,
              accountName: m.accountName,
            }),
          );
          s.end();
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };
