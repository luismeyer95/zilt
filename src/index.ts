import { iter } from "./lib";

const text =
    "Lorem ipsum dolor sit amet. Eum repellendus quia eos inventore nostrum ut sint veniam et consequuntur fuga et velit officiis est vitae animi qui obcaecati commodi. Et quam vitae quo aspernatur internos sit corporis autem sed voluptas quasi. Et quis molestiae sit magnam nihil eos excepturi eligendi.";

const result = iter([...text])
    .flatMap((ch) => (ch === "." ? iter(".").cycle(3) : iter(ch)))
    .chunks(10)
    // .map((line) => iter(line).count((ch) => ch === "."))
    .collect();

console.log(result.join(""));
