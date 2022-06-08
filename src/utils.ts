export type Flatten<T> = T extends readonly (infer ElementType)[]
    ? ElementType
    : T extends Iterable<infer E>
    ? E
    : T;

export type PickIterType<I> = I extends Iterable<infer E> ? E : never;

export type MapToIterType<ArrI extends Iterable<any>[]> = {
    [Index in keyof ArrI]: PickIterType<ArrI[Index]>;
};

export type Unzip<T> = T extends any[]
    ? {
          [Index in keyof T]: T[Index][];
      }
    : [T[]];

export type TupleToUnion<T extends any[]> = T[number];

type Decr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type RecursiveFlatten<N extends number, T> = N extends 0
    ? T
    : N extends Decr[number]
    ? RecursiveFlatten<Decr[N], Flatten<T>>
    : never;

// type Test = RecursiveFlatten<2, [number, [number], [[number]]]>;
