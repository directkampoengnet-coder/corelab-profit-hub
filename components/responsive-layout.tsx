"use client"

export const ResponsiveClasses = {
  container: "w-full px-2 sm:px-3 md:px-4 lg:px-6",
  heading: "text-base sm:text-lg md:text-2xl lg:text-3xl",
  subheading: "text-sm sm:text-base md:text-lg lg:text-xl",
  body: "text-xs sm:text-sm md:text-base lg:text-lg",
  button: "px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm md:text-base",
  card: "rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 lg:p-8",
  gap: "gap-2 sm:gap-3 md:gap-4 lg:gap-6",
  spacing: "my-3 sm:my-4 md:my-6 lg:my-8",
}

export function ResponsiveGrid({ cols = 2, children, ...props }: any) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-${cols} lg:grid-cols-${cols + 1} gap-3 sm:gap-4 md:gap-6`}
      {...props}
    >
      {children}
    </div>
  )
}
