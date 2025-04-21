import axios, { AxiosHeaders, AxiosRequestConfig } from 'axios'

//- rcaxiosconfig is the custom config according to our needs, in future we can add more of this fields
interface RcAxiosConfig extends AxiosRequestConfig {
    skidErrorHandling?: boolean,
    cacheDuration?: boolean,
}


// you can change this naming and also move to types folder if you want, i prefer putting this here tho.
export type ServiceResponse<T> = {
    status: boolean;
    code: number;
    message: string;
    data: T | null;
    other?: any;
    error: { message: string; stack?: string } | null;
    stack?: any,
}

export const apiFetch = async <T = any>(config: RcAxiosConfig): Promise<ServiceResponse<T>> => {
    try {
        const { data } = await axios(config)
        if (data.errors || !data) return Promise.reject(data.errors || 'nothing found')
        return Promise.resolve(data)
    } catch (error) {
        console.log("[ASYNC_FUNC]", error)
        return Promise.reject(error)
    }
}

export type AuthHeader = {
    authorization: string;
    'Content-Type': string;
}

export const setHeader = (
    token?: string,
    contentType: string = "application/json"
): AuthHeader => {
    try {
        if (token) return {
            authorization: `jwt ${token}`,
            'Content-Type': contentType
        };

        const authToken = typeof window !== 'undefined'
            ? localStorage?.getItem("rc-token") || "" : "";

        return {
            authorization: `jwt ${authToken}`,
            'Content-Type': contentType,
        };
    } catch (err: unknown) {
        console.error("Error setting auth headers:", err);
        return {
            authorization: "jwt error_happened_in_front_end",
            'Content-Type': contentType,
        };
    }
}