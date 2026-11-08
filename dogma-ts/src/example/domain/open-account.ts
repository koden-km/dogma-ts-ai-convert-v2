import {
  type Context,
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
  CommandName,
  createCommand,
  CustomerAcquired,
  type DomainEvent,
  EventName,
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
        handlesEvent(EventName.CustomerAcquired),
        executesCommand(CommandName.OpenAccount),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.name) {
        case EventName.CustomerAcquired:
          return [m.data.customerID, true];
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
      switch (m.name) {
        case EventName.CustomerAcquired:
          openAccount(s, m);
          s.end();
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };

function openAccount(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: CustomerAcquired,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.OpenAccount, {
      customerID: m.customerID,
      accountID: m.accountID,
      accountName: m.accountName,
    }),
  );
}
