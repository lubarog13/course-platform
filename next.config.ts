import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pdf-lib", "@pdf-lib/fontkit"],
};

export default nextConfig;
