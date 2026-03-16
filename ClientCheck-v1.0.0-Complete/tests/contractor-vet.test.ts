import { describe, it, expect } from "vitest";
import {
  parseRedFlags,
  serializeRedFlags,
  getRiskLevel,
  RED_FLAG_LABELS,
  RED_FLAGS,
  type RedFlag,
} from "../shared/types";

describe("parseRedFlags", () => {
  it("returns empty array for null input", () => {
    expect(parseRedFlags(null)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseRedFlags("")).toEqual([]);
  });

  it("parses a single valid flag", () => {
    expect(parseRedFlags("scope_creep")).toEqual(["scope_creep"]);
  });

  it("parses multiple valid flags", () => {
    const result = parseRedFlags("scope_creep,no_deposits,micromanages");
    expect(result).toEqual(["scope_creep", "no_deposits", "micromanages"]);
  });

  it("filters out invalid flags", () => {
    const result = parseRedFlags("scope_creep,invalid_flag,no_deposits");
    expect(result).toEqual(["scope_creep", "no_deposits"]);
  });

  it("handles all known red flags", () => {
    const allFlags = RED_FLAGS.join(",");
    const result = parseRedFlags(allFlags);
    expect(result).toHaveLength(RED_FLAGS.length);
  });
});

describe("serializeRedFlags", () => {
  it("serializes empty array to empty string", () => {
    expect(serializeRedFlags([])).toBe("");
  });

  it("serializes a single flag", () => {
    expect(serializeRedFlags(["scope_creep"])).toBe("scope_creep");
  });

  it("serializes multiple flags with commas", () => {
    const flags: RedFlag[] = ["scope_creep", "disputes_invoices"];
    expect(serializeRedFlags(flags)).toBe("scope_creep,disputes_invoices");
  });

  it("round-trips through serialize and parse", () => {
    const original: RedFlag[] = ["scope_creep", "no_deposits", "micromanages"];
    const serialized = serializeRedFlags(original);
    const parsed = parseRedFlags(serialized);
    expect(parsed).toEqual(original);
  });
});

describe("getRiskLevel", () => {
  it("returns 'unknown' for rating of 0", () => {
    expect(getRiskLevel(0)).toBe("unknown");
  });

  it("returns 'high' for rating below 2.5", () => {
    expect(getRiskLevel(1)).toBe("high");
    expect(getRiskLevel(2)).toBe("high");
    expect(getRiskLevel(2.4)).toBe("high");
  });

  it("returns 'medium' for rating between 2.5 and 3.99", () => {
    expect(getRiskLevel(2.5)).toBe("medium");
    expect(getRiskLevel(3)).toBe("medium");
    expect(getRiskLevel(3.99)).toBe("medium");
  });

  it("returns 'low' for rating of 4.0 or above", () => {
    expect(getRiskLevel(4.0)).toBe("low");
    expect(getRiskLevel(4.5)).toBe("low");
    expect(getRiskLevel(5)).toBe("low");
  });
});

describe("RED_FLAG_LABELS", () => {
  it("has a label for every red flag", () => {
    for (const flag of RED_FLAGS) {
      expect(RED_FLAG_LABELS[flag]).toBeTruthy();
      expect(typeof RED_FLAG_LABELS[flag]).toBe("string");
    }
  });

  it("labels are non-empty strings", () => {
    for (const flag of RED_FLAGS) {
      expect(RED_FLAG_LABELS[flag].length).toBeGreaterThan(0);
    }
  });
});

describe("RED_FLAGS constant", () => {
  it("contains 5 flags", () => {
    expect(RED_FLAGS).toHaveLength(5);
  });

  it("contains expected flags", () => {
    expect(RED_FLAGS).toContain("scope_creep");
    expect(RED_FLAGS).toContain("no_deposits");
    expect(RED_FLAGS).toContain("micromanages");
    expect(RED_FLAGS).toContain("refuses_change_orders");
    expect(RED_FLAGS).toContain("disputes_invoices");
  });
});
