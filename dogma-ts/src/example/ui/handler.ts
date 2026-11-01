import { randomUUID } from "node:crypto";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { STATUS_CODES } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  backgroundContext,
  type CommandExecutor,
  EventObserverNotSatisfiedError,
  withEventObserver,
} from "@/dogma/index.ts";
import {
  CommandName,
  createCommand,
  EventName,
  formatAmount,
  type TransferDeclined,
  type WithdrawalDeclined,
} from "@/example/messages/index.ts";

export type UIHandlerConfig = {
  db: DatabaseSync;
  commandExecutor: CommandExecutor;
};

type PageData = {
  title: string;
  customerID?: string;
  customerName?: string;
};

type Customer = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
  balance: bigint;
};

type AccountGroup = {
  customerID: string;
  customerName: string;
  isOwn: boolean;
  accounts: Account[];
};

type TransactionRow = {
  occurredAt: Date;
  description: string;
  debit: bigint;
  credit: bigint;
  balance: bigint;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMoney(cents: bigint | number): string {
  return formatAmount(BigInt(cents));
}

export function parseMoney(s: string): bigint {
  const cleaned = s.trim().replace(/^\$/, "");
  const f = Number.parseFloat(cleaned);
  if (!Number.isFinite(f)) {
    throw new Error("invalid amount");
  }
  if (f <= 0) {
    throw new Error("amount must be positive");
  }
  return BigInt(Math.round(f * 100));
}

function parseSchedule(s: string): Date {
  const now = Date.now();
  switch (s) {
    case "10s":
      return new Date(now + 10_000);
    case "1m":
      return new Date(now + 60_000);
    default:
      return new Date(now);
  }
}

function generateAccountID(): string {
  const n = Math.floor(Math.random() * 900_000_000) + 100_000_000;
  return String(n);
}

function formatDate(d: Date): string {
  return d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const LAYOUT_CSS = `:root {
  --carbon-black: #1b1b1e;
  --deep-teal: #708d81;
  --porcelain: #fffffa;
  --honeydew: #d4e8e0;
  --tiger-orange: #f58a07;

  --font-weight-normal: 300;
  --font-weight-semibold: 400;
  --font-weight-bold: 500;
  --font-weight-extrabold: 600;
}

body {
  margin: 2rem auto;
  min-height: 100vh;
  max-width: 768px;
  color: var(--honeydew);
  background: linear-gradient(
    160deg,
    var(--deep-teal),
    color-mix(in srgb, var(--deep-teal) 75%, black)
  );
  font-family: system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-weight: var(--font-weight-normal);

  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

p {
  margin: 0;
  padding: 0;
  font-size: 0.95rem;
}

em {
  color: var(--porcelain);
  font-style: normal;
}

h1,
h2 {
  font-weight: var(--font-weight-semibold);
  padding: 0;
  margin: 0;
}

h1 {
  font-size: 1.675rem;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
  color: var(--porcelain);
  font-weight: var(--font-weight-extrabold);
}

h2 {
  font-size: 1.2rem;
}

strong {
  font-weight: var(--font-weight-semibold);
}

[data-lucide] {
  width: 1em;
  height: 1em;
  display: inline-block;
}

a {
  all: unset;
  cursor: pointer;
}

a[role="link"]:hover {
  text-decoration: underline;
}

h1 a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

header {
  padding: 0.25rem;
  height: 3rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  a[role="link"] {
    color: var(--porcelain);
  }

  .user-info {
    display: flex;
    flex-direction: column;
    text-align: right;
  }

  .logout {
    font-size: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    justify-content: flex-end;
  }
}

main {
  padding: 2rem;
  border-radius: 4px;
  color: var(--carbon-black);
  background: var(--porcelain);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  a[role="link"] {
    color: var(--deep-teal);
  }

  small {
    color: var(--deep-teal);
  }
}

button,
a[role="button"],
.buttons a:not([role]) {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-width: 6rem;
  font: inherit;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &[disabled] {
    cursor: not-allowed;
  }
}

main button,
main a[role="button"] {
  background: var(--tiger-orange);
  color: var(--porcelain);

  &:not([disabled]):hover {
    background: color-mix(in srgb, var(--tiger-orange) 80%, white);
  }
}

.buttons a:not([role]) {
  background: none;
  color: var(--deep-teal);

  &:hover {
    background: color-mix(in srgb, var(--porcelain) 80%, var(--deep-teal));
  }
}

footer {
  margin: 0 auto;
  width: 90%;
  display: grid;
  gap: 0.25rem;
  grid-template-columns: 1fr auto;
  align-items: center;
  font-size: 0.85rem;

  a[role="link"] {
    color: var(--porcelain);
  }

  a[role="button"] {
    background: color-mix(in srgb, var(--porcelain) 15%, transparent);
    color: var(--porcelain);
    padding: 0.35rem 0.75rem;

    &:hover {
      background: color-mix(in srgb, var(--porcelain) 25%, transparent);
    }
  }

  svg {
    display: inline-block;
    width: 1.25em;
    height: 1.25em;
  }

  .version {
    grid-column: 2;
    text-align: center;
  }
}

.admonition {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  background: color-mix(in srgb, var(--honeydew) 40%, var(--porcelain));
  padding: 0.75rem 1rem;
  border-radius: 4px;

  [data-lucide] {
    flex-shrink: 0;
    width: 1.5em;
    height: 1.5em;
    align-self: center;
    color: var(--tiger-orange);
  }

  &.error {
    background: color-mix(in srgb, var(--tiger-orange) 10%, var(--porcelain));
  }
}

:is(button, a[role="button"]):has(+ :is(button, a[role="button"])) {
  background: var(--porcelain);
  color: var(--deep-teal);
  box-shadow: inset 0 0 0 2px var(--honeydew);

  &:hover {
    background: color-mix(in srgb, var(--porcelain) 80%, var(--deep-teal));
  }
}

.buttons {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

label {
  display: block;
  font-weight: var(--font-weight-bold);
  margin-bottom: -1.25rem;
}

form > label {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: -0.025em;
}

.radio-group {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;

  label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: normal;
    margin-bottom: 0;
    cursor: pointer;

    input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checked,
    .unchecked {
      color: var(--deep-teal);
    }

    .checked {
      display: none;
    }

    .unchecked {
      display: inline-block;
    }

    &:has(input:checked) {
      .checked {
        display: inline-block;
      }

      .unchecked {
        display: none;
      }
    }
  }
}

:focus-visible {
  outline: none;
}

input,
select {
  font: inherit;
  color: var(--carbon-black);
  border: 2px solid var(--deep-teal);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  background: var(--porcelain);

  &[disabled] {
    color: var(--deep-teal);
    cursor: not-allowed;
  }
}

select {
  appearance: none;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  background: var(--porcelain)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23708d81' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 0.75rem center;
  cursor: pointer;
}

article {
  background: var(--porcelain);
  border: 1px solid var(--honeydew);
  border-radius: 4px;
  padding: 1rem;

  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;

  > div {
    display: flex;
    flex-direction: column;
    gap: 0;

    &:first-of-type {
      flex-grow: 1;
    }

    &:last-of-type {
      text-align: right;
      margin-left: 1rem;
    }
  }

  > :first-child[data-lucide] {
    width: 2rem;
    height: 2rem;
  }

  > :last-child[data-lucide] {
    width: 1.5em;
    height: 1.5em;
  }
}

.icon-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;

  [data-lucide] {
    width: 1em;
    height: 1em;
  }

  &:hover {
    background: color-mix(in srgb, var(--porcelain) 80%, var(--deep-teal));
  }
}

a > article:hover {
  background: color-mix(in srgb, var(--porcelain) 80%, var(--honeydew));
}

small {
  margin: 0;
  padding: 0;
  font-size: 0.675rem;
  color: color-mix(in srgb, var(--honeydew) 50%, transparent);
  text-transform: uppercase;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  thead {
    font-size: 0.7rem;
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: -0.025em;
    color: var(--deep-teal);
  }

  th,
  td {
    text-align: left;
    padding: 0.5rem 1rem;
    white-space: nowrap;

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
    }

    &.grow {
      width: 100%;
      white-space: normal;

      div {
        display: flex;
        flex-direction: column;
      }
    }
  }

  tr + tr td {
    border-top: 1px solid var(--honeydew);
  }

  .numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  td[colspan] {
    text-align: center;
  }
}`;

function renderLayout(page: PageData, content: string): string {
  const homeHref = page.customerID
    ? `/c/${encodeURIComponent(page.customerID)}/accounts`
    : "/";
  const userInfo = page.customerID
    ? `<div class="user-info">
        <span>Logged in as <em>${escapeHtml(page.customerName ?? "")}</em></span>
        <a href="/" role="link" class="logout">
          <i data-lucide="log-out"></i> Log Out
        </a>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(page.title)} &mdash; Dogmatiq Bank</title>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="stylesheet" href="https://unpkg.com/modern-normalize" />

    <style>
${LAYOUT_CSS}
    </style>
  </head>
  <body>
    <header>
      <h1>
        <a href="${homeHref}"><i data-lucide="landmark"></i> Dogmatiq Bank</a>
      </h1>
      ${userInfo}
    </header>

    <main>${content}</main>

    <footer>
      <span>
        This is a demo of
        <a href="https://github.com/dogmatiq/dogma#readme" role="link">Dogma</a>
        &mdash; a toolkit for building message-driven applications.
      </span>
      <a href="https://github.com/dogmatiq/example" role="button">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-1.23 3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        View on GitHub
      </a>
      <small class="version">
        Version &lt;dev&gt;
      </small>
    </footer>

    <script>
      lucide.createIcons();
      document.addEventListener("htmx:afterSwap", (e) => {
        lucide.createIcons({ nodes: [e.detail.elt] });
      });
    </script>
  </body>
</html>`;
}

function renderAccountsFragmentHTML(
  customerID: string,
  accounts: Account[],
): string {
  const items = accounts
    .map(
      (a) => `<a href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(a.id)}/transactions">
  <article>
    <i data-lucide="piggy-bank"></i>
    <div>
      <strong>${escapeHtml(a.name)}</strong>
      <small>${escapeHtml(a.id)}</small>
    </div>
    <div>
      <small>Balance</small>
      <strong>${escapeHtml(formatMoney(a.balance))}</strong>
    </div>
    <i data-lucide="chevron-right" aria-hidden="true"></i>
  </article>
</a>`,
    )
    .join("\n");

  return `${items}
<div class="buttons">
  <a href="/c/${encodeURIComponent(customerID)}/accounts/new" role="button"><i data-lucide="circle-plus"></i> Open a new account</a>
</div>`;
}

function renderTransactionsFragmentHTML(
  customerID: string,
  accountID: string,
  transactions: TransactionRow[],
): string {
  if (transactions.length === 0) {
    return `<p class="admonition">
  <i data-lucide="banknote-x"></i>
  <span>
    <strong>No transactions</strong><br />
    Visit the
    <a href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/atm" role="link">Virtual ATM</a>
    to make a deposit.
  </span>
</p>`;
  }

  const rows = transactions
    .map(
      (t) => `<tr>
      <td class="grow">
        <div>
          ${escapeHtml(t.description)}
          <small>${escapeHtml(formatDate(t.occurredAt))} &bullet; ${escapeHtml(formatTime(t.occurredAt))}</small>
        </div>
      </td>
      <td class="numeric">${t.debit > 0n ? escapeHtml(formatMoney(t.debit)) : ""}</td>
      <td class="numeric">${t.credit > 0n ? escapeHtml(formatMoney(t.credit)) : ""}</td>
      <td class="numeric">${escapeHtml(formatMoney(t.balance))}</td>
    </tr>`,
    )
    .join("\n");

  return `<table>
  <thead>
    <tr>
      <th class="grow">Description</th>
      <th class="numeric">Debit</th>
      <th class="numeric">Credit</th>
      <th class="numeric">Balance</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

async function readFormBody(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return new URLSearchParams(body);
}

function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { Location: location });
  res.end();
}

function renderError(
  res: ServerResponse,
  code: number,
  detail: string = "",
): void {
  const statusText = STATUS_CODES[code] ?? "Error";
  const icon = code === 404 ? "search-x" : "server-crash";
  let msgHtml: string;
  if (detail) {
    msgHtml = `<p>${escapeHtml(detail)}</p>`;
  } else if (code === 404) {
    msgHtml = `<p>The page you're looking for doesn't exist or may have been removed.</p>`;
  } else {
    msgHtml = `<p>Something went wrong. Please try again later.</p>`;
  }

  const content = `<h2>
  ${escapeHtml(statusText)}
  <small style="display: block">HTTP ${code}</small>
</h2>

<div class="admonition">
  <i data-lucide="${icon}"></i>
  ${msgHtml}
</div>

<div class="buttons">
  <a href="/"><i data-lucide="chevron-left"></i> Home</a>
</div>`;

  sendHtml(res, code, renderLayout({ title: statusText }, content));
}

// newUIHandler returns a Node HTTP RequestListener that serves the Dogmatiq Bank UI.
export function newUIHandler({
  db,
  commandExecutor,
}: UIHandlerConfig): RequestListener {
  const queryCustomers = (): Customer[] => {
    const stmt = db.prepare(`SELECT id, name FROM customers ORDER BY name`);
    return stmt.all() as Customer[];
  };

  const queryCustomerName = (customerID: string): string | undefined => {
    const stmt = db.prepare(`SELECT name FROM customers WHERE id = ?`);
    const row = stmt.get(customerID) as { name: string } | undefined;
    return row?.name;
  };

  const queryAccountDetails = (
    accountID: string,
  ): { name: string; balance: bigint } | undefined => {
    const stmt = db.prepare(`SELECT name, balance FROM accounts WHERE id = ?`);
    const row = stmt.get(accountID) as
      | { name: string; balance: number | bigint }
      | undefined;
    if (!row) {
      return undefined;
    }
    return { name: row.name, balance: BigInt(row.balance) };
  };

  const queryAccounts = (customerID: string): Account[] => {
    const stmt = db.prepare(
      `SELECT id, name, balance FROM accounts WHERE customer_id = ? ORDER BY name`,
    );
    const rows = stmt.all(customerID) as Array<{
      id: string;
      name: string;
      balance: number | bigint;
    }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      balance: BigInt(r.balance),
    }));
  };

  const queryAllAccountsGrouped = (
    currentCustomerID: string,
    excludeAccountID: string,
  ): AccountGroup[] => {
    const stmt = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.balance,
        a.customer_id,
        c.name AS customer_name
      FROM accounts AS a
      INNER JOIN customers AS c
        ON c.id = a.customer_id
      WHERE a.id != ?
      ORDER BY
        CASE WHEN a.customer_id = ? THEN 0 ELSE 1 END,
        c.name,
        a.name
    `);
    const rows = stmt.all(excludeAccountID, currentCustomerID) as Array<{
      id: string;
      name: string;
      balance: number | bigint;
      customer_id: string;
      customer_name: string;
    }>;

    const groups: AccountGroup[] = [];
    for (const r of rows) {
      let g = groups[groups.length - 1];
      if (!g || g.customerID !== r.customer_id) {
        const isOwn = r.customer_id === currentCustomerID;
        g = {
          customerID: r.customer_id,
          customerName: isOwn ? "My Accounts" : r.customer_name,
          isOwn,
          accounts: [],
        };
        groups.push(g);
      }
      g.accounts.push({
        id: r.id,
        name: r.name,
        balance: BigInt(r.balance),
      });
    }
    return groups;
  };

  const queryTransactions = (accountID: string): TransactionRow[] => {
    const stmt = db.prepare(`
      SELECT
        created_at,
        description,
        debit,
        credit,
        balance
      FROM ledger
      WHERE account_id = ?
      ORDER BY
        created_at DESC,
        transaction_order DESC
    `);
    const rows = stmt.all(accountID) as Array<{
      created_at: string;
      description: string;
      debit: number | bigint;
      credit: number | bigint;
      balance: number | bigint;
    }>;
    return rows.map((r) => ({
      occurredAt: new Date(r.created_at),
      description: r.description,
      debit: BigInt(r.debit),
      credit: BigInt(r.credit),
      balance: BigInt(r.balance),
    }));
  };

  const renderSignup = (res: ServerResponse, formError: string = ""): void => {
    const errHtml = formError
      ? `<div class="admonition error">
  <i data-lucide="circle-alert"></i>
  <p>${escapeHtml(formError)}</p>
</div>`
      : "";

    const content = `<h2>Sign Up</h2>
${errHtml}
<div class="narrow">
  <form method="POST" action="/signup">
    <label for="customer_name">Your Name</label>
    <input
      type="text"
      id="customer_name"
      name="customer_name"
      placeholder="e.g. Anna Smith"
      required
    />

    <label for="account_name">Account Name</label>
    <input
      type="text"
      id="account_name"
      name="account_name"
      placeholder="e.g. Savings"
      required
    />

    <div class="buttons">
      <a href="/"><i data-lucide="chevron-left"></i> Back to Login</a>
      <button type="submit"><i data-lucide="circle-plus"></i> Open Account</button>
    </div>
  </form>
</div>`;

    sendHtml(
      res,
      formError ? 422 : 200,
      renderLayout({ title: "Sign Up" }, content),
    );
  };

  const renderOpenAccount = (
    res: ServerResponse,
    customerID: string,
    formError: string = "",
  ): void => {
    const customerName = queryCustomerName(customerID);
    if (customerName === undefined) {
      renderError(res, 404);
      return;
    }

    const errHtml = formError
      ? `<div class="admonition error">
  <i data-lucide="circle-alert"></i>
  <p>${escapeHtml(formError)}</p>
</div>`
      : "";

    const content = `<h2>Open a New Account</h2>
${errHtml}
<div class="narrow">
  <form method="POST" action="/c/${encodeURIComponent(customerID)}/accounts">
    <label for="account_name">Account Name</label>
    <input
      type="text"
      id="account_name"
      name="account_name"
      placeholder="e.g. Savings"
      required
    />
    <div class="buttons">
      <a href="/c/${encodeURIComponent(customerID)}/accounts"><i data-lucide="chevron-left"></i> Back to Accounts</a>
      <button type="submit"><i data-lucide="circle-plus"></i> Open Account</button>
    </div>
  </form>
</div>`;

    sendHtml(
      res,
      formError ? 422 : 200,
      renderLayout(
        {
          title: "Open a New Account",
          customerID,
          customerName,
        },
        content,
      ),
    );
  };

  const renderATM = (
    res: ServerResponse,
    customerID: string,
    accountID: string,
    formError: string = "",
  ): void => {
    const customerName = queryCustomerName(customerID);
    const account = queryAccountDetails(accountID);
    if (customerName === undefined || !account) {
      renderError(res, 404);
      return;
    }

    const errHtml = formError
      ? `<div class="admonition error">
  <i data-lucide="circle-alert"></i>
  <p>${escapeHtml(formError)}</p>
</div>`
      : "";

    const content = `<h2>Virtual ATM</h2>

<article>
  <i data-lucide="piggy-bank"></i>
  <div>
    <strong>${escapeHtml(account.name)}</strong>
    <small>${escapeHtml(accountID)}</small>
  </div>
  <div>
    <small>Balance</small>
    <strong>${escapeHtml(formatMoney(account.balance))}</strong>
  </div>
</article>

${errHtml}

<form method="POST">
  <label for="amount">Amount</label>
  <input
    type="text"
    id="amount"
    name="amount"
    placeholder="e.g. 100.00"
    required
  />
  <div class="buttons">
    <a href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions"><i data-lucide="chevron-left"></i> Back to Transactions</a>
    <button
      type="submit"
      formaction="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/deposit"
    >
      <i data-lucide="banknote-arrow-up"></i> Deposit
    </button>
    <button
      type="submit"
      formaction="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/withdraw"
    >
      <i data-lucide="banknote-arrow-down"></i> Withdraw
    </button>
  </div>
</form>`;

    sendHtml(
      res,
      formError ? 422 : 200,
      renderLayout(
        {
          title: `Virtual ATM: ${account.name}`,
          customerID,
          customerName,
        },
        content,
      ),
    );
  };

  const renderTransfer = (
    res: ServerResponse,
    customerID: string,
    accountID: string,
    formError: string = "",
  ): void => {
    const customerName = queryCustomerName(customerID);
    const account = queryAccountDetails(accountID);
    if (customerName === undefined || !account) {
      renderError(res, 404);
      return;
    }

    const groups = queryAllAccountsGrouped(customerID, accountID);

    const errHtml = formError
      ? `<div class="admonition error">
  <i data-lucide="circle-alert"></i>
  <p>${escapeHtml(formError)}</p>
</div>`
      : "";

    const hasGroups = groups.length > 0;
    const optionsHtml = hasGroups
      ? `<option value="" selected disabled>Select a destination account&hellip;</option>` +
        groups
          .map(
            (g) => `<optgroup label="${escapeHtml(g.customerName)}">
        ${g.accounts
          .map(
            (a) =>
              `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)} (${escapeHtml(a.id)})${g.isOwn ? ` — ${escapeHtml(formatMoney(a.balance))}` : ""}</option>`,
          )
          .join("\n")}
      </optgroup>`,
          )
          .join("\n")
      : `<option>No other accounts</option>`;

    const content = `<h2>Transfer</h2>

<article>
  <i data-lucide="piggy-bank"></i>
  <div>
    <strong>${escapeHtml(account.name)}</strong>
    <small>${escapeHtml(accountID)}</small>
  </div>
  <div>
    <small>Balance</small>
    <strong>${escapeHtml(formatMoney(account.balance))}</strong>
  </div>
</article>

${errHtml}

<form
  method="POST"
  action="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transfer"
>
  <label for="to_account_id">Destination Account</label>
  <select
    id="to_account_id"
    name="to_account_id"
    required
    ${hasGroups ? "" : "disabled"}
  >
    ${optionsHtml}
  </select>

  <label for="amount">Amount</label>
  <input
    type="text"
    id="amount"
    name="amount"
    placeholder="e.g. 25.00"
    required
  />

  <label>Schedule</label>
  <div class="radio-group">
    <label>
      <input type="radio" name="schedule" value="now" checked />
      <i data-lucide="circle" class="unchecked"></i>
      <i data-lucide="circle-check-big" class="checked"></i>
      Now
    </label>
    <label>
      <input type="radio" name="schedule" value="10s" />
      <i data-lucide="circle" class="unchecked"></i>
      <i data-lucide="circle-check-big" class="checked"></i>
      In 10 seconds
    </label>
    <label>
      <input type="radio" name="schedule" value="1m" />
      <i data-lucide="circle" class="unchecked"></i>
      <i data-lucide="circle-check-big" class="checked"></i>
      In 1 minute
    </label>
  </div>

  <div class="buttons">
    <a href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions"><i data-lucide="chevron-left"></i> Back to Transactions</a>
    <button type="submit" ${hasGroups ? "" : "disabled"}>
      <i data-lucide="arrow-right-left"></i> Transfer
    </button>
  </div>
</form>`;

    sendHtml(
      res,
      formError ? 422 : 200,
      renderLayout(
        {
          title: "Transfer",
          customerID,
          customerName,
        },
        content,
      ),
    );
  };

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = url.pathname;

      // GET /
      if (method === "GET" && path === "/") {
        const customers = queryCustomers();
        const hasCustomers = customers.length > 0;
        const options = customers
          .map(
            (c) =>
              `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`,
          )
          .join("\n");

        const content = `<h2>Welcome to Dogmatiq Bank</h2>

<section>
  <form method="GET">
    <label for="customer">Customer</label>
    <select
      id="customer"
      name="customer"
      onchange="this.form.action = '/c/' + this.value + '/accounts'"
      required
      ${hasCustomers ? "" : "disabled"}
    >
      <option value="" selected disabled>Select a customer&hellip;</option>
      ${options}
    </select>

    <div class="buttons">
      <a href="/signup" role="button"><i data-lucide="user-plus"></i> Sign Up</a>
      <button type="submit" ${hasCustomers ? "" : "disabled"}>
        <i data-lucide="log-in"></i> Log In
      </button>
    </div>
  </form>
</section>`;

        sendHtml(res, 200, renderLayout({ title: "Welcome" }, content));
        return;
      }

      // GET /signup
      if (method === "GET" && path === "/signup") {
        renderSignup(res);
        return;
      }

      // POST /signup
      if (method === "POST" && path === "/signup") {
        const form = await readFormBody(req);
        const customerName = (form.get("customer_name") ?? "").trim();
        const accountName = (form.get("account_name") ?? "").trim();

        if (!customerName || !accountName) {
          renderSignup(res, "Name is required.");
          return;
        }

        const customerID = randomUUID();
        const accountID = generateAccountID();

        await commandExecutor.executeCommand(
          backgroundContext(),
          createCommand(CommandName.OpenAccountForNewCustomer, {
            customerID,
            customerName,
            accountID,
            accountName,
          }),
        );

        redirect(res, `/c/${encodeURIComponent(customerID)}/accounts`);
        return;
      }

      // Match /c/:customerID/accounts...
      const accountsMatch = path.match(/^\/c\/([^/]+)\/accounts(\/.*)?$/);
      if (accountsMatch) {
        const customerID = decodeURIComponent(accountsMatch[1]);
        const sub = accountsMatch[2] ?? "";

        if (method === "GET" && sub === "") {
          const customerName = queryCustomerName(customerID);
          if (customerName === undefined) {
            renderError(res, 404);
            return;
          }
          const accounts = queryAccounts(customerID);
          const content = `<h2>Your Accounts</h2>

<div
  style="display: contents"
  hx-get="/c/${encodeURIComponent(customerID)}/accounts/fragment"
  hx-trigger="every 3s"
  hx-swap="innerHTML"
>
  ${renderAccountsFragmentHTML(customerID, accounts)}
</div>`;

          sendHtml(
            res,
            200,
            renderLayout(
              { title: "Your Accounts", customerID, customerName },
              content,
            ),
          );
          return;
        }

        if (method === "GET" && sub === "/fragment") {
          const accounts = queryAccounts(customerID);
          sendHtml(res, 200, renderAccountsFragmentHTML(customerID, accounts));
          return;
        }

        if (method === "GET" && sub === "/new") {
          renderOpenAccount(res, customerID);
          return;
        }

        if (method === "POST" && sub === "") {
          const form = await readFormBody(req);
          const accountName = (form.get("account_name") ?? "").trim();
          if (!accountName) {
            renderOpenAccount(res, customerID, "Account name is required.");
            return;
          }
          const accountID = generateAccountID();
          await commandExecutor.executeCommand(
            backgroundContext(),
            createCommand(CommandName.OpenAccount, {
              customerID,
              accountID,
              accountName,
            }),
          );
          redirect(res, `/c/${encodeURIComponent(customerID)}/accounts`);
          return;
        }

        const acctActionMatch = sub.match(/^\/([^/]+)\/(.+)$/);
        if (acctActionMatch) {
          const accountID = decodeURIComponent(acctActionMatch[1]);
          const action = acctActionMatch[2];

          if (method === "GET" && action === "transactions") {
            const customerName = queryCustomerName(customerID);
            const account = queryAccountDetails(accountID);
            if (customerName === undefined || !account) {
              renderError(res, 404);
              return;
            }
            const transactions = queryTransactions(accountID);
            const content = `<h2>Transactions</h2>

<article>
  <i data-lucide="piggy-bank"></i>
  <div>
    <strong>${escapeHtml(account.name)}</strong>
    <small>${escapeHtml(accountID)}</small>
  </div>

  <a href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/atm" class="icon-action">
    <i data-lucide="banknote"></i>
    <small>Virtual ATM</small>
  </a>
  <a
    href="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transfer"
    class="icon-action"
  >
    <i data-lucide="arrow-right-left"></i>
    <small>Transfer</small>
  </a>

  <div>
    <small>Balance</small>
    <strong>${escapeHtml(formatMoney(account.balance))}</strong>
  </div>
</article>

<div
  hx-get="/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions/fragment"
  hx-trigger="every 3s"
  hx-swap="innerHTML"
>
  ${renderTransactionsFragmentHTML(customerID, accountID, transactions)}
</div>

<div class="buttons">
  <a href="/c/${encodeURIComponent(customerID)}/accounts"><i data-lucide="chevron-left"></i> Back to Accounts</a>
</div>`;

            sendHtml(
              res,
              200,
              renderLayout(
                {
                  title: `Transactions: ${account.name}`,
                  customerID,
                  customerName,
                },
                content,
              ),
            );
            return;
          }

          if (method === "GET" && action === "transactions/fragment") {
            const transactions = queryTransactions(accountID);
            sendHtml(
              res,
              200,
              renderTransactionsFragmentHTML(
                customerID,
                accountID,
                transactions,
              ),
            );
            return;
          }

          if (method === "GET" && action === "atm") {
            renderATM(res, customerID, accountID);
            return;
          }

          if (method === "POST" && action === "deposit") {
            const form = await readFormBody(req);
            let amount: bigint;
            try {
              amount = parseMoney(form.get("amount") ?? "");
            } catch {
              renderATM(res, customerID, accountID, "Invalid amount.");
              return;
            }

            try {
              await commandExecutor.executeCommand(
                backgroundContext(),
                createCommand(CommandName.Deposit, {
                  transactionID: randomUUID(),
                  accountID,
                  amount,
                }),
                withEventObserver(EventName.DepositApproved, () => true),
              );
            } catch (err) {
              if (!(err instanceof EventObserverNotSatisfiedError)) {
                throw err;
              }
            }

            redirect(
              res,
              `/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions`,
            );
            return;
          }

          if (method === "POST" && action === "withdraw") {
            const form = await readFormBody(req);
            let amount: bigint;
            try {
              amount = parseMoney(form.get("amount") ?? "");
            } catch {
              renderATM(res, customerID, accountID, "Invalid amount.");
              return;
            }

            const scheduledTime = parseSchedule(form.get("schedule") ?? "now");
            let formError = "";

            try {
              await commandExecutor.executeCommand(
                backgroundContext(),
                createCommand(CommandName.Withdraw, {
                  transactionID: randomUUID(),
                  accountID,
                  amount,
                  scheduledTime,
                }),
                withEventObserver(EventName.WithdrawalApproved, () => true),
                withEventObserver<WithdrawalDeclined>(
                  EventName.WithdrawalDeclined,
                  (_ctx, e) => {
                    formError = `Withdrawal declined — ${e.data.reason}.`;
                    return true;
                  },
                ),
              );
            } catch (err) {
              if (!(err instanceof EventObserverNotSatisfiedError)) {
                throw err;
              }
            }

            if (formError) {
              renderATM(res, customerID, accountID, formError);
              return;
            }

            redirect(
              res,
              `/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions`,
            );
            return;
          }

          if (method === "GET" && action === "transfer") {
            renderTransfer(res, customerID, accountID);
            return;
          }

          if (method === "POST" && action === "transfer") {
            const form = await readFormBody(req);
            let amount: bigint;
            try {
              amount = parseMoney(form.get("amount") ?? "");
            } catch {
              renderTransfer(res, customerID, accountID, "Invalid amount.");
              return;
            }

            const toAccountID = (form.get("to_account_id") ?? "").trim();
            if (!toAccountID) {
              renderTransfer(
                res,
                customerID,
                accountID,
                "Destination account is required.",
              );
              return;
            }

            const scheduledTime = parseSchedule(form.get("schedule") ?? "now");
            let formError = "";

            try {
              await commandExecutor.executeCommand(
                backgroundContext(),
                createCommand(CommandName.Transfer, {
                  transactionID: randomUUID(),
                  fromAccountID: accountID,
                  toAccountID,
                  amount,
                  toThirdPartyBank: false,
                  scheduledTime,
                }),
                withEventObserver(EventName.TransferApproved, () => true),
                withEventObserver<TransferDeclined>(
                  EventName.TransferDeclined,
                  (_ctx, e) => {
                    formError = `Transfer declined — ${e.data.reason}.`;
                    return true;
                  },
                ),
                withEventObserver(EventName.TransferFailed, () => {
                  formError = "Transfer failed.";
                  return true;
                }),
              );
            } catch (err) {
              if (!(err instanceof EventObserverNotSatisfiedError)) {
                throw err;
              }
            }

            if (formError) {
              renderTransfer(res, customerID, accountID, formError);
              return;
            }

            redirect(
              res,
              `/c/${encodeURIComponent(customerID)}/accounts/${encodeURIComponent(accountID)}/transactions`,
            );
            return;
          }
        }
      }

      renderError(res, 404);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      renderError(res, 500, msg);
    }
  };
}
