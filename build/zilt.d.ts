import { MapToIterType, NumberLiteral, PickIterType, RecursiveFlatten, TupleToUnion, Unzip } from "./utils";
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
export declare function iter<T>(input: Iterable<T>): ZiltIterator<T>;
/**
 * Creates an iterator over a single value.
 *
 * @example
 * // [['hello']]
 * once(['hello'])
 *   .collect();
 */
export declare function once<T>(value: T): ZiltIterator<T>;
/**
 * Creates an iterator over a range of numbers (end excluded).
 * @example
 * range().collect()        // [0, 1, ...] (infinite)
 * range(1, 4).collect()    // [1, 2, 3]
 * range(3, 0).collect()    // [3, 2, 1]
 * range(4).collect()       // [0, 1, 2, 3]
 * range(-4).collect()      // [0, -1, -2, -3]
 */
export declare function range(start: number, end: number): ZiltIterator<number>;
export declare function range(end: number): ZiltIterator<number>;
export declare function range(): ZiltIterator<number>;
/**
 * Creates an iterator that yields the values of each passed iterable in sequence.
 *
 * @example
 * // [0, 1, 'foo']
 * chain([0, 1], ['foo'])
 *   .collect();
 */
export declare function chain<I extends Iterable<any>>(...iterables: I[]): ZiltIterator<PickIterType<I>>;
/**
 * Creates an iterator over n-tuples from "merging" n iterators together.
 *
 * @example
 * // [[0, 6, "foo"], [1, 7, "bar"]]
 * zip([0, 1], [6, 7], ["foo", "bar"])
 *   .collect();
 */
