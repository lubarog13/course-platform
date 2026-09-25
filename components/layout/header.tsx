import { ThemeToggle } from "../base/ThemeToggle";
import { Button } from "../ui/button";
import { CircleUserRound, Bell, LayoutDashboard, UserGroup, User as UserIcon, DockIcon, SettingsIcon, FileTextIcon, LogOutIcon, LogInIcon } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./usermenu";


export default function Header() {
  return (
    <header className="bg-gray-800 text-white py-4">
      <div className="container mx-auto flex-wrap sm:flex-nowrap flex gap-6 items-center">
        <h1 className="text-center font-bold w-full sm:w-auto border-b sm:border-b-0 border-gray-700 sm:border-none pb-2 sm:pb-0">Онлайн-курсы</h1>
        <div className="flex items-center gap-2">
        <Link href="/courses">
        <Button variant="ghost" className="text-sm sm:text-base text-[0px]">
          <LayoutDashboard className="w-4 h-4" /> Все курсы
        </Button>
        </Link>
        <Link href="/courses/user">
        <Button variant="ghost" className="text-sm sm:text-base text-[0px]">
          <UserGroup className="w-4 h-4" /> Мои курсы
        </Button>
        </Link>
        </div>
        <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        <Link href="/notifications">
        <Button variant="ghost" size='icon'>
          <Bell className="w-4 h-4" />
        </Button>
        </Link>
        <UserMenu />
        </div>
      </div>
    </header>
  );
}