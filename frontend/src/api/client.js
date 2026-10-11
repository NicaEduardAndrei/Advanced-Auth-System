import axios from "axios";

const backendAPI = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true
})

backendAPI.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry
      && !originalRequest.url.includes("/refresh")
      && !originalRequest.url.includes("/2fa/verify")
      && !originalRequest.url.includes("/send-login-email-code")
    ) {
      originalRequest._retry = true
      try {
        await backendAPI.post("/api/auth/refresh")
        return backendAPI(originalRequest)
      } catch (refreshError) {
        const message = refreshError.response?.data?.message || "Something went wrong!"
        return Promise.reject(new Error(message))
      }
    }
    const message = error.response?.data?.message || "Something went wrong!"
    return Promise.reject(new Error(message))
  }
)



export default backendAPI