export type Const<A> = (A extends Narrowable ? A : never) | { [K in keyof A]: Const<A[K]> };

// TECH DEBT: Work out if these eslint rules are reasonable in this context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Narrowable = string | number | bigint | boolean | readonly any[];

export type RemoveStart<
    Start extends string,
    Subject extends string,
> = Subject extends `${Start}${infer End}` ? End : never;
