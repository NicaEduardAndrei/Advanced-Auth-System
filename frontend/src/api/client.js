import axios from "axios";

const backendAPI = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true
})

backendAPI.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || "Something went wrong!"
    return Promise.reject(new Error(message))
  }
)



export default backendAPI