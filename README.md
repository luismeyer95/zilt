<div id="top"></div>
<div align="center">

<a href="">[![Build](https://circleci.com/gh/luismeyer95/zilt.svg?style=shield&circle-token=d674f84f39bcfc08996d2f783aaf67c036ba4cf3)](https://app.circleci.com/pipelines/github/luismeyer95/zilt)</a>
<a href="">[![Downloads](https://img.shields.io/npm/dt/zilt?style=flat-square)](https://www.npmjs.com/package/zilt)</a>
<a href="">[![LastCommit](https://img.shields.io/github/last-commit/luismeyer95/zilt?style=flat-square)](about:blank)</a>
<a href="">[![Stars](https://img.shields.io/github/stars/luismeyer95/zilt?style=flat-square)](about:blank)</a>

</div>

<br />
<div align="center">
  <img src="https://i.imgur.com/V9jWp3N.png" alt="Logo" width="300" height="300">
  <p align="center">
    <h2>A lazy iterator library in TypeScript.</h2>
    <a href="https://github.com/luismeyer95/zilt/issues">Report Bug</a>
    ·
    <a href="https://github.com/luismeyer95/zilt/issues">Request Feature</a>
  </p>
</div>
<br />

<summary><h1><b>Table of Contents</b></h1></summary>
  <ol>
    <li>
        <a href="#presentation">Presentation</a>
    </li>
    <li>
      <a href="#installation">Installation</a>
    </li>
    <li>
        <a href="#example">Example</a>
    </li>
    <li><a href="#documentation">Documentation</a>
        <ul>
            <li>
                <details>
                    <summary><a href="#builders">Builders</a></summary>
                    <ul>
                        <li><a href="#iter">iter()</a></li>
                        <li><a href="#once">once()</a></li>
                        <li><a href="#range">range()</a></li>
                        <li><a href="#chain">chain()</a></li>
                        <li><a href="#zip">zip()</a></li>
                    </ul>
                </details>
            </li>
            <li>
                <details>
                    <summary><a href="#consumer-methods">Consumer methods</a></summary>
                <ul>
                    <li><a href="#collect">.collect()</a></li>
                    <li><a href="#foreach">.forEach()</a></li>
                    <li><a href="#find">.find()</a></li>
                    <li><a href="#position">.position()</a></li>
                    <li><a href="#reduce">.reduce()</a></li>
                    <li><a href="#count">.count()</a></li>
                    <li><a href="#nth">.nth()</a></li>
                    <li><a href="#first">.first()</a></li>
                    <li><a href="#last">.last()</a></li>
                    <li><a href="#min">.min()</a></li>
                    <li><a href="#max">.max()</a></li>
                    <li><a href="#some">.some()</a></li>
                    <li><a href="#every">.every()</a></li>
                    <li><a href="#unzip">.unzip()</a></li>
                    <li><a href="#partition">.partition()</a></li>
                    <li><a href="#consume">.consume()</a></li>
                </ul>
                </details>
            </li>
            <li>
                <details>
                    <summary><a href="#adapter-methods">Adapter methods</a></summary>
                    <ul>
                    <li><a href="#enumerate">.enumerate()</a></li>
                    <li><a href="#filter">.filter()</a></li>
                    <li><a href="#map">.map()</a></li>
                    <li><a href="#flat">.flat()</a></li>
                    <li><a href="#flatmap">.flatMap()</a></li>
                    <li><a href="#take">.take()</a></li>
                    <li><a href="#takewhile">.takeWhile()</a></li>
                    <li><a href="#skip">.skip()</a></li>
                    <li><a href="#skipwhile">.skipWhile()</a></li>
                    <li><a href="#slice">.slice()</a></li>
                    <li><a href="#step">.step()</a></li>
                    <li><a href="#chain">.chain()</a></li>
                    <li><a href="#cycle">.cycle()</a></li>
                    <li><a href="#stretch">.stretch()</a></li>
                    <li><a href="#nest">.nest()</a></li>
                    <li><a href="#zip">.zip()</a></li>
                    <li><a href="#chunks">.chunks()</a></li>
                    <li><a href="#windows">.windows()</a></li>
                    <li><a href="#accumulate">.accumulate()</a></li>
                    <li><a href="#unique">.unique()</a></li>
                    <li><a href="#uniqueby">.uniqueBy()</a></li>
                    <li><a href="#inspect">.inspect()</a></li>
                </ul>
                </details>
            </li>
        </ul>
    </li>
    <!-- <li><a href="#roadmap">Roadmap</a></li> -->
    <li><a href="#contributing">Contributing</a></li>
  </ol>

# **Presentation**

`zilt` is a TypeScript lazy [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) library. It lets you create iterators with useful utility methods for declarative-style data processing. The library uses ES6 generators under the hood and has no dependencies.

Some great iterator libraries already exist, why create another one?

-   To learn about ES6 generators
-   To learn about creating, publishing and maintaining open-source libraries
-   For fun

# **Installation**

```sh
npm install zilt
```

```ts
// ESM
import * as zilt from "zilt";

// CommonJS
const zilt = require("zilt");
```

# **Example**

Let's consider the following exercise: given a non-empty `height * width` matrix full of `.`'s, draw a zigzag pattern of `O`'s inside the matrix and return it. This is a contrived example, but it helps demonstrate the capabilities of `zilt` iterators.

```ts
const input = [
    [".", ".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", ".", "."],
    [".", ".", ".", ".", ".", ".", ".", ".", "."],
];

const output = [
    ["O", ".", ".", "O", ".", ".", "O", ".", "."],
    ["O", ".", "O", "O", ".", "O", "O", ".", "O"],
    ["O", "O", ".", "O", "O", ".", "O", "O", "."],
    ["O", ".", ".", "O", ".", ".", "O", ".", "."],
];
```

To visit the cells that need to be replaced with an `O`, we want to iterate over matrix positions starting from `[0, 0]` moving either down or to the top right at each iteration.

The step algorithm can be described as follows:

-   `height - 1` vertical steps down are taken to reach the bottom of the matrix (direction: `[1, 0]`)
-   `height - 1` diagonal steps to the top right are taken to reach the top again (direction: `[-1, 1]`)
-   Repeat

We can create a `zilt` iterator over the infinite step sequence from above using the <a href="#stretch">.stretch()</a> and <a href="#cycle">.cycle()</a> methods.

```ts
function draw(matrix, height, width) {
    const down = [1, 0];
    const up = [-1, 1];

    const steps = zilt.iter([down, up]) // [down, up]
        .stretch(height - 1) // [down * (height - 1), up * (height - 1)]
        .cycle(); // repeat the above to infinity

    ...
}
```

From there, we just need to initialize some matrix coordinates to `[0, 0]` and apply each directional step to it in order to loop over the relevant cells and overwrite their content with `O`'s. Since the iterator loops indefinitely, we need to make sure to stop the drawing loop once the current coordinate is out of the matrix bounds.

```ts
function draw(matrix, height, width) {
    const down = [1, 0];
    const up = [-1, 1];

    const steps = zilt
        .iter([down, up])
        .stretch(height - 1)
        .cycle();

    let [y, x] = [0, 0];
    for (const [ystep, xstep] of steps) {
        if (x >= width) break;

        matrix[y][x] = "O";
        [y, x] = [y + ystep, x + xstep];
    }

    return matrix;
}
```

I wouldn't advise writing code in this style, but here's another way of solving this problem using `zilt` exclusively.

```ts
function draw(matrix, height, width) {
    const down = [1, 0];
    const up = [-1, 1];

    const steps = zilt
        .iter([down, up])
        .stretch(height - 1)
        .cycle();

    zilt.once([0, 0])
        .chain(steps)
        .accumulate(([y, x], [ys, xs]) => [y + ys, x + xs])
        .takeWhile(([_, x]) => x < width)
        .forEach(([y, x]) => (matrix[y][x] = "O"));

    return matrix;
}
```

# **Documentation**

## Builders

### `iter()`

Creates an iterator from an iterable.

```ts
// [0, 1, 2]
zilt.iter([0, 1, 2]).collect();
```

### `once()`

Creates an iterator over a single value.

```ts
// [['hello']]
zilt.once(["hello"]).collect();
```

### `range()`

Creates an iterator over a range of numbers (end excluded).

```ts
zilt.range().collect(); // [0, 1, ...] (infinite)
zilt.range(1, 4).collect(); // [1, 2, 3]
zilt.range(3, 0).collect(); // [3, 2, 1]
zilt.range(4).collect(); // [0, 1, 2, 3]
zilt.range(-4).collect(); // [0, -1, -2, -3]
```

### `chain()`

Creates an iterator that yields the values of each passed iterable in sequence.

```ts
// [0, 1, 'foo']
zilt.chain([0, 1], ["foo"]).collect();
```

### `zip()`

Creates an iterator over n-tuples from "merging" n iterators together.

```ts
// [[0, 6, "foo"], [1, 7, "bar"]]
zilt.zip([0, 1], [6, 7], ["foo", "bar"]).collect();
```

## Consumer methods

### `.collect()`

Consumes the iterator to collect its values in an array and returns it.

```ts
// [0, 1, 2]
zilt.range(0, 3).collect();
```

### `.forEach()`

Consumes the iterator, invoking the provided function for each element.

```ts
// prints 0, 1, 2
zilt.range(0, 3).forEach((n, i) => console.log(n));
```

### `.find()`

Partially consumes the iterator and returns the first element for which the predicate is true. Returns undefined if none was found.

```ts
// 6
zilt.iter([7, 11, 3, 6, 5]).find((n) => n % 2 === 0);
```

### `.position()`

Partially consumes the iterator and returns the index of the first element for which the predicate is true. Returns undefined if none was found.

```ts
// 3
zilt.iter([7, 11, 3, 6, 5]).position((n) => n % 2 === 0);
```

### `.reduce()`

Consumes the iterator to produce a single value using a given function.

```ts
// 6
zilt.range(0, 4).reduce((acc, n) => acc + n);

// 7
zilt.range(0, 4).reduce((acc, n) => acc + n, 1);

// '0123'
zilt.range(0, 4).reduce((acc, n) => acc + n.toString(), "");
```

### `.count()`

Consumes the iterator and returns the number of elements that match a predicate.

```ts
// 3
const arr = [10, 15, 15, 20];
zilt.iter(arr).count(); // 4
zilt.iter(arr).count((n) => n === 15); // 2
```

### `.nth()`

Partially consumes the iterator and returns its nth element (0-indexed).

```ts
zilt.iter([1, 2, 3]).nth(2); // 3
```

### `.first()`

Partially consumes the iterator and returns its first element.

```ts
zilt.iter([1, 2, 3]).first(); // 1
```

### `.last()`

Consumes the iterator and returns its last element.

```ts
zilt.iter([1, 2, 3]).last(); // 3
```

### `.min()`

Consumes the iterator and returns the element for which the `getKey` function result is the minimum.

```ts
zilt.iter([3, 6, 4, 1, 8]).min((n) => n); // 1
zilt.iter([3, 6, 4, 1, 8]).min((n) => -n); // 8
```

### `.max()`

Consumes the iterator and returns the element for which the `getKey` function result is the maximum.

```ts
zilt.iter([3, 6, 4, 1, 8]).max((n) => n); // 8
zilt.iter([3, 6, 4, 1, 8]).max((n) => -n); // 1
```

### `.some()`

Consumes the iterator and returns true if any element satisfies the predicate.

```ts
zilt.iter([1, 1, 2]).some((n) => n === 2); // true
zilt.iter([1, 1, 1]).some((n) => n === 2); // false
```

### `.every()`

Consumes the iterator and returns true if every element satisfies the predicate.

```ts
zilt.iter([1, 2, 2]).every((n) => n === 2); // false
zilt.iter([2, 2, 2]).every((n) => n === 2); // true
```

### `.unzip()`

Consumes an iterator over `n`-tuples and returns `n` arrays.

```ts
// [[0, 1, 2], [3, 4, 5]]
zilt.iter([
    [0, 3],
    [1, 4],
    [2, 5],
]).unzip();
```

### `.partition()`

Consumes the iterator and returns a pair of arrays.

-   the first array contains all elements for which the predicate is true
-   the second array contains all elements for which the predicate is false

```ts
// [[2, 4], [1, 3]]
zilt.iter([1, 2, 3, 4]).partition((n) => n % 2 === 0);
```

### `.consume()`

Consumes the iterator.

```ts
// void
zilt.range(0, 3).consume();
```

## Adapter methods

### `.enumerate()`

Creates an iterator yielding values with an index counter starting from 0.

```ts
// [[4, 0], [5, 1], [6, 2]]
zilt.iter([4, 5, 6]).enumerate().collect();
```

### `.filter()`

Creates an iterator which uses a callback to determine if an element should be yielded.

```ts
// [1, 3]
zilt.range(0, 4)
    .filter((n) => n % 2 === 1)
    .collect();
```

### `.map()`

Creates an iterator that transforms each value in the original iterator using the passed function parameter.

```ts
// [0, 2, 4, 6]
zilt.range(0, 4)
    .map((n) => n * 2)
    .collect();
```

### `.flat()`

Creates an iterator which flattens nested array elements up to a certain depth (`maxDepth`).

> NOTE: this method only accepts **number literals** for the `maxDepth` parameter in order to correctly infer the output iterator element type.

```ts
const array = [
    [0, 1],
    [2, [3]],
];
// [0, 1, 2, [3]]
zilt.iter(arr).flat(1).collect();

// [0, 1, 2, 3]
zilt.iter(arr).flat(2).collect();
```

### `.flatMap()`

Creates an iterator which is equivalent to `.map().flat(1)`

```ts
// [1, -1, 2, -2]
zilt.iter([1, 2])
    .flatMap((n) => [n, -n])
    .collect();
```

### `.take()`

Creates an iterator which only keeps the first `num` values.

```ts
// [0, 1, 2]
zilt.range(0, 6).take(3).collect();
```

### `.takeWhile()`

Creates an iterator which yields values until a predicate is false.

```ts
// [0, 1, 2]
zilt.range(0, 6)
    .takeWhile((n) => n < 3)
    .collect();
```

### `.skip()`

Creates an iterator which skips the first num values.

```ts
// [3, 4, 5]
zilt.range(0, 6).skip(3).collect();
```

### `.skipWhile()`

Creates an iterator which skips values while a predicate is true.

```ts
// [3, 4, 5]
zilt.range(0, 6)
    .skipWhile((n) => n < 3)
    .collect();
```

### `.slice()`

Creates an iterator which only yields elements from start to end (excluded). It is equivalent to `.skip(start).take(end - start)`.

```ts
// [1, 2]
zilt.iter([0, 1, 1, 2, 3]).slice(2, 4).collect();
```

### `.step()`

Creates an iterator that yields values by steps of `step` starting from the first element.

```ts
// [1, 4, 7]
zilt.range(1, 10).step(3).collect();
```

### `.chain()`

Creates an iterator that extends the current iterator with the values of each passed iterable in sequence.

```ts
// [0, 'foo', 'bar']
zilt.iter([0]).chain(["foo"], ["bar"]).collect();
```

### `.cycle()`

Creates an iterator that repeats the current iterator count times. count defaults to Infinity.

```ts
// [1, 2, 3, 1, 2, 3]
zilt.range(1, 4).cycle(2).collect();

// [1, 2, 3, 1, 2, 3, 1, 2]
zilt.range(1, 4).cycle().take(8).collect();
```

### `.stretch()`

Creates an iterator that repeats each value of the current iterator count times.

```ts
// [1, 1, 2, 2, 3, 3]
zilt.iter([1, 2, 3]).stretch(2).collect();
```

### `.nest()`

Creates an iterator which repeats the provided iterable for each element in the current iterator. Elements are yielded as pairs.

> NOTE: prefer using `.nest(start, end)` instead of `.nest(range(start, end))` to avoid the unnecessary buffering of iterable values.

```ts
// [[0, 'a'], [0, 'b'], [1, 'a'], [1, 'b']]
zilt.range(2).nest(["a", "b"]).collect();

// [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]
zilt.range(2).nest(3).collect();

// [[0, 0], [0, -1], [1, 0], [1, -1]]
zilt.range(2).nest(0, -2).collect();
```

### `.zip()`

Creates an iterator over `n`-tuples from "merging" `n` iterators together.

```ts
// [[0, 6, "foo"], [1, 7, "bar"]]
zilt.iter([0, 1]).zip([6, 7], ["foo", "bar"]).collect();
```

### `.chunks()`

Creates an iterator which yields elements by chunks of `k`.

```ts
// [[0, 1], [2, 3], [4]]
zilt.iter([0, 1, 2, 3, 4]).chunks(2).collect();
```

### `.windows()`

Creates an iterator which yields every consecutive `k`-element window.

```ts
// [[0, 1], [1, 2], [2, 3], [3, 4]]
zilt.iter([0, 1, 2, 3, 4]).windows(2).collect();
```

### `.accumulate()`

Creates an iterator which updates and yields an accumulator using the provided function (similar to reduce, but yields the accumulator at every step instead of returning the final accumulator value).

```ts
// [0, 1, 3, 6, 10]
zilt.range(0, 5)
    .accumulate((acc, n) => acc + n)
    .collect();
```

### `.unique()`

Creates an iterator which filters out duplicate values.

```ts
// [0, 1, 2, 3, 4]
zilt.iter([0, 1, 1, 2, 3, 2, 4]).unique().collect();
```

### `.uniqueBy()`

Creates an iterator which filters out duplicate values using a `getKey` function.

```ts
// [0, 1, 2, 3, 4]
zilt.iter([0, 1, 1, 2, 3, 2, 4])
    .uniqueBy((n) => n)
    .collect();
```

### `.inspect()`

Creates an iterator that invokes a callback on each element before yielding.

```ts
// [1, 10, 2, 20, 3, 30]
const out: number[] = [];

zilt.range(1, 4)
    .inspect((n) => out.push(n))
    .map((n) => n * 10)
    .inspect((n) => out.push(n))
    .consume();
```

<!-- ROADMAP -->

<!-- ## Roadmap

-   [ ] Async support

See the [open issues](https://github.com/luismeyer95/zilt/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p> -->

<!-- CONTRIBUTING -->

# **Contributing**

Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

<p align="right">(<a href="#top">back to top</a>)</p>
