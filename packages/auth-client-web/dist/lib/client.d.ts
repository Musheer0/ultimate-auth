import { ClientOptions } from 'openapi-fetch';
import { paths } from '../types/blurfield-api.js';
export declare const createAuthClient: (clientOptions: ClientOptions) => import("openapi-fetch").Client<paths, `${string}/${string}`>;
