import {
    MapToIterType,
    NumberLiteral,
    PickIterType,
    RecursiveFlatten,
    TupleToUnion,
    Unzip,
} from "./utils";
import ZiltError from "./zilt.error";

export { ZiltError };

/**
 * Creates an iterator from an iterable.
 *
 * @example
 * // [0, 1, 2]
 * iter([0, 1, 2])
 *   .collect();
 */
export function iter<T>(input: Iterable<T>): ZiltIterator<T> {
    return new ZiltIterator(input);
}

/**
 * Creates an iterator over a single value.
 *
 * @example
 * // [['hello']]
 * once(['hello'])
 *   .collect();
 */
export function once<T>(value: T): ZiltIterator<T> {
    return new ZiltIterator(
        (function* () {
            yield value;
        })()
    );
}

/**
 * Creates an iterator over a range of numbers (end excluded).
 * @example
 * range().collect()        // [0, 1, ...] (infinite)
 * range(1, 4).collect()    // [1, 2, 3]
 * range(3, 0).collect()    // [3, 2, 1]
 * range(4).collect()       // [0, 1, 2, 3]
 * range(-4).collect()      // [0, -1, -2, -3]
 */
export function range(start: number, end: number): ZiltIterator<number>;
export function range(end: number): ZiltIterator<number>;
export function range(): ZiltIterator<number>;
export function range(...args: number[]) {
    let start = 0,
        end = Infinity;

    if (args.length === 2) [start, end] = args;
    else if (args.length === 1) [end] = args;

    const step = start < end ? 1 : -1;

    const iterable = (function* () {
        for (let i = start; i !== end; i += step) {
            yield i;
        }
    })();

    return iter(iterable);
}

/**
 * Creates an iterator that yields the values of each passed iterable in sequence.
 *
 * @example
 * // [0, 1, 'foo']
 * chain([0, 1], ['foo'])
 *   .collect();
 */
export function chain<I extends Iterable<any>>(
    ...iterables: I[]
): ZiltIterator<PickIterType<I>> {
    return new ZiltIterator(
        (function* () {
            for (const it of iterables) {
                for (const item of it) {
                    yield item;
                }
            }
        })()
    );
}

/**
 * Creates an iterator over n-tuples from "merging" n iterators together.
 *
 * @example
 * // [[0, 6, "foo"], [1, 7, "bar"]]
 * zip([0, 1], [6, 7], ["foo", "bar"])
 *   .collect();
 */
export function zip<I extends Iterable<any>[]>(
    ...iterables: I
): ZiltIterator<MapToIterType<I>> {
    return new ZiltIterator(
        (function* () {
            if (iterables.length === 0) return;

            const iters = iterables.map((it) => it[Symbol.iterator]());
            let results = iters.map((it) => it.next());

            while (results.every((res) => !res.done)) {
                const values = results.map((res) => res.value);
                yield values as MapToIterType<I>;

                results = iters.map((it) => it.next());
            }
        })()
    );
}

class ZiltIterator<T> {
    private generator: () => Generator<T>;

    constructor(iterable: Iterable<T>) {
        this.generator = function* () {
            for (const item of iterable) {
                yield item;
            }
        };
    }

    *[Symbol.iterator]() {
        for (const item of this.generator()) {
            yield item;
        }
    }

    /**
     * Consumes the iterator to collect its values in an array and returns it.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 3)
     *   .collect();
     */
    collect() {
        return [...this];
    }

    /**
     * Consumes the iterator.
     *
     * @example
     * // void
     * range(0, 3)
     *   .consume();
     */
    consume() {
        for (const item of this) {
        }
    }

    /**
     * Creates an iterator that transforms each value in the original iterator using the passed function parameter.
     *
     * @example
     * // [0, 2, 4, 6]
     * range(0, 4)
     *   .map((n) => n * 2)
     *   .collect();
     */
    map<F extends (val: T, index: number) => any>(
        func: F
    ): ZiltIterator<ReturnType<F>> {
        const previous = this.generator;

        return iter(
            (function* () {
                let index = 0;

                for (const item of previous()) {
                    yield func(item, index);
                    index += 1;
                }
            })()
        );
    }

