import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Available page sizes for pagination controls.
 * Shared constant matching the schema utilities in @repo/schemas (SP-001).
 */
const PAGE_SIZES = [5, 10, 25, 50, 100] as const;

type NavigateOptions<TParams> = {
  search: (prev: TParams) => TParams;
};

interface ViewPaginationProps<TParams> {
  /** Total number of records across all pages */
  totalCount: number;
  /** Key in TParams for the page number. Defaults to 'page' */
  pageKey?: keyof TParams;
  /** Key in TParams for the page size. Defaults to 'pageSize' */
  pageSizeKey?: keyof TParams;
  /** Default values when params are absent from the URL */
  defaults: { page: number; pageSize: number };
  /** Current search params from the URL (via useSearch) */
  params: TParams;
  /** Navigate function to update URL search params */
  navigate: (options: NavigateOptions<TParams>) => void;
  /** Additional CSS class name */
  className?: string;
}

function ViewPagination<TParams extends Record<string, unknown>>(
  props: ViewPaginationProps<TParams>
) {
  const {
    totalCount,
    pageKey = 'page' as keyof TParams,
    pageSizeKey = 'pageSize' as keyof TParams,
    defaults,
    params,
    navigate,
    className,
  } = props;

  const currentPage = (params[pageKey] as number | undefined) ?? defaults.page;
  const currentPageSize = (params[pageSizeKey] as number | undefined) ?? defaults.pageSize;

  const pageCount = Math.max(1, Math.ceil(totalCount / currentPageSize));
  const from = (currentPage - 1) * currentPageSize + 1;
  const to = Math.min(currentPage * currentPageSize, totalCount);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  const handlePageChange = useCallback(
    (nextPage: number) => {
      navigate({
        search: (prev: TParams) => ({
          ...prev,
          [pageKey]: nextPage,
        }),
      });
    },
    [navigate, pageKey]
  );

  const handlePageSizeChange = useCallback(
    (nextSize: number) => {
      navigate({
        search: (prev: TParams) => {
          const updated = { ...prev };
          (updated as Record<string, unknown>)[pageSizeKey as string] = nextSize;
          delete (updated as Record<string, unknown>)[pageKey as string];
          return updated;
        },
      });
    },
    [navigate, pageKey, pageSizeKey]
  );

  const paginationInfo = `${from} - ${to} of ${totalCount}`;

  // Pagination button rendering
  const btnBaseClasses = 'size-7 p-0 text-sm';
  const btnArrowClasses = btnBaseClasses + ' rtl:transform rtl:rotate-180';
  const moreLimit = 5;

  const pageIndex = currentPage - 1; // 0-based for rendering logic
  const currentGroupStart = Math.floor(pageIndex / moreLimit) * moreLimit;
  const currentGroupEnd = Math.min(currentGroupStart + moreLimit, pageCount);

  const renderPageButtons = () => {
    const buttons = [];
    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <Button
          key={i}
          size="icon-sm"
          variant="ghost"
          className={cn(btnBaseClasses, 'text-muted-foreground', {
            'bg-accent text-accent-foreground': pageIndex === i,
          })}
          onClick={() => {
            if (pageIndex !== i) {
              handlePageChange(i + 1);
            }
          }}
        >
          {i + 1}
        </Button>
      );
    }
    return buttons;
  };

  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          size="icon-sm"
          className={btnBaseClasses}
          variant="ghost"
          onClick={() => handlePageChange(currentGroupStart)}
        >
          ...
        </Button>
      );
    }
    return null;
  };

  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          variant="ghost"
          size="icon-sm"
          onClick={() => handlePageChange(currentGroupEnd + 1)}
        >
          ...
        </Button>
      );
    }
    return null;
  };

  return (
    <div
      data-slot="view-pagination"
      className={cn(
        'flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0',
        className
      )}
    >
      <div className="order-2 flex flex-wrap items-center space-x-2.5 pb-2.5 sm:order-1 sm:pb-0">
        <div className="text-muted-foreground text-sm">Rows per page</div>
        <Select
          value={`${currentPageSize}`}
          onValueChange={(value) => {
            handlePageSizeChange(Number(value));
          }}
        >
          <SelectTrigger className="w-fit" size="sm">
            <SelectValue placeholder={`${currentPageSize}`} />
          </SelectTrigger>
          <SelectContent side="top" className="min-w-[50px]">
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <div className="text-muted-foreground order-2 text-nowrap text-sm sm:order-1">
          {paginationInfo}
        </div>
        {pageCount > 1 && (
          <div className="order-1 flex items-center space-x-1 sm:order-2">
            <Button
              size="icon-sm"
              variant="ghost"
              className={btnArrowClasses}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!canGoPrevious}
              aria-label="Go to previous page"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>

            {renderEllipsisPrevButton()}

            {renderPageButtons()}

            {renderEllipsisNextButton()}

            <Button
              size="icon-sm"
              variant="ghost"
              className={btnArrowClasses}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!canGoNext}
              aria-label="Go to next page"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { ViewPagination, PAGE_SIZES, type ViewPaginationProps };
