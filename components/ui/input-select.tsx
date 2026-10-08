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

import { Dispatch, SetStateAction } from "react";
export type SetState<T> = Dispatch<SetStateAction<T>>;

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export interface InputSelectProvided {
  options: SelectOption[];
  onValueChange?: (v: string) => void;
  placeholder: string;
  clearable: boolean;
  disabled: boolean;
  selectedValue: string;
  setSelectedValue: SetState<string>;
  isPopoverOpen: boolean;
  setIsPopoverOpen: SetState<boolean>;
  onOptionSelect: (v: string) => void;
  onClearAllOptions: () => void;
}

function mergeOptions(
  base: SelectOption[],
  extra: SelectOption[],
  selectedValue: string,
): SelectOption[] {
  const map = new Map<string, SelectOption>();
  for (const option of base) map.set(option.value, option);
  for (const option of extra) map.set(option.value, option);
  if (selectedValue && !map.has(selectedValue)) {
    map.set(selectedValue, { value: selectedValue, label: selectedValue });
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

export const InputSelect: React.FC<{
  options: SelectOption[];
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  /** Разрешить ввод значения, которого нет в списке */
  creatable?: boolean;
  /** Вернуть option для нового значения; по умолчанию { value, label } = текст */
  onCreateOption?: (input: string) => SelectOption | void;
  className?: string;
  style?: React.CSSProperties;
  children: (v: InputSelectProvided) => React.ReactNode;
}> = ({
  options,
  value = "",
  onValueChange,
  placeholder = "Выберите...",
  clearable = false,
  disabled = false,
  creatable = false,
  onCreateOption,
  className,
  children,
  ...restProps
}) => {
  const [selectedValue, setSelectedValue] = React.useState<string>(value);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [extraOptions, setExtraOptions] = React.useState<SelectOption[]>([]);

  const allOptions = React.useMemo(
    () => mergeOptions(options, extraOptions, selectedValue),
    [options, extraOptions, selectedValue],
  );

  const onOptionSelect = (option: string) => {
    setSelectedValue(option);
    onValueChange?.(option);
    setIsPopoverOpen(false);
    setSearch("");
  };

  const onClearAllOptions = () => {
    setSelectedValue("");
    onValueChange?.("");
    setIsPopoverOpen(false);
    setSearch("");
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
    onOptionSelect(created.value);
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
          clearable,
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
            {!showCreate && <CommandEmpty>Ничего не найдено.</CommandEmpty>}
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmedSearch}`}
                  onSelect={createFromSearch}
                  className="cursor-pointer"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  <span>
                    Добавить «{trimmedSearch}»
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup className="max-h-[20rem] min-h-[10rem] overflow-y-auto">
              {allOptions.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => onOptionSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-1 flex h-4 w-4 items-center justify-center",
                        isSelected ? "text-primary" : "invisible",
                      )}
                    >
                      <CheckIcon className="w-4 h-4" />
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
                {selectedValue && clearable && (
                  <>
                    <CommandItem
                      onSelect={onClearAllOptions}
                      className="justify-center flex-1 cursor-pointer"
                    >
                      Очистить
                    </CommandItem>
                    <Separator
                      orientation="vertical"
                      className="flex h-full mx-2 min-h-6"
                    />
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
InputSelect.displayName = "InputSelect";

export const InputSelectTrigger = React.forwardRef<
  HTMLButtonElement,
  InputSelectProvided & {
    className?: string;
    children?: (v: SelectOption) => React.ReactNode;
    style?: React.CSSProperties;
  }
>(
  (
    {
      options,
      placeholder,
      clearable,
      disabled,
      selectedValue,
      setIsPopoverOpen,
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

    const selectedOption =
      options.find((option) => option.value === selectedValue) ??
      (selectedValue
        ? { value: selectedValue, label: selectedValue }
        : undefined);

    return (
      <Button
        ref={ref}
        onClick={onTogglePopover}
        variant="outline"
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between p-1 [&_svg]:pointer-events-auto",
          "hover:bg-transparent",
          disabled && "[&_svg]:pointer-events-none",
          className,
        )}
        style={style}
      >
        {selectedValue && selectedOption ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-wrap items-center px-2">
              {children ? (
                children(selectedOption)
              ) : (
                <div className={cn("text-foreground")}>
                  {selectedOption.icon && (
                    <selectedOption.icon className="mr-1 h-3.5 w-3.5" />
                  )}
                  {selectedOption.label}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              {clearable && (
                <>
                  <X
                    className={cn(
                      "mx-1 h-4 cursor-pointer text-muted-foreground",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearAllOptions();
                    }}
                  />
                  <Separator orientation="vertical" className="flex h-full min-h-6" />
                </>
              )}
              <ChevronDown className="h-4 mx-1 cursor-pointer text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full mx-auto">
            <span className="mx-3 text-sm text-muted-foreground">{placeholder}</span>
            <ChevronDown className="h-4 mx-1 cursor-pointer text-muted-foreground" />
          </div>
        )}
      </Button>
    );
  },
);
InputSelectTrigger.displayName = "InputSelectTrigger";
