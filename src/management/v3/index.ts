// TECH DEBT: Work out if these eslint rules are reasonable in this context
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
    fetchTransport,
    FetchTransportOptions,
    OperationIndex,
    Parameters,
    Request,
    RequestMethod,
    Response,
    Transport,
} from '../../internal/operation.js';
import type { V3 as reference } from '../../internal/reference/index.js';
import type { Const, RemoveStart, SimplifyDeep } from '../../internal/type-utils.js';
import type { NarrowResponse } from './response-narrowing.js';

export type Operations = reference.Operation;

// RequestLine represents all possible API endpoints in the Operations type
// e.g. "GET /catalog/products", "POST /orders", etc.
export type RequestLine = keyof Operations;

// NoParamsRequestLine represents only the API endpoints that have no required parameters
// This filters Operations to only include endpoints where all parameters are optional
// e.g. "GET /catalog/products" would be included, but "GET /catalog/products/{id}" would not
export type NoParamsRequestLine = keyof OperationIndex.FilterOptionalParams<Operations>;

export type InferResponse<ReqLine extends RequestLine, Params extends Parameters> = SimplifyDeep<
    NarrowResponse<Operations, Request<ReqLine, Params>, Operations[ReqLine]['response']>
>;

export type ResponseData<ReqLine extends RequestLine, Params = unknown> =
    Response.Success<ResolveResponse<ReqLine, Params>> extends {
        readonly body: { readonly data?: infer Data };
    }
        ? SimplifyDeep<Data>
        : never;

export type Config = Omit<FetchTransportOptions, 'baseUrl' | 'headers'> & {
    readonly storeHash: string;
    readonly accessToken: string;
};

export class Client<CustomEndpoints extends string = never> {
    constructor(config: Config);

    constructor(transport: Transport);

    constructor(configOrTransport: Config | Transport) {
        this.transport =
            typeof configOrTransport === 'function'
                ? configOrTransport
                : fetchTransport({
                      headers: { 'X-Auth-Token': configOrTransport.accessToken },
                      baseUrl: `https://api.bigcommerce.com/stores/${configOrTransport.storeHash}/v3`,
                      agent: configOrTransport.agent,
                  });
    }

    private readonly transport: Transport;

    send<ReqLine extends NoParamsRequestLine>(
        requestLine: ReqLine
    ): Promise<InferResponse<ReqLine, {}>>;

    send<ReqLine extends RequestLine, Params extends Operations[ReqLine]['parameters']>(
        requestLine: ReqLine,
        params: Const<Params & Operations[ReqLine]['parameters']>
    ): Promise<InferResponse<ReqLine, Params>>;

    send(requestLine: string, params?: Parameters): Promise<Response>;

    send(requestLine: string, params?: Parameters): Promise<Response> {
        return this.transport(requestLine, params);
    }

    get<Path extends NoParamsRequestPath<'GET'>>(
        path: Path
    ): Promise<ResponseData<`GET ${Path}`, {}> | null>;

