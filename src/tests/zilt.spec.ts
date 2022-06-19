import { range, iter, once, chain } from "../zilt";

describe("iter", () => {
    it("should create an array iterator", () => {
        let index = 0;
        let arr = [{ prop: 1 }, { prop: 2 }, { prop: 3 }];

        for (const item of iter(arr)) {
            expect(item).toBe(arr[index]);
            index += 1;
        }
    });

    it("should create a single element iterator", () => {
        let count = 0;

        for (const item of once(7)) {
            expect(item).toBe(7);
            count += 1;
        }

        expect(count).toBe(1);
    });
});

describe("range", () => {
    it("should iterate over the range 1..4", () => {
        let expected = 1;

        for (const item of range(1, 4)) {
            expect(item).toBe(expected);
            expected += 1;
        }
    });

    it("should iterate over the range 0..-6", () => {
        let expected = 0;

        for (const item of range(0, -6)) {
            expect(item).toBe(expected);
            expected -= 1;
        }
    });

    it("should iterate indefinitely", () => {
        expect(range().take(1000).count()).toBe(1000);
    });

    it("should iterate forward", () => {
        expect(range(3).collect()).toMatchObject([0, 1, 2]);
    });

    it("should iterate backward", () => {
        expect(range(-3).collect()).toMatchObject([0, -1, -2]);
    });
});

describe("collect", () => {
    it("should consume the iterator into a collection", () => {
        expect(range(0, 5).collect()).toMatchObject([0, 1, 2, 3, 4]);
    });

    it("should consume the empty iterator into an empty collection", () => {
        expect(iter([]).collect()).toMatchObject([]);
    });
});

describe("map", () => {
    it("should map iterator values", () => {
        expect(
            range(0, 5)
                .map((x) => x * 2)
                .collect()
        ).toMatchObject([0, 2, 4, 6, 8]);
    });
});

describe("filter", () => {
    it("should filter iterator values using a predicate", () => {
        expect(
            range(0, 5)
                .filter((x) => x % 2 === 1)
                .collect()
        ).toMatchObject([1, 3]);
    });
});

describe("skip", () => {
    it("should drop n values from the iterator", () => {
        expect(range(0, 5).skip(2).collect()).toMatchObject([2, 3, 4]);
    });

    it("should return empty iterator if skip is too large", () => {
        expect(range(0, 5).skip(10).collect()).toMatchObject([]);
    });

    it("should throw on negative skip", () => {
        expect(() => range(0, 5).skip(-1)).toThrowError();
    });
});

describe("skip while", () => {
    it("should skip while predicate is true", () => {
        expect(
            range(0, 5)
                .skipWhile((n) => n < 2)
                .collect()
        ).toMatchObject([2, 3, 4]);
    });

    it("should give empty iterator if predicate is always true", () => {
        expect(
            range(0, 5)
                .skipWhile((n) => n < 10)
                .collect()
        ).toMatchObject([]);
    });

    it("should be no-op if predicate is always false", () => {
        expect(
            range(0, 5)
                .skipWhile((n) => n > 10)
                .collect()
        ).toMatchObject([0, 1, 2, 3, 4]);
    });
});

describe("take", () => {
    it("should take n values from the iterator", () => {
        expect(range(0, 5).take(2).collect()).toMatchObject([0, 1]);
    });

    it("should be no-op if take is too large", () => {
        expect(range(0, 5).take(10).collect()).toMatchObject([0, 1, 2, 3, 4]);
    });

    it("should throw on negative take", () => {
        expect(() => range(0, 5).take(-1)).toThrowError();
    });
});

describe("take while", () => {
    it("should take while predicate is true", () => {
        expect(
            range(0, 5)
                .takeWhile((n) => n < 2)
                .collect()
        ).toMatchObject([0, 1]);
    });

    it("should be no-op if predicate is always true", () => {
        expect(
            range(0, 5)
                .takeWhile((n) => n < 10)
                .collect()
        ).toMatchObject([0, 1, 2, 3, 4]);
    });

    it("should give empty iterator if predicate is always false", () => {
        expect(
            range(0, 5)
                .takeWhile((n) => n > 10)
                .collect()
        ).toMatchObject([]);
    });
});

