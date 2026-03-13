"use client"

import Image from "next/image"
import { SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export function TeamSwitcher() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <a href="#">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <Image
                  src="/man_logo.jpg"
                  alt="Manyazewal Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Manyazewal</span>
                <span className="text-xs text-muted-foreground">Manyazewal Eshetu Gibi</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

