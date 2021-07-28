/**
 * An Obj is a recursive data structure that is either:
 * 1) a hashmap of keys to Objs.
 * 2) a primitive.
 * TODO: add support for arrays of Obj.
 *
 * We will use obj as the basic data structure that we can 
 * get patches from and apply patches to.
 *
 * For simplicity we don't allow undefined as a value in the data structure.
 *
 * This allows us to use undefined inside the patching algorithms and know
 * that it cannot come from actually set values.
 */
export type Primitive = string | number | boolean | null;
export type Hash = {[key: string]: Obj};
export type Obj = Hash | Primitive;

export function isPrimitive(obj?: Obj): obj is Primitive {
  return obj !== undefined && typeof obj !== 'object';
}

export function isHash(obj?: Obj): obj is {[key: string]: Obj} {
  return obj !== undefined && !isPrimitive(obj);
}

export function clone(obj: Obj): Obj {
  if (isPrimitive(obj)) return obj;
  const r: Obj = {};
  for (const k of Object.keys(obj)) {
    r[k] = clone(obj[k]);
  }
  return r;
}

/**
 * Structural equality.
 */
export function isEqual(obj1: Obj, obj2: Obj): boolean {
  if (isPrimitive(obj1) || isPrimitive(obj2)) return obj1 === obj2;
  for (const k of Object.keys(obj1)) {
    if (!isEqual(obj1[k], obj2[k])) return false;
  }
  return true;
}

/**
 * A patch is a set of instructions that can be applied to
 * an Obj to produce a new Obj.
 *
 * The nesting of hashes tells us where to apply the patch.
 * At the leafs we have three Primitive patches:
 * - adding a new primitive value
 * - or removing that key form the enclosing hash.
 * - do nothing
 *
 * The patch {} corresponds to creating a new empty hash.
 * Note: that is different from {type: 'noop'}
 * as apply({}, 0) is {}, while apply({type: 'noop'}, 0) is 0.
 */
export type PrimitivePatch = {type: 'add', value: Primitive} | {type: 'remove'} | {type: 'noop'};
export type HashPatch = {[key: string]: Patch};
export type Patch = PrimitivePatch | HashPatch;

export function isPrimitivePatch(p: Patch): p is PrimitivePatch {
  return p.type && (p.type === 'add' || p.type === 'remove' || p.type === 'noop'); 
}

export function isHashPatch(p: Patch): p is HashPatch {
  return !isPrimitivePatch(p);
}

/**
 * Extract a patch given A and B Objs, so that:
 *   applyPatch(getPatch(A, B), A') 
 *   where A' is an Obj equal to A
 *   returns a new Obj that is structurally equal to B.
 *
 * An empty patch is represented by {}, but it can occur only top-level.
 */
export function getPatch(from: Obj|undefined, to: Obj): Patch {
  if (isPrimitive(to)) {
    if (isHash(from) || to !== from) {
      return {type:'add', value: to};
    }
    return {type:'noop'};
  } 
  // to is a hash from here on.
  let patch: Patch = {};
  for (const k of Object.keys(to)) {
    let innerPatch: Patch;
    if (isHash(from) && from.hasOwnProperty(k)) {
      innerPatch = getPatch(from[k], to[k]);
      // no need to record {} or noop, because from[k] exists.
      if (Object.keys(innerPatch).length === 0 || innerPatch.type === 'noop') {
        continue;
      }
    } else {
      // Using undefined to make sure that we never match with to[k]
      innerPatch = getPatch(undefined, to[k]);
    }
    // keep {} only to express empty object creation.
    patch[k] = innerPatch;
  }
  if (isHash(from)) {
    for (const k of Object.keys(from)) {
      if (!to.hasOwnProperty(k)) {
        patch[k] = {type: 'remove'};
      }
    }
  }
  return patch;
}

// obj is optional as we are traversing we might not have a obj to apply.
export function applyPatch(patch: Patch, obj?: Obj): Obj {
  if (isPrimitivePatch(patch) && patch.type === 'noop') {
    if (obj === undefined) throw new Error('attempting to apply noop patch to missing primitive');
    return obj;
  }
  if (isPrimitivePatch(patch) && patch.type === 'add') return patch.value;
  if (isPrimitivePatch(patch) && patch.type === 'remove') {
    throw new Error(`recursed into remove patch for obj ${obj}. Should have been taken care upstream`);
  }
  if (isHashPatch(patch) && Object.keys(patch).length === 0) return obj !== undefined && isHash(obj) ? obj : {};

  // patch must be hash patch below.
  // if obj is hash we keep it otherwise we blast it.
  const res: Obj = obj && isHash(obj) ? {...obj} : {};
  for (const k of Object.keys(patch)) {
    if (isPrimitivePatch(patch[k]) && patch[k].type === 'remove') {
      delete res[k];
      continue;
    }
    // res[k] might be undefined, but second arg is optional.
    res[k] = applyPatch(patch[k], res[k]);
  }
  return res;
}
