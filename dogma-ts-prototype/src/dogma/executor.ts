import { Command } from "./message.ts";
import { Context } from "./util.ts";

// A CommandExecutor submits [Command] messages for execution.
//
// It's the primary way that code outside of the Dogma application interacts
// with the engine.
export type CommandExecutor = {
  // executeCommand() submits a [Command] for execution.
  //
  // It returns once the engine has taken ownership of the command. It doesn't
  // wait for handling to finish.
  //
  // The engine may invoke the command's handler more than once, but the
  // command's side-effects, such as the events it produces, occur exactly
  // once.
  //
  // If it returns a non-nil error, the engine may not have taken ownership of
  // message delivery, and the application should retry execution.
  //
  // See [WithIdempotencyKey].
  executeCommand(
    ctx: Context,
    c: Command,
    ...executeCommandOption: ExecuteCommandOption[]
  ): void;
};

// ExecuteCommandOption is an option that modifies the behavior of
// [CommandExecutor].ExecuteCommand.
export type ExecuteCommandOption = {
  // isExecuteCommandOption(): void;
  // isExecuteCommandOption: boolean;
};

// WithIdempotencyKey returns an [ExecuteCommandOption] that sets a unique
// identifier for the [Command].
//
// Use an idempotency key when retrying a failed [CommandExecutor].ExecuteCommand
// call to ensure that the engine doesn't execute the command multiple times.
export function withIdempotencyKey(key: string): ExecuteCommandOption {
  if (key === "") {
    throw new Error("idempotency key cannot be empty");
  }

  return { key };
}

// IdempotencyKeyOption is an [ExecuteCommandOption] that sets a unique
// identifier for a [Command].
//
// Use [WithIdempotencyKey] to create values of this type.
export type IdempotencyKeyOption = {
  // nocmp

  key: string;
};

// // Key returns the idempotency key.
// func (o IdempotencyKeyOption) Key() string {
// 	return o.key
// }
