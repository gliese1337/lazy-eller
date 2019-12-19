// The following constants are related to IEEE 754 limits.
const width = 256;        // each RC4 output is 0 <= x < 256
const chunks = 6;         // at least six RC4 outputs for each double
const digits = 52;        // there are 52 significant digits in a double
const startdenom = width ** chunks;
const significance = 2 ** digits;
const overflow = significance * 2;
const mask = width - 1;

// Generate a key array by mixing info from multiple seed characters per byte
function genkey(seed: string) {
  if (seed.length === 0) return new Uint8Array([0]);
  const key = new Uint8Array(mask & seed.length);
  
  let mix = 0;
  for (let i = 0; i < seed.length; i++) {
    mix ^= key[mask & i] * 19
    key[mask & i] = mask & (mix + seed.charCodeAt(i++));
  }

  return key;
}

// Expand the key according to the standard key scheduling algorithm
function ksa(key: Uint8Array) {
  const s = new Uint8Array(Array.from({ length: width }, (_, i) => i));
  const keylen = key.length;
  let j = 0;
  for (let i = 0; i < width; i++) {
    const t = s[i];
    j = mask & (j + t + key[i % keylen]);
    s[i] = s[j];
    s[j] = t;
  }

  return s;
}

export class SeedRandom {
  private i = 0;
  private j = 0;
  private s: Uint8Array;

  constructor(seed: unknown) {
    const key = genkey(seed + '');
    this.s = ksa(key);
  }

  // returns the next `count` outputs as one number.
  private g(count: number) {
    let r = 0;
    let { i, j, s } = this;
    while (count--) {
      i = mask & (i + 1);
      const t = s[i];
      j = mask & (j + t);
      s[i] = s[j];
      s[j] = t;
      r = r * width + s[mask & (s[i] + t)];
    }
    this.i = i;
    this.j = j;
    return r;
  }

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  public random() {
    let n = this.g(chunks);             // Start with a numerator n < 2 ^ 48
    let d = startdenom;                 //   and denominator d = 2 ^ 48.
    let x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = this.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }

    return (n + x) / d;                 // Form the number within [0, 1).
  }
}