    /**
     * Creates an iterator which uses a callback to determine if an element should be yielded.
     *
     * @example
     * // [1, 3]
     * range(0, 4)
     *   .filter((n) => n % 2 === 1)
     *   .collect();
     */
    filter(func: (val: T, index: number) => boolean) {
        const previous = this.generator;

        return iter(
            (function* () {
                let index = 0;

                for (const item of previous()) {
                    if (func(item, index)) {
                        yield item;
                        index += 1;
                    }
                }
            })()
        );
    }

    /**
     * Creates an iterator which skips the first `num` values.
     *
     * @example
     * // [3, 4, 5]
     * range(0, 6)
     *   .skip(3)
     *   .collect();
     */
    skip(num: number) {
        if (num < 0) throw new ZiltError("Invalid skip parameter");

        const previous = this.generator;

        return iter(
            (function* () {
                let iter = previous();
                for (let i = 0; i < num; ++i) {
                    iter.next();
                }
                for (const item of iter) {
                    yield item;
                }
            })()
        );
    }

    /**
     * Creates an iterator which skips values while a predicate is true.
     *
     * @example
     * // [3, 4, 5]
     * range(0, 6)
     *   .skipWhile((n) => n < 3)
     *   .collect();
     */
    skipWhile(pred: (val: T, index: number) => boolean): ZiltIterator<T> {
        const previous = this.generator;

        return iter(
            (function* () {
                let iter = previous();
                let value = iter.next().value;
                let index = 0;

                while (pred(value, index)) {
                    value = iter.next().value;
                    index += 1;
                }

                yield value;
                for (const item of iter) {
                    yield item;
                }
            })()
        );
    }

    /**
     * Creates an iterator which only keeps the first `num` values.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 6)
     *   .take(3)
     *   .collect();
     */
    take(num: number) {
        if (num < 0) throw new ZiltError("Invalid take parameter");

        const previous = this.generator;

        return iter(
            (function* () {
                for (const item of previous()) {
                    if (num === 0) break;
                    yield item;
                    num -= 1;
                }
            })()
        );
    }

    /**
     * Creates an iterator which yields values until a predicate is false.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 6)
     *   .takeWhile((n) => n < 3)
     *   .collect();
     */
    takeWhile(pred: (val: T, index: number) => boolean) {
        const previous = this.generator;

        this.generator = function* () {
            let iter = previous();
            let value = iter.next().value;
            let index = 0;

            while (pred(value, index)) {
                yield value;
                value = iter.next().value;
                index += 1;
            }
        };

        return this;
    }

    /**
     * Consumes the iterator to produce a single value using a given function.
     * @example
     * // 6
     * range(0, 4)
     *   .reduce((acc, n) => acc + n);
     *
     * // 7
     * range(0, 4)
     *   .reduce((acc, n) => acc + n, 1);
     *
     * // '0123'
     * range(0, 4)
     *   .reduce((acc, n) => acc + n.toString(), '');
     */
    reduce(func: (acc: T, element: T) => T): T;
    reduce(func: (acc: T, element: T) => T, initializer: T): T;
    reduce<U>(func: (acc: U, element: T) => U, initializer: U): U;
    reduce(func: any, initializer: any = null) {
        const iter = this[Symbol.iterator]();

        // Empty iterator without initializer, return early
        let first = iter.next();
        if (initializer === null && first.done) {
            throw new ZiltError(
                "Reduce of empty iterator with no initial value"
            );
        }

        let acc =
            initializer === null ? first.value : func(initializer, first.value);

        for (const item of iter) {
            acc = func(acc, item);
        }

        return acc;
    }

