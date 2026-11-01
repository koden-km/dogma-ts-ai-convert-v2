import {
  type Command,
  handlesCommand,
  type IntegrationCommandScope,
  type IntegrationConfigurer,
  type IntegrationMessageHandler,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  createEvent,
  type DomainCommand,
  EventName,
  formatAmount,
} from "@/example/messages/index.ts";

// ThirdPartyBankIntegrationHandler handles commands that interact with
// a hypothetical third-party bank's API on behalf of the application.
export const ThirdPartyBankIntegrationHandler: IntegrationMessageHandler = {
  configure(c: IntegrationConfigurer): void {
    c.identity("third-party-bank", "f2a7e4b1-9c3d-4f8a-b6e5-1d0c2a9f7e3b");

    c.routes(
      handlesCommand(CommandName.CreditThirdPartyAccount),
      recordsEvent(EventName.ThirdPartyAccountCredited),
      recordsEvent(EventName.ThirdPartyAccountCreditFailed),
    );
  },

  handleCommand(_ctx, s: IntegrationCommandScope, c: Command): void {
    const m = c as DomainCommand;

    switch (m.name) {
      case CommandName.CreditThirdPartyAccount:
        s.log(
          `crediting third-party account ${m.data.accountID} with ${formatAmount(m.data.amount)} (transaction ${m.data.transactionID})`,
        );

        if (!/^\d+$/.test(m.data.accountID)) {
          s.log(
            `third-party bank rejected the credit: account ${m.data.accountID} not found`,
          );
          s.recordEvent(
            createEvent(EventName.ThirdPartyAccountCreditFailed, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              amount: m.data.amount,
            }),
          );
        } else {
          s.recordEvent(
            createEvent(EventName.ThirdPartyAccountCredited, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              amount: m.data.amount,
            }),
          );
        }
        return;

      default:
        throw new UnexpectedMessageError();
    }
  },
};
