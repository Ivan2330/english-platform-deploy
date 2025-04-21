import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; // URL бекенду

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
