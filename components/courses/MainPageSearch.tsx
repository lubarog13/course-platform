"use client";

import { useState } from "react";
import { SearchField } from "@/components/base/SearchField";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";

export default function MainPageSearch() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(0);
  const router = useRouter();
  const handleSearch = (value: string) => {
    setSearch(value);
    router.push(`/courses?search=${value}`);
  };

  return (
    <div className="flex items-center justify-between gap-2 my-6">
      <SearchField showResults={false} className="w-full h-10 max-w-full" placeholder="Поиск по курсам" results={results} onInput={(value) => setSearch(value)} emitOnInput={false} onSearch={handleSearch} />
   <Button size="sm" className="h-10 max-w-full" onClick={() => handleSearch(search)}>
    <SearchIcon className="w-4 h-4" />
    Поиск
   </Button>
    </div>
  );
}