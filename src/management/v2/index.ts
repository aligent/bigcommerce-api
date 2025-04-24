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
import type { V2 as reference } from '../../internal/reference/index.js';
import type { Const, RemoveStart, SimplifyDeep } from '../../internal/type-utils.js';

export type Operations = reference.Operation;

export type RequestLine = keyof Operations;

export type NoParamsRequestLine = keyof OperationIndex.FilterOptionalParams<Operations>;

export type InferResponse<ReqLine extends RequestLine, Params extends Parameters> = SimplifyDeep<
    NarrowResponse<Operations, Request<ReqLine, Params>, Operations[ReqLine]['response']>
>;

export type ResponseData<ReqLine extends RequestLine, Params = unknown> = SimplifyDeep<
    Response.Success<ResolveResponse<ReqLine, Params>> extends { readonly body: infer Data }
        ? Data
        : never
>;

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
                      agent: configOrTransport.agent,
                      baseUrl: `https://api.bigcommerce.com/stores/${configOrTransport.storeHash}/v2`,
                      headers: { 'X-Auth-Token': configOrTransport.accessToken },
                  });
    }

    private readonly transport: Transport;

    send<ReqLine extends NoParamsRequestLine>(
        requestLine: ReqLine
    ): Promise<InferResponse<ReqLine, {}>>;
    // TODO: MI-199 work out if this still needs Params extends....
    send<ReqLine extends RequestLine, Params extends Operations[ReqLine]['parameters']>(
        requestLine: ReqLine,
        params: Const<Params & Operations[ReqLine]['parameters']>
    ): Promise<InferResponse<ReqLine, Params>>;

    send(requestLine: string, params?: Parameters): Promise<Response>;

    async send(requestLine: string, params?: Parameters): Promise<Response> {
        return this.transport(requestLine, params);
    }

    delete<Path extends NoParamsRequestPath<'DELETE'>>(
        requestLine: Path
    ): Promise<ResponseData<`DELETE ${Path}`, {}> | null>;

    delete<
        Path extends RequestPath<'DELETE'>,
        Params extends Operations[`DELETE ${Path}`]['parameters'],
    >(
        path: Path,
        params: Const<Params & Operations[`DELETE ${Path}`]['parameters']>
    ): Promise<ResponseData<`DELETE ${Path}`, Params> | null>;

    delete<T = unknown>(
        path: RemoveStart<'DELETE ', UntypedEndpoints | CustomEndpoints>,
        params?: Parameters
    ): Promise<T>;

    async delete(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`DELETE ${path}`, params);
        if (res.status === 204) {
            return null;
        }
        this.checkResponseStatus(`DELETE ${path}`, res);
        return res.body;
    }

    get<Path extends NoParamsRequestPath<'GET'>>(
        requestLine: Path
    ): Promise<ResponseData<`GET ${Path}`, {}> | null>;

    get<Path extends RequestPath<'GET'>, Params extends Operations[`GET ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`GET ${Path}`]['parameters']>
    ): Promise<ResponseData<`GET ${Path}`, Params> | null>;

    get<T = unknown>(
        path: RemoveStart<'GET ', UntypedEndpoints | CustomEndpoints>,
        params?: Parameters
    ): Promise<T>;

    async get(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`GET ${path}`, params);
        if (res.status === 204 || res.status === 404) {
            return null;
        }
        this.checkResponseStatus(`GET ${path}`, res);
        return res.body;
    }

    post<Path extends NoParamsRequestPath<'POST'>>(
        requestLine: Path
    ): Promise<ResponseData<`POST ${Path}`, {}>>;

    post<Path extends RequestPath<'POST'>, Params extends Operations[`POST ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`POST ${Path}`]['parameters']>
    ): Promise<ResponseData<`POST ${Path}`, Params>>;

    post<T = unknown>(
        path: RemoveStart<'POST ', UntypedEndpoints | CustomEndpoints>,
        params?: Parameters
    ): Promise<T>;

    async post(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`POST ${path}`, params);
        this.checkResponseStatus(`POST ${path}`, res);
        return res.body;
    }

    put<Path extends NoParamsRequestPath<'PUT'>>(
        requestLine: Path
    ): Promise<ResponseData<`PUT ${Path}`, {}>>;

    put<Path extends RequestPath<'PUT'>, Params extends Operations[`PUT ${Path}`]['parameters']>(
        path: Path,
        params: Const<Params & Operations[`PUT ${Path}`]['parameters']>
    ): Promise<ResponseData<`PUT ${Path}`, Params>>;

    put<T = unknown>(
        path: RemoveStart<'PUT ', UntypedEndpoints | CustomEndpoints>,
        params?: Parameters
    ): Promise<T>;

    async put(path: string, params?: Parameters): Promise<unknown> {
        const res = await this.send(`PUT ${path}`, params);
        this.checkResponseStatus(`PUT ${path}`, res);
        return res.body;
    }

    private checkResponseStatus(requestLine: string, response: Response): void {
        if (Number(response.status) > 299) {
            throw new Error(
                `ERROR DURING ${requestLine}: ${response.status} - ${JSON.stringify(response.body)}`
            );
        }
    }
}

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

/**
 * A list of known BigCommerce endpoints which are not part of the Open API specs
 */
type UntypedEndpoints = never;
