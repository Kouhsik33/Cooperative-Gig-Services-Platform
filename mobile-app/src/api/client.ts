import axios from "axios";
import { BACKEND_URL } from "../lib/apiConfig";

// Authorization header is set on login/logout by AuthContext.
export const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});
