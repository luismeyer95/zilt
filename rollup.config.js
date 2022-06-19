// rollup.config.js
import typescript from "rollup-plugin-typescript2";

export default {
    input: "./src/zilt.ts",
    output: [
        {
            file: "build/zilt.esm.js",
            format: "es",
        },
        {
            file: "build/zilt.umd.js",
            format: "umd",
            name: "zilt",
        },
    ],
    plugins: [typescript(/*{ plugin options }*/)],
};
