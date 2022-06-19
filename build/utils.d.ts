export declare type Flatten<T> = T extends readonly (infer ElementType)[] ? ElementType : T extends Iterable<infer E> ? E : T;
export declare type PickIterType<I> = I extends Iterable<infer E> ? E : never;
export declare type MapToIterType<ArrI extends Iterable<any>[]> = {
    [Index in keyof ArrI]: PickIterType<ArrI[Index]>;
};
export declare type Unzip<T> = T extends any[] ? {
    [Index in keyof T]: T[Index][];
} : [T[]];
export declare type TupleToUnion<T extends any[]> = T[number];
declare type Decr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export declare type RecursiveFlatten<N extends number, T> = N extends 0 ? T : N extends Decr[number] ? RecursiveFlatten<Decr[N], Flatten<T>> : never;
export declare type NumberLiteral<T extends number> = number extends T ? never : T;
export {};
