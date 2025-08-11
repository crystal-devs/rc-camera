import axios from "axios";
import { REPORT_BUG_ROUTE } from "./z.all-routes";
import { setHeader } from "../common/api.fetch";

export const reportBug = async (data: FormData) => {
    try {
        const response = await axios.post(REPORT_BUG_ROUTE, data, {
            headers: setHeader()
        });
        return response.data;
    } catch (error) {
        console.error('Error reporting bug:', error);
        throw error;
    }
}