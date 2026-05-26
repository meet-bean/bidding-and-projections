import * as React from 'react';
import { useState } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
} from '@repo/ui';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional secondary line shown below the label. */
  hint?: string;
}

interface ComboboxProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Enables LOV unbounded mode — when set, a "Create" affordance appears when no option matches the typed text. */
  onCreate?: (name: string) => string;
  /** Label generator for the create-new action. */
  createLabel?: (typed: string) => string;
  className?: string;
}

/**
 * Type-ahead searchable dropdown with optional "create new" (LOV unbounded mode).
 * Used for the cascading Customer → Location → Rig pickers on job creation.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  emptyMessage = 'No options',
  searchPlaceholder = 'Search...',
  disabled,
  onCreate,
  createLabel = (typed) => `Create "${typed}"`,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const trimmed = query.trim();
  const exactMatch = trimmed
    ? options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())
    : true;
  const canCreate = onCreate && trimmed.length > 0 && !exactMatch;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selected && 'text-muted-foreground',
              className
            )}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="text-muted-foreground ml-2 size-4 shrink-0 opacity-60" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] min-w-[260px] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  type="button"
                  onClick={() => {
                    const newId = onCreate!(trimmed);
                    onChange(newId);
                    setOpen(false);
                  }}
                  className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                >
                  <Plus className="text-primary size-4" />
                  <span>{createLabel(trimmed)}</span>
                </button>
              ) : (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  {emptyMessage}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{opt.label}</span>
                    {opt.hint ? (
                      <span className="text-muted-foreground truncate text-[11px]">
                        {opt.hint}
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
              {canCreate ? (
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => {
                    const newId = onCreate!(trimmed);
                    onChange(newId);
                    setOpen(false);
                  }}
                  className="border-t"
                >
                  <Plus className="text-primary mr-2 size-4" />
                  <span className="text-sm">{createLabel(trimmed)}</span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
