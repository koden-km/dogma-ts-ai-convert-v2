import { DebitFailureReason, TransactionType } from "./transaction_pb.ts";

export { DebitFailureReason, TransactionType };

// isDebit returns true if the transaction type is a debit type.
export function isDebit(t: TransactionType): boolean {
  switch (t) {
    case TransactionType.WITHDRAWAL:
    case TransactionType.TRANSFER:
      return true;
    default:
      return false;
  }
}

// isValidTransactionType returns true if the transaction type is valid.
export function isValidTransactionType(t: TransactionType): boolean {
  switch (t) {
    case TransactionType.DEPOSIT:
    case TransactionType.WITHDRAWAL:
    case TransactionType.TRANSFER:
      return true;
    default:
      return false;
  }
}

// formatTransactionType returns the human-readable string for a TransactionType.
export function formatTransactionType(t: TransactionType): string {
  switch (t) {
    case TransactionType.DEPOSIT:
      return "deposit";
    case TransactionType.WITHDRAWAL:
      return "withdrawal";
    case TransactionType.TRANSFER:
      return "transfer";
    default:
      return String(t);
  }
}

// validateTransactionType throws an error if t is not a valid transaction type.
export function validateTransactionType(
  t: TransactionType,
  errorMessage?: string,
) {
  if (!isValidTransactionType(t)) {
    throw new Error(errorMessage || `invalid transaction type: ${String(t)}`);
  }
}

// isValidDebitFailureReason returns true if the debit failure reason is valid.
export function isValidDebitFailureReason(r: DebitFailureReason): boolean {
  switch (r) {
    case DebitFailureReason.INSUFFICIENT_FUNDS:
    case DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED:
      return true;
    default:
      return false;
  }
}

// formatDebitFailureReason returns the human-readable string for a DebitFailureReason.
export function formatDebitFailureReason(r: DebitFailureReason): string {
  switch (r) {
    case DebitFailureReason.INSUFFICIENT_FUNDS:
      return "insufficient funds";
    case DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED:
      return "daily debit limit exceeded";
    default:
      return String(r);
  }
}

// dailyDebitLimitDate returns the date of a transaction for the purposes of
// checking daily debit limits.
//
// It normalizes the date to the UTC timezone so that regardless of which
// timezone is used to schedule the transaction two equivalent times always
// contribute towards the same day's limit.
export function dailyDebitLimitDate(date: Date | string): string {
  const dt = typeof date === "string" ? new Date(date) : date;
  return dt.toISOString().slice(0, 10);
}
