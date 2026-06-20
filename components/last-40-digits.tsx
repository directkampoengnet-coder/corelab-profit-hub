"use client"

interface Last40DigitsProps {
  digits: number[]
  theme?: "light" | "dark"
  mode?: "even-odd" | "rise-fall"
}

export function Last40Digits({ digits, theme = "dark", mode = "even-odd" }: Last40DigitsProps) {
  const last40 = digits.slice(-40)

  // Split into two rows of 20
  const row1 = last40.slice(0, 20)
  const row2 = last40.slice(20, 40)

  const renderDigit = (digit: number, index: number, prevDigit?: number) => {
    if (mode === "rise-fall") {
      const isRise = prevDigit !== undefined && digit > prevDigit
      const label = prevDigit === undefined ? "-" : isRise ? "R" : "F"
      const bgColor = prevDigit === undefined ? "bg-gray-500" : isRise ? "bg-cyan-500" : "bg-pink-500"

      return (
        <div
          key={index}
          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${bgColor}`}
        >
          <span className="text-sm sm:text-lg md:text-xl font-bold text-white">{label}</span>
        </div>
      )
    } else {
      // Even/Odd mode
      const isEven = digit % 2 === 0
      return (
        <div
          key={index}
          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
            isEven ? "bg-cyan-500" : "bg-pink-500"
          }`}
        >
          <span className="text-sm sm:text-lg md:text-xl font-bold text-white">{isEven ? "E" : "O"}</span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
        {row1.map((digit, index) => renderDigit(digit, index, index > 0 ? row1[index - 1] : undefined))}
      </div>
      {row2.length > 0 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          {row2.map((digit, index) =>
            renderDigit(digit, index + 20, index === 0 ? row1[row1.length - 1] : row2[index - 1]),
          )}
        </div>
      )}
    </div>
  )
}
