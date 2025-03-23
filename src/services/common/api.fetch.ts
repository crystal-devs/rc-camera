import axios from 'axios'


export const apiFetch = async config => {
    try{
        const { data } = await axios(config)
        if(data.errors || !data) return Promise.reject(data.errors || 'nothing found')
        return Promise.resolve(data)
    }catch(error){
        console.log("[ASYNC_FUNC]",error)
        return Promise.reject(error)
    }
}