    /**
     * Creates an iterator which updates and yields an accumulator using the provided function (similar to reduce, but yields the accumulator at every step instead of returning the final accumulator value).
     *
     * @example
     * // [0, 1, 3, 6, 10]
     * range(0, 5)
     *   .accumulate((acc, n) => acc + n)
     *   .collect();
     *
     * // [2, 3, 5, 8, 12]
     * range(0, 5)
     *   .accumulate((acc, n) => acc + n, 2)
     *   .collect();
     */
    accumulate(f: (acc: T, element: T) => T): ZiltIterator<T>;
    accumulate(f: (acc: T, element: T) => T, initializer: T): ZiltIterator<T>;
    accumulate<U>(
        f: (acc: U, element: T) => U,
        initializer: U
    ): ZiltIterator<U>;
    accumulate(func: any, initializer: any = null) {
        const previous = this[Symbol.iterator]();

        // Empty iterator without initializer, return early
        let first = previous.next();
        if (initializer === null && first.done) {
            throw new ZiltError(
                "Reduce of empty iterator with no initial value"
            );
        }

        return iter(
            (function* () {
                let acc =
                    initializer === null
                        ? first.value
                        : func(initializer, first.value);

                yield acc;

                for (const item of previous) {
                    acc = func(acc, item);
                    yield acc;
                }
            })()
        );
    }

    /**
     * Consumes the iterator and returns the number of elements that match a predicate.
     *
     * @example
     * const arr = [10, 15, 15, 20];
     * iter(arr).count(); // 4
     * iter(arr).count((n) => n === 15); // 2
     */
    count(pred: (val: T) => boolean = () => true) {
        return this.reduce((acc, val) => (pred(val) ? acc + 1 : acc), 0);
    }

    /**
     * Creates an iterator which flattens nested array elements up to a certain depth (`maxDepth`).
     *
     * @example
     * // [0, 1, 2, [3]]
     * iter([[0, 1], [2, [3]]])
     *   .flatten(1)
     *   .collect();
     *
     * // [0, 1, 2, 3]
     * iter([[0, 1], [2, [3]]])
     *   .flatten(2)
     *   .collect();
     */
    flatten<N extends number>(
        maxDepth: NumberLiteral<N>
    ): ZiltIterator<RecursiveFlatten<N, T>> {
        if (maxDepth < 0 || maxDepth > 10)
            throw new ZiltError(
                "Invalid depth for flatten, allowed range is [0, 10]"
            );

        function* recurse<U>(depth: number, it: Iterable<U>): any {
            for (const item of it) {
                if (Symbol.iterator in Object(item) && depth !== maxDepth) {
                    yield* recurse(depth + 1, item as any);
                } else {
                    yield item;
                }
            }
        }

        return iter(recurse(0, this.generator()));
    }

    /**
     * Creates an iterator which yields elements by chunks of `k`.
     *
     * @example
     * // [[0, 1], [2, 3], [4]]
     * iter([0, 1, 2, 3, 4])
     *   .chunks(2)
     *   .collect();
     */
    chunks(k: number) {
        const previous = this.generator;

        return iter(
            (function* () {
                let chunk = [];

                for (const item of previous()) {
                    chunk.push(item);

                    if (chunk.length === k) {
                        yield chunk;
                        chunk = [];
                    }
                }

                if (chunk.length !== 0) {
                    yield chunk;
                }
            })()
        );
    }

    /**
     * Creates an iterator which yields every consecutive `k`-element window.
     *
     * @example
     * // [[0, 1], [1, 2], [2, 3], [3, 4]]
     * iter([0, 1, 2, 3, 4])
     *   .windows(2)
     *   .collect();
     */
    windows(k: number) {
        if (k <= 0) throw new ZiltError("Invalid window length");

        const previous = this.generator;

        return iter(
            (function* () {
                let window: T[] = [];
                let yielded = false;

                for (const item of previous()) {
                    window.push(item);

                    if (window.length === k) {
                        yield window;
                        yielded = true;
                        window = window.slice(1);
                    }
                }

                if (!yielded) {
                    yield window;
                }
            })()
        );
    }

    /**
     * Creates an iterator yielding values with an index counter starting from 0.
     *
     * @example
     * // [[4, 0], [5, 1], [6, 2]]
     * iter([4, 5, 6])
     *   .enumerate()
     *   .collect();
     */
    enumerate(): ZiltIterator<[T, number]> {
        const previous = this.generator;

        return iter(
            (function* () {
                let index = 0;

                for (const item of previous()) {
                    yield [item, index] as [T, number];
                    index += 1;
                }
            })()
        );
    }

