import {
    Flatten,
    MapToIterType,
    RecursiveFlatten,
    TupleToUnion,
    Unzip,
} from "./utils";
import LaziError from "./lazi.error";

/**
 * Creates a Lazi iterator from a regular iterable or a single value.
 */
export function iter<T>(input: Iterable<T>): LaziIterator<T> {
    return new LaziIterator(input);
}

export function once<T>(value: T): LaziIterator<T> {
    return new LaziIterator(
        (function* () {
            yield value;
        })()
    );
}

export function chain<T>(...iterables: Iterable<T>[]): LaziIterator<T> {
    return new LaziIterator(
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
 * Creates a Lazi iterator over a specified range of numbers and step.
 * @param start the start of the range
 * @param end the end of the range (excluded)
 * @param step the iteration step (defaults to 1)
 */
export function range(start: number, end: number, step = 1) {
    const iterable = (function* () {
        for (let i = start; i !== end; i += step) {
            yield i;
        }
    })();

    return iter(iterable);
}

/**
 * Lazi Iterator
 */
export class LaziIterator<T> {
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

    collect() {
        return [...this];
    }

    map<F extends (val: T, index: number) => any>(
        func: F
    ): LaziIterator<ReturnType<F>> {
        const previous = this.generator.bind(this);

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

    skip(num: number) {
        if (num < 0) throw new LaziError("Invalid skip parameter");

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

    skipWhile(pred: (val: T, index: number) => boolean): LaziIterator<T> {
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

    take(num: number) {
        if (num < 0) throw new LaziError("Invalid take parameter");

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

    reduce(func: (acc: T, element: T) => T): T;
    reduce(func: (acc: T, element: T) => T, initializer: T): T;
    reduce<U>(func: (acc: U, element: T) => U, initializer: U): U;
    reduce(func: any, initializer: any = null) {
        const iter = this[Symbol.iterator]();

        // Empty iterator without initializer, return early
        let first = iter.next();
        if (initializer === null && first.done) {
            throw new TypeError(
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

    accumulate(f: (acc: T, element: T) => T): LaziIterator<T>;
    accumulate(f: (acc: T, element: T) => T, initializer: T): LaziIterator<T>;
    accumulate<U>(
        f: (acc: U, element: T) => U,
        initializer: U
    ): LaziIterator<U>;
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

    count(pred: (val: T) => boolean = () => true) {
        return this.reduce((acc, val) => (pred(val) ? acc + 1 : acc), 0);
    }

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
    ): LaziIterator<RecursiveFlatten<N, T>> {
        if (maxDepth < 0) throw new LaziError("Invalid depth for flatten");

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
        if (windowLen <= 0) throw new LaziError("Invalid window length");

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

    enumerate(): LaziIterator<[T, number]> {
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

    stepBy(step: number) {
        if (step <= 0) throw new LaziError("Invalid step");

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
    ): LaziIterator<[T, ...MapToIterType<I>]> {
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
                throw new LaziError("Element type is not an array");
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
    ): LaziIterator<T | TupleToUnion<MapToIterType<I>>> {
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
            throw new LaziError("Invalid count parameter");

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
        if (count < 0) throw new LaziError("Invalid stretch parameter");

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

    tap(func: (element: T) => unknown) {
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
            throw new LaziError("Invalid slice range");
        }

        return this.skip(start).take(end - start);
    }
}
