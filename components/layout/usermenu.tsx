"use client"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { CircleUserRound, User as UserIcon, DockIcon, FileTextIcon, LogInIcon, MessageCircleIcon } from "lucide-react";
import { SignOutLink } from "../auth/SignOutLink";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";

export function UserMenu() {
  const { status, data } = useSession()
  const isAuthenticated = status === "authenticated"
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const nextUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
  const role = data?.user?.role
  return (
    <>
    {isAuthenticated &&
        <DropdownMenu>
          <DropdownMenuTrigger>
            <CircleUserRound className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            <DropdownMenuItem>
              <Link href="/user/profile" className="py-2 flex items-center gap-2 whitespace-nowrap">
                <UserIcon className="w-4 h-4" />
                Профиль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/user/certificates" className="py-2 flex items-center gap-2 whitespace-nowrap">
                <DockIcon className="w-4 h-4" />
                {role === 'student' ? 'Мои сертификаты' : 'Сертификаты'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/user/messages" className="py-2 flex items-center gap-2 whitespace-nowrap">
                <MessageCircleIcon className="w-4 h-4" />
                Сообщения
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/user/enrollments" className="py-2 flex items-center gap-2 whitespace-nowrap">
                <FileTextIcon className="w-4 h-4" />
                {role === 'student' ? 'Мои заявки' : 'Заявки'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SignOutLink>
              </SignOutLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
        {!isAuthenticated &&
        <Link href={`/login?next=${nextUrl}`}>
        <Button variant="ghost" size='icon'>
          <LogInIcon className="w-4 h-4" />
        </Button>
        </Link>
        }
    </>
  )
}