    /**
     * Creates an iterator that yields values by steps of `step` starting from the first element.
     *
     * @example
     * // [1, 4, 7]
     * range(1, 10)
     *   .step(3)
     *   .collect();
     */
    step(step: number) {
        if (step <= 0) throw new ZiltError("Invalid step");

        const previous = this.generator;

        return iter(
            (function* () {
                let index = 0;

                for (const item of previous()) {
                    if (index % step === 0) {
                        yield item;
                    }
                    index += 1;
                }
            })()
        );
    }

    /**
     * Creates an iterator over n-tuples from "merging" n iterators together.
     *
     * @example
     * // [[0, 6, "foo"], [1, 7, "bar"]]
     * iter([0, 1])
     *   .zip([6, 7], ["foo", "bar"])
     *   .collect();
     */
    zip<I extends Iterable<any>[]>(
        ...iterables: I
    ): ZiltIterator<[T, ...MapToIterType<I>]> {
        const previous = this.generator;

        return iter(
            (function* () {
                const iters = [
                    previous(),
                    ...iterables.map((it) => it[Symbol.iterator]()),
                ];

                let results = iters.map((it) => it.next());

                while (results.every((res) => !res.done)) {
                    const values = results.map((res) => res.value);
                    yield values as [T, ...MapToIterType<I>];

                    results = iters.map((it) => it.next());
                }
            })()
        );
    }

    /**
     * Consumes an iterator over n-tuples and returns n arrays.
     *
     * @example
     * // [[0, 1, 2], [3, 4, 5]]
     * iter([[0, 3], [1, 4], [2, 5]])
     *   .unzip();
     */
    unzip(): Unzip<T> {
        let outLists: any = [];

        const updateLen = (n: number) => {
            const oldLen = outLists.length;
            outLists.length = Math.max(oldLen, n);
            for (let i = oldLen; i < outLists.length; i++) {
                outLists[i] = [];
            }
        };

        for (const item of this.generator()) {
            if (Array.isArray(item) === false) {
                throw new ZiltError("Element type is not an array");
            }

            const list: any = item;
            updateLen(list.length);

            let index = 0;
            for (const elem of list) {
                outLists[index].push(elem);
                index += 1;
            }
        }

        return outLists;
    }

    /**
     * Creates an iterator which is equivalent to`.map().flatten(1)`.
     *
     * @example
     * // [1, -1, 2, -2]
     * iter([1, 2])
     *   .flatMap((n) => [n, -n])
     *   .collect();
     */
    flatMap<F extends (val: T, index: number) => any>(func: F) {
        return this.map(func).flatten(1);
    }

    /**
     * Consumes the iterator and returns a pair of arrays.
     * - the first array contains all elements for which the predicate is `true`
     * - the second array contains all elements for which the predicate is `false`
     *
     * @example
     * // [[2, 4], [1, 3]]
     * iter([1, 2, 3, 4])
     *   .partition((n) => n % 2 === 0);
     */
    partition(pred: (val: T, index: number) => boolean) {
        const left = [];
        const right = [];
        let index = 0;

        for (const item of this.generator()) {
            if (pred(item, index)) {
                left.push(item);
            } else {
                right.push(item);
            }
            index += 1;
        }

        return [left, right];
    }

    /**
     * Partially consumes the iterator and returns its nth element (0-indexed).
     *
     * @example
     * iter([1, 2, 3]).nth(2) // 3
     */
    nth(n: number): T | undefined {
        if (n >= 0) {
            const res = this.skip(n)[Symbol.iterator]().next();
            if (!res.done) return res.value;
        }
    }

    /**
     * Partially consumes the iterator and returns its first element.
     *
     * @example
     * iter([1, 2, 3]).first() // 1
     */
    first(): T | undefined {
        return this.nth(0);
    }

    /**
     * Consumes the iterator and returns its last element.
     *
     * @example
     * iter([1, 2, 3]).last() // 3
     */
    last(): T | undefined {
        let last;

        for (const element of this.generator()) {
            last = element;
        }

        return last;
    }

    /**
     * Consumes the iterator and returns true if every element satisfies the predicate.
     *
     * @example
     * iter([1, 2, 2]).every(n => n === 2) // false
     * iter([2, 2, 2]).every(n => n === 2) // true
     */
    every(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (!pred(element, index)) {
                return false;
            }
            index += 1;
        }