describe("reduce", () => {
    it("should reduce without initializer", () => {
        const result = iter([0, 1, 2, 3]).reduce((acc, n) => acc + n);
        expect(result).toBe(6);
    });

    it("should reduce with same type initializer", () => {
        const result = iter([0, 1, 2, 3]).reduce((acc, n) => acc + n, 4);
        expect(result).toBe(10);
    });

    it("should throw on reduce without initializer and empty iterator", () => {
        const sequence: number[] = [];
        const operation = () => iter(sequence).reduce((acc, n) => acc + n);
        expect(operation).toThrowError();
    });

    it("should reduce with different type initializer", () => {
        const result = iter(["apple", "orange", "banana", "apple"]).reduce<
            Record<string, number>
        >((acc, fruit) => {
            if (fruit in acc === false) acc[fruit] = 0;
            acc[fruit] += 1;
            return acc;
        }, {});

        expect(result).toMatchObject({ apple: 2, orange: 1, banana: 1 });
    });
});

describe("accumulate", () => {
    it("should accumulate elements using callback", () => {
        const it = range(0, 5).accumulate((acc, n) => acc + n);
        expect(it.collect()).toMatchObject([0, 1, 3, 6, 10]);
    });

    it("should accumulate elements using callback and initializer", () => {
        const it = range(0, 5).accumulate((acc, n) => acc + n, 5);
        expect(it.collect()).toMatchObject([5, 6, 8, 11, 15]);
    });

    it("should throw on accumulate without initializer and empty iterator", () => {
        const sequence: number[] = [];
        const operation = () => iter(sequence).accumulate((acc, n) => acc + n);
        expect(operation).toThrowError();
    });
});

describe("count", () => {
    it("should return the iterator length", () => {
        expect(range(4, 9).count()).toBe(5);
    });
});

describe("rate", () => {
    it("should return the percentage of values satisfying the predicate", () => {
        expect(range(4, 9).rate((n) => n % 2 === 0)).toBe(3 / 5);
    });
});

describe("flatten", () => {
    it("should flatten array of arrays", () => {
        const result = iter([
            [0, 1],
            [2, 3],
        ])
            .flatten(1)
            .collect();

        expect(result).toMatchObject([0, 1, 2, 3]);
    });

    it("should flatten mixed depth array", () => {
        const arr = [0, [1], [[2]]];
        const result = iter(arr).flatten(1).collect();

        expect(result).toMatchObject([0, 1, [2]]);
    });

    it("should deep flatten mixed depth array", () => {
        const arr = [0, [1], [[2]]];
        const result = iter(arr).flatten(2).collect();

        expect(result).toMatchObject([0, 1, 2]);
    });

    it("should no-op on 0 depth", () => {
        const arr = [0, [1], [[2]]];
        const result = iter(arr).flatten(0).collect();

        expect(result).toMatchObject([0, [1], [[2]]]);
    });

    // it("should not receive a non-literal argument", () => {
    //     const arr = [0, [1], [[2]]];
    //     const result = iter(arr)
    //         .flatten(0 as number)
    //         .collect();

    //     expect(result).toMatchObject([0, [1], [[2]]]);
    // });
});

describe("chunks", () => {
    it("should chunk", () => {
        const result = iter([0, 1, 2, 3]).chunks(2).collect();

        expect(result).toMatchObject([
            [0, 1],
            [2, 3],
        ]);
    });

    it("should chunk with leftover", () => {
        const result = iter([0, 1, 2, 3]).chunks(3).collect();

        expect(result).toMatchObject([[0, 1, 2], [3]]);
    });

    it("should chunk empty iterator", () => {
        const result = iter([]).chunks(3).collect();

        expect(result).toMatchObject([]);
    });
});

