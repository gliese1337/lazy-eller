import { SeedRandom } from './prng';

export type Cell = {
  left: Cell | null;
  right: Cell | null;
  up: Cell | null;
  down: Cell | null;
};

export type EllerArgs = {
  width: number;
  height?: number;
  wallp?: number;
  floorp?: number;
  seed?: any;
};

function union(sets: number[], stop: number, a: number, b: number) {
  for(let i = 0; i <= stop; i++) {
    if (sets[i] === a) sets[i] = b;
  }
}

export class EllerMaze implements IterableIterator<Cell[]>{
  private width: number;
  private height: number;
  private wallp: number;
  private floorp: number;
  private prng: SeedRandom;
  private rc = 0;
  private row: Cell[];
  private sets: number[];
  private done = false;

  constructor({
    width,
    seed = Math.random(),
    height = Infinity,
    wallp = 0.5,
    floorp = 0.5,
  }: EllerArgs) {
    this.width = width;
    this.height = height;
    this.wallp = wallp;
    this.floorp = floorp;
    this.prng = new SeedRandom(seed);
    this.row = Array.from({ length: width }, () => ({ left: null, right: null, up: null, down: null }));
    this.sets = Array.from({ length: width }, (_, i) => i);
  }

  [Symbol.iterator](){ return this; }

  public next(final?: boolean): IteratorResult<Cell[]> {
    if (this.done) return { value: this.row, done: true };

    const { row, sets, width, floorp, wallp, prng } = this;
    this.rc++;
    final = final || this.rc >= this.height;

    // Remove walls, moving from left to right:
    let nc = row[width-1];
    let li = 0;
    for (let ni = width-2; ni >= 0; ni--) {
      const lc = nc;
      nc = row[ni];

      // If the last cell and next cell are members of the same set, always keep a wall between them. (This prevents loops)
      if (sets[li] === sets[ni]) continue;

      // Randomly decide to delete a wall or not
      if (prng.random() < wallp) continue;

      // If you decide to delete a wall,
      // connect adjacent cells & union their sets
      lc.right = nc;
      nc.left = lc;
      union(sets, ni, sets[ni], sets[li]);
    }

    if (final) { //finalize row
      // If the last and next cells are members of different sets,
      // connect the cells & unnion their sets
      let nc = row[width-1];
      let li = 0;
      for (let ni = width-2; ni >= 0; ni--) {
        const lc = nc;
        nc = row[ni];

        if (sets[li] === sets[ni]) continue;
        lc.right = nc;
        nc.left = lc;
        union(sets, ni, sets[ni], sets[li]);
      }

      this.done = true;
      return { value: row, done: true };
    }

    // Initialize another row
    const nr: Cell[] = Array.from({ length: width }, () => ({ left: null, right: null, up: null, down: null }));
    const ns = new Array(width).fill(-1);

    // Add downward connections from the current row, keeping track of which sets are propagated.
    const used = new Set<number>();

    // Ensure there is at least one downward connection per set. (This prevents isolations.)

    // Collect connected sets
    const cellsets = new Map<number, number[]>();
    for (let i = 0; i < width; i++) {
      const s = sets[i];
      const cells = cellsets.get(s) || [];
      cells.push(i);
      cellsets.set(s, cells);
    }

    // Add per-set connections
    for (const cells of cellsets.values()) {
      const idx = Math.floor(prng.random()*cells.length);
      row[idx].down = nr[idx];
      nr[idx].up = row[idx];
      ns[idx] = sets[idx];
      used.add(sets[idx]);
    }

    // Adjust probabilities of additional downward connections to account
    // for having already added some, so the average fraction of total
    // downward connections per level matches `floorp`.
    const nfloorp = Math.max(0, (floorp * width - cellsets.size)/width);

    // Add random redundant downward connections
    for (let i = width - 1; i >= 0; i--) {
      if (row[i].down === null && prng.random() > nfloorp) {
        row[i].down = nr[i];
        nr[i].up = row[i];
        ns[i] = sets[i];
        used.add(sets[i]);
      }
    }

    // Assign sets to remaining cells in new row.
    // Note that set ids are re-used.
    let id = 0
    for (let i = 0; i < width; i++) {
      if (ns[i] !== -1) continue;
      while(used.has(id)) id++;
      ns[i] = id++;
    }

    this.row = nr;
    this.sets = ns;

    return { value: row, done: false };
  }

  public static toASCII(row: Cell[]) {
    return (row[0].left === null ? '|' : ' ') + row.map(
      c => (c.down === null ? '_' : ' ') + (c.right === null ? '|' : ' ')
    ).join('');
  }
}