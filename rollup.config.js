// rollup.config.js
import typescript from "rollup-plugin-typescript2";

export default {
    input: "./src/zilt.ts",
    output: [
        {
            file: "build/zilt.esm.js",
            format: "es",
            exports: "named",
        },
        {
            file: "build/zilt.umd.js",
            format: "umd",
            name: "zilt",
            exports: "named",
        },
    ],
    plugins: [typescript(/*{ plugin options }*/)],
};
