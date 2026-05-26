import { ParentSize } from '@visx/responsive';

interface ChartContainerProps {
  /** Minimum height in pixels */
  height?: number;
  className?: string;
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
}

/**
 * Responsive chart container that measures its parent width
 * and provides dimensions to chart children via render prop.
 */
export function ChartContainer({ height = 300, className, children }: ChartContainerProps) {
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ParentSize>
        {({ width: w, height: h }) => {
          if (w <= 0 || h <= 0) return null;
          return <>{children({ width: w, height: h })}</>;
        }}
      </ParentSize>
    </div>
  );
}
