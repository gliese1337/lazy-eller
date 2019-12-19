Lazy Eller
==========

This package implements the Eller maze algorithm to generate potentially-infinite 2D mazes. The maze generator is implemented as an iterator over lazily-generated rows.

The package exports a single `EllerMaze` class with the following interface:

* `new EllerMaze(opts: EllerArgs): EllerMaze` Creates a new maze generator, which implements the IterableIterator interface.
* `em.next(final?: boolean): IteratorResult<Cell[]>` Returns the next row of the maze, as an array of cells. If `true` is passed in, the returned row will be the final row of a finite maze.
* `EllerMaze.toASCII(row: Cell[]): string` Produces an ASCII-art representation of a maze row for debugging purposes.

The `EllerArgs` type is defined as follows:

```ts
type EllerArgs = {
    // The length of each row of cells
    width: number;
    // The maximum number of rows to generate
    // If unset, this will default to producing an infinite maze.
    // If set to a positive finite number, the iterator will
    // automatically terminate, with a completed maze, after
    // producing that number of rows, so you can use EllerMaze
    // objects with spread operators or for-of loops.
    height?: number;
    // Sets the probability that any particular horizontal cell
    // boundary will be made into a wall, rather than a passage.
    wallp?: number;
    // Sets the probability that any particular vertical cell
    // boundary will be made into a wall, rather than a passage.
    floorp?: number;
    // An arbitrary value used to set the random number
    // generator to a repeatable state, so you can generate
    // the same maze multiple times.
    seed?: unknown;
};
```

Meanwhile, `Cell` objects have the following form:

```ts
type Cell = {
    left: Cell | null;
    right: Cell | null;
    up: Cell | null;
    down: Cell | null;
};
```

which implements a cell graph. Null values indicate the presence of walls. Proper mazes are represented by spanning trees over the graph of cells.
