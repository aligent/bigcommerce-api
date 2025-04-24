export type Const<A> = (A extends Narrowable ? A : never) | { [K in keyof A]: Const<A[K]> };

// TECH DEBT: Work out if these eslint rules are reasonable in this context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Narrowable = string | number | bigint | boolean | readonly any[];

export type RemoveStart<
    Start extends string,
    Subject extends string,
> = Subject extends `${Start}${infer End}` ? End : never;

export type SimplifyDeep<Type, ExcludeType = never> = ConditionalSimplifyDeep<
    Type,
    ExcludeType | NonRecursiveType | Set<unknown> | Map<unknown, unknown>,
    object
>;

export type ConditionalSimplifyDeep<
    Type,
    ExcludeType = never,
    IncludeType = unknown,
> = Type extends ExcludeType
    ? Type
    : Type extends IncludeType
      ? {
            [TypeKey in keyof Type]: ConditionalSimplifyDeep<
                Type[TypeKey],
                ExcludeType,
                IncludeType
            >;
        }
      : Type;

/**
Matches any [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive).

@category Type
*/
export type Primitive = null | undefined | string | number | boolean | symbol | bigint;

/**
Matches any primitive, `void`, `Date`, or `RegExp` value.
*/
export type BuiltIns = Primitive | void | Date | RegExp;

/**
Matches non-recursive types.
*/
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any
export type NonRecursiveType = BuiltIns | Function | (new (...arguments_: any[]) => unknown);
