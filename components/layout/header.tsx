import { ThemeToggle } from "../base/ThemeToggle";

export default function Header() {
  return (
    <header className="bg-gray-800 text-white py-4">
      <div className="container mx-auto flex justify-between items-center">
        <ThemeToggle />
        <h1 className="text-center">Онлайн-курсы</h1>
      </div>
    </header>
  );
}