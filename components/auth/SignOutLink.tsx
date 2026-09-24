"use client";

import { Button } from "../ui/button";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SignOutLink({ children, className }: { children?: React.ReactNode, className?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return <Button onClick={handleSignOut} variant="link" className={className}>{children? children : "Выйти"}</Button>;
}