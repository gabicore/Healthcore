'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Wallet,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { initials, studio as studioFallback } from '@/lib/data'
import { fetchStudio } from '@/lib/settings-api'
import { authClient, useSession } from '@/lib/auth/client'

const nav = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Alunos', href: '/alunos', icon: Users },
  { title: 'Agenda', href: '/agenda', icon: CalendarDays },
  { title: 'Campanhas', href: '/campanhas', icon: Megaphone },
  { title: 'Financeiro', href: '/financeiro', icon: Wallet },
  { title: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [studio, setStudio] = useState(studioFallback)

  useEffect(() => {
    let cancelled = false
    fetchStudio()
      .then((data) => {
        if (!cancelled) setStudio(data)
      })
      .catch(() => {
        /* mantém fallback do mock */
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await authClient.signOut()
    document.cookie = 'sf_role=; path=/; max-age=0'
    toast.success('Sessão encerrada')
    router.replace('/login')
    router.refresh()
  }

  const displayName = session?.user?.name || studio.owner
  const displayEmail = session?.user?.email || studio.email

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">HealthCore</span>
            <span className="text-xs text-muted-foreground">
              {studio.name}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {displayEmail}
            </span>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
