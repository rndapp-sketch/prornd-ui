import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-black placeholder:text-gray-400 selection:bg-primary selection:text-primary-foreground border-gray-400 flex h-10 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-black font-bold shadow-sm transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900",
        "aria-invalid:ring-red-500 aria-invalid:border-red-500",
        className
      )}
      {...props}
    />
  )
}

export { Input }
