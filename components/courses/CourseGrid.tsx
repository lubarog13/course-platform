"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { CourseListQuery, CourseListResponse } from "@/app/lib/courses";
import type { CourseLevel } from "@/lib/models";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CourseCard } from "./CourseCard";
import FiltersModal from "./FiltersModal";


export function CourseGrid({ forceRefresh = false }: {forceRefresh?: boolean}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);
  const [data, setData] = useState<CourseListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(9);

  const [filters, setFilters] = useState<CourseListQuery>({});
  const updateFilters = (currentFilters: CourseListQuery) => {
    setFilters((prevFilters) => ({
        ...prevFilters,
        ...currentFilters,
    }));
    const resultFilters = { ...filters, ...currentFilters } as {tag?: string} & CourseListQuery;
    if (resultFilters.tag) {
      delete resultFilters.tag;
    }
    const localQueryParams = Object.fromEntries(Object.entries(resultFilters).filter(([key, value]) => value !== null && value !== undefined)) as Record<string, string>;
    router.replace(`/courses?${new URLSearchParams(localQueryParams).toString()}`);
    if (forceRefresh) {
      router.refresh();
    }
  };

  const loadFromQueryParams = () => {
    const newQueryParams = new URLSearchParams(window.location.search);
    console.log("loadFromQueryParams", newQueryParams.toString(), queryParams?.toString());
    if (!queryParams || newQueryParams.toString()!==queryParams?.toString()) {
      setQueryParams({...newQueryParams});
    } else {
      return;
    }
    if (!newQueryParams) return;
    const queryPage = newQueryParams.get("page") ?? 1;
    const queryPageSize = newQueryParams.get("pageSize") ?? 9;
    const sort = newQueryParams.get("sort") ?? "publishedAt";
    const order = newQueryParams.get("order") ?? "desc";
    const published = newQueryParams.get("published") ?? "1";
    const level = newQueryParams.get("level") ?? undefined;
    const category = newQueryParams.get("category") ?? undefined;
    const instructor = newQueryParams.get("instructor") ?? undefined;
    const tags = newQueryParams.get("tags")?.split(",") ?? undefined;
    const search = newQueryParams.get("search") ?? undefined;
    const ratingFrom = newQueryParams.get("ratingFrom") ?? undefined;
    const needEnrollment = newQueryParams.get("needEnrollment") ?? undefined;
    if (queryPage!==page) {
      setPage(Number(queryPage));
    }
    if (queryPageSize!==pageSize) {
      setPageSize(Number(queryPageSize));
    }
    setFilters({
      sort,
      order,
      published,
      level,
      category,
      instructor,
      tags,
      search,
      ratingFrom,
      needEnrollment: needEnrollment === "1",
    });
  }

  const loadData = () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize ?? 9),
      sort: filters.sort ?? "publishedAt",
      order: filters.order ?? "desc",
    });

    if (filters.published) params.set("published", "1");
    if (filters.level) params.set("level", filters.level);
    if (filters.category) params.set("category", filters.category);
    if (filters.instructor) params.set("instructor", filters.instructor);
    if (filters.tags) params.set("tags", filters.tags.join(","));
    if (filters.search) params.set("search", filters.search);
    if (filters.ratingFrom) params.set("ratingFrom", filters.ratingFrom);
    if (filters.needEnrollment) params.set("needEnrollment", filters.needEnrollment.toString());

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/course?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Не удалось загрузить курсы");
        }
        return response.json() as Promise<CourseListResponse>;
      })
      .then((result) => {
        setData(result);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить курсы");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }


  useEffect(() => {
    loadFromQueryParams();
  }, [forceRefresh]);

  useEffect(() => {
    loadData();
  }, [page, pageSize, filters]);

  const updateFiltersFromCard = (localFilters: {tag?: string} & CourseListQuery) => {
    setPage(1);
    if (localFilters.tag) {
      updateFilters({ ...localFilters, tags: [...(filters.tags || []), localFilters.tag] });
    } else {
      updateFilters(localFilters);
    }
  };

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <Card key={index} className="w-full max-w-xs">
      <CardContent>
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-20 mt-2" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </CardFooter>
    </Card>
    ))}
        </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-12 text-center">{error}</p>;
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Курсы не найдены
      </p>
    );
  }

  const from = (data.page - 1) * data.limit + 1;
  const to = Math.min(data.page * data.limit, data.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex align-center">
        <FiltersModal filters={filters} setFilters={updateFilters} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((course) => (
          <CourseCard key={course.id} course={course} updateFilters={updateFiltersFromCard} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-sm">
          {from}–{to} из {data.total}
        </p>
        {data.pageCount > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Назад"
                  aria-disabled={data.page <= 1 || loading}
                  className={
                    data.page <= 1 || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (data.page > 1 && !loading) {
                      setPage((current) => current - 1);
                    }
                  }}
                />
              </PaginationItem>
              {Array.from({ length: data.pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === data.page}
                      onClick={(event) => {
                        event.preventDefault();
                        if (!loading) setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Вперёд"
                  aria-disabled={data.page >= data.pageCount || loading}
                  className={
                    data.page >= data.pageCount || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (data.page < data.pageCount && !loading) {
                      setPage((current) => current + 1);
                    }
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