describe("windows", () => {
    it("should slide window", () => {
        const result = iter([0, 1, 2, 3]).windows(2).collect();

        expect(result).toMatchObject([
            [0, 1],
            [1, 2],
            [2, 3],
        ]);
    });

    it("should slide window with len larger than size", () => {
        const result = iter([0, 1, 2, 3]).windows(8).collect();

        expect(result).toMatchObject([[0, 1, 2, 3]]);
    });

    it("should throw on window length <= 0", () => {
        expect(() => iter([0, 1, 2]).windows(0)).toThrowError();
        expect(() => iter([0, 1, 2]).windows(-1)).toThrowError();
    });
});

describe("enumerate", () => {
    it("should enumerate", () => {
        const result = iter([4, 5, 6]).enumerate().collect();

        expect(result).toMatchObject([
            [4, 0],
            [5, 1],
            [6, 2],
        ]);
    });
});

describe("step", () => {
    it("should step by 3", () => {
        const result = iter([1, 2, 3, 4, 5, 6, 7, 8, 9]).step(3).collect();

        expect(result).toMatchObject([1, 4, 7]);
    });

    it("should no-op on empty iterator", () => {
        const result = iter([]).step(3).collect();

        expect(result).toMatchObject([]);
    });

    it("should error on step <= 0", () => {
        expect(() => iter([1]).step(0)).toThrowError();
        expect(() => iter([1]).step(-1)).toThrowError();
    });
});

describe("zip", () => {
    it("should zip same len iterators", () => {
        const result = iter([0, 1]).zip([6, 7], ["foo", "bar"]).collect();

        expect(result).toMatchObject([
            [0, 6, "foo"],
            [1, 7, "bar"],
        ]);
    });

    it("should zip diff len iterators and stop when any iterator ends", () => {
        const result = iter([0, 1])
            .zip([6, 7, 8, 9], ["hola", "bonjour", "hello"])
            .collect();

        expect(result).toMatchObject([
            [0, 6, "hola"],
            [1, 7, "bonjour"],
        ]);
    });

    it("should not error on empty zip", () => {
        const result = iter([0, 1]).zip().collect();

        expect(result).toMatchObject([[0], [1]]);
    });

    it("should not yield from zipped iterator on empty base iterator", () => {
        const result = iter([]).zip([0, 1]).collect();

        expect(result).toMatchObject([]);
    });
});

describe("unzip", () => {
    it("should unzip zipped iterators", () => {
        const [one, two, three] = iter([0, 1])
            .zip([6, 7], ["foo", "bar"])
            .unzip();

        expect(one).toMatchObject([0, 1]);
        expect(two).toMatchObject([6, 7]);
        expect(three).toMatchObject(["foo", "bar"]);
    });

    it("should unzip tuple iterators", () => {
        const result = iter([1, 2, 3, 4]).windows(2).unzip();

        // [1,2], [2,3], [3,4] => [[1,2,3], [2,3,4]]

        expect(result).toMatchObject([
            [1, 2, 3],
            [2, 3, 4],
        ]);
    });

    it("should throw when unzipping on iterator of non-iterables", () => {
        expect(() => range(0, 5).unzip()).toThrowError();
    });
});

describe("flat map", () => {
    it("should map then flatten", () => {
        const result = iter([1, 2, 3, 4])
            .flatMap((n) => [n, -n])
            .collect();

        expect(result).toMatchObject([1, -1, 2, -2, 3, -3, 4, -4]);
    });
});

describe("partition", () => {
    it("should partition", () => {
        const [even, odd] = iter([1, 2, 3, 4]).partition((n) => n % 2 === 0);

        expect(even).toMatchObject([2, 4]);
        expect(odd).toMatchObject([1, 3]);
    });

    it("should partition with true predicate", () => {
        const [t, f] = iter([1, 2, 3, 4]).partition(() => true);

        expect(t).toMatchObject([1, 2, 3, 4]);
        expect(f).toMatchObject([]);
    });
});

