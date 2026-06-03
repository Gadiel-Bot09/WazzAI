import { cn } from "@/lib/utils/client"

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-8 h-8", className)}>
      <defs>
        <linearGradient id="wazzai-grad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" /> {/* Emerald/WhatsApp green */}
          <stop offset="1" stopColor="#3b82f6" /> {/* Modern AI blue */}
        </linearGradient>
      </defs>
      <path d="M100 20C55.8 20 20 52.2 20 92c0 21.8 10.6 41.2 27.2 54.4C45.2 158.8 30 176 30 176c0 0 22.4-3.4 38.6-10.4C78.4 169.4 89 172 100 172c44.2 0 80-32.2 80-72S144.2 20 100 20z" fill="url(#wazzai-grad)"/>
      <path d="M100 50 L107 75 L132 82 L107 89 L100 114 L93 89 L68 82 L93 75 Z" fill="#ffffff"/>
      <circle cx="100" cy="82" r="6" fill="#fbbf24"/>
      <path d="M130 120 L135 135 L150 140 L135 145 L130 160 L125 145 L110 140 L125 135 Z" fill="#ffffff" opacity="0.6"/>
    </svg>
  )
}
