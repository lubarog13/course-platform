import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

/**
 * В Next.js 16 middleware.ts переименован в proxy.ts.
 * Берём только auth.config (без Prisma), чтобы не тянуть Node-зависимости в edge.
 */
export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/editor/:path*",
    "/course/:slug/learn/:path*",
    "/login",
    "/register",
  ],
};