    get<Path extends RequestPath<'GET'>, Params extends Operations[`GET ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`GET ${Path}`]['parameters']>
    ): Promise<ResponseData<`GET ${Path}`, Params> | null>;

    get<T = unknown>(path: RemoveStart<'GET ', CustomEndpoints>, params?: Parameters): Promise<T>;

    async get(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`GET ${path}`, params);
        if (res.status === 204 || res.status === 404) {
            return null;
        }
        this.checkResponseStatus(`GET ${path}`, res);
        return res.body.data;
    }

    list<Path extends NoParamsListablePath>(path: Path): AsyncIterable<ListItemType<Path, {}>>;

    list<Path extends ListablePath, Params extends Operations[`GET ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`GET ${Path}`]['parameters']>
    ): AsyncIterable<ListItemType<Path, Params>>;

    list<T = unknown>(
        path: RemoveStart<'GET ', CustomEndpoints>,
        params?: Parameters
    ): AsyncIterable<T>;

    async *list<T>(path: string, params?: Parameters): AsyncIterable<T> {
        const MAX_PAGES = Number.MAX_SAFE_INTEGER;
        for (let page = 1; page < MAX_PAGES; page++) {
            const res = await this.send(`GET ${path}`, {
                ...params,
                query: { ...params?.query, page },
            });
            this.checkResponseStatus(`GET ${path}`, res);
            const items = res.body.data as T[] | null | undefined;
            if (!items?.length) {
                break;
            }
            yield* res.body.data as T[];
        }
    }

    post<Path extends NoParamsRequestPath<'POST'>>(
        path: Path
    ): Promise<ResponseData<`POST ${Path}`, {}>>;

    post<Path extends RequestPath<'POST'>, Params extends Operations[`POST ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`POST ${Path}`]['parameters']>
    ): Promise<ResponseData<`POST ${Path}`, Params>>;

    post<T = unknown>(path: RemoveStart<'POST ', CustomEndpoints>, params?: Parameters): Promise<T>;

    async post(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`POST ${path}`, params);
        this.checkResponseStatus(`POST ${path}`, res);
        return res.body.data;
    }

    put<Path extends NoParamsRequestPath<'PUT'>>(
        path: Path
    ): Promise<ResponseData<`PUT ${Path}`, {}>>;

    put<Path extends RequestPath<'PUT'>, Params extends Operations[`PUT ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`PUT ${Path}`]['parameters']>
    ): Promise<ResponseData<`PUT ${Path}`, Params>>;

    put<T = unknown>(path: RemoveStart<'PUT ', CustomEndpoints>, params?: Parameters): Promise<T>;

    async put(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`PUT ${path}`, params);
        this.checkResponseStatus(`PUT ${path}`, res);
        return res.body.data;
    }

    delete<Path extends NoParamsRequestPath<'DELETE'>>(
        path: Path
    ): Promise<ResponseData<`DELETE ${Path}`, {}> | null>;

    delete<
        Path extends RequestPath<'DELETE'>,
        Params extends Operations[`DELETE ${Path}`]['parameters'],
    >(
        path: Path,
        params: Const<Params & Operations[`DELETE ${Path}`]['parameters']>
    ): Promise<ResponseData<`DELETE ${Path}`, Params> | null>;

    delete<T = unknown>(
        path: RemoveStart<'DELETE ', CustomEndpoints>,
        params?: Parameters
    ): Promise<T>;

    async delete(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`DELETE ${path}`, params);
        this.checkResponseStatus(`DELETE ${path}`, res);
        if (res.status === 204) {
            return null;
        }
        return res.body.data;
    }

    private checkResponseStatus(requestLine: string, response: Response): void {
        if (Number(response.status) > 299) {
            throw new Error(
                `ERROR DURING ${requestLine}: ${response.status} - ${JSON.stringify(response.body)}`
            );
        }
    }
}

type ListItemType<Path extends string, Params = unknown> =
    ResponseData<`GET ${Path}` & RequestLine, Params> extends ReadonlyArray<infer T> ? T : never;

type ListablePath = ListablePath_<Operations>;

type NoParamsListablePath = ListablePath & NoParamsRequestPath<'GET'>;

type ListablePath_<Ops extends OperationIndex> = {
    [ReqLine in keyof Ops]: Response.Success<Ops[ReqLine]['response']> extends {
        body: { data?: readonly any[] };
    }
        ? ReqLine extends `GET ${infer Path}`
            ? Path
            : never
        : never;
}[keyof Ops];

type ResolveResponse<ReqLine extends RequestLine, Params = unknown> = unknown extends Params
    ? Operations[ReqLine]['response']
    : Params extends Parameters
      ? InferResponse<ReqLine, Params>
      : never;

type RequestPath<Method extends RequestMethod> = RequestLine &
    `${Method} ${any}` extends `${Method} ${infer Path}`
    ? Path
    : never;

type NoParamsRequestPath<Method extends RequestMethod> = NoParamsRequestLine &
    `${Method} ${any}` extends `${Method} ${infer Path}`
    ? Path
    : never;
