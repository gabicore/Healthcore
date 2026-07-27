export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.12),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef6f4_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg_width%3D%2260%22_height%3D%2260%22_viewBox%3D%220_0_60_60%22_xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg_fill%3D%22none%22_fill-rule%3D%22evenodd%22%3E%3Cg_fill%3D%22%230f766e%22_fill-opacity%3D%220.04%22%3E%3Cpath_d%3D%22M36_34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6_34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6_4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
