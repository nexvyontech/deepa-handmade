import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/provider";
import { AuthProvider } from "@/lib/auth/context";
import { SiteLogin } from "@/components/auth/site-login";

const replaceMock = vi.fn();
const routerMock = { replace: replaceMock, push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/login",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const loginMock = vi.fn();
const fetchMeMock = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  login: (input: { mobile: string; password: string }) => loginMock(input),
  fetchMe: () => fetchMeMock(),
  logout: () => Promise.resolve(),
}));

function renderLogin() {
  return render(
    <I18nProvider>
      <AuthProvider>
        <SiteLogin />
      </AuthProvider>
    </I18nProvider>,
  );
}

const adminUser = {
  id: "u1",
  name: "Deepa",
  mobile: "9000000001",
  role: "ADMIN",
  permissions: ["admin"],
  status: "ACTIVE",
};

beforeEach(() => {
  window.localStorage.clear();
  replaceMock.mockClear();
  loginMock.mockReset();
  fetchMeMock.mockReset();
});

describe("SiteLogin", () => {
  it("shows the sign-in form to anonymous visitors", async () => {
    renderLogin();
    expect(await screen.findByText("Staff sign in")).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
  });

  it("signs in and navigates to the admin area", async () => {
    loginMock.mockResolvedValue({ accessToken: "a", expiresIn: 3600, refreshToken: "r", user: adminUser });
    const user = userEvent.setup();

    renderLogin();
    await user.type(await screen.findByLabelText(/Mobile number/), "9000000001");
    await user.type(screen.getByLabelText(/Password/), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin"));
    expect(loginMock).toHaveBeenCalledWith({ mobile: "9000000001", password: "secret" });
  });

  it("surfaces API errors without navigating", async () => {
    const apiError = new Error("Incorrect mobile number or password.");
    loginMock.mockRejectedValue(apiError);
    const user = userEvent.setup();

    renderLogin();
    await user.type(await screen.findByLabelText(/Mobile number/), "9000000001");
    await user.type(screen.getByLabelText(/Password/), "bad");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Incorrect mobile number or password.")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("offers a staff member to continue to admin or sign out", async () => {
    window.localStorage.setItem("deepa.accessToken", "a");
    window.localStorage.setItem("deepa.refreshToken", "r");
    fetchMeMock.mockResolvedValue(adminUser);

    renderLogin();
    expect(await screen.findByText("You are already signed in.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});