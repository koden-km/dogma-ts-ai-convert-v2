import { beforeEach, describe, expect, it } from "vitest";
import {
  type Command,
  registerCommand,
  registerDeadline,
  registerEvent,
  resetMessageRegistry,
} from "@/dogma/index.ts";
import {
  CommandKind,
  DeadlineKind,
  EventKind,
  kindOf,
  kinds,
  kindSymbol,
  nameOf,
  typeFor,
  typeOf,
} from "./index.ts";

describe("enginekit/message", () => {
  beforeEach(() => {
    resetMessageRegistry();
  });

  it("kinds and symbols work as expected", () => {
    expect(kinds()).toEqual([CommandKind, EventKind, DeadlineKind]);
    expect(kindSymbol(CommandKind)).toBe("?");
    expect(kindSymbol(EventKind)).toBe("!");
    expect(kindSymbol(DeadlineKind)).toBe("@");
  });

  it("kindOf, nameOf, typeOf, and typeFor work for messages", () => {
    registerCommand("MyCmd", "83c4a2d9-a728-49e6-83a3-6c670b99a173");
    registerEvent("MyEvt", "bef3014a-fca1-4cb3-90a3-ee83f5ca56c8");
    registerDeadline("MyDln", "e11b5a92-e1ab-4a16-841a-9286b4e4d12f");

    const cmd: Command = { type: "command", name: "MyCmd" };
    expect(kindOf(cmd)).toBe(CommandKind);
    expect(nameOf(cmd)).toBe("MyCmd");

    const t1 = typeFor("MyCmd");
    const t2 = typeOf(cmd);
    expect(t1).toBe(t2);
    expect(t1.name).toBe("MyCmd");
    expect(t1.kind).toBe(CommandKind);
    expect(t1.toString()).toBe("MyCmd");
  });
});
