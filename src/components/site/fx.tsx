import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AmbientOrbs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-blue/15 blur-[100px]" />
      <div className="absolute top-1/3 -right-32 size-[24rem] rounded-full bg-blue/10 blur-[90px]" />
      <div className="absolute -bottom-24 left-1/3 size-[22rem] rounded-full bg-blue/8 blur-[80px]" />
    </div>
  );
}

export function GlassCard({
  className,
  children,
  strong = false,
}: {
  className?: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-xl border backdrop-blur-md transition-shadow duration-300",
        strong
          ? "border-blue/30 bg-ink/60 shadow-border-hover"
          : "border-paper/8 bg-ink/40 hover:shadow-border-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ParallaxImage({
  src,
  alt,
  className,
  strength = 24,
}: {
  src: string;
  alt: string;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength]);

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="size-full scale-110 object-cover"
        loading="lazy"
      />
    </div>
  );
}
