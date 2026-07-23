/** Thin SVG wrapper for @mdi/js path strings — the web stand-in for the
 *  vector-icon packs the mobile app uses. */
export function Icon({
  path,
  size = 24,
  color = 'currentColor',
  className,
}: {
  path: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill={color} />
    </svg>
  );
}
