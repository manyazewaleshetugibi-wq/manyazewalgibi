"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

// Extended item type to support nested items with icons and URLs
interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavItem[]
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }
  
  // Don't render anything if there are no items
  if (!items || items.length === 0) {
    return null;
  }

  // Recursive function to render nested items
  const renderNavItems = (items: NavItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const isActive = pathname === item.url || (item.items?.some(subItem => pathname === subItem.url))
      const hasChildren = item.items && item.items.length > 0

      if (hasChildren) {
        // For items with children
        if (depth === 0) {
          // Top-level collapsible items - wrapped in SidebarMenuItem
          return (
            <SidebarMenuItem key={item.title}>
              <Collapsible
                defaultOpen={item.isActive || isActive}
                className="group/collapsible w-full"
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {renderNavItems(item.items!, depth + 1)}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          )
        } else if (depth === 1) {
          // Second level collapsible items (like SOP) - wrapped in SidebarMenuSubItem
          // For depth 1, we use SidebarMenuSubItem (which is an li)
          return (
            <SidebarMenuSubItem key={item.title}>
              <Collapsible
                defaultOpen={item.isActive || isActive}
                className="group/collapsible w-full"
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuSubButton>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {/* For depth 2 and beyond, use div to avoid nested li elements */}
                  <div className="ml-4 mt-1 space-y-1">
                    {renderNavItems(item.items!, depth + 1)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuSubItem>
          )
        } else {
          // Third level and deeper - use regular div (no li elements)
          return (
            <div key={item.title} className="w-full">
              <Collapsible
                defaultOpen={item.isActive || isActive}
                className="group/collapsible w-full"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 w-full px-2 py-1 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span className="flex-1">{item.title}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 space-y-1">
                    {renderNavItems(item.items!, depth + 1)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )
        }
      }

      // For leaf nodes (no children)
      if (depth === 0) {
        // Top level items
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
              <Link href={item.url} onClick={closeMobileSidebar}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      } else if (depth === 1) {
        // Second level items - use SidebarMenuSubItem (li)
        return (
          <SidebarMenuSubItem key={item.title}>
            <SidebarMenuSubButton asChild isActive={pathname === item.url}>
              <Link href={item.url} onClick={closeMobileSidebar}>
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      } else {
        // Third level and deeper items - use regular div to avoid nested li
        return (
          <div key={item.title} className="w-full">
            <Link href={item.url} onClick={closeMobileSidebar}>
              <div className={`flex items-center gap-2 w-full px-2 py-1 text-sm rounded-md transition-colors ${
                pathname === item.url 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}>
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.title}</span>
              </div>
            </Link>
          </div>
        )
      }
    })
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {renderNavItems(items)}
      </SidebarMenu>
    </SidebarGroup>
  )
}