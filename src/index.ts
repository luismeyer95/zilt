import * as azil from "./azil";
import { range, once, chain, iter } from "./azil";

// function draw(mat: number[][]) {
//     const down = [1, 0];
//     const upRight = [-1, 1];

//     const stepIt = azil
//         .iter([down, upRight])
//         .stretch(mat.length - 1)
//         .cycle();

//     azil.chain(azil.once([0, 0]), stepIt)
//         .accumulate(([y, x], [ys, xs]) => [y + ys, x + xs])
//         .takeWhile(([_, x]) => x < mat[0].length)
//         .forEach(([y, x]) => (mat[y][x] = 1));

//     return mat;
// }

// function createMatrix(height: number, width: number) {
//     return Array(height)
//         .fill(0)
//         .map((_) => Array(width).fill(0));
// }

// function printMatrix(matrix: number[][]) {
//     const width = matrix[0].length,
//         height = matrix.length;

//     for (const [y, x] of range(height).nestRange(width)) {
//         const cell = matrix[y][x];
//         process.stdout.write(cell === 1 ? "x" : " ");
//         if (x === width - 1) {
//             process.stdout.write("\n");
//         }
//     }
// }

// const matrix = draw(createMatrix(17, 180));
// printMatrix(matrix);

function benchmark(name: string, fn: () => unknown) {
    console.log(`-------- ${name} ---------`);
    console.time(name);
    fn();
    console.timeEnd(name);
    console.log(`--------------------------`);
}

function regularOp(arr: number[]) {
    return arr
        .map((x) => x * 7)
        .filter((n) => n % 2 === 0)
        .reduce((acc, n) => acc + n);
}

function azilOp(arr: number[]) {
    return iter(arr)
        .map((x) => x * 7)
        .filter((n) => n % 2 === 0)
        .reduce((acc, n) => acc + n);
}

function forLoop(arr: number[]) {
    let res = [];
    for (let i = 0; i < arr.length; ++i) {
        res.push(arr[i]);
    }
}

function forOfLoop(arr: number[]) {
    let res = [];
    for (const num of arr) {
        res.push(num);
    }
}

function iterLoop(arr: number[]) {
    let res = [];
    let iter = arr[Symbol.iterator]();
    let next = iter.next();

    while (!next.done) {
        res.push(next.value);
        next = iter.next();
    }
}

function genLoop(arr: number[]) {
    const gen = function* () {
        let i = 0;
        for (; i < arr.length; ++i) {
            yield arr[i];
        }
    };

    let res = [];
    for (const item of gen()) {
        res.push(item);
    }
}

function genRandomArray(len: number) {
    const rand = (low: number, high: number) =>
        Math.floor(low + Math.random() * (high - low));

    return Array(len)
        .fill(0)
        .map(() => rand(0, 1000000));
}

for (const len of once(10)
    .cycle(7)
    .accumulate((acc, n) => acc * n)) {
    console.log(len);
    const arr = genRandomArray(len);
    benchmark("regular", () => regularOp(arr));
    benchmark("azil", () => azilOp(arr));
}
