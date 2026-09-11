"use client";
import { Button } from "../ui/button";
import {Sun, Moon} from "lucide-react";
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    return (
        <Button variant="outline" className="cursor-pointer text-black dark:text-white hover:opacity-80 dark:hover:opacity-100" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            <Sun data-theme="light" className={`h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 ${theme === "dark" ? "hidden" : ""}`} />
            <Moon data-theme="dark" className={`absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ${theme === "light" ? "hidden" : ""}`} />
            <span className="sr-only">Toggle theme {theme}</span>
        </Button>
    );
}