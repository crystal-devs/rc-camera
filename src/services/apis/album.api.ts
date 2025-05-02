import { apiFetch, setHeader } from "@/services/common/api.fetch"
import { ALBUM_ROUTE } from "./z.all-routes"

export const getAllUserAlbums = async (userId: string, showToast: boolean = false) => {
    try {
        return apiFetch<Album[]>({
            method: "GET",
            url: ALBUM_ROUTE,
            headers: setHeader()
        })
    } catch (err: any) {
        if (showToast) {
            // navaneeth boi, write a global error handler here that shows a toast message.
        }
        throw err // or just catch the error when function calling
    }
}