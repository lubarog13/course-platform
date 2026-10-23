"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { Button } from "../ui/button";

export default function NotificationBell() {
  const { data: session, status } = useSession();
  const [count, setCount] = useState(0);
  const userId = session?.user?.id;

  const fetchCount = useCallback(
    async (signal: AbortSignal) => {
      if (status !== "authenticated" || !userId) {
        setCount(0);
        return;
      }

      try {
        const response = await fetch("/api/notification?count=1", { signal });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        setCount(typeof data.count === "number" ? data.count : 0);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    },
    [status, userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const tick = () => {
      void fetchCount(controller.signal);
    };
    tick();
    const id = window.setInterval(tick, 30000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      controller.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCount]);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <Link href="/user/notifications">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] text-white">
            {count}
          </span>
        )}
      </Button>
    </Link>
  );
}
