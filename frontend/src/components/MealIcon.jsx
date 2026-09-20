import './MealIcon.css'

const ICONS = {
  sunrise: (
    <>
      <path d="M4 9h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4V9z" />
      <path d="M17 10h1.5a2.5 2.5 0 010 5H17" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 12.5A8.5 8.5 0 1111.5 4a7 7 0 008.5 8.5z" />,
  sparkle: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
}

/** Small tinted badge for a meal section (breakfast/lunch/dinner/snacks). */
export default function MealIcon({ icon, size = 28 }) {
  return (
    <span className={`meal-icon meal-icon--${icon}`} style={{ width: size, height: size }}>
      <svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[icon]}
      </svg>
    </span>
  )
}
