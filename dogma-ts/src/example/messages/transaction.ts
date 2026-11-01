export const TransactionType = {
  // Deposit is a deposit transaction type.
  Deposit: "deposit",

  // Withdrawal is a withdrawal transaction type.
  Withdrawal: "withdrawal",

  // Transfer is a transfer transaction type.
  Transfer: "transfer",
} as const;

// TransactionType defines types of transactions.
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

// isDebit returns true if the transaction type is a debit type.
export function isDebit(t: TransactionType): boolean {
  switch (t) {
    case TransactionType.Withdrawal:
    case TransactionType.Transfer:
      return true;
  }
  return false;
}

// isValidTransactionType returns true if the transaction type is valid.
export function isValidTransactionType(t: TransactionType): boolean {
  switch (t) {
    case TransactionType.Deposit:
    case TransactionType.Withdrawal:
    case TransactionType.Transfer:
      return true;
    default:
      return false;
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

export const DebitFailureReason = {
  // InsufficientFunds means there was not enough funds available in the
  // account to perform the debit.
  InsufficientFunds: "insufficient funds",

  // DailyDebitLimitExceeded means that the debit cannot be performed
  // because it will exceed the account daily debit limit.
  DailyDebitLimitExceeded: "daily debit limit exceeded",
} as const;

// DebitFailureReason defines reasons why a debit may fail.
export type DebitFailureReason =
  (typeof DebitFailureReason)[keyof typeof DebitFailureReason];

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
