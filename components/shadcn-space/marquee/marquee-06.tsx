import type { CSSProperties } from "react";
import {
  BookOpenText,
  LibraryBig,
  Bookmark,
  NotebookPen,
  Presentation,
  GraduationCap,
  Church,
  Earth,
  type LucideIcon,
} from "lucide-react";
import { Marquee } from "@/components/shadcn-space/animations/marquee";
import { cn, declOfNum } from "@/lib/utils";
import { CategoryWithCount } from "@/app/lib/courses";
import Link from "next/link";

const icons = [
  BookOpenText,
  LibraryBig,
  Bookmark,
  NotebookPen,
  Presentation,
  GraduationCap,
  Church,
  Earth,
];

const colors = [
  "hover:bg-blue-200 dark:hover:bg-blue-900",
  "hover:bg-green-200 dark:hover:bg-green-900",
  "hover:bg-yellow-200 dark:hover:bg-yellow-900",
  "hover:bg-red-200 dark:hover:bg-red-900",
  "hover:bg-purple-200 dark:hover:bg-purple-900",
  "hover:bg-orange-200 dark:hover:bg-orange-900",
  "hover:bg-pink-200 dark:hover:bg-pink-900",
  "hover:bg-gray-200 dark:hover:bg-gray-900",
];

function CategoryTile({ item, index, itemsCount }: { item: CategoryWithCount, index: number, itemsCount: number }) {
  const Icon = icons[(itemsCount - index) % icons.length] as LucideIcon;
  const color = colors[index % colors.length];
  return (
    <Link href={`/courses?category=${item.slug}`} className={cn("bg-background flex items-center gap-3 rounded-xl border border-border p-3 hover:scale-115 transition-all duration-300", color)}>
      <span className={cn("bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg")}>
        <Icon className="size-5" />
      </span>
      <span className="flex flex-col line-clamp-1">
        <span className="text-foreground text-sm font-medium line-clamp-1">{item.name}</span>
        <span className="text-muted-foreground text-xs">{item.coursesCount} {declOfNum(item.coursesCount, ['курс', 'курса', 'курсов'])}</span>
      </span>
    </Link>
  );
}

export default function Marquee06({categories}: {categories: CategoryWithCount[]}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 mt-8">
      <div className="flex flex-col items-center gap-1 w-full">
        <p className="text-foreground text-xl font-semibold">Категории курсов</p>
        <p className="text-muted-foreground text-sm">На нашем сайте вы можете найти курсы по различным направлениям</p>
      </div>
      <div className="relative flex w-full flex-col overflow-hidden">
        <Marquee pauseOnHover style={{ "--duration": "70s" } as CSSProperties}>
          {categories.slice(0, 10).map((item, index) => (
            <CategoryTile key={item.id} item={item} index={index} itemsCount={categories.length} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover style={{ "--duration": "70s" } as CSSProperties}>
          {categories.slice(10, 20).map((item, index) => (
            <CategoryTile key={item.id} item={item} index={index} itemsCount={categories.length} />
          ))}
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l" />
      </div>
    </div>
  );
}
