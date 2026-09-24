import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe конфиг: без Prisma и Node crypto.
 * Используется в proxy.ts. Полная логика логина — в auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");

      const isProtected =
        pathname.startsWith("/editor") || pathname.includes("/learn");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/courses", nextUrl));
        }
        return true;
      }

      if (isProtected) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
