import api from "./api";

const TOKEN_KEY = "nme_token";
const USER_KEY = "nme_user";

export const roleHome = (role) =>
  role === "admin" ? "/admin/dashboard" : role === "user" ? "/dashboard" : null;

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

export async function login(username, password) {
  const { data } = await api.post("/api/auth/login", { username, password });
  if (!data?.token || !data?.user) {
    throw new Error("Unexpected response from server.");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user)); // never store the password
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(b64));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true; // unreadable token -> treat as invalid
  }
}

// Returns the user if the session is valid, otherwise clears it and returns null.
export function getSession() {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) return null;
  if (isTokenExpired(token)) {
    logout();
    return null;
  }
  return user;
}