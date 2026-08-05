'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Stethoscope,
  Tags,
  UserRound,
  Users,
  Wallet,
  Activity,
  BriefcaseMedical,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { initials, studio as studioFallback } from '@/lib/data'
import { fetchStudio } from '@/lib/settings-api'
import { authClient, useSession } from '@/lib/auth/client'
import { cn } from '@/lib/utils'

const agendaSubNav = [
  { title: 'Pilates', href: '/agenda', icon: CalendarDays },
  { title: 'Clínica', href: '/clinica/agenda', icon: Stethoscope },
]

const settingsSubNav = [
  { title: 'Horários', href: '/configuracoes/horarios', icon: Clock },
  { title: 'Planos', href: '/configuracoes/planos', icon: Tags },
  { title: 'Profissionais', href: '/configuracoes/profissionais', icon: UserRound },
  { title: 'Serviços', href: '/configuracoes/servicos', icon: BriefcaseMedical },
  { title: 'Estoque', href: '/configuracoes/estoque', icon: Package },
]

function isAgendaPath(pathname: string) {
  return (
    pathname === '/agenda' ||
    pathname.startsWith('/agenda/') ||
    pathname.startsWith('/clinica/agenda')
  )
}

function isSettingsPath(pathname: string) {
  return (
    pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [studio, setStudio] = useState(studioFallback)
  const [agendaOpen, setAgendaOpen] = useState(() => isAgendaPath(pathname))
  const [settingsOpen, setSettingsOpen] = useState(() =>
    isSettingsPath(pathname),
  )

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

  useEffect(() => {
    if (isAgendaPath(pathname)) setAgendaOpen(true)
    if (isSettingsPath(pathname)) setSettingsOpen(true)
  }, [pathname])

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/'}
                  tooltip="Dashboard"
                  render={
                    <Link href="/">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isAgendaPath(pathname)}
                  tooltip="Agenda"
                  aria-expanded={agendaOpen}
                  onClick={() => setAgendaOpen((open) => !open)}
                >
                  <CalendarDays />
                  <span>Agenda</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto transition-transform',
                      agendaOpen && 'rotate-90',
                    )}
                  />
                </SidebarMenuButton>
                {agendaOpen ? (
                  <SidebarMenuSub>
                    {agendaSubNav.map((item) => {
                      const active =
                        item.href === '/agenda'
                          ? pathname === '/agenda' ||
                            pathname.startsWith('/agenda/')
                          : pathname.startsWith(item.href)
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            isActive={active}
                            render={
                              <Link href={item.href}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            }
                          />
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/alunos')}
                  tooltip="Pessoas"
                  render={
                    <Link href="/alunos">
                      <Users />
                      <span>Pessoas</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/financeiro')}
                  tooltip="Financeiro"
                  render={
                    <Link href="/financeiro">
                      <Wallet />
                      <span>Financeiro</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/configuracoes'}
                  tooltip="Configurações"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((open) => !open)}
                >
                  <Settings />
                  <span>Configurações</span>
                  <ChevronRight
                    className={cn(
                      'ml-auto transition-transform',
                      settingsOpen && 'rotate-90',
                    )}
                  />
                </SidebarMenuButton>
                {settingsOpen ? (
                  <SidebarMenuSub>
                    {settingsSubNav.map((item) => {
                      const active = pathname.startsWith(item.href)
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            isActive={active}
                            render={
                              <Link href={item.href}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            }
                          />
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
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
