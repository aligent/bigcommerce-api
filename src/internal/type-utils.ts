export type Const<A> = (A extends Narrowable ? A : never) | { [K in keyof A]: Const<A[K]> };


/**
 * @description Removes a string from the start of another string
 * @example
 * ```ts
 * type A = RemoveStart<'a', 'abc'>
 * // A is 'bc'
 */
export type RemovePrefix<
    Start extends string,
    Subject extends string,
> = Subject extends `${Start}${infer End}` ? End : never;

export type SimplifyDeep<Type> = Type extends object
    ? {
          [TypeKey in keyof Type]: SimplifyDeep<Type[TypeKey]>;
      }
    : Type;

// Takes a record of types and flattens them into a single intersection type
// This combines all the operations from different paths into one type
/**
 * @description Flattens a record of types into a single intersection type
 * @example
 * ```ts
 * type A = {
 *  'path/a': { get: { params: { a: string } } },
 *  'path/b': { post: { params: { b: number } } },
 *  'path/c': { get: { params: { c: string } } }
 * }
 * type B = Flatten<A>
 * // B is {
 *  get: { params: { a: string } } &
 *  post: { params: { b: number } } &
 *  get: { params: { c: string } }
 * }
 * ```
 */
export type Flatten<T extends Record<string, unknown>> = UnionToIntersection<T[keyof T]>;

/**
 * @description Converts a union type into an intersection type
 * @example
 * ```ts
 * type A = { a: string } | { b: number }
 * type B = UnionToIntersection<A>
 * // B is { a: string } & { b: number }
 * ```
 */
type UnionToIntersection<T> = (T extends unknown ? (x: T) => unknown : never) extends (
    x: infer R
) => unknown
    ? R
    : never;

/**
 * @description Checks if a property of an object is optional
 * @example
 * ```ts
 * type A = IsOptional<{ a: string }, 'a'>
 * // A is false
 * type B = IsOptional<{ a?: string }, 'a'>
 * // B is true
 * ```
 */
export type IsOptional<T, K extends keyof T> = K extends keyof T
    ? T extends Record<K, T[K]>
        ? false
        : true
    : false;
