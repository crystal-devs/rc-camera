import { url } from "inspector";
import { apiFetch } from "./common/api.fetch";
import { USERLOGIN_ROUTE } from "./routes.service";
import { handleApiError } from "./common/apiErrorHandler";

export const loginFunction = async (data, navigate) => {
    try {
        const config = {
            method: "POST",
            url: USERLOGIN_ROUTE,
            headers: {
                "Content-Type": "application/json",
            },
            body: data,
        }
        const { message, ...rest } = await apiFetch(config)
        navigate('/')
    } catch (error) {
        handleApiError(error)
    } finally {
        // dispatch(setIsloading(false))
    }
}