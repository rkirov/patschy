# paTSchy - a TS object patching library

## Overview 

The library exposes two basic functions:
- getPatch(old, new) - creates a patch to represent the change from `old` to
  `new`. 
- applyPatch(patch, old) - applies a patch to `old` to return an object that is
  equal to `new` structurally.

Only the structure of objects is considered, not the object identity. For
example, `getPatch({}, {})` is the noop patch. The result of applying a patch
is structurally equal to `new`. Also, a patch created from `old` can be applied
safely to any `old'` that is structurally equal to `old`.

When applying the patch no subobject of `old` is mutated. If a subobject can be
directly shared, because there is no patch to apply to it, it is.

## Purpose

This library can be useful when one needs to serialize `old` and `new` objects
-- when writing to disk, sending over the wire, or over `postMessage` channels.

With `patschy` one can only serialize the patch and the original object. To
produce the new object the patch can get applied to the `old` object.
Generally, when `new` and `old` are similar, serializing `patch` is cheaper
than serializing `new`.

### A simple example

```javascript
const original = {
  name: {
    first: 'Karl',
    last: 'The Fog',
  },
  address: {
    city: 'San Francisco',
    zip: '94101'
  },
};

const withNewAddress = {
  name: {
    first: 'Karl',
    last: 'The Fog',
  },
  address: {
    city: 'Los Angeles',
    zip: '90041'
  },
};

const patch = patschy.getPatch(original, withNewAddress);

// serialize, deserialize `patch` and `original`
// for sake of example, we can do JSON stringify/parse.
// in a realistic example, this will be file or wire write/read.
// Using C suffix for clone.
const originalC = JSON.parse(JSON.stringify(original));
const patchC = JSON.parse(JSON.stringify(patch));

const withNewAddressC = patschy.applyPatch(patch', original'); 

// jest.toStrictEqual does deep structural equality check.
expect(withNewAddressC).toStrictEqual(withNewAddress);

// original.name hasn't changed, so it is referentially equal.
expect(originalC.name).toBe(withNewAddressC.name);
```

## Patch representation

Unlike a full diff the patch represents just a small set of operations that
need to performed onto the `old` object to create the new object. 

## Limitations

Currently, the objects used cannot have `undefined` as values and cannot have
arrays. These are not hard limitation, just need more work to support.
