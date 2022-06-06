import { range, iter } from '../lib';

describe('reduce', () => {
    it('should reduce without initializer', () => {
        const result = iter([0, 1, 2, 3]).reduce((acc, n) => acc + n);
        expect(result).toBe(6);
    });

    it('should reduce with same type initializer', () => {
        const result = iter([0, 1, 2, 3]).reduce((acc, n) => acc + n, 4);
        expect(result).toBe(10);
    });

    it('should throw on reduce without initializer and empty iterator', () => {
        const sequence: number[] = [];
        const operation = () => iter(sequence).reduce((acc, n) => acc + n);
        expect(operation).toThrowError();
    });

    it('should reduce with different type initializer', () => {
        const result = iter(['apple', 'orange', 'banana', 'apple']).reduce<
            Record<string, number>
        >((acc, fruit) => {
            if (fruit in acc === false) acc[fruit] = 0;
            acc[fruit] += 1;
            return acc;
        }, {});

        expect(result).toMatchObject({ apple: 2, orange: 1, banana: 1 });
    });
});

describe('flatten', () => {
    it('should flatten array of arrays', () => {
        const result = iter([
            [0, 1],
            [2, 3]
        ])
            .flatten()
            .collect();

        expect(result).toMatchObject([0, 1, 2, 3]);
    });

    it('should flatten mixed depth array', () => {
        const arr = [0, [1], [[2]]];
        const result = iter(arr).flatten().collect();

        expect(result).toMatchObject([0, 1, [2]]);
    });
});

describe('chunks', () => {
    it('should chunk', () => {
        const result = iter([0, 1, 2, 3]).chunks(2).collect();

        expect(result).toMatchObject([
            [0, 1],
            [2, 3]
        ]);
    });

    it('should chunk with leftover', () => {
        const result = iter([0, 1, 2, 3]).chunks(3).collect();

        expect(result).toMatchObject([[0, 1, 2], [3]]);
    });

    it('should chunk empty iterator', () => {
        const result = iter([]).chunks(3).collect();

        expect(result).toMatchObject([]);
    });
});

describe('windows', () => {
    it('should slide window', () => {
        const result = iter([0, 1, 2, 3]).windows(2).collect();

        expect(result).toMatchObject([
            [0, 1],
            [1, 2],
            [2, 3]
        ]);
    });

    it('should slide window with len larger than size', () => {
        const result = iter([0, 1, 2, 3]).windows(8).collect();

        expect(result).toMatchObject([[0, 1, 2, 3]]);
    });

    it('should throw on window length <= 0', () => {
        expect(() => iter([0, 1, 2]).windows(0)).toThrowError();
        expect(() => iter([0, 1, 2]).windows(-1)).toThrowError();
    });
});

describe('enumerate', () => {
    it('should enumerate', () => {
        const result = iter([4, 5, 6]).enumerate().collect();

        expect(result).toMatchObject([
            [0, 4],
            [1, 5],
            [2, 6]
        ]);
    });
});

describe('enumerate', () => {
    it('should enumerate', () => {
        const result = iter([4, 5, 6]).enumerate().collect();

        expect(result).toMatchObject([
            [0, 4],
            [1, 5],
            [2, 6]
        ]);
    });
});

describe('step by', () => {
    it('should step by 3', () => {
        const result = iter([1, 2, 3, 4, 5, 6, 7, 8, 9]).stepBy(3).collect();

        expect(result).toMatchObject([1, 4, 7]);
    });

    it('should no-op on empty iterator', () => {
        const result = iter([]).stepBy(3).collect();

        expect(result).toMatchObject([]);
    });

    it('should error on step <= 0', () => {
        const stepper = (n: number) => () => iter([1]).stepBy(n);

        expect(stepper(0)).toThrowError();
        expect(stepper(-1)).toThrowError();
    });
});

describe('step by', () => {
    it('should step by 3', () => {
        const result = iter([1, 2, 3, 4, 5, 6, 7, 8, 9]).stepBy(3).collect();

        expect(result).toMatchObject([1, 4, 7]);
    });

    it('should no-op on empty iterator', () => {
        const result = iter([]).stepBy(3).collect();

        expect(result).toMatchObject([]);
    });

    it('should error on step <= 0', () => {
        const stepper = (n: number) => () => iter([1]).stepBy(n);

        expect(stepper(0)).toThrowError();
        expect(stepper(-1)).toThrowError();
    });
});

describe('zip', () => {
    it('should zip same len iterators', () => {
        const result = iter([0, 1]).zip([6, 7], ['foo', 'bar']).collect();

        expect(result).toMatchObject([
            [0, 6, 'foo'],
            [1, 7, 'bar']
        ]);
    });

    it('should zip diff len iterators and stop when any iterator ends', () => {
        const result = iter([0, 1])
            .zip([6, 7, 8, 9], ['hola', 'bonjour', 'hello'])
            .collect();

        expect(result).toMatchObject([
            [0, 6, 'hola'],
            [1, 7, 'bonjour']
        ]);
    });

    it('should not error on empty zip', () => {
        const result = iter([0, 1]).zip().collect();

        expect(result).toMatchObject([[0], [1]]);
    });
});
