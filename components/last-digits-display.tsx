"use client"

interface LastDigitsDisplayProps {
  digits: number[]
  currentDigit?: number | null
  mode?: "default" | "even-odd" | "over-under" | "rise-fall"
  theme?: "light" | "dark"
}

const uniqueDigitColors = [
  "from-purple-500 to-purple-600",
  "from-blue-500 to-blue-600",
  "from-cyan-500 to-cyan-600",
  "from-teal-500 to-teal-600",
  "from-emerald-500 to-emerald-600",
  "from-lime-500 to-lime-600",
  "from-amber-500 to-amber-600",
  "from-orange-500 to-orange-600",
  "from-red-500 to-red-600",
  "from-pink-500 to-pink-600",
]

export function LastDigitsDisplay({ digits, currentDigit, mode = "default", theme = "dark" }: LastDigitsDisplayProps) {
  if (mode === "even-odd") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {digits.map((digit, index) => {
          const isEven = digit % 2 === 0
          return (
            <div
              key={index}
              className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm shadow-lg ${
                isEven
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                  : "bg-gradient-to-br from-pink-500 to-red-500 text-white"
              }`}
            >
              {isEven ? "E" : "O"}
            </div>
          )
        })}
      </div>
    )
  }

  if (mode === "over-under") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {digits.map((digit, index) => {
          const isOver = digit >= 5
          return (
            <div
              key={index}
              className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm shadow-lg ${
                isOver
                  ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                  : "bg-gradient-to-br from-orange-500 to-red-500 text-white"
              }`}
            >
              {isOver ? "O" : "U"}
            </div>
          )
        })}
      </div>
    )
  }

  if (mode === "rise-fall") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {digits.map((digit, index) => {
          if (index === 0) return null
          const isRise = digit > digits[index - 1]
          return (
            <div
              key={index}
              className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm shadow-lg ${
                isRise
                  ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
                  : "bg-gradient-to-br from-red-500 to-pink-500 text-white"
              }`}
            >
              {isRise ? "R" : "F"}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {digits.map((digit, index) => (
        <div
          key={index}
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${uniqueDigitColors[digit]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
        >
          {digit}
        </div>
      ))}
    </div>
  )
}
