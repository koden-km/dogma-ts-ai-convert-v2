import { Event, InvalidMessageError, defineEvents } from "@/dogma/message.ts";

export const EventName = {
  CustomerAcquired: "CustomerAcquired",
} as const;

// CustomerAcquired is an event indicating that a new customer has been
// acquired.
export type CustomerAcquired = Event & {
  name: typeof EventName.CustomerAcquired;
  data: {
    customerID: string;
    customerName: string;
    accountID: string;
    accountName: string;
  };
};

export type DomainEvent = CustomerAcquired;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.CustomerAcquired,
      validateCustomerAcquired,
      describeCustomerAcquired,
    ],
  ]);

function validateCustomerAcquired({ data: m }: CustomerAcquired) {
  if (m.customerID == "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty customer ID",
    );
  }
  if (m.customerName == "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty name",
    );
  }
  if (m.accountID == "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty account ID",
    );
  }
  if (m.accountName == "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty account name",
    );
  }
}

function describeCustomerAcquired({ data: m }: CustomerAcquired) {
  return `acquired customer ${m.customerID} ${m.customerName}`;
}
