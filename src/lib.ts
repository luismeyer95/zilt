import { Flatten, MapToIterType, TupleToUnion, Unzip } from "./types/utils";
import LaziError from "./types/lazi-error";

export function iter<T>(input: T | Iterable<T>): LazyIterator<T> {
    if (Symbol.iterator in Object(input))
        return new LazyIterator(input as Iterable<T>);

    return new LazyIterator([input] as Iterable<T>);
}

export function range(start: number, end: number, step = 1) {
    const iterable = (function* () {
        for (let i = start; i !== end; i += step) {
            yield i;
        }
    })();

    return iter(iterable);
}

export class LazyIterator<T> {
    private transformer: () => Generator<T>;

    constructor(iterable: Iterable<T>) {
        this.transformer = function* () {
            for (const item of iterable) {
                yield item;
            }
        };
    }

    *[Symbol.iterator]() {
        for (const item of this.transformer()) {
            yield item;
        }
    }

    collect() {
        const result = [];

        for (const item of this) {
            result.push(item);
        }

        return result;
    }

    map<F extends (val: T, index: number) => any>(
        func: F
    ): LazyIterator<ReturnType<F>> {
        const previous = this.transformer.bind(this);

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
        const previous = this.transformer.bind(this);

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

        const previous = this.transformer.bind(this);

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

    skipWhile(pred: (val: T, index: number) => boolean): LazyIterator<T> {
        const previous = this.transformer.bind(this);

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

        const previous = this.transformer.bind(this);

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
        const previous = this.transformer.bind(this);

        this.transformer = function* () {
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

    count() {
        return this.reduce((acc) => acc + 1, 0);
    }

    flatten(): LazyIterator<Flatten<T>> {
        const previous = this.transformer.bind(this);

        return iter(
            (function* () {
                for (const sublist of previous()) {
                    if (Symbol.iterator in Object(sublist)) {
                        for (const item of sublist as any) {
                            yield item;
                        }
                    } else {
                        yield sublist;
                    }
                }
            })()
        );
    }

    chunks(chunkLen: number) {
        const previous = this.transformer.bind(this);

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

        const previous = this.transformer.bind(this);

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

    enumerate(): LazyIterator<[T, number]> {
        const previous = this.transformer.bind(this);

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

        const previous = this.transformer.bind(this);

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
    ): LazyIterator<[T, ...MapToIterType<I>]> {
        const previous = this.transformer.bind(this);

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

        for (const item of this.transformer()) {
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
        return this.map(func).flatten();
    }

    partition(pred: (val: T, index: number) => boolean) {
        const left = [];
        const right = [];
        let index = 0;

        for (const item of this.transformer()) {
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

        for (const element of this.transformer()) {
            last = element;
        }

        return last;
    }

    all(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.transformer()) {
            if (!pred(element, index)) {
                return false;
            }
            index += 1;
        }

        return true;
    }

    any(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.transformer()) {
            if (pred(element, index)) {
                return true;
            }
            index += 1;
        }

        return false;
    }

    find(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.transformer()) {
            if (pred(element, index)) {
                return element;
            }
            index += 1;
        }
    }

    position(pred: (val: T, index: number) => boolean) {
        let index = 0;

        for (const element of this.transformer()) {
            if (pred(element, index)) {
                return index;
            }

            index += 1;
        }
    }

    chain<I extends Iterable<any>[]>(
        ...iterables: I
    ): LazyIterator<T | TupleToUnion<MapToIterType<I>>> {
        const previous = this.transformer.bind(this);

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

    cycle() {
        const previous = this.transformer.bind(this);
        const buffered: T[] = [];

        return iter(
            (function* () {
                for (const item of previous()) {
                    buffered.push(item);
                    yield item;
                }

                while (true) {
                    for (const item of buffered) {
                        yield item;
                    }
                }
            })()
        );
    }

    forEach(func: (val: T, index: number) => unknown) {
        let index = 0;

        for (const element of this.transformer()) {
            func(element, index);
            index += 1;
        }
    }

    minByKey(getKey: (element: T) => number) {
        let minKey = Infinity,
            minElement;

        for (const element of this.transformer()) {
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

        for (const element of this.transformer()) {
            const key = getKey(element);

            if (key > maxKey) {
                maxKey = key;
                maxElement = element;
            }
        }

        return maxElement;
    }
}
