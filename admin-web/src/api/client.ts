import axios from "axios";

// Authorization header is set on login/logout by AuthContext.
export const apiClient = axios.create({
  baseURL: "http://localhost:4000/api",
});
