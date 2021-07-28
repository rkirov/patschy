import * as diffy from '.'; 

const obj1: diffy.Obj = {a: 0, b: '', c: { c1: 0, c2: 0}};
const closeToObj1: diffy.Obj = {a: 0, b: '', c: { c1: 0, c2: 10000}};

describe('The simple Obj data structure', () => {
  it('should support checking for primitive vs a hashmap', () => {
    expect(diffy.isPrimitive(obj1)).toBe(false);
    expect(diffy.isPrimitive(0)).toBe(true);
  });
  
  it('should support equality testing', () => {
    expect(diffy.isEqual(obj1, obj1)).toBe(true);
    expect(diffy.isEqual(obj1, 0)).toBe(false);

    expect(diffy.isEqual(obj1, closeToObj1)).toBe(false);
  });

  it('should support cloning', () => {
    const clone = diffy.clone(obj1);
    expect(diffy.isEqual(obj1, clone)).toBe(true);
  });
});

describe('getPatch', () => {
  it('should produce a noop patch for two equal primitives', () => {
    const p = diffy.getPatch(0, 0);
    expect(p).toStrictEqual({type: 'noop'});
  });

  it('should produce a patch for empty obj', () => {
    const p = diffy.getPatch(0, {});
    expect(p).toStrictEqual({});
  });

  it('should produce a simple patch for two primitives', () => {
    const p = diffy.getPatch(0, 1);
    expect(p).toStrictEqual({value: 1, type:'add'});
  });

  it('should produce a simple patch from hash to primitive', () => {
    const p = diffy.getPatch({}, 1);
    expect(p).toStrictEqual({value: 1, type:'add'});
  });

  it('should produce a simple patch from primitive to single value hash', () => {
    const p = diffy.getPatch(0, {a: 1});
    expect(p).toStrictEqual({a: {value: 1, type:'add'}});
  });

  it('should produce a simple patch from primitive to multi value hash', () => {
    const p = diffy.getPatch(0, {a: 1, b: 1});
    expect(p).toStrictEqual({
        a: {value: 1, type:'add'},
        b: {value: 1, type:'add'},
      });
  });

  it('should produce a simple patch from primitive to multi value deep hash', () => {
    const p = diffy.getPatch(0, {a: 1, b: {b1: 0, b2: {b21: 0}}});
    expect(p).toStrictEqual({
      a: {value: 1, type:'add'},
      b: {
        b1: {value: 0, type:'add'},
        b2: {
          b21: {value: 0, type:'add'},
        },
      }
    });
  });

  it('should produce a complex patch from hash to multi value deep hash', () => {
    const p = diffy.getPatch(
      {a: {a1: 0}, b: {b1: 0, b2: {b21: 0, b22: 0}}},
      {a: {a1: 0}, b: {b1: 0, b2: {b21: 0, b22: 100}}});
    expect(p).toStrictEqual({
      b: {
        b2: {
          b22: {value: 100, type:'add'},
        }
      }
    });
  });

  it('should produce a simple patch with removals', () => {
    const p = diffy.getPatch(
      {a: 1, b: 0},
      {a: 1});
    expect(p).toStrictEqual({b: {type:'remove'}});
  });

  it('should produce a complex patch with removals', () => {
    const p = diffy.getPatch(
      {x: {a: 1, b: 0}},
      {x: {a: 1, c: 0}});
    expect(p).toStrictEqual({
      x: {
        c: {value: 0, type:'add'},
        b: {type: 'remove'},
      }
    });
  });

  it('should produce a patch with {} for object creation', () => {
    const p = diffy.getPatch(
      {},
      {x: {}});
    expect(p).toStrictEqual({ x: {} });
  });

  it('should produce a patch for top-level {} object', () => {
    const from = 0;
    const to = {};
    const p = diffy.getPatch(from, to)
    expect(p).toStrictEqual({});
  });
});

// TODO: use property testing for `applyPatch(getPatch(from, to), from)`
describe('applyPatch', () => {
  it('should keep same obj if the patch is noop', () => {
    const newP = diffy.applyPatch(diffy.getPatch(0, 0), 0);
    expect(newP).toStrictEqual(0);

    const empty = {};
    const newE = diffy.applyPatch(diffy.getPatch(empty, empty), empty);
    expect(newE).toBe(empty);  // specifically check .toBe here. 

    const hash = {a: {b: {c: 1}}};
    const newH = diffy.applyPatch(diffy.getPatch(hash, hash), hash);
    expect(newH).toBe(hash);  // specifically check .toBe here. 
  });

  it('should produce the same complicated object with deep difference', () => {
    const from = {a: 1, b: {b1: {}, b2: {b21: 0, b22: 0}}};
    const to = {a: 1, b: {b1: {}, b2: {b21: 0, b22: 100}}};
    const newObj = diffy.applyPatch(diffy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it('should maximally share objects when they dont change', () => {
    const from = {a: {a1: 0}, b: {b1: {}, b2: {b21: 0, b22: 0}}};
    const to = {a: {a1: 0}, b: {b1: {}, b2: {b21: 0, b22: 100}}};
    const newObj = diffy.applyPatch(diffy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
    expect(newObj).not.toBe(to);
    expect(newObj).not.toBe(from);
    expect((newObj as diffy.Hash)['a']).toBe(from['a']);
    expect((newObj as diffy.Hash)['b']).not.toBe(from['b']);
    expect(((newObj as diffy.Hash)['b'] as diffy.Hash)['b1']).toBe(from['b']['b1']);
  });

  it('should produce the same complicated object with removal', () => {
    const from = {a: 1, b: 0};
    const to = {a: 1};
    const newObj = diffy.applyPatch(diffy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it('should produce the same complicated object with deep removal', () => {
    const from = {x: {a: 1, b: 0}};
    const to = {x: {a: 1, c: 0}};
    const newObj = diffy.applyPatch(diffy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });

  it('should produce a new object top-level {} object', () => {
    const from = 0;
    const to = {};
    const newObj = diffy.applyPatch(diffy.getPatch(from, to), from);
    expect(newObj).toStrictEqual(to);
  });
});
