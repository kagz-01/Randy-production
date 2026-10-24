import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans text-sm font-medium tracking-wide transition-[transform,background-color,color,box-shadow,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-blue text-paper glow-blue hover:bg-blue-2",
        paper:
          "bg-paper text-void hover:bg-paper/90",
        ghost:
          "bg-transparent text-paper hover:bg-paper/8",
        line:
          "hairline bg-transparent text-paper hover:glow-blue",
      },
      size: {
        md: "h-11 rounded-md px-5",
        sm: "h-9 rounded-sm px-3.5 text-xs uppercase tracking-[0.16em]",
        lg: "h-12 rounded-md px-6",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
