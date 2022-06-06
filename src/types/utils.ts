export type Flatten<ArrType> = ArrType extends readonly (infer ElementType)[]
    ? ElementType
    : ArrType;

export type PickIterType<I> = I extends Iterable<infer E> ? E : never;

export type MapToIterType<ArrI extends Iterable<any>[]> = {
    [Index in keyof ArrI]: PickIterType<ArrI[Index]>;
};
