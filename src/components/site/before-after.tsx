import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function BeforeAfter({
  before,
  after,
  beforeLabel = "Raw room",
  afterLabel = "Dressed",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [pos, setPos] = useState(52);
  const dragging = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);

  function setFromClientX(x: number) {
    const el = wrap.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((x - rect.left) / rect.width) * 100;
    setPos(Math.min(96, Math.max(4, next)));
  }

  return (
    <div
      ref={wrap}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        setFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      <img src={before} alt={beforeLabel} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={after}
          alt={afterLabel}
          className="absolute inset-0 size-full max-w-none object-cover"
          style={{ width: wrap.current ? `${wrap.current.clientWidth}px` : "100%" }}
        />
      </div>
      <div
        className="absolute inset-y-0 z-10 w-px bg-paper"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full glass-strong">
          <span className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-widest text-paper">
            drag
          </span>
        </div>
      </div>
      <span className={cn("absolute bottom-3 left-3 rounded-sm glass px-2 py-1 text-[10px] uppercase tracking-[0.16em]")}>
        {beforeLabel}
      </span>
      <span className="absolute right-3 bottom-3 rounded-sm glass px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
        {afterLabel}
      </span>
    </div>
  );
}
