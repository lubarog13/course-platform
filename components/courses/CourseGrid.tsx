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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CourseCard } from "./CourseCard";
import FiltersModal from "./FiltersModal";
import { SearchField } from "../base/SearchField";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { ListSortDescending, ListSortAscending } from "lucide-react";


export function CourseGrid({ forceRefresh = false, category = undefined }: {forceRefresh?: boolean, category?: string | undefined}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);
  const [data, setData] = useState<CourseListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(9);

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    router.replace(`/courses${category ? `/${category}` : ''}?${new URLSearchParams(localQueryParams).toString()}`);
    if (forceRefresh) {
      router.refresh();
    }
  };

  const loadFromQueryParams = () => {
    const newQueryParams = new URLSearchParams(window.location.search);
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
    const paramCategory = category ?? newQueryParams.get("category") ?? undefined;
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
      category: paramCategory,
      instructor,
      tags,
      search,
      ratingFrom: ratingFrom ? Number(ratingFrom) : null,
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
    if (filters.category) params.set("category", category ?? filters.category);
    if (filters.instructor) params.set("instructor", filters.instructor);
    if (filters.tags) params.set("tags", filters.tags.join(","));
    if (filters.search) params.set("search", filters.search);
    if (filters.ratingFrom) params.set("ratingFrom", filters.ratingFrom.toString());
    if (filters.needEnrollment) params.set("needEnrollment", filters.needEnrollment.toString());
    console.log("loadData", params.toString());
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

  const sortOptions = [
    { label: "По дате публикации", value: "publishedAt" },
    { label: "По дате создания", value: "createdAt" },
    { label: "По дате изменения", value: "updatedAt" },
    { label: "По названию", value: "name" },
    { label: "По рейтингу", value: "rating" },
  ]

  const order = [
    { label: "По возрастанию", value: "asc" },
    { label: "По убыванию", value: "desc" },
  ]

  const searchMobile = () => {
    return (
      <div className="flex flex-col gap-3 w-full">
        <SearchField className="w-full h-10 max-w-full" placeholder="Поиск по курсам" results={data?.total ?? 0} emitOnInput={true} onSearch={(value) => updateFilters({ search: value })} />
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="outline">{sortOptions.find(option => option.value === filters.sort)?.label} {filters.order==="desc" ? <ListSortDescending /> : <ListSortAscending />} </Button>}></CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-col gap-3">
              {sortOptions.map(option => (
                order.map(order => (
                  <Button variant="outline" key={option.value + order.value} onClick={() => updateFilters({ sort: option.value, order: order.value })}>{option.label}
                  <span className="text-xs text-muted-foreground"> ({order.label})</span>
                </Button>
                ))
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  const filtersBlock = () => {
    return (
      <div className="flex align-center gap-3 mb-5">
        <FiltersModal filters={filters} setFilters={updateFilters} >
          {mobile ? searchMobile() : null}
        </FiltersModal>
        <SearchField placeholder="Поиск по курсам" results={data?.total ?? 0} emitOnInput={true} onSearch={(value) => updateFilters({ search: value })} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline">
            {filters.order === "desc" ? <ListSortDescending /> : <ListSortAscending />}
            {sortOptions.find(option => option.value === filters.sort)?.label}</Button>}></DropdownMenuTrigger>
          <DropdownMenuContent className="w-[fit-content]">
            {sortOptions.map(option => (
              order.map(order => (
                <DropdownMenuItem className="block" key={option.value + order.value} onClick={() => updateFilters({ sort: option.value, order: order.value })}>{option.label}
                <DropdownMenuShortcut> ({order.label})</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
};
if (loading && !data) {
  return (  
    <>
    {filtersBlock()}
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
        </>
    );
  }
  

  if (error) {
    return <p className="text-destructive py-12 text-center">{error}</p>;
  }

  if (!data || data.items.length === 0) {
    return (
      <>
      {filtersBlock()}
      <p className="text-muted-foreground py-12 text-center">
        Курсы не найдены
      </p>
      </>
    );
  }

  const from = (data.page - 1) * data.limit + 1;
  const to = Math.min(data.page * data.limit, data.total);

  return (
    <>
    {filtersBlock()}
    <div className="flex flex-col gap-6">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
