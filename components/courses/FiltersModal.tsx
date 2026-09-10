"use client";

import { useEffect, useState } from "react";
import type { CourseListQuery } from "@/app/lib/courses";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Funnel, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CourseLevel } from "@prisma/client";

type TagOption = {
  tag: string;
  count: number;
};

let filtersRequest: Promise<{ tags: TagOption[], categories: { name: string, slug: string }[] }> | null = null;

function loadFilterTags(signal: AbortSignal): Promise<{ tags: TagOption[], categories: { name: string, slug: string }[] }> {
  if (!filtersRequest) {
    filtersRequest = fetch("/api/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        return res.json() as Promise<{ tags: TagOption[], categories: { name: string, slug: string }[] }>;
      })
      .then((data) =>{
        const tags = [...data.tags].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
        const categories = [...data.categories].sort((a, b) => a.name.localeCompare(b.name));
        return { tags, categories };
      })
      .catch((error) => {
        filtersRequest = null;
        throw error;
      });
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    filtersRequest!.then(
      (data) => {
        signal.removeEventListener("abort", onAbort);
        resolve(data);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

type FiltersModalProps = {
  filters?: CourseListQuery;
  setFilters: (filters: CourseListQuery) => void;
  children?: React.ReactNode;
};

export default function FiltersModal({
  filters = {},
  setFilters,
  children,
}: FiltersModalProps) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [categories, setCategories] = useState<{ name: string, slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    loadFilterTags(controller.signal)
      .then((data) => {
        setTags(data.tags);
        setCategories(data.categories);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const selectedTags = new Set(filters.tags ?? []);

  const handleTagClick = (tag: string) => {
    const next = selectedTags.has(tag)
      ? (filters.tags ?? []).filter((item) => item !== tag)
      : [...(filters.tags ?? []), tag];

    setFilters({
      ...filters,
      tags: next.length > 0 ? next : undefined,
    });
  };

  const handleRatingClick = (rating: number) => {
    if (rating === filters.ratingFrom) {
      setFilters({
        ...filters,
        ratingFrom: undefined,
      });
      return;
    }
    setFilters({
      ...filters,
      ratingFrom: rating,
    });
  };

  const handleCategoryClick = (slug: string) => {
    setFilters({
      ...filters,
      category: slug,
    });
  };

  const handleEnrollModeChange = (needEnrollment: boolean) => {
    console.log(needEnrollment);
    setFilters({
      ...filters,
      needEnrollment: needEnrollment ? undefined : false,
    });
  };

  const handleLevelClick = (level: CourseLevel | null) => {
    setFilters({
      ...filters,
      level: level,
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon">
            <Funnel className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="w-full h-full sm:h-auto flex flex-col sm:w-[90vw] sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Фильтры</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2  max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
          <div className="flex flex-col gap-3">
          <div className="text-lg font-medium">Теги</div>
            <div className="flex flex-wrap gap-2">
              {loading && (
                <p className="text-muted-foreground text-sm">Загрузка тегов…</p>
              )}
              {!loading && tags.length === 0 && (
                <p className="text-muted-foreground text-sm">Теги не найдены</p>
              )}
              {tags.map((item) => {
                const selected = selectedTags.has(item.tag);
                return (
                  <Badge
                    key={item.tag}
                    variant={selected ? "default" : "secondary"}
                    className="cursor-pointer text-xs capitalize"
                    onClick={() => handleTagClick(item.tag)}
                  >
                    {item.tag} ({item.count})
                  </Badge>
                );
              })}
            </div>
            <div className="text-lg font-medium mt-2">Рейтинг </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRatingClick(3)}>
                <Star className={filters.ratingFrom === 3 ? "h-4 w-4 text-yellow-500" : "h-4 w-4 text-muted-foreground"} />
                <div className={filters.ratingFrom === 3 ? "text-sm text-yellow-500" : "text-sm text-muted-foreground"}>от 3.0</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRatingClick(4)}>
                <Star className={filters.ratingFrom === 4 ? "h-4 w-4 text-yellow-500" : "h-4 w-4 text-muted-foreground"} />
                <div className={filters.ratingFrom === 4 ? "text-sm text-yellow-500" : "text-sm text-muted-foreground"}>от 4.0</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRatingClick(5)}>
                <Star className={filters.ratingFrom === 5 ? "h-4 w-4 text-yellow-500" : "h-4 w-4 text-muted-foreground"} />
                <div className={filters.ratingFrom === 5 ? "text-sm text-yellow-500" : "text-sm text-muted-foreground"}>от 5.0</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRatingClick(0)}></div>
            </div>  
            <div className="text-lg font-medium mt-2">Уровень подготовки</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleLevelClick(null)}>
                <div className={filters.level === null ? "text-sm text-white underline" : "text-sm text-muted-foreground"}>Любой</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleLevelClick("beginner")}>
                <div className={filters.level === "beginner" ? "text-sm text-white underline" : "text-sm text-muted-foreground"}>Начальный</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleLevelClick("intermediate")}>
                <div className={filters.level === "intermediate" ? "text-sm text-white underline" : "text-sm text-muted-foreground"}>Средний</div>
              </div>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleLevelClick("advanced")}>
                <div className={filters.level === "advanced" ? "text-sm text-white underline" : "text-sm text-muted-foreground"}>Профессиональный</div>
              </div>
            </div>
            </div>
            <div className="flex flex-col gap-3">
            <div className="text-lg font-medium">Категории</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <Badge key={item.slug} variant="secondary" className="cursor-pointer text-xs capitalize" onClick={() => handleCategoryClick(item.slug)}>
                  {item.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center mt-2 space-x-2 cursor-pointer">
              <Switch id="enroll-mode" checked={filters.needEnrollment === false} onCheckedChange={() => handleEnrollModeChange(filters.needEnrollment === false)} />
              <Label htmlFor="enroll-mode">Без записи</Label>
            </div>
            </div>
        </div>
        <DialogFooter className="mt-auto">
          <Button variant="outline" onClick={() => setFilters({})}>Сбросить</Button>
          <DialogClose render={<Button variant="default">Показать</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