        return true;
    }

    /**
     * Consumes the iterator and returns true if any element satisfies the predicate.
     *
     * @example
     * iter([1, 1, 2]).some(n => n === 2) // true
     * iter([1, 1, 1]).some(n => n === 2) // false
     */
    some(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (pred(element, index)) {
                return true;
            }
            index += 1;
        }

        return false;
    }

    /**
     * Partially consumes the iterator and returns the first element for which the predicate is true. Returns `undefined` if none was found.
     *
     * @example
     * // 6
     * iter([7, 11, 3, 6, 5])
     *   .find(n => n % 2 === 0);
     */
    find(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (pred(element, index)) {
                return element;
            }
            index += 1;
        }
    }

    /**
     * Partially consumes the iterator and returns the index of the first element for which the predicate is true. Returns `undefined` if none was found.
     *
     * @example
     * // 3
     * iter([7, 11, 3, 6, 5])
     *   .position(n => n % 2 === 0);
     */
    position(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (pred(element, index)) {
                return index;
            }

            index += 1;
        }
    }

    /**
     * Creates an iterator that extends the current iterator with the values of each passed iterable in sequence.
     *
     * @example
     * // [0, 'foo', 'bar']
     * iter([0])
     *   .chain(['foo'], ['bar'])
     *   .collect();
     */
    chain<I extends Iterable<any>[]>(
        ...iterables: I
    ): ZiltIterator<T | TupleToUnion<MapToIterType<I>>> {
        const previous = this.generator;

        return iter(
            (function* () {
                for (const item of previous()) {
                    yield item;
                }

                for (const it of iterables) {
                    for (const item of it) {
                        yield item;
                    }
                }
            })()
        );
    }

    /**
     * Creates an iterator that repeats the current iterator `count` times. `count` defaults to `Infinity`.
     *
     * @example
     * // [1, 2, 3, 1, 2, 3]
     * range(1, 4)
     *   .cycle(2)
     *   .collect();
     *
     * // [1, 2, 3, 1, 2, 3, 1, 2]
     * range(1, 4)
     *   .cycle()
     *   .take(8)
     *   .collect();
     */
    cycle(count: number = Infinity) {
        if (count < 0) throw new ZiltError("Invalid count parameter");

        const previous = this.generator;
        const buffered: T[] = [];

        return iter(
            (function* () {
                if (count === 0) return;

                for (const item of previous()) {
                    buffered.push(item);
                    yield item;
                }

                while (--count) {
                    for (const item of buffered) {
                        yield item;
                    }
                }
            })()
        );
    }

    /**
     * Creates an iterator that repeats each value of the current iterator `count` times.
     *
     * @example
     * // [1, 1, 2, 2, 3, 3]
     * iter([1, 2, 3])
     *   .stretch(2)
     *   .collect();
     */
    stretch(count: number) {
        if (count < 0) throw new ZiltError("Invalid stretch parameter");

        const previous = this.generator;

        return iter(
            (function* () {
                if (count === 0) return;

                for (const item of previous()) {
                    for (const _ of range(0, count)) {
                        yield item;
                    }
                }
            })()
        );
    }

    /**
     * Consumes the iterator, invoking the provided function for each element.
     *
     * @example
     * range(0, 3)
     *   .forEach((n, i) => console.log(n));
     */
    forEach(func: (val: T, index: number) => unknown) {
        let index = 0;

        for (const element of this) {
            func(element, index);
            index += 1;
        }
    }

    /**
     * Consumes the iterator and returns the element for which the `getKey` function result is the minimum.
     *
     * @example
     * iter([3, 6, 4, 1, 8]).min(n => n); // 1
     * iter([3, 6, 4, 1, 8]).min(n => -n); // 8
     */
    min(getKey: (element: T) => number) {
        let minKey = Infinity,
            minElement;

        for (const element of this.generator()) {
            const key = getKey(element);

            if (key < minKey) {
                minKey = key;
                minElement = element;
            }
        }

        return minElement;
    }

    /**
     * Consumes the iterator and returns the element for which the `getKey` function result is the maximum.
     *
     * @example
     * iter([3, 6, 4, 1, 8]).max(n => n); // 8
     * iter([3, 6, 4, 1, 8]).max(n => -n); // 1
     */
    max(getKey: (element: T) => number) {
        let maxKey = -Infinity,
            maxElement;

        for (const element of this.generator()) {
            const key = getKey(element);

            if (key > maxKey) {
                maxKey = key;
                maxElement = element;
            }
        }

        return maxElement;
    }

    /**
     * Creates an iterator which filters out duplicate values.
     *
     * @example
     * // [0, 1, 2, 3, 4]
     * iter([0, 1, 1, 2, 3, 2, 4])
     *   .unique()
     *   .collect();
     */
    unique() {
        return this.uniqueBy((elem) => elem);
    }

    /**
     * Creates an iterator which filters out duplicate values using a `getKey` function.
     *
     * @example
     * // [0, 1, 2, 3, 4]
     * iter([0, 1, 1, 2, 3, 2, 4])
     *   .uniqueBy(n => n)
     *   .collect();
     */
    uniqueBy(getKey: (element: T) => unknown) {
        const previous = this.generator;

        return iter(
            (function* () {
                const seen = new Set();

                for (const item of previous()) {
                    if (seen.has(getKey(item)) === false) {
                        yield item;
                        seen.add(getKey(item));
                    }
                }
            })()
        );
    }

    /**
     * Creates an iterator that invokes a callback on each element before yielding.
     *
     * @example
     * // [1, 10, 2, 20, 3, 30]
     * const out: number[] = [];
     *
     * range(1, 4)
     *   .inspect((n) => out.push(n))
     *   .map((n) => n * 10)
     *   .inspect((n) => out.push(n))
     *   .consume();
     */
    inspect(func: (element: T) => unknown) {
        const previous = this.generator;

        return iter(
            (function* () {
                for (const item of previous()) {
                    func(item);
                    yield item;
                }
            })()
        );
    }

    /**
     * Creates an iterator which only yields elements from `start` to `end` (excluded). It is equivalent to `.skip(start).take(end - start)`.
     *
     * @example
     * // [1, 2]
     * iter([0, 1, 1, 2, 3])
     *   .slice(2, 4)
     *   .collect();
     */
    slice(start: number, end: number = Infinity) {
        if (start < 0 || end < 0 || start > end) {
            throw new ZiltError("Invalid slice range");
        }

        return this.skip(start).take(end - start);
    }

    /**
     * Creates an iterator which repeats the provided iterable for each element in the current iterator. Elements are yielded as pairs.
     *
     * NOTE: prefer using `.nest(start, end)` instead of `.nest(range(start, end))` to avoid the unnecessary buffering of iterable values.
     *
     * @example
     * // [[0, 'a'], [0, 'b'], [1, 'a'], [1, 'b']]
     * range(2)
     *   .nest(['a', 'b'])
     *   .collect();
     *
     * // [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]
     * range(2)
     *   .nest(3)
     *   .collect();
     *
     * // [[0, 0], [0, -1], [1, 0], [1, -1]]
     * range(2)
     *   .nest(0, -2)
     *   .collect();
     */
    nest(start: number, end: number): ZiltIterator<[T, number]>;
    nest(end: number): ZiltIterator<[T, number]>;
    nest<U>(iterable: Iterable<U>): ZiltIterator<[T, U]>;
    nest<U>(...args: number[] | [Iterable<U>]) {
        if (typeof args[0] == "number") {
            return this._nestRange(...(args as number[]));
        }

        const previous = this.generator;

        const [iterable] = args;
        const nested = Array.isArray(iterable) ? iterable : [...iterable];

        return iter(
            (function* () {
                for (const i of previous()) {
                    for (const j of nested) {
                        yield [i, j];
                    }
                }
            })()
        );
    }

    private _nestRange(...args: number[]): ZiltIterator<[T, number]> {
        const previous = this.generator;

        let start = 0,
            end = Infinity;

        if (args.length === 2) [start, end] = args;
        else if (args.length === 1) end = args[0];

        return iter(
            (function* () {
                for (const i of previous()) {
                    for (const j of range(start, end)) {
                        yield [i, j];
                    }
                }
            })()
        );
    }
}
