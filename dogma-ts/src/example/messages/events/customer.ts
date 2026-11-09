import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import {
  type CustomerAcquired as CustomerAcquiredMessage,
  CustomerAcquiredSchema,
} from "./customer_pb.ts";

export type CustomerAcquired = CustomerAcquiredMessage;
export const CustomerAcquired = CustomerAcquiredSchema;

export type DomainEvent = CustomerAcquired;

registerEvent(
  CustomerAcquired,
  "ddf33f6c-d120-440e-b611-b86a6c3b80a6",
  {
    validate: validateCustomerAcquired,
    describe: describeCustomerAcquired,
    allowIdempotent: true,
  },
);

function validateCustomerAcquired(m: CustomerAcquired) {
  if (m.customerId === "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty customer ID",
    );
  }
  if (m.customerName === "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty name",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty account ID",
    );
  }
  if (m.accountName === "") {
    throw new InvalidMessageError(
      "CustomerAcquired must not have an empty account name",
    );
  }
}

function describeCustomerAcquired(m: CustomerAcquired) {
  return `acquired customer ${m.customerId} ${m.customerName}`;
}
