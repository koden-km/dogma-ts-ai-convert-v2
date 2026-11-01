import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  createEvent,
  type DomainCommand,
  type DomainEvent,
  EventName,
  type OpenAccountForNewCustomer,
} from "../messages/index.ts";

// Customer is the aggregate root for a bank customer.
export type Customer = AggregateRoot & {
  name: string;
};

// CustomerHandler implements the business logic for a bank customer.
export const CustomerHandler: AggregateMessageHandler<Customer> = {
  ...NoSnapshotBehavior,

  configure(c: AggregateConfigurer): void {
    c.identity("customer", "f30111d5-f100-4495-90ad-b09746ba8477");

    c.routes(
      handlesCommand<OpenAccountForNewCustomer>(
        CommandName.OpenAccountForNewCustomer,
      ),
      recordsEvent(EventName.CustomerAcquired),
    );
  },

  newRoot(): Customer {
    return {
      name: "",
    };
  },

  describeInstance(r: Customer): string {
    return r.name;
  },

  applyEvent(r: Customer, e: Event): void {
    const m = e as DomainEvent;
    switch (m.name) {
      case EventName.CustomerAcquired:
        r.name = m.data.customerName;
        break;
    }
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.name) {
      case CommandName.OpenAccountForNewCustomer:
        return m.data.customerID;
      default:
        throw new UnexpectedMessageError();
    }
  },

  handleCommand(
    r: Customer,
    s: AggregateCommandScope<Customer>,
    c: Command,
  ): void {
    const m = c as DomainCommand;
    switch (m.name) {
      case CommandName.OpenAccountForNewCustomer:
        if (r.name !== "") {
          s.log("customer has already been acquired");
          return;
        }
        s.recordEvent(
          createEvent(EventName.CustomerAcquired, {
            customerID: m.data.customerID,
            customerName: m.data.customerName,
            accountID: m.data.accountID,
            accountName: m.data.accountName,
          }),
        );
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};
