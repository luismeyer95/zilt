const { iter, range } = require("azil");

for (const [y, x] of range(4).nestRange(4)) {
    console.log(`${x},${y}`);
}
