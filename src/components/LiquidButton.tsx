import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LiquidGlass } from './LiquidGlass';

type LiquidButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  frost?: number;
  glassClassName?: string;
};

/**
 * Semantic button with the app's shared refractive substrate.
 *
 * The button stays transparent so the LiquidGlass child can sample the real
 * backdrop. Its negative z-index keeps text and icons sharp above the lens.
 */
export function LiquidButton({
  children,
  className,
  frost = 1,
  glassClassName,
  ...props
}: LiquidButtonProps) {
  return (
    <button
      {...props}
      className={[className, 'liquid-control'].filter(Boolean).join(' ')}
    >
      <LiquidGlass
        className={['control-glass', glassClassName].filter(Boolean).join(' ')}
        frost={frost}
      />
      {children}
    </button>
  );
}
