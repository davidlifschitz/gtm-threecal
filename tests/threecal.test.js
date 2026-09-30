import { describe, it, expect } from "vitest";
import { load } from "./load.js";

function run(w, text) {
  w.document.getElementById("src").value = text;
  w.document.getElementById("run").click();
  return [...w.document.querySelectorAll("#tbl tr")].slice(1).map((tr) => [...tr.cells].map((c) => c.textContent));
}

const IM = ["Muharram","Safar","Rabi I","Rabi II","Jumada I","Jumada II","Rajab","Shaaban","Ramadan","Shawwal","Dhu al-Qadah","Dhu al-Hijjah"];
const PM = ["Farvardin","Ordibehesht","Khordad","Tir","Mordad","Shahrivar","Mehr","Aban","Azar","Dey","Bahman","Esfand"];

describe("converters", () => {
  const w = load();
  it("matches known dates", () => {
    expect(w.persian(2026, 3, 21)).toBe("1405 Farvardin 1");
    expect(w.persian(2025, 3, 20)).toBe("1403 Esfand 30");
    expect(w.islamic(2026, 2, 18)).toBe("1447 Ramadan 1");
    expect(w.isoWeek(new w.Date(2021, 0, 3))).toBe("2020-W53");
  });
  it("agrees with Intl persian and islamic-civil across decades", () => {
    const opts = { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" };
    const P = new Intl.DateTimeFormat("en-u-ca-persian", opts);
    const I = new Intl.DateTimeFormat("en-u-ca-islamic-civil", opts);
    const part = (f, d) => Object.fromEntries(f.formatToParts(d).map((p) => [p.type, parseInt(p.value)]));
    for (let t = Date.UTC(2000, 0, 1); t < Date.UTC(2040, 0, 1); t += 86400000 * 7) {
      const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
      const p = part(P, d), i = part(I, d);
      expect(w.persian(y, m, dd)).toBe(`${p.year} ${PM[p.month - 1]} ${p.day}`);
      expect(w.islamic(y, m, dd)).toBe(`${i.year} ${IM[i.month - 1]} ${i.day}`);
    }
  });
});

describe("page", () => {
  it("converts pasted dates into a table and CSV", async () => {
    const w = load();
    const rows = run(w, "2026-03-21\n\nnot a date");
    expect(rows).toEqual([["2026-03-21", "Saturday", "2026-W12", w.islamic(2026, 3, 21), "1405 Farvardin 1"]]);
    expect(w.document.getElementById("warn").textContent).toMatch(/1 line/);
    w.document.getElementById("copy").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(w.__clip.split("\n")[1]).toMatch(/^"2026-03-21","Saturday"/);
  });
});

describe("impossible dates", () => {
  it("skips dates that don't exist instead of rolling over", () => {
    const w = load();
    const rows = run(w, "2026-02-31\n31 Feb 2026\n13/13/2026\n2026-02-29\n2024-02-29\n31/12/2026\nFeb 30, 2026\nMar 5, 2026");
    expect(rows.map((r) => r[0])).toEqual(["2024-02-29", "2026-12-31", "2026-03-05"]);
    expect(w.document.getElementById("warn").textContent).toMatch(/5 line/);
  });
});

describe("line cap", () => {
  it("says how many lines past the cap were left out", () => {
    const w = load();
    const text = Array.from({ length: 450 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, "0")}`).join("\n");
    expect(run(w, text)).toHaveLength(400);
    expect(w.document.getElementById("warn").textContent).toMatch(/50 line\(s\) past the 400 cap/);
  });
  it("stays quiet under the cap", () => {
    const w = load();
    run(w, "2026-01-01");
    expect(w.document.getElementById("warn").textContent).toBe("");
  });
});
