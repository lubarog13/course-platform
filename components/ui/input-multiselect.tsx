"use client";

import * as React from "react";
import { CheckIcon, ChevronDown, PlusIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dispatch, SetStateAction } from "react";
export type SetState<T> = Dispatch<SetStateAction<T>>;

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export interface InputMultiSelectProvided {
  options: SelectOption[];
  onValueChange: (v: string[]) => void;
  placeholder: string;
  truncateCount: number;
  disabled: boolean;
  selectedValue: string[];
  setSelectedValue: SetState<string[]>;

  isPopoverOpen: boolean;
  setIsPopoverOpen: SetState<boolean>;
  onOptionSelect: (v: string) => void;
  onClearAllOptions: () => void;
}

function mergeOptions(
  base: SelectOption[],
  extra: SelectOption[],
  selectedValues: string[],
): SelectOption[] {
  const map = new Map<string, SelectOption>();
  for (const option of base) map.set(option.value, option);
  for (const option of extra) map.set(option.value, option);
  for (const value of selectedValues) {
    if (!map.has(value)) {
      map.set(value, { value, label: value });
    }
  }
  return Array.from(map.values());
}

function hasExactOption(options: SelectOption[], query: string) {
  const normalized = query.trim().toLowerCase();
  return options.some(
    (option) =>
      option.label.toLowerCase() === normalized ||
      option.value.toLowerCase() === normalized,
  );
}

