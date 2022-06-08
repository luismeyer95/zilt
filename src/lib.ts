import { MapToIterType, RecursiveFlatten, TupleToUnion, Unzip } from "./utils";
import AzilError from "./azil.error";

/**
 * Creates an iterator from a regular iterable or a single value.
 * @example
 * iter([0, 1, 2]).collect() // [0, 1, 2]
 */
export function iter<T>(input: Iterable<T>): AzilIterator<T> {
    return new AzilIterator(input);
}

/**
 * Creates an iterator over a single value.
 * @example
 * once(['hello']).collect() // [['hello']]
 */
export function once<T>(value: T): AzilIterator<T> {
    return new AzilIterator(
        (function* () {
            yield value;
        })()
    );
}

/**
 * Creates an iterator that yields the values of each passed iterable in sequence.
 * @example
 * chain([0, 1], ['foo']).collect(); // [0, 1, 'foo']
 */
export function chain<T>(...iterables: Iterable<T>[]): AzilIterator<T> {
    return new AzilIterator(
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
 * Creates an iterator over a range of numbers (end excluded).
 * @example
 * range().collect()        // [0, 1, ...] (infinite)
 * range(1, 4).collect()    // [1, 2, 3]
 * range(3, 0).collect()    // [3, 2, 1]
 * range(4).collect()       // [0, 1, 2, 3]
 * range(-4).collect()      // [0, -1, -2, -3]
 */
export function range(start: number, end: number): AzilIterator<number>;
export function range(end: number): AzilIterator<number>;
export function range(): AzilIterator<number>;
export function range(...args: number[]) {
    let start = 0,
        end = Infinity;

    if (args.length === 2) [start, end] = args;
    else if (args.length === 1) end = args[0];

    const step = start < end ? 1 : -1;

    const iterable = (function* () {
        for (let i = start; i !== end; i += step) {
            yield i;
        }
    })();

    return iter(iterable);
}

class AzilIterator<T> {
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
     * @example
     * range(0, 3).collect() // [0, 1, 2]
     */
    collect() {
        return [...this];
    }

    /**
     * Creates an iterator that transforms each value in the original iterator using the passed function parameter.
     * @example
     * range(0, 4).map((n) => n * 2).collect() // [0, 2, 4, 6]
     */
    map<F extends (val: T, index: number) => any>(
        func: F
    ): AzilIterator<ReturnType<F>> {
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
     * @example
     * range(0, 4).filter((n) => n % 2 === 1).collect();
     * // => [1, 3]
     */
    filter(func: (val: T, index: number) => boolean) {
        const previous = this.generator.bind(this);

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
     * @example
     * range(0, 6).skip(3).collect();
     * // => [3, 4, 5]
     */
    skip(num: number) {
        if (num < 0) throw new AzilError("Invalid skip parameter");

        const previous = this.generator.bind(this);

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
     * @example
     * range(0, 6).skipWhile((n) => n < 3).collect();
     * // => [3, 4, 5]
     */
    skipWhile(pred: (val: T, index: number) => boolean): AzilIterator<T> {
        const previous = this.generator.bind(this);

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
     * @example
     * range(0, 6).take(3).collect();
     * // => [0, 1, 2]
     */
    take(num: number) {
        if (num < 0) throw new AzilError("Invalid take parameter");

        const previous = this.generator.bind(this);

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
     * @example
     * range(0, 6).takeWhile((n) => n < 3).collect();
     * // => [0, 1, 2]
     */
    takeWhile(pred: (val: T, index: number) => boolean) {
        const previous = this.generator.bind(this);

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
     * range(0, 4).reduce((acc, n) => acc + n); // 6
     * range(0, 4).reduce((acc, n) => acc + n, 1); // 7
     * range(0, 4).reduce((acc, n) => acc + n.toString(), ''); // '0123'
     */
    reduce(func: (acc: T, element: T) => T): T;
    reduce(func: (acc: T, element: T) => T, initializer: T): T;
    reduce<U>(func: (acc: U, element: T) => U, initializer: U): U;
    reduce(func: any, initializer: any = null) {
        const iter = this[Symbol.iterator]();

        // Empty iterator without initializer, return early
        let first = iter.next();
        if (initializer === null && first.done) {
            throw new AzilError(
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
     * Creates an iterator which updates an accumulator using a function argument (similar to reduce, but yielding the accumulator at every step).
     * @example
     * // [0, 1, 3, 6, 10]
     * range(0, 5)
     *   .accumulate((acc, n) => acc + n)
     *   .collect();
     *
     * // [2, 3, 5, 8]
     * range(0, 4)
     *   .accumulate((acc, n) => acc + n, 2)
     *   .collect();
     */
    accumulate(f: (acc: T, element: T) => T): AzilIterator<T>;
    accumulate(f: (acc: T, element: T) => T, initializer: T): AzilIterator<T>;
    accumulate<U>(
        f: (acc: U, element: T) => U,
        initializer: U
    ): AzilIterator<U>;
    accumulate(func: any, initializer: any = null) {
        const previous = this[Symbol.iterator]();

        // Empty iterator without initializer, return early
        let first = previous.next();
        if (initializer === null && first.done) {
            throw new TypeError(
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
     * @example
     * const arr = [10, 15, 15, 20];
     * iter(arr).count(); // 4
     * iter(arr).count((n) => n === 15); // 2
     */
    count(pred: (val: T) => boolean = () => true) {
        return this.reduce((acc, val) => (pred(val) ? acc + 1 : acc), 0);
    }

    /**
     * Consumes the iterator and returns the percentage of elements that match a predicate.
     * @example
     * const arr = [10, 15, 15, 20];
     * iter(arr).rate((n) => n === 15); // 0.5
     */
    rate(pred: (val: T) => boolean) {
        let total = 0;

        const count = this.reduce((acc, val) => {
            total += 1;
            return pred(val) ? acc + 1 : acc;
        }, 0);

        return count / total;
    }

    flatten<N extends number>(
        maxDepth: N
    ): AzilIterator<RecursiveFlatten<N, T>> {
        if (maxDepth < 0 || maxDepth > 10)
            throw new AzilError(
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

    chunks(chunkLen: number) {
        const previous = this.generator.bind(this);

        return iter(
            (function* () {
                let chunk = [];

                for (const item of previous()) {
                    chunk.push(item);

                    if (chunk.length === chunkLen) {
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

    windows(windowLen: number) {
        if (windowLen <= 0) throw new AzilError("Invalid window length");

        const previous = this.generator.bind(this);

        return iter(
            (function* () {
                let window: T[] = [];
                let yielded = false;

                for (const item of previous()) {
                    window.push(item);

                    if (window.length === windowLen) {
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

    enumerate(): AzilIterator<[T, number]> {
        const previous = this.generator.bind(this);

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

    step(step: number) {
        if (step <= 0) throw new AzilError("Invalid step");

        const previous = this.generator.bind(this);

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

    zip<I extends Iterable<any>[]>(
        ...iterables: I
    ): AzilIterator<[T, ...MapToIterType<I>]> {
        const previous = this.generator.bind(this);

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
                throw new AzilError("Element type is not an array");
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

    flatMap<F extends (val: T, index: number) => any>(func: F) {
        return this.map(func).flatten(1);
    }

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

    nth(n: number) {
        if (n < 0) return undefined;

        return this.skip(n)[Symbol.iterator]().next().value;
    }

    first() {
        return this.nth(0);
    }

    last() {
        let last;

        for (const element of this.generator()) {
            last = element;
        }

        return last;
    }

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

    find(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (pred(element, index)) {
                return element;
            }
            index += 1;
        }
    }

    position(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.generator()) {
            if (pred(element, index)) {
                return index;
            }

            index += 1;
        }
    }

    chain<I extends Iterable<any>[]>(
        ...iterables: I
    ): AzilIterator<T | TupleToUnion<MapToIterType<I>>> {
        const previous = this.generator.bind(this);

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

    cycle(count: number | null = null) {
        if (count !== null && count < 0)
            throw new AzilError("Invalid count parameter");

        const previous = this.generator.bind(this);
        const buffered: T[] = [];

        return iter(
            (function* () {
                if (count === 0) return;

                for (const item of previous()) {
                    buffered.push(item);
                    yield item;
                }

                while (count === null ? true : --count) {
                    for (const item of buffered) {
                        yield item;
                    }
                }
            })()
        );
    }

    stretch(count: number) {
        if (count < 0) throw new AzilError("Invalid stretch parameter");

        const previous = this.generator.bind(this);

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

    forEach(func: (val: T, index: number) => unknown) {
        let index = 0;

        for (const element of this.generator()) {
            func(element, index);
            index += 1;
        }
    }

    minByKey(getKey: (element: T) => number) {
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

    maxByKey(getKey: (element: T) => number) {
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

    unique() {
        return this.uniqueBy((elem) => elem);
    }

    uniqueBy(getKey: (element: T) => unknown) {
        const previous = this.generator.bind(this);

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

    inspect(func: (element: T) => unknown) {
        const previous = this.generator.bind(this);

        return iter(
            (function* () {
                for (const item of previous()) {
                    func(item);
                    yield item;
                }
            })()
        );
    }

    slice(start: number, end: number = Infinity) {
        if (start < 0 || end < 0 || start > end) {
            throw new AzilError("Invalid slice range");
        }

        return this.skip(start).take(end - start);
    }

    // TODO: unit test
    nest<U>(iterable: Iterable<U>): AzilIterator<[T, U]> {
        const previous = this.generator.bind(this);
        const nested = [...iterable];

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

    nestRange(start: number, end: number): AzilIterator<[T, number]>;
    nestRange(end: number): AzilIterator<[T, number]>;
    nestRange(...args: number[]): AzilIterator<[T, number]> {
        const previous = this.generator.bind(this);

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
