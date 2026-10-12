import { apiRequest } from "./request";
import type { AuthResponse, PublicUser } from "@/lib/types/api";

export interface LoginInput {
  mobile: string;
  password: string;
}

/** POST /auth/login — public endpoint. */
export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>({ method: "POST", path: "/auth/login", body: input, auth: "none" });
}

/** POST /auth/logout — revokes the current refresh session. */
export function logout(): Promise<void> {
  return apiRequest<void>({ method: "POST", path: "/auth/logout" });
}

/** GET /auth/me — the current session user (used to hydrate the admin shell). */
export function fetchMe(): Promise<PublicUser> {
  return apiRequest<PublicUser>({ path: "/auth/me" });
}