describe("nth", () => {
    it("should get nth when it exists", () => {
        const it = iter([1, 2, 3]);

        expect(it.nth(0)).toBe(1);
        expect(it.nth(1)).toBe(2);
        expect(it.nth(2)).toBe(3);
    });

    it("should get undefined when nth does not exist", () => {
        const it = iter([1, 2, 3]);

        expect(it.nth(10)).toBeUndefined();
        expect(it.nth(-1)).toBeUndefined();
    });
});

describe("first/last", () => {
    it("should get first", () => {
        const it = iter([1, 2, 3]);
        expect(it.first()).toBe(1);
    });

    it("should get last", () => {
        const it = iter([1, 2, 3]);
        expect(it.last()).toBe(3);
    });
});

describe("every/some", () => {
    it("some should return true on any predicate call true", () => {
        const it = iter([1, 2, 3]);
        expect(it.some((n) => n === 2)).toBe(true);
        expect(it.some((n) => n === 4)).toBe(false);
    });

    it("every should return true on all predicate calls true", () => {
        const it = iter([1, 2, 3]);
        expect(it.every((n) => n === 2)).toBe(false);
        expect(it.every((n) => n < 4)).toBe(true);
    });
});

describe("find", () => {
    it("should find predicate element", () => {
        const it = iter([1, 2, 3]);

        expect(it.find((n) => n % 2 === 0)).toBe(2);
    });

    it("should return undefined on not found", () => {
        const it = iter([1, 2, 3]);

        expect(it.find((n) => n % 4 === 0)).toBeUndefined();
    });
});

describe("position", () => {
    it("should find predicate element's position", () => {
        const it = iter([1, 2, 3]);

        expect(it.position((n) => n % 2 === 0)).toBe(1);
    });

    it("should return undefined on not found", () => {
        const it = iter([1, 2, 3]);

        expect(it.position((n) => n % 4 === 0)).toBeUndefined();
    });
});

describe("chain", () => {
    it("should chain two iterators", () => {
        const it1 = iter([1, 2, 3]);
        const it2 = iter([4, 5, 6]);

        expect(it1.chain(it2).collect()).toMatchObject([1, 2, 3, 4, 5, 6]);
    });

    it("should chain multiple different type iterators", () => {
        const it = iter([1, 2, 3]).chain(
            ["apple", "orange"],
            [{ age: 23 }, { age: 58 }]
        );

        expect(it.collect()).toMatchObject([
            1,
            2,
            3,
            "apple",
            "orange",
            { age: 23 },
            { age: 58 },
        ]);
    });
});

describe("cycle", () => {
    it("should cycle indefinitely", () => {
        const it = iter([1, 2, 3]);

        expect(it.cycle().take(8).collect()).toMatchObject([
            1, 2, 3, 1, 2, 3, 1, 2,
        ]);
    });

    it("should cycle 3 times", () => {
        expect(once(0).cycle(3).collect()).toMatchObject([0, 0, 0]);
    });

    it("should throw on negative cycle count", () => {
        expect(() => once(0).cycle(-1)).toThrowError();
    });
});

describe("for each", () => {
    it("should iterate and invoke callback with elem, index", () => {
        const result: [number, number][] = [];

        iter([1, 2, 3]).forEach((elem, index) => {
            result.push([elem, index]);
        });

        expect(result).toMatchObject([
            [1, 0],
            [2, 1],
            [3, 2],
        ]);
    });
});

describe("min by key", () => {
    it("should get min using key predicate", () => {
        const it = iter([{ a: 4 }, { a: 3 }, { a: 8 }, { a: 7 }]);

        expect(it.min((e) => e.a)).toMatchObject({ a: 3 });
    });
});

describe("max by key", () => {
    it("should get max using key predicate", () => {
        const it = iter([{ a: 4 }, { a: 3 }, { a: 8 }, { a: 7 }]);

        expect(it.max((e) => e.a)).toMatchObject({ a: 8 });
    });
});

