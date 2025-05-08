import axios from "axios"
import { LOGIN_ROUTE } from "./z.all-routes"

type TLoginUser = {
    email: string,
    phone_number?: string,
    provider: "google" | "instagram",
    name: string,
    profile_pic?: string,
}

export const loginUser = async (loginUserInputDTO: TLoginUser) => {
    try{
        const {data} = await axios.post(LOGIN_ROUTE, {...loginUserInputDTO})
        console.log(data, "from login user")
        if(data.token){
            localStorage.setItem("authToken", data.token)
        }
        return data
    }catch(err){
        console.log(err) // or do a error handling
        return null
    }
}