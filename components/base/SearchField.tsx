import { Search } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useEffect, useState } from "react"
import useDebounce from "@/hooks/use-debounce"
import { declOfNum } from "@/lib/utils"
type SearchFieldProps = {
  className?: string
  placeholder: string
  results: number
  emitOnInput: boolean
  onSearch: (value: string) => void
}


export function SearchField({ className, placeholder, results, emitOnInput = false, onSearch }: SearchFieldProps) {
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebounce(search, 500)
    const handleSearch = (value: string) => {
        setSearch(value)
    }
    useEffect(() => {
        if (emitOnInput) {
            onSearch(debouncedSearch)
        }
    }, [debouncedSearch, emitOnInput])
  return (
    <InputGroup className={`max-w-xs ${className}`}>
      <InputGroupInput placeholder={placeholder} onChange={(e) => handleSearch(e.target.value)} value={search} onKeyDown={(e) => {
        if (e.key === "Enter") {
            onSearch(debouncedSearch)
        }
      }} 
      onBlur={() => {
            onSearch(debouncedSearch)
      }}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">{results} {declOfNum(results, ["результат", "результата", "результатов"])}</InputGroupAddon>
    </InputGroup>
  )
}
