import { describe, expect, it } from "vitest";
import { balances, type Entry } from "@/lib/store";
const e = (kind: Entry["kind"], date: string, amount: number): Entry => ({ id: date + kind, kind, name: "x", date, person: "", amount });
describe("bakiye", () => {
  it("yatan + iade - malzeme, devreden ayrı", () => {
    const b = balances([e("yatan", "2026-10-05", 1000), e("malzeme", "2026-10-09", 300), e("iade", "2026-11-02", 50), e("malzeme", "2026-11-03", 100)], "2026-11");
    expect(b.carry).toBe(700);
    expect(b.thisMonth).toBe(-50);
    expect(b.total).toBe(650);
  });
});
