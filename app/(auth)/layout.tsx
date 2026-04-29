import { Playfair_Display } from 'next/font/google'

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
})

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${playfairDisplay.variable} min-h-screen flex items-center justify-center bg-gray-50`}
    >
      <div className="w-full max-w-md p-8 bg-white rounded-xl border shadow-sm">
        {children}
      </div>
    </div>
  )
}
