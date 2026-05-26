/**
 * SearchInput component with search icon.
 *
 * @see Issue #72: P10-003: Create atomic UI component library
 *
 * Usage:
 * ```tsx
 * import { SearchInput } from "@repo/ui";
 *
 * const [search, setSearch] = useState("");
 *
 * <SearchInput
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 *   placeholder="Search users..."
 *   onClear={() => setSearch("")}
 * />
 * ```
 */

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  onClear?: () => void;
}

/**
 * SearchInput with icon and optional clear button.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => {
    const showClear = onClear && value;

    return (
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          ref={ref}
          type="search"
          className={cn('pl-10 pr-10', className)}
          value={value}
          {...props}
        />
        {showClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
