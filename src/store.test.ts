import { describe, expect, it } from "vitest";
import { parseData } from "./store";

describe("parseData", () => {
  it("rejects files that aren't Jars data", () => {
    expect(parseData("not json")).toBeNull();
    expect(parseData(JSON.stringify({ version: 2 }))).toBeNull();
  });

  it("drops broken rows and fills missing fields instead of crashing later", () => {
    const d = parseData(
      JSON.stringify({
        version: 1,
        settings: { income: 50000 },
        spends: [
          { id: "ok", amount: 15, jar: "play", note: "tea", date: "2026-11-17" },
          { id: "bad-amount", amount: "15", jar: "play", date: "2026-11-17" },
          { id: "bad-date", amount: 15, jar: "play" },
          { id: "bad-jar", amount: 20, jar: "nope", date: "2026-11-17" },
        ],
        friends: [{ amount: 100, date: "2026-11-01" }],
      }),
    );
    expect(d?.spends.map((s) => [s.id, s.jar])).toEqual([
      ["ok", "play"],
      ["bad-jar", "untracked"],
    ]);
    expect(d?.incomes).toEqual([]);
    expect(d?.friends[0]).toMatchObject({ person: "Someone", type: "gave", note: "" });
    expect(d?.settings.shares.necessities).toBe(55);
  });
});
