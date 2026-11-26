import { BriefcaseBusiness, CircleHelp, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navigationItems } from '../../config/navigation'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  return (
    <>
      {isOpen ? (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-border bg-sidebar px-4 pb-4 pt-5 transition-transform duration-200 md:static md:z-auto md:w-[248px] md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-11 items-center justify-between px-2">
          <NavLink
            aria-label="JobTrack dashboard"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
            onClick={onClose}
            to="/"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              JobTrack
            </span>
          </NavLink>
          <Button
            aria-label="Close navigation menu"
            className="md:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="mt-8 px-3">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Workspace
          </span>
        </div>
        <nav className="mt-3 flex flex-1 flex-col gap-1" aria-label="Workspace">
          {navigationItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                cn(
                  'group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/20',
                  isActive
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
              onClick={onClose}
              to={to}
              end={to === '/'}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      'size-[17px] shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span>{label}</span>
                  {isActive ? (
                    <span className="ml-auto size-1.5 rounded-full bg-primary" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <CircleHelp aria-hidden="true" className="size-4 text-muted-foreground" />
            A calmer job search
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Keep every opportunity and next step in one organized workspace.
          </p>
        </div>
      </aside>
    </>
  )
}