export const InputMultiSelect: React.FC<{
  options: SelectOption[];
  value: string[];
  onValueChange: (v: string[]) => void;
  placeholder?: string;
  truncateCount?: number;
  disabled?: boolean;
  /** Разрешить ввод значения, которого нет в списке */
  creatable?: boolean;
  /** Вернуть option для нового значения; по умолчанию { value, label } = текст */
  onCreateOption?: (input: string) => SelectOption | void;
  className?: string;
  style?: React.CSSProperties;
  children: (v: InputMultiSelectProvided) => React.ReactNode;
}> = ({
  options,
  value = [],
  onValueChange,
  placeholder = "Выберите...",
  truncateCount = 3,
  disabled = false,
  creatable = false,
  onCreateOption,
  className,
  children,
  ...restProps
}) => {
  const [selectedValue, setSelectedValue] = React.useState<string[]>(value);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [extraOptions, setExtraOptions] = React.useState<SelectOption[]>([]);

  const allOptions = React.useMemo(
    () => mergeOptions(options, extraOptions, selectedValue),
    [options, extraOptions, selectedValue],
  );

  const onOptionSelect = (option: string) => {
    const newSelectedValues = selectedValue.includes(option)
      ? selectedValue.filter((item) => item !== option)
      : [...selectedValue, option];
    setSelectedValue(newSelectedValues);
    onValueChange(newSelectedValues);
  };

  const onClearAllOptions = () => {
    setSelectedValue([]);
    onValueChange([]);
  };

  const toggleAll = () => {
    if (selectedValue.length === allOptions.length) {
      onClearAllOptions();
    } else {
      const allValues = allOptions.map((option) => option.value);
      setSelectedValue(allValues);
      onValueChange(allValues);
    }
  };

  const createFromSearch = () => {
    const trimmed = search.trim();
    if (!trimmed || hasExactOption(allOptions, trimmed)) return;
    const created = onCreateOption
      ? onCreateOption(trimmed)
      : ({ value: trimmed, label: trimmed } satisfies SelectOption);
    if (!created) return;
    setExtraOptions((prev) =>
      prev.some((option) => option.value === created.value)
        ? prev
        : [...prev, created],
    );
    if (!selectedValue.includes(created.value)) {
      const next = [...selectedValue, created.value];
      setSelectedValue(next);
      onValueChange(next);
    }
    setSearch("");
  };

  React.useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  React.useEffect(() => {
    if (!isPopoverOpen) setSearch("");
  }, [isPopoverOpen]);

  const trimmedSearch = search.trim();
  const showCreate =
    creatable &&
    trimmedSearch.length > 0 &&
    !hasExactOption(allOptions, trimmedSearch);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        {children({
          options: allOptions,
          onValueChange,
          placeholder,
          truncateCount,
          disabled,
          selectedValue,
          setSelectedValue,
          isPopoverOpen,
          setIsPopoverOpen,
          onOptionSelect,
          onClearAllOptions,
        })}
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", className)}
        align="start"
        onEscapeKeyDown={() => setIsPopoverOpen(false)}
        {...restProps}
      >
        <Command>
          <CommandInput
            placeholder={creatable ? "Поиск или ввод..." : "Поиск..."}
            value={search}
            onValueChange={setSearch}
            onKeyDown={(event) => {
              if (event.key === "Enter" && showCreate) {
                event.preventDefault();
                createFromSearch();
              }
            }}
          />
          <CommandList className="max-h-[unset] overflow-y-hidden">
            {!showCreate && <CommandEmpty>Результатов не найдено.</CommandEmpty>}
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedSearch}`}
                  onSelect={createFromSearch}
                  className="cursor-pointer"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  <span>Добавить «{trimmedSearch}»</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              <CommandItem key="all" onSelect={toggleAll} className="cursor-pointer">
                <div
                  className={cn(
                    "mr-1 flex h-4 w-4 items-center justify-center rounded-md border border-muted-foreground/50",
                    selectedValue.length === allOptions.length && allOptions.length > 0
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible",
                  )}
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground">Выбрать все</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup className="max-h-[20rem] min-h-[10rem] overflow-y-auto">
              {allOptions.map((option) => {
                const isSelected = selectedValue.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => onOptionSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-1 flex h-4 w-4 items-center justify-center rounded-md border border-muted-foreground/50",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </div>
                    {option.icon && (
                      <option.icon className="w-4 h-4 mr-2 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div className="flex items-center justify-between">
                {selectedValue.length > 0 && (
                  <>
                    <CommandItem
                      onSelect={onClearAllOptions}
                      className="justify-center flex-1 cursor-pointer"
                    >
                      Очистить
                    </CommandItem>
                    <Separator orientation="vertical" className="flex h-full min-h-6" />
                  </>
                )}
                <CommandItem
                  onSelect={() => setIsPopoverOpen(false)}
                  className="justify-center flex-1 max-w-full cursor-pointer"
                >
                  Закрыть
                </CommandItem>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
InputMultiSelect.displayName = "MultiSelect";

export const InputMultiSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  InputMultiSelectProvided & {
    className?: string;
    children?: (v: SelectOption) => React.ReactNode;
    style?: React.CSSProperties;
  }
>(
  (
    {
      options,
      placeholder,
      truncateCount,
      disabled,
      selectedValue,
      setIsPopoverOpen,
      onOptionSelect,
      onClearAllOptions,
      className,
      style,
      children,
    },
    ref,
  ) => {
    const onTogglePopover = () => {
      setIsPopoverOpen((prev) => !prev);
    };

    return (
      <Button
        ref={ref}
        onClick={onTogglePopover}
        variant="outline"
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-auto min-h-11 w-full items-center justify-between p-1 [&_svg]:pointer-events-auto",
          "hover:bg-transparent",
          disabled && "[&_svg]:pointer-events-none",
          className,
        )}
        style={style}
      >
        {selectedValue.length > 0 ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-wrap items-center px-1">
              {selectedValue.slice(0, truncateCount).map((value, index) => {
                const option =
                  options.find((item) => item.value === value) ?? {
                    value,
                    label: value,
                  };

                if (children) {
                  return <div key={`${index}-${value}`}>{children(option)}</div>;
                }

                return (
                  <Badge
                    key={`${index}-${value}`}
                    className={cn(
                      "mr-1 cursor-default border-transparent bg-muted text-foreground hover:bg-muted",
                    )}
                  >
                    {option.icon && <option.icon className="mr-1 h-3.5 w-3.5" />}
                    {option.label}
                    <X
                      className="ml-1 h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOptionSelect(value);
                      }}
                    />
                  </Badge>
                );
              })}
              {selectedValue.length > truncateCount && (
                <div className={cn("cursor-default py-1 pl-1.5 text-muted-foreground")}>
                  {`+${selectedValue.length - truncateCount}`}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <X
                className="h-4 mx-2 cursor-pointer text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearAllOptions();
                }}
              />
              <Separator orientation="vertical" className="flex h-full min-h-6" />
              <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full mx-auto">
            <span className="mx-3 text-sm text-muted-foreground">{placeholder}</span>
            <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
          </div>
        )}
      </Button>
    );
  },
);
InputMultiSelectTrigger.displayName = "InputMultiSelectTrigger";
