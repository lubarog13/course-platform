"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Badge, Bell } from "lucide-react";
import { getNotificationCount } from "@/app/lib/notifications";
import { auth } from "@/auth";

export default async function NotificationBell() {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }
    const count = await getNotificationCount(Number(session.user.id), true);

    return <Link href="/user/notifications">
        <Button variant="ghost" size='icon' className="relative">
            <Bell className="w-4 h-4" />
            {count > 0 && (
                <Badge className="bg-blue-500 text-white absolute -top-1 -right-1">
                    {count}
                </Badge>
            )}
        </Button>
    </Link>
}