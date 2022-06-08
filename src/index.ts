import * as azil from "./lib";
import { range, once, chain, iter } from "./lib";

function draw(mat: number[][]) {
    const down = [1, 0];
    const upRight = [-1, 1];

    const stepIt = azil
        .iter([down, upRight])
        .stretch(mat.length - 1)
        .cycle();

    azil.chain(azil.once([0, 0]), stepIt)
        .accumulate(([y, x], [ys, xs]) => [y + ys, x + xs])
        .takeWhile(([_, x]) => x < mat[0].length)
        .forEach(([y, x]) => (mat[y][x] = 1));

    return mat;
}

function createMatrix(height: number, width: number) {
    return Array(height)
        .fill(0)
        .map((_) => Array(width).fill(0));
}

function printMatrix(matrix: number[][]) {
    const width = matrix[0].length,
        height = matrix.length;

    for (const [y, x] of azil.range(height).nestRange(width)) {
        const cell = matrix[y][x];
        process.stdout.write(cell === 1 ? "x" : " ");
        if (x === width - 1) {
            process.stdout.write("\n");
        }
    }
}

// const matrix = draw(createMatrix(17, 199));
// printMatrix(matrix);

const res = iter([10, 15, 15, 20]).count((n) => n === 15); // 6
// '0123'
console.log(res);