describe("unique, uniqueBy", () => {
    it("should filter out duplicates", () => {
        const it = iter([0, 1, 1, 2, 3, 3, 2, 4, 1, 5]);

        expect(it.unique().collect()).toMatchObject([0, 1, 2, 3, 4, 5]);
        expect(it.uniqueBy((n) => n).collect()).toMatchObject([
            0, 1, 2, 3, 4, 5,
        ]);
    });
});

describe("inspect", () => {
    it("should invoke callback on yielded values", () => {
        const out: number[] = [];

        range(0, 5)
            .inspect((n) => out.push(n))
            .map((n) => n * 10)
            .inspect((n) => out.push(n))
            .consume();

        expect(out).toMatchObject([0, 0, 1, 10, 2, 20, 3, 30, 4, 40]);
    });
});

describe("slice", () => {
    it("should filter out values outside the slice range", () => {
        const it = range(2, 7).slice(1, 3);

        expect(it.collect()).toMatchObject([3, 4]);
    });

    it("should throw on invalid range", () => {
        const it = range(2, 7);

        expect(() => it.slice(-1).collect()).toThrowError();
        expect(() => it.slice(2, 1).collect()).toThrowError();
        expect(() => it.slice(1, -1).collect()).toThrowError();
    });
});

describe("nest, nestRange", () => {
    it("should create a 2D iterator", () => {
        const pairs = [];
        const strs = ["hello", "world"];

        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 2; ++j) {
                pairs.push([i, strs[j]]);
            }
        }

        expect(range(3).nest(strs).collect()).toMatchObject(pairs);
    });

    it("should create a 2D iterator", () => {
        const pairs = [];

        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 2; ++j) {
                pairs.push([i, j]);
            }
        }

        expect(range(3).nestRange(2).collect()).toMatchObject(pairs);
    });
});

describe("chaos", () => {
    it("should work", () => {
        const it = range(0, 3)
            .chain(once(3), once(4), [5, 6, 7])
            .cycle()
            .step(3)
            .take(9);

        expect(it.collect()).toMatchObject([0, 3, 6, 1, 4, 7, 2, 5, 0]);
    });

    it("should draw a zigzag pattern in the matrix", () => {
        const expected = [
            [1, 0, 0, 1, 0, 0, 1, 0, 0],
            [1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 1, 0, 1, 1, 0, 1, 1, 0],
            [1, 0, 0, 1, 0, 0, 1, 0, 0],
        ];

        const draw = (mat: number[][]) => {
            const down = [1, 0];
            const upRight = [-1, 1];

            const stepIt = iter([down, upRight])
                .stretch(mat.length - 1)
                .cycle();

            chain(once([0, 0]), stepIt)
                .accumulate(([y, x], [ys, xs]) => [y + ys, x + xs])
                .takeWhile(([_, x]) => x < mat[0].length)
                .forEach(([y, x]) => (mat[y][x] = 1));

            return mat;
        };

        const mat = Array(expected.length)
            .fill(0)
            .map((_) => Array(expected[0].length).fill(0));

        expect(draw(mat)).toMatchObject(expected);
    });

    it("should compute the rate of space chars per line after doubling each char + wrapping on row length 8", () => {
        const text = "Hi hey hello hola bonjour";

        const expected = () => {
            const doubled = [...text]
                .map((l) => [...l.repeat(2)])
                .flat(1)
                .join("");

            const lines = [];
            let current = [];
            for (const letter of doubled) {
                current.push(letter);
                if (current.length === 8) {
                    lines.push(current.join(""));
                    current = [];
                }
            }
            if (current.length) lines.push(current.join(""));

            return lines.map((line) => {
                const spaces = line.split(" ").length - 1;
                return spaces / line.length;
            });
        };

        const result = () =>
            iter([...text])
                .stretch(2)
                .chunks(8)
                .map((line) => iter(line).rate((ch) => ch === " "))
                .collect();

        expect(result()).toMatchObject(expected());
    });
});
