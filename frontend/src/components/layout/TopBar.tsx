import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { navigationItems } from '../../config/navigation'
import { Button } from '../ui/Button'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation()
  const currentPage = navigationItems.find(
    (item) => item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to)),
  )

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-border bg-card/90 px-4 backdrop-blur sm:px-7 lg:px-9">
      <Button
        aria-label="Open navigation menu"
        className="mr-3 md:hidden"
        onClick={onMenuClick}
        size="icon"
        variant="ghost"
      >
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Workspace</span>
          <span aria-hidden="true" className="hidden text-border sm:inline">
            /
          </span>
          <span className="truncate font-medium text-foreground">
            {currentPage?.label ?? 'Not found'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
          Your job search workspace
        </p>
      </div>
      <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <span className="size-1.5 rounded-full bg-success" />
        Your progress, in one place
      </div>
    </header>
  )
}
