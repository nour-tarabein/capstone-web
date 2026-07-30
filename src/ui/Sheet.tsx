import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { LiquidGlass } from '../components/LiquidGlass';

/**
 * The one bottom sheet. Slides up on mount, fades its backdrop, dismisses on
 * backdrop tap or by dragging the handle past the threshold, and always plays
 * the exit animation before telling the owner to unmount it — so closing never
 * "pops". Children ask for dismissal through context instead of unmounting
 * themselves, which is what keeps every close path animated.
 */
const DismissContext = createContext<() => void>(() => {});

/** The animated way out, available to anything rendered inside a Sheet. */
export function useDismiss() {
  return useContext(DismissContext);
}

const EXIT_MS = 240;
const DRAG_CLOSE_PX = 110;

export function Sheet({
  onClosed,
  children,
  tall = false,
}: {
  /** Called after the exit animation finishes — remove the sheet here. */
  onClosed: () => void;
  children: ReactNode;
  /** Fixed near-full height, for content that is itself a scroll view. */
  tall?: boolean;
}) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const dragStart = useRef(0);
  const leavingRef = useRef(false);

  useEffect(() => {
    // Double rAF so the mounted (offscreen) frame paints before the slide-up.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const dismiss = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setDragY(null);
    window.setTimeout(onClosed, EXIT_MS);
  }, [onClosed]);

  function onHandleDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leavingRef.current) return;
    dragStart.current = e.clientY;
    setDragY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandleMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragY === null || leavingRef.current) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  }

  function onHandleUp() {
    if (dragY === null || leavingRef.current) return;
    if (dragY > DRAG_CLOSE_PX) dismiss();
    else setDragY(null);
  }

  const open = entered && !leaving;
  const sheetStyle: CSSProperties =
    dragY !== null
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : {};

  return (
    <div
      className={open ? 'sheet-backdrop sheet-backdrop-open' : 'sheet-backdrop'}
      onClick={dismiss}
    >
      <div
        className={[
          'sheet',
          tall ? 'sheet-tall' : '',
          open ? 'sheet-open' : '',
        ].join(' ')}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <LiquidGlass className="sheet-glass" frost={14} />
        <div
          className="sheet-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={() => setDragY(null)}
        >
          <div className="sheet-grabber" />
        </div>
        <DismissContext.Provider value={dismiss}>
          <div className="sheet-scroll">{children}</div>
        </DismissContext.Provider>
      </div>
    </div>
  );
}
