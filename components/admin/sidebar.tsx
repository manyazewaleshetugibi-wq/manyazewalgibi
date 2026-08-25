"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { ChevronDown, Moon, Sun, Menu, Home, Utensils, Coffee, Users, ClipboardList, BarChart2, Settings, LogOut } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

// Mock data for branches (replace with actual data fetching logic)
const branches = [
  { id: 1, name: "Main Branch" },
  { id: 2, name: "Downtown Cafe" },
  { id: 3, name: "Airport Restaurant" },
]

export function Sidebars() {
  const { data: session } = useSession()
  const [selectedBranch, setSelectedBranch] = React.useState(branches[0])
  const { setTheme, theme } = useTheme()

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Utensils, label: "Restaurant", href: "/restaurant" },
    { icon: Coffee, label: "Cafe", href: "/cafe" },
    { icon: Users, label: "Staff", href: "/staff" },
    { icon: ClipboardList, label: "Inventory", href: "/inventory" },
    { icon: BarChart2, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  return (
    <SidebarProvider>
      <Sidebar className="border-r">
        <SidebarHeader className="border-b px-2">
          <div className="flex items-center justify-between py-2">
            <SidebarTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu />
              </Button>
            </SidebarTrigger>
            <h1 className="text-xl font-bold">eResto</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {theme === "light" ? <Moon /> : <Sun />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-between py-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedBranch.name}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {branches.map((branch) => (
                  <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranch(branch)}>
                    {branch.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <a href={item.href} className="flex items-center">
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || undefined} />
              <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.role || "Staff"}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
          </Button>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  )
}