export declare function zip<I extends Iterable<any>[]>(...iterables: I): ZiltIterator<MapToIterType<I>>;
declare class ZiltIterator<T> {
    private generator;
    constructor(iterable: Iterable<T>);
    [Symbol.iterator](): Generator<T, void, unknown>;
    /**
     * Consumes the iterator to collect its values in an array and returns it.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 3)
     *   .collect();
     */
    collect(): T[];
    /**
     * Consumes the iterator.
     *
     * @example
     * // void
     * range(0, 3)
     *   .consume();
     */
    consume(): void;
    /**
     * Creates an iterator that transforms each value in the original iterator using the passed function parameter.
     *
     * @example
     * // [0, 2, 4, 6]
     * range(0, 4)
     *   .map((n) => n * 2)
     *   .collect();
     */
    map<F extends (val: T, index: number) => any>(func: F): ZiltIterator<ReturnType<F>>;
    /**
     * Creates an iterator which uses a callback to determine if an element should be yielded.
     *
     * @example
     * // [1, 3]
     * range(0, 4)
     *   .filter((n) => n % 2 === 1)
     *   .collect();
     */
    filter(func: (val: T, index: number) => boolean): ZiltIterator<T>;
    /**
     * Creates an iterator which skips the first `num` values.
     *
     * @example
     * // [3, 4, 5]
     * range(0, 6)
     *   .skip(3)
     *   .collect();
     */
    skip(num: number): ZiltIterator<T>;
    /**
     * Creates an iterator which skips values while a predicate is true.
     *
     * @example
     * // [3, 4, 5]
     * range(0, 6)
     *   .skipWhile((n) => n < 3)
     *   .collect();
     */
    skipWhile(pred: (val: T, index: number) => boolean): ZiltIterator<T>;
    /**
     * Creates an iterator which only keeps the first `num` values.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 6)
     *   .take(3)
     *   .collect();
     */
    take(num: number): ZiltIterator<T>;
    /**
     * Creates an iterator which yields values until a predicate is false.
     *
     * @example
     * // [0, 1, 2]
     * range(0, 6)
     *   .takeWhile((n) => n < 3)
     *   .collect();
     */
    takeWhile(pred: (val: T, index: number) => boolean): ZiltIterator<any>;
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
    accumulate<U>(f: (acc: U, element: T) => U, initializer: U): ZiltIterator<U>;
    /**
     * Consumes the iterator and returns the number of elements that match a predicate.
     *
     * @example
     * const arr = [10, 15, 15, 20];
     * iter(arr).count(); // 4
     * iter(arr).count((n) => n === 15); // 2
     */
    count(pred?: (val: T) => boolean): number;
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
    flat<N extends number>(maxDepth: NumberLiteral<N>): ZiltIterator<RecursiveFlatten<N, T>>;
    /**
     * Creates an iterator which yields elements by chunks of `k`.
     *
     * @example
     * // [[0, 1], [2, 3], [4]]
     * iter([0, 1, 2, 3, 4])
     *   .chunks(2)
     *   .collect();
     */
    chunks(k: number): ZiltIterator<T[]>;
    /**
     * Creates an iterator which yields every consecutive `k`-element window.
     *
     * @example
     * // [[0, 1], [1, 2], [2, 3], [3, 4]]
     * iter([0, 1, 2, 3, 4])
     *   .windows(2)
     *   .collect();
     */
    windows(k: number): ZiltIterator<T[]>;
    /**
     * Creates an iterator yielding values with an index counter starting from 0.
     *
     * @example
     * // [[4, 0], [5, 1], [6, 2]]
     * iter([4, 5, 6])
     *   .enumerate()
     *   .collect();
     */
    enumerate(): ZiltIterator<[T, number]>;
    /**
     * Creates an iterator that yields values by steps of `step` starting from the first element.
     *
     * @example
     * // [1, 4, 7]
     * range(1, 10)
     *   .step(3)
     *   .collect();
     */
    step(step: number): ZiltIterator<T>;
    /**
     * Creates an iterator over n-tuples from "merging" n iterators together.
     *
     * @example
     * // [[0, 6, "foo"], [1, 7, "bar"]]
     * iter([0, 1])
     *   .zip([6, 7], ["foo", "bar"])
     *   .collect();
     */
    zip<I extends Iterable<any>[]>(...iterables: I): ZiltIterator<[T, ...MapToIterType<I>]>;
    /**
     * Consumes an iterator over n-tuples and returns n arrays.
     *
     * @example
     * // [[0, 1, 2], [3, 4, 5]]
     * iter([[0, 3], [1, 4], [2, 5]])
     *   .unzip();
     */
    unzip(): Unzip<T>;
    /**
     * Creates an iterator which is equivalent to`.map().flatten(1)`.
     *
     * @example
     * // [1, -1, 2, -2]
     * iter([1, 2])
     *   .flatMap((n) => [n, -n])
     *   .collect();
     */
    flatMap<F extends (val: T, index: number) => any>(func: F): ZiltIterator<import("./utils").Flatten<ReturnType<F>>>;
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
    partition(pred: (val: T, index: number) => boolean): T[][];
    /**
     * Partially consumes the iterator and returns its nth element (0-indexed).
     *
     * @example
     * iter([1, 2, 3]).nth(2) // 3
     */
    nth(n: number): T | undefined;
    /**
     * Partially consumes the iterator and returns its first element.
     *
     * @example
     * iter([1, 2, 3]).first() // 1
     */
    first(): T | undefined;
    /**
     * Consumes the iterator and returns its last element.
     *
     * @example
     * iter([1, 2, 3]).last() // 3
     */
    last(): T | undefined;
    /**
     * Consumes the iterator and returns true if every element satisfies the predicate.
     *
     * @example
     * iter([1, 2, 2]).every(n => n === 2) // false
     * iter([2, 2, 2]).every(n => n === 2) // true
     */
    every(pred: (val: T, index: number) => boolean): boolean;
    /**
     * Consumes the iterator and returns true if any element satisfies the predicate.
     *
     * @example
     * iter([1, 1, 2]).some(n => n === 2) // true
     * iter([1, 1, 1]).some(n => n === 2) // false
     */
    some(pred: (val: T, index: number) => boolean): boolean;
    /**
     * Partially consumes the iterator and returns the first element for which the predicate is true. Returns `undefined` if none was found.
     *
     * @example
     * // 6
     * iter([7, 11, 3, 6, 5])
     *   .find(n => n % 2 === 0);
     */
    find(pred: (val: T, index: number) => boolean): T | undefined;
    /**
     * Partially consumes the iterator and returns the index of the first element for which the predicate is true. Returns `undefined` if none was found.
     *
     * @example
     * // 3
     * iter([7, 11, 3, 6, 5])
     *   .position(n => n % 2 === 0);
     */
    position(pred: (val: T, index: number) => boolean): number | undefined;
    /**
     * Creates an iterator that extends the current iterator with the values of each passed iterable in sequence.
     *
     * @example
     * // [0, 'foo', 'bar']
     * iter([0])
     *   .chain(['foo'], ['bar'])
     *   .collect();
     */
    chain<I extends Iterable<any>[]>(...iterables: I): ZiltIterator<T | TupleToUnion<MapToIterType<I>>>;
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
    cycle(count?: number): ZiltIterator<T>;
    /**
     * Creates an iterator that repeats each value of the current iterator `count` times.
     *
     * @example
     * // [1, 1, 2, 2, 3, 3]
     * iter([1, 2, 3])
     *   .stretch(2)
     *   .collect();
     */
    stretch(count: number): ZiltIterator<T>;
    /**
     * Consumes the iterator, invoking the provided function for each element.
     *
     * @example
     * range(0, 3)
     *   .forEach((n, i) => console.log(n));
     */
    forEach(func: (val: T, index: number) => unknown): void;
    /**
     * Consumes the iterator and returns the element for which the `getKey` function result is the minimum.
     *
     * @example
     * iter([3, 6, 4, 1, 8]).min(n => n); // 1
     * iter([3, 6, 4, 1, 8]).min(n => -n); // 8
     */
    min(getKey: (element: T) => number): T | undefined;
    /**
     * Consumes the iterator and returns the element for which the `getKey` function result is the maximum.
     *
     * @example
     * iter([3, 6, 4, 1, 8]).max(n => n); // 8
     * iter([3, 6, 4, 1, 8]).max(n => -n); // 1
     */
    max(getKey: (element: T) => number): T | undefined;
    /**
     * Creates an iterator which filters out duplicate values.
     *
     * @example
     * // [0, 1, 2, 3, 4]
     * iter([0, 1, 1, 2, 3, 2, 4])
     *   .unique()
     *   .collect();
     */
    unique(): ZiltIterator<T>;
    /**
     * Creates an iterator which filters out duplicate values using a `getKey` function.
     *
     * @example
     * // [0, 1, 2, 3, 4]
     * iter([0, 1, 1, 2, 3, 2, 4])
     *   .uniqueBy(n => n)
     *   .collect();
     */
    uniqueBy(getKey: (element: T) => unknown): ZiltIterator<T>;
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
    inspect(func: (element: T) => unknown): ZiltIterator<T>;
    /**
     * Creates an iterator which only yields elements from `start` to `end` (excluded). It is equivalent to `.skip(start).take(end - start)`.
     *
     * @example
     * // [1, 2]
     * iter([0, 1, 1, 2, 3])
     *   .slice(2, 4)
     *   .collect();
     */
    slice(start: number, end?: number): ZiltIterator<T>;
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
    private _nestRange;
}
