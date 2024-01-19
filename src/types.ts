export type TTypeData =
    | "String"
    | "Number"
    | "Array"
    | "Object"
    | "Boolean"
    | "Null"
    | "Undefined"
    | "Map"
    | "Set"
    | "Date"
    | "RegExp"
    | "Uint8Array"
    | "Bigint"
    | [TTypeData];

export type TFunction = (...args: any[]) => any;
