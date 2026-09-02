import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm font-semibold text-[#27272A] dark:text-[#F4F4F5] ring-offset-white dark:ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 disabled:text-[#27272A] dark:disabled:text-[#F4F4F5] transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }
