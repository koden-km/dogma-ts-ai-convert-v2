import {
  type Command,
  create,
  handlesCommand,
  type IntegrationCommandScope,
  type IntegrationConfigurer,
  type IntegrationMessageHandler,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CreditThirdPartyAccount,
  type DomainCommand,
  formatAmount,
  ThirdPartyAccountCredited,
  ThirdPartyAccountCreditFailed,
} from "@/example/messages/index.ts";

// ThirdPartyBankIntegrationHandler handles commands that interact with
// a hypothetical third-party bank's API on behalf of the application.
export const ThirdPartyBankIntegrationHandler: IntegrationMessageHandler = {
  configure(c: IntegrationConfigurer): void {
    c.identity("third-party-bank", "f2a7e4b1-9c3d-4f8a-b6e5-1d0c2a9f7e3b");

    c.routes(
      handlesCommand(CreditThirdPartyAccount),
      recordsEvent(ThirdPartyAccountCredited),
      recordsEvent(ThirdPartyAccountCreditFailed),
    );
  },

  handleCommand(_ctx, s: IntegrationCommandScope, c: Command): void {
    const m = c as DomainCommand;

    switch (m.$typeName) {
      case CreditThirdPartyAccount.typeName:
        s.log(
          `crediting third-party account ${m.accountId} with ${formatAmount(m.amount)} (transaction ${m.transactionId})`,
        );

        if (!/^\d+$/.test(m.accountId)) {
          s.log(
            `third-party bank rejected the credit: account ${m.accountId} not found`,
          );
          s.recordEvent(
            create(ThirdPartyAccountCreditFailed, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
        } else {
          s.recordEvent(
            create(ThirdPartyAccountCredited, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
        }
        return;

      default:
        throw new UnexpectedMessageError();
    }
  },
};
