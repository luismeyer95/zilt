// rollup.config.js
import typescript from "rollup-plugin-typescript2";

export default {
    input: "./src/azil.ts",
    output: [
        {
            file: "build/azil.esm.js",
            format: "es",
        },
        {
            file: "build/azil.umd.js",
            format: "umd",
            name: "azil",
        },
    ],
    plugins: [typescript(/*{ plugin options }*/)],
};
