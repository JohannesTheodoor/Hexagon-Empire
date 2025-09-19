// A simple Perlin noise generator.
// Based on the original implementation by Ken Perlin and subsequent improvements.
// This is a self-contained implementation to avoid external dependencies.

export class Noise {
  private p: number[] = [];

  constructor(seed: number = Math.random()) {
    // A seeded PRNG to make noise deterministic with a seed.
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const permutation = Array.from({ length: 256 }, (_, i) => i);
    for (let i = permutation.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    
    // Duplicate the permutation array to avoid buffer overflows.
    this.p = [...permutation, ...permutation];
  }

  // Fade function as defined by Ken Perlin.
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Linear interpolation.
  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  // Calculates the dot product of a gradient vector and the distance vector.
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * Generates 2D Perlin noise for a given coordinate.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @returns A noise value between -1 and 1.
   */
  public perlin2(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const p = this.p;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const res = this.lerp(v,
      this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf)),
      this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1))
    );
    
    // The result can be slightly outside [-1, 1], so we clamp it for safety.
    return Math.max(-1, Math.min(1, res));
  }
}
