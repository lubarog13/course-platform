import Image from "next/image";
import Link from "next/link";

const catalogLinks = [
  { href: "/", label: "Главная" },
  { href: "/courses", label: "Все курсы" },
  { href: "/courses/user", label: "Мои курсы" },
] as const;

const accountLinks = [
  { href: "/user/profile", label: "Профиль" },
  { href: "/user/enrollments", label: "Записи на курсы" },
  { href: "/user/certificates", label: "Сертификаты" },
  { href: "/user/messages", label: "Сообщения" },
] as const;

const infoLinks = [
  { href: "/about", label: "О проекте" },
  { href: "/contact", label: "Контакты" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Условия использования" },
] as const;

function FooterNav({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">
        {title}
      </h2>
      <ul className="space-y-2 text-sm text-gray-300">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 font-bold font-lora">
              <Image
                priority
                src="/images/logo.png"
                alt="Логотип"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              Библейские курсы
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-300">
              Онлайн-платформа библейских курсов для самостоятельного и
              группового обучения.
            </p>
          </div>

          <FooterNav title="Каталог" links={catalogLinks} />
          <FooterNav title="Аккаунт" links={accountLinks} />
          <FooterNav title="Информация" links={infoLinks} />
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
          Copyright © {year} Библейские курсы
        </div>
      </div>
    </footer>
  );
}
