"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown, Loader2, Search, UserRound } from "@/components/ui/icons";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  appendUniqueUserOptions,
  getNextUserPickerActiveIndex,
  mergeRemoteUserPickerOptions,
  type UserPickerOption,
} from "@/lib/risk-register-user-picker";
import { cn } from "@/lib/utils";

type RemoteUserPickerResult = {
  options: UserPickerOption[];
  total: number;
  page: number;
  limit: number;
};

interface RemoteUserPickerProps {
  title: string;
  description: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  value: UserPickerOption | null;
  onSelect: (option: UserPickerOption) => void;
  loadOptions: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<RemoteUserPickerResult>;
  className?: string;
  iconOnly?: boolean;
}

export function RemoteUserPicker({
  title,
  description,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  value,
  onSelect,
  loadOptions,
  className,
  iconOnly = false,
}: RemoteUserPickerProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<UserPickerOption[]>(
    value ? [value] : [],
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setQuery("");
      setPage(1);
      setErrorMessage("");
      setActiveIndex(-1);
    }
  }, []);

  useEffect(() => {
    if (!value) {
      return;
    }

    setOptions((current) => appendUniqueUserOptions(current, [value]));
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPage(1);
    setOptions(value ? [value] : []);
    setHasMore(false);
    setErrorMessage("");
    setActiveIndex(-1);
  }, [deferredQuery, open, value]);

  useEffect(() => {
    if (!disabled || !open) {
      return;
    }

    handleOpenChange(false);
  }, [disabled, handleOpenChange, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const pageLimit = 10;

    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setErrorMessage("");

    loadOptions({ q: deferredQuery, page, limit: pageLimit })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setOptions((current) => {
          return mergeRemoteUserPickerOptions({
            current,
            nextPage: result.options,
            page,
            selected: value,
          });
        });
        setHasMore(result.page * result.limit < result.total);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Daftar user tidak dapat dimuat.";
        setErrorMessage(message);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoading(false);
        setIsLoadingMore(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, loadOptions, open, page, value]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (options.length === 0) {
        return -1;
      }

      if (current < 0) {
        return 0;
      }

      if (current >= options.length) {
        return options.length - 1;
      }

      return current;
    });
  }, [options]);

  const handleSelect = useCallback(
    (option: UserPickerOption) => {
      onSelect(option);
      handleOpenChange(false);
    },
    [handleOpenChange, onSelect],
  );

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) =>
          getNextUserPickerActiveIndex({
            currentIndex: current,
            total: options.length,
            direction: 1,
          }),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          getNextUserPickerActiveIndex({
            currentIndex: current,
            total: options.length,
            direction: -1,
          }),
        );
        return;
      }

      if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        const option = options[activeIndex];
        if (option) {
          handleSelect(option);
        }
      }
    },
    [activeIndex, handleSelect, options],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div
        ref={containerRef}
        className={cn("relative", !iconOnly && "w-full", className)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={iconOnly ? `${title}: ${value?.name ?? placeholder}` : undefined}
            title={iconOnly ? `${title}: ${value?.name ?? placeholder}` : undefined}
            className={cn(
              "group/remote-user-picker flex h-10 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-card py-2 pr-3 pl-3 text-sm whitespace-nowrap transition-[background-color,border-color] active:translate-y-0 active:scale-100 outline-none select-none hover:border-foreground/15 disabled:hover:border-input focus:border-input focus-visible:border-input focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              !value && "text-muted-foreground",
        iconOnly && "size-8 justify-center border-0 bg-transparent p-0 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
            )}
          >
            {iconOnly ? <UserRound className="size-4" /> : <>
              <span className="truncate">{value?.name ?? placeholder}</span>
              <ChevronDown className="pointer-events-none size-4 text-muted-foreground transition-transform duration-150 ease-(--ease-out) group-data-[state=open]/remote-user-picker:rotate-180 motion-reduce:transition-none" />
            </>}
          </button>
        </PopoverTrigger>

        <PopoverContent
          variant="dropdown"
          style={{
            width: iconOnly
              ? "min(320px, calc(100vw - 2rem))"
              : "min(24rem, calc(100vw - 2rem))",
          }}
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <SearchInput
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 rounded-none border-0 bg-transparent px-0 py-2.5 shadow-none"
                aria-activedescendant={
                  activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined
                }
              />
            </div>
            <p className="sr-only">{description}</p>

            <ScrollArea className="mt-1 max-h-[300px] overflow-y-auto">
              <div id={panelId} className="flex flex-col" role="listbox" aria-label={title}>
                {isLoading && options.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Memuat user...
                  </div>
                ) : null}

                {!isLoading && errorMessage ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {errorMessage}
                  </div>
                ) : null}

                {!isLoading && !errorMessage && options.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                ) : null}

                {options.map((option, optionIndex) => {
                  const isSelected = value?.id === option.id;
                  const isActive = optionIndex === activeIndex;

                  return (
                    <button
                      key={option.id}
                      id={`${panelId}-option-${optionIndex}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg pr-10 pl-2 text-sm outline-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground",
                        (isSelected || isActive) ? "bg-accent text-accent-foreground" : "",
                      )}
                      onMouseEnter={() => setActiveIndex(optionIndex)}
                      onClick={() => handleSelect(option)}
                    >
                      <UserRound
                        className="size-4 shrink-0 text-muted-foreground"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                      <span className="truncate font-normal">{option.name}</span>
                      {isSelected ? (
                        <span className="absolute right-3 flex size-4 items-center justify-center">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={isLoading || isLoadingMore}
                    className="relative flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm text-muted-foreground outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat...
                      </>
                    ) : (
                      "Muat lagi"
                    )}
                  </button>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
