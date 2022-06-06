export type Flatten<ArrType> = ArrType extends readonly (infer ElementType)[]
    ? ElementType
    : ArrType;

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
