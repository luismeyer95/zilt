class ZiltError extends Error {
}

/**
 * Creates an iterator from an iterable.
 *
 * @example
 * // [0, 1, 2]
 * iter([0, 1, 2])
 *   .collect();
 */
function iter(input) {
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
function once(value) {
    return new ZiltIterator((function* () {
        yield value;
    })());
}
function range(...args) {
    let start = 0, end = Infinity;
    if (args.length === 2)
        [start, end] = args;
    else if (args.length === 1)
        [end] = args;
    const step = start < end ? 1 : -1;
    const iterable = (function* () {
        for (let i = start; i !== end; i += step) {
            yield i;
        }
    })();
    return new ZiltIterator(iterable);
}
/**
 * Creates an iterator that yields the values of each passed iterable in sequence.
 *
 * @example
 * // [0, 1, 'foo']
 * chain([0, 1], ['foo'])
 *   .collect();
 */
function chain(...iterables) {
    const iterable = (function* () {
        for (const it of iterables) {
            for (const item of it) {
                yield item;
            }
        }
    })();
    return new ZiltIterator(iterable);
}
/**
 * Creates an iterator over n-tuples from "merging" n iterators together.
 *
 * @example
 * // [[0, 6, "foo"], [1, 7, "bar"]]
 * zip([0, 1], [6, 7], ["foo", "bar"])
 *   .collect();
 */
function zip(...iterables) {
    const iterable = (function* () {
        if (iterables.length === 0)
            return;
        const iters = iterables.map((it) => it[Symbol.iterator]());
        let results = iters.map((it) => it.next());
        while (results.every((res) => !res.done)) {
            const values = results.map((res) => res.value);
            yield values;
            results = iters.map((it) => it.next());
        }
    })();
    return new ZiltIterator(iterable);
}
class ZiltIterator {
    constructor(iterable) {
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
    map(func) {
        const source = this.generator;
        const iterable = (function* () {
            let index = 0;
            for (const item of source()) {
                yield func(item, index);
                index += 1;
            }
        })();
        return new ZiltIterator(iterable);
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
    filter(func) {
        const source = this.generator;
        const iterable = (function* () {
            let index = 0;
            for (const item of source()) {
                if (func(item, index)) {
                    yield item;
                    index += 1;
                }
            }
        })();
        return new ZiltIterator(iterable);
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
    skip(num) {
        if (num < 0)
            throw new ZiltError("Invalid skip parameter");
        const source = this.generator;
        const iterable = (function* () {
            let iter = source();
            for (let i = 0; i < num; ++i) {
                iter.next();
            }
            for (const item of iter) {
                yield item;
            }
        })();
        return new ZiltIterator(iterable);
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
    skipWhile(pred) {
        const source = this.generator;
        const iterable = (function* () {
            let iter = source();
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
        })();
        return new ZiltIterator(iterable);
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
    take(num) {
        if (num < 0)
            throw new ZiltError("Invalid take parameter");
        const source = this.generator;
        const iterable = (function* () {
            for (const item of source()) {
                if (num === 0)
                    break;
                yield item;
                num -= 1;
            }
        })();
        return new ZiltIterator(iterable);
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
    takeWhile(pred) {
        const source = this.generator;
        const iterable = (function* () {
            let iter = source();
            let value = iter.next().value;
            let index = 0;
            while (pred(value, index)) {
                yield value;
                value = iter.next().value;
                index += 1;
            }
        })();
        return new ZiltIterator(iterable);
    }
    reduce(func, initializer = null) {
        const iter = this.generator();
        // Empty iterator without initializer, return early
        let first = iter.next();
        if (initializer === null && first.done) {
            throw new ZiltError("Reduce of empty iterator with no initial value");
        }
        let acc = initializer === null ? first.value : func(initializer, first.value);
        for (const item of iter) {
            acc = func(acc, item);
        }
        return acc;
    }
    accumulate(func, initializer = null) {
        const iter = this.generator();
        // Empty iterator without initializer, return early
        let first = iter.next();
        if (initializer === null && first.done) {
            throw new ZiltError("Reduce of empty iterator with no initial value");
        }
        const iterable = (function* () {
            let acc = initializer === null
                ? first.value
                : func(initializer, first.value);
            yield acc;
            for (const item of iter) {
                acc = func(acc, item);
                yield acc;
            }
        })();
        return new ZiltIterator(iterable);
    }
    /**
     * Consumes the iterator and returns the number of elements that match a predicate.
     *
     * @example
     * const arr = [10, 15, 15, 20];
     * iter(arr).count(); // 4
     * iter(arr).count((n) => n === 15); // 2
     */
    count(pred = () => true) {
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
    flat(maxDepth) {
        if (maxDepth < 0 || maxDepth > 15)
            throw new ZiltError("Invalid depth for flatten, allowed range is [0, 15]");
        function* recursiveFlatten(it, depth = maxDepth) {
            for (const item of it) {
                if (Symbol.iterator in Object(item) && depth !== 0) {
                    yield* recursiveFlatten(item, depth - 1);
                }
                else {
                    yield item;
                }
            }
        }
        const iterable = recursiveFlatten(this.generator());
        return new ZiltIterator(iterable);
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
    chunks(k) {
        const source = this.generator;
        const iterable = (function* () {
            let chunk = [];
            for (const item of source()) {
                chunk.push(item);
                if (chunk.length === k) {
                    yield chunk;
                    chunk = [];
                }
            }
            if (chunk.length !== 0) {
                yield chunk;
            }
        })();
        return new ZiltIterator(iterable);
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
    windows(k) {
        if (k <= 0)
            throw new ZiltError("Invalid window length");
        const source = this.generator;
        const iterable = (function* () {
            let window = [];
            let yielded = false;
            for (const item of source()) {
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
        })();
        return new ZiltIterator(iterable);
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
    enumerate() {
        const source = this.generator;
        const iterable = (function* () {
            let index = 0;
            for (const item of source()) {
                yield [item, index];
                index += 1;
            }
        })();
        return new ZiltIterator(iterable);
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
    step(step) {
        if (step <= 0)
            throw new ZiltError("Invalid step");
        const source = this.generator;
        const iterable = (function* () {
            let index = 0;
            for (const item of source()) {
                if (index % step === 0) {
                    yield item;
                }
                index += 1;
            }
        })();
        return new ZiltIterator(iterable);
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
    zip(...iterables) {
        const source = this.generator;
        const iterable = (function* () {
            const iters = [
                source(),
                ...iterables.map((it) => it[Symbol.iterator]()),
            ];
            let results = iters.map((it) => it.next());
            while (results.every((res) => !res.done)) {
                const values = results.map((res) => res.value);
                yield values;
                results = iters.map((it) => it.next());
            }
        })();
        return new ZiltIterator(iterable);
    }
    /**
     * Consumes an iterator over n-tuples and returns n arrays.
     *
     * @example
     * // [[0, 1, 2], [3, 4, 5]]
     * iter([[0, 3], [1, 4], [2, 5]])
     *   .unzip();
     */
    unzip() {
        let outLists = [];
        for (const item of this.generator()) {
            if (Array.isArray(item) === false) {
                throw new ZiltError("Element type is not an array");
            }
            const list = item;
            const oldLen = outLists.length;
            outLists.length = Math.max(oldLen, list.length);
            for (let i = oldLen; i < outLists.length; i++) {
                outLists[i] = [];
            }
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
    flatMap(func) {
        return this.map(func).flat(1);
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
    partition(pred) {
        const left = [];
        const right = [];
        let index = 0;
        for (const item of this.generator()) {
            if (pred(item, index)) {
                left.push(item);
            }
            else {
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
    nth(n) {
        if (n >= 0) {
            const res = this.skip(n)[Symbol.iterator]().next();
            if (!res.done)
                return res.value;
        }
    }
    /**
     * Partially consumes the iterator and returns its first element.
     *
     * @example
     * iter([1, 2, 3]).first() // 1
     */
    first() {
        return this.nth(0);
    }
    /**
     * Consumes the iterator and returns its last element.
     *
     * @example
     * iter([1, 2, 3]).last() // 3
     */
    last() {
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
    every(pred) {
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
    some(pred) {
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
    find(pred) {
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
    position(pred) {
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
    chain(...iterables) {
        const source = this.generator;
        const iterable = (function* () {
            for (const item of source()) {
                yield item;
            }
            for (const it of iterables) {
                for (const item of it) {
                    yield item;
                }
            }
        })();
        return new ZiltIterator(iterable);
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
    cycle(count = Infinity) {
        if (count < 0)
            throw new ZiltError("Invalid count parameter");
        const source = this.generator;
        const buffered = [];
        const iterable = (function* () {
            if (count === 0)
                return;
            for (const item of source()) {
                buffered.push(item);
                yield item;
            }
            while (--count) {
                for (const item of buffered) {
                    yield item;
                }
            }
        })();
        return new ZiltIterator(iterable);
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
    stretch(count) {
        if (count < 0)
            throw new ZiltError("Invalid stretch parameter");
        const source = this.generator;
        const iterable = (function* () {
            if (count === 0)
                return;
            for (const item of source()) {
                for (let i = 0; i < count; i++) {
                    yield item;
                }
            }
        })();
        return new ZiltIterator(iterable);
    }
    /**
     * Consumes the iterator, invoking the provided function for each element.
     *
     * @example
     * range(0, 3)
     *   .forEach((n, i) => console.log(n));
     */
    forEach(func) {
        let index = 0;
        for (const element of this.generator()) {
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
    min(getKey) {
        let minKey = Infinity, minElement;
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
    max(getKey) {
        let maxKey = -Infinity, maxElement;
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
    uniqueBy(getKey) {
        const source = this.generator;
        const iterable = (function* () {
            const seen = new Set();
            for (const item of source()) {
                if (seen.has(getKey(item)) === false) {
                    yield item;
                    seen.add(getKey(item));
                }
            }
        })();
        return new ZiltIterator(iterable);
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
    inspect(func) {
        const source = this.generator;
        const iterable = (function* () {
            for (const item of source()) {
                func(item);
                yield item;
            }
        })();
        return new ZiltIterator(iterable);
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
    slice(start, end = Infinity) {
        if (start < 0 || end < 0 || start > end) {
            throw new ZiltError("Invalid slice range");
        }
        return this.skip(start).take(end - start);
    }
    nest(...args) {
        if (typeof args[0] == "number") {
            return this._nestRange(...args);
        }
        const source = this.generator;
        const nested = Array.isArray(args[0]) ? args[0] : [...args[0]];
        const iterable = (function* () {
            for (const i of source()) {
                for (const j of nested) {
                    yield [i, j];
                }
            }
        })();
        return new ZiltIterator(iterable);
    }
    _nestRange(...args) {
        let start = 0, end = Infinity;
        if (args.length === 2)
            [start, end] = args;
        else if (args.length === 1)
            end = args[0];
        const source = this.generator;
        const iterable = (function* () {
            for (const i of source()) {
                for (const j of range(start, end)) {
                    yield [i, j];
                }
            }
        })();
        return new ZiltIterator(iterable);
    }
}

export { ZiltError, chain, iter, once, range, zip };
