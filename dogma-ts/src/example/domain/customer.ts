import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  create,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CustomerAcquiredSchema,
  type DomainCommand,
  type DomainEvent,
  OpenAccountForNewCustomerSchema,
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
      handlesCommand(OpenAccountForNewCustomerSchema),
      recordsEvent(CustomerAcquiredSchema),
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
    switch (m.$typeName) {
      case CustomerAcquiredSchema.typeName:
        r.name = m.customerName;
        break;
    }
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.$typeName) {
      case OpenAccountForNewCustomerSchema.typeName:
        return m.customerId;
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
    switch (m.$typeName) {
      case OpenAccountForNewCustomerSchema.typeName:
        if (r.name !== "") {
          s.log("customer has already been acquired");
          return;
        }
        s.recordEvent(
          create(CustomerAcquiredSchema, {
            customerId: m.customerId,
            customerName: m.customerName,
            accountId: m.accountId,
            accountName: m.accountName,
          }),
        );
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};
