import { describe, expect, it } from "vitest";

import {
  DEFAULT_MIN_COLUMN_WIDTH,
  clampWidth,
  indexAtPointer,
  moveColumn,
  resizeColumn,
  stepColumn,
} from "./column-layout";

describe("clampWidth", () => {
  it("keeps a width at or above the minimum", () => {
    expect(clampWidth(200, 80)).toBe(200);
    expect(clampWidth(80, 80)).toBe(80);
  });

  it("raises a width below the minimum to the minimum", () => {
    expect(clampWidth(12, 80)).toBe(80);
    expect(clampWidth(-40, 80)).toBe(80);
  });

  it("rounds to whole pixels", () => {
    expect(clampWidth(120.6, 80)).toBe(121);
  });

  it("treats a non-finite width as the minimum", () => {
    expect(clampWidth(Number.NaN, 80)).toBe(80);
    expect(clampWidth(Number.POSITIVE_INFINITY, 80)).toBe(80);
  });

  it("falls back to the default minimum when none is given", () => {
    expect(clampWidth(1)).toBe(DEFAULT_MIN_COLUMN_WIDTH);
  });
});

describe("resizeColumn", () => {
  it("sets one column and leaves the others alone", () => {
    const before = { a: 100, b: 150 };
    const after = resizeColumn(before, "a", 180, 64);
    expect(after).toEqual({ a: 180, b: 150 });
  });

  it("clamps the new width", () => {
    expect(resizeColumn({ a: 100 }, "a", 10, 64)).toEqual({ a: 64 });
  });

  it("never mutates the input", () => {
    const before = { a: 100 };
    resizeColumn(before, "a", 200, 64);
    expect(before).toEqual({ a: 100 });
  });
});

describe("moveColumn", () => {
  const order = ["a", "b", "c", "d"];

  it("moves a column rightwards", () => {
    expect(moveColumn(order, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves a column leftwards", () => {
    expect(moveColumn(order, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns an equal copy when the index does not change", () => {
    const result = moveColumn(order, 1, 1);
    expect(result).toEqual(order);
    expect(result).not.toBe(order);
  });

  it("ignores an out-of-range source index", () => {
    expect(moveColumn(order, 9, 0)).toEqual(order);
    expect(moveColumn(order, -1, 0)).toEqual(order);
  });

  it("clamps an out-of-range target index to the ends", () => {
    expect(moveColumn(order, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveColumn(order, 2, -5)).toEqual(["c", "a", "b", "d"]);
  });

  it("never mutates the input and never loses or duplicates a column", () => {
    const before = [...order];
    const result = moveColumn(before, 0, 3);
    expect(before).toEqual(order);
    expect([...result].sort()).toEqual([...order].sort());
  });
});

describe("stepColumn", () => {
  const order = ["a", "b", "c"];

  it("moves a column one place either way", () => {
    expect(stepColumn(order, "b", -1)).toEqual(["b", "a", "c"]);
    expect(stepColumn(order, "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("stops at either end", () => {
    expect(stepColumn(order, "a", -1)).toEqual(order);
    expect(stepColumn(order, "c", 1)).toEqual(order);
  });

  it("ignores an unknown id", () => {
    expect(stepColumn(order, "z", 1)).toEqual(order);
  });
});

describe("indexAtPointer", () => {
  // Three 100px header cells laid out from x=10.
  const cells = [
    { left: 10, right: 110 },
    { left: 110, right: 210 },
    { left: 210, right: 310 },
  ];

  it("returns the cell under the pointer", () => {
    expect(indexAtPointer(cells, 50)).toBe(0);
    expect(indexAtPointer(cells, 150)).toBe(1);
    expect(indexAtPointer(cells, 309)).toBe(2);
  });

  it("clamps a pointer past either end to the end cell", () => {
    expect(indexAtPointer(cells, -200)).toBe(0);
    expect(indexAtPointer(cells, 900)).toBe(2);
  });

  it("returns -1 when there are no cells", () => {
    expect(indexAtPointer([], 50)).toBe(-1);
  });
});
