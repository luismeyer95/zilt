export type Flatten<T> = T extends readonly (infer ElementType)[]
    ? ElementType
    : T extends Iterable<infer E>
    ? E
    : T;

export type PickIterType<I> = I extends Iterable<infer E> ? E : never;

export type MapToIterType<ArrI extends Iterable<unknown>[]> = {
    [Index in keyof ArrI]: PickIterType<ArrI[Index]>;
};

export type Unzip<T> = T extends unknown[]
    ? {
          [Index in keyof T]: T[Index][];
      }
    : [T[]];

export type TupleToUnion<T extends unknown[]> = T[number];

type Decr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export type RecursiveFlatten<N extends number, T> = N extends 0
    ? T
    : N extends Decr[number]
    ? RecursiveFlatten<Decr[N], Flatten<T>>
    : never;

export type NumberLiteral<T extends number> = number extends T ? never : T;
