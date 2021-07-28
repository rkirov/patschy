import * as patschy from ".";

const obj1: patschy.Obj = { a: 0, b: "", c: { c1: 0, c2: 0 } };
const closeToObj1: patschy.Obj = { a: 0, b: "", c: { c1: 0, c2: 10000 } };

describe("The simple Obj data structure", () => {
  it("should support checking for primitive vs a hashmap", () => {
    expect(patschy.isPrimitive(obj1)).toBe(false);
    expect(patschy.isPrimitive(0)).toBe(true);
  });

  it("should support equality testing", () => {
    expect(patschy.isEqual(obj1, obj1)).toBe(true);
    expect(patschy.isEqual(obj1, 0)).toBe(false);

    expect(patschy.isEqual(obj1, closeToObj1)).toBe(false);
  });

  it("should support cloning", () => {
    const clone = patschy.clone(obj1);
    expect(patschy.isEqual(obj1, clone)).toBe(true);
  });
});

describe("getPatch", () => {
  it("should produce a noop patch for two equal primitives", () => {
    const p = patschy.getPatch(0, 0);
    expect(p).toStrictEqual({ type: "noop" });
  });

  it("should produce a patch for empty obj", () => {
    const p = patschy.getPatch(0, {});
    expect(p).toStrictEqual({});
  });

  it("should produce a simple patch for two primitives", () => {
    const p = patschy.getPatch(0, 1);
    expect(p).toStrictEqual({ value: 1, type: "add" });
  });

  it("should produce a simple patch from hash to primitive", () => {
    const p = patschy.getPatch({}, 1);
    expect(p).toStrictEqual({ value: 1, type: "add" });
  });

  it("should produce a simple patch from primitive to single value hash", () => {
    const p = patschy.getPatch(0, { a: 1 });
    expect(p).toStrictEqual({ a: { value: 1, type: "add" } });
  });

  it("should produce a simple patch from primitive to multi value hash", () => {
    const p = patschy.getPatch(0, { a: 1, b: 1 });
    expect(p).toStrictEqual({
      a: { value: 1, type: "add" },
      b: { value: 1, type: "add" },
    });
  });

  it("should produce a simple patch from primitive to multi value deep hash", () => {
    const p = patschy.getPatch(0, { a: 1, b: { b1: 0, b2: { b21: 0 } } });
    expect(p).toStrictEqual({
      a: { value: 1, type: "add" },
      b: {
        b1: { value: 0, type: "add" },
        b2: {
          b21: { value: 0, type: "add" },
        },
      },
    });
  });

  it("should produce a complex patch from hash to multi value deep hash", () => {
    const p = patschy.getPatch(
      { a: { a1: 0 }, b: { b1: 0, b2: { b21: 0, b22: 0 } } },
      { a: { a1: 0 }, b: { b1: 0, b2: { b21: 0, b22: 100 } } }
    );
    expect(p).toStrictEqual({
      b: {
        b2: {
          b22: { value: 100, type: "add" },
        },
      },
    });
  });

  it("should produce a simple patch with removals", () => {
    const p = patschy.getPatch({ a: 1, b: 0 }, { a: 1 });
    expect(p).toStrictEqual({ b: { type: "remove" } });
  });

  it("should produce a complex patch with removals", () => {
    const p = patschy.getPatch({ x: { a: 1, b: 0 } }, { x: { a: 1, c: 0 } });
    expect(p).toStrictEqual({
      x: {
        c: { value: 0, type: "add" },
        b: { type: "remove" },
      },
    });
  });

  it("should produce a patch with {} for object creation", () => {
    const p = patschy.getPatch({}, { x: {} });
    expect(p).toStrictEqual({ x: {} });
  });

  it("should produce a patch for top-level {} object", () => {
    const from = 0;
    const to = {};
    const p = patschy.getPatch(from, to);
    expect(p).toStrictEqual({});
  });
});

// TODO: use property testing for `applyPatch(getPatch(from, to), from)`
describe("applyPatch", () => {
  it("should keep same obj if the patch is noop", () => {
    const newP = patschy.applyPatch(patschy.getPatch(0, 0), 0);
    expect(newP).toStrictEqual(0);

    const empty = {};
    const newE = patschy.applyPatch(patschy.getPatch(empty, empty), empty);
    expect(newE).toBe(empty); // specifically check .toBe here.

    const hash = { a: { b: { c: 1 } } };
    const newH = patschy.applyPatch(patschy.getPatch(hash, hash), hash);
    expect(newH).toBe(hash); // specifically check .toBe here.
  });

  it("should produce the same complicated object with deep difference", () => {
    const from = { a: 1, b: { b1: {}, b2: { b21: 0, b22: 0 } } };
    const to = { a: 1, b: { b1: {}, b2: { b21: 0, b22: 100 } } };
    const newObj = patschy.applyPatch(patschy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it("should maximally share objects when they dont change", () => {
    const from = { a: { a1: 0 }, b: { b1: {}, b2: { b21: 0, b22: 0 } } };
    const to = { a: { a1: 0 }, b: { b1: {}, b2: { b21: 0, b22: 100 } } };
    const newObj = patschy.applyPatch(patschy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
    expect(newObj).not.toBe(to);
    expect(newObj).not.toBe(from);
    expect((newObj as patschy.Hash)["a"]).toBe(from["a"]);
    expect((newObj as patschy.Hash)["b"]).not.toBe(from["b"]);
    expect(((newObj as patschy.Hash)["b"] as patschy.Hash)["b1"]).toBe(
      from["b"]["b1"]
    );
  });

  it("should produce the same complicated object with removal", () => {
    const from = { a: 1, b: 0 };
    const to = { a: 1 };
    const newObj = patschy.applyPatch(patschy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it("should produce the same complicated object with deep removal", () => {
    const from = { x: { a: 1, b: 0 } };
    const to = { x: { a: 1, c: 0 } };
    const newObj = patschy.applyPatch(patschy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it("should produce a new object top-level {} object", () => {
    const from = 0;
    const to = {};
    const newObj = patschy.applyPatch(patschy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });
});
