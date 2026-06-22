import axios from "axios";
import { API_URL } from "../../config";

export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  return axios.post(`${API_URL}/auth/jwt/login`, formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const getUser = async (token) => {
  return axios.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};