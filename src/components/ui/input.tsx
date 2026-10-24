import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md bg-paper/5 px-3.5 text-sm text-paper outline-none",
        "shadow-[0_0_0_1px_rgb(243_241_234/0.12)] placeholder:text-mist",
        "transition-[box-shadow] duration-150 focus:shadow-[0_0_0_1px_var(--color-blue)]",
        className,
      )}
      {...props}
    />
  );
}
