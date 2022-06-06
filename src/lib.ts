import { Flatten, MapToIterType, PickIterType } from './types/utils';
import LaziError from './types/lazi-error';

export function iter<T>(iterable: Iterable<T>) {
    return new LazyIterator(iterable);
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

    filter<F extends (val: T, index: number) => boolean>(func: F) {
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

    skipWhile<F extends (val: T, index: number) => boolean>(
        pred: F
    ): LazyIterator<T> {
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
        const previous = this.transformer.bind(this);

        num = Math.max(0, num);

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

    takeWhile<F extends (val: T, index: number) => boolean>(pred: F) {
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
                'Reduce of empty iterator with no initial value'
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
        if (windowLen <= 0) throw new LaziError('Invalid window length');

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

    enumerate(): LazyIterator<[number, T]> {
        const previous = this.transformer.bind(this);

        return iter(
            (function* () {
                let index = 0;

                for (const item of previous()) {
                    yield [index, item];
                    index += 1;
                }
            })()
        );
    }

    stepBy(step: number) {
        if (step <= 0) throw new LaziError('Invalid step');

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
                    ...iterables.map((it) => it[Symbol.iterator]())
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

    // unzip() {
    //     const previous = this.transformer.bind(this);

    //     this.transformer = function* () {
    //         const left = [];
    //         const right = [];

    //         for (const [l, r] of previous()) {
    //             left.push(l);
    //             right.push(r);
    //         }

    //         yield left;
    //         yield right;
    //     };

    //     return this;
    // }

    // flatMap(func) {
    //     return this.map(func).flatten();
    // }

    // partition(pred) {
    //     const previous = this.transformer.bind(this);

    //     this.transformer = function* () {
    //         const left = [];
    //         const right = [];

    //         for (const item of previous()) {
    //             if (pred(item)) {
    //                 left.push(item);
    //             } else {
    //                 right.push(item);
    //             }
    //         }

    //         yield left;
    //         yield right;
    //     };

    //     return this;
    // }

    // nth(n) {
    //     return this.skip(n)[Symbol.iterator]().next().value;
    // }

    // first() {
    //     return this.nth(0);
    // }

    // last() {
    //     let last;

    //     for (const element of this.transformer()) {
    //         last = element;
    //     }

    //     return last;
    // }

    // all(pred) {
    //     for (const element of this.transformer()) {
    //         if (!pred(element)) {
    //             return false;
    //         }
    //     }

    //     return true;
    // }

    // any(pred) {
    //     for (const element of this.transformer()) {
    //         if (pred(element)) {
    //             return true;
    //         }
    //     }

    //     return false;
    // }

    // find(pred) {
    //     for (const element of this.transformer()) {
    //         if (pred(element)) {
    //             return element;
    //         }
    //     }
    // }

    // chain(iterable) {
    //     const previous = this.transformer.bind(this);

    //     this.transformer = function* () {
    //         for (const item of previous()) {
    //             yield item;
    //         }

    //         for (const item of iterable) {
    //             yield item;
    //         }
    //     };

    //     return this;
    // }

    // cycle() {
    //     const previous = this.transformer.bind(this);
    //     const buffered = [];

    //     this.transformer = function* () {
    //         for (const item of previous()) {
    //             buffered.push(item);
    //             yield item;
    //         }

    //         while (true) {
    //             for (const item of buffered) {
    //                 yield item;
    //             }
    //         }
    //     };

    //     return this;
    // }

    // forEach(func) {
    //     let index = 0;

    //     for (const element of this.transformer()) {
    //         func(element, index);
    //         index += 1;
    //     }
    // }

    // minByKey(getKey) {
    //     let minKey = Infinity,
    //         minElement;

    //     for (const element of this.transformer()) {
    //         const key = getKey(element);

    //         if (key < minKey) {
    //             minKey = key;
    //             minElement = element;
    //         }
    //     }

    //     return minElement;
    // }

    // maxByKey(getKey) {
    //     let maxKey = -Infinity,
    //         maxElement;

    //     for (const element of this.transformer()) {
    //         const key = getKey(element);

    //         if (key > maxKey) {
    //             maxKey = key;
    //             maxElement = element;
    //         }
    //     }

    //     return maxElement;
    // }

    // position(pred) {
    //     let index = 0;

    //     for (const element of this.transformer()) {
    //         if (pred(element)) {
    //             return index;
    //         }

    //         index += 1;
    //     }
    // }
}
