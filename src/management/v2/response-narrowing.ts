// TECH DEBT: Work out if these eslint rules are reasonable in this context
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { OperationIndex, Request, Response } from '../../internal/operation.js';

/**
 * This module contains functionality for narrowing the response type based on input parameters.
 *
 * See v3 for examples of how this can be done.
 */

export type NarrowResponse<
    // @ts-expect-error - Unused value
    Ops extends OperationIndex,
    // @ts-expect-error - Unused value
    Req extends Request,
    Rep extends Response,
> = Rep;
