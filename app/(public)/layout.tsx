export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.10),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef6f4_100%)]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        {children}
      </div>
    </div>
  )
}
