"use client";

import { useEffect, useState } from "react";
import type { CourseListQuery } from "@/app/lib/courses";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Funnel } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TagOption = {
  tag: string;
  count: number;
};

let filtersRequest: Promise<TagOption[]> | null = null;

function loadFilterTags(signal: AbortSignal): Promise<TagOption[]> {
  if (!filtersRequest) {
    filtersRequest = fetch("/api/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        return res.json() as Promise<TagOption[]>;
      })
      .then((data) =>
        [...data].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
      )
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
};

export default function FiltersModal({
  filters = {},
  setFilters,
}: FiltersModalProps) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    loadFilterTags(controller.signal)
      .then((data) => {
        setTags(data);
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

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon">
            <Funnel className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Фильтры</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
