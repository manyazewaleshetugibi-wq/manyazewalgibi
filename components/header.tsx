"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Header() {
  const pathname = usePathname()
  const pathSegments = pathname.split("/").filter((segment) => segment !== "")

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      <div className="flex items-center gap-1">
        <Link href="/scan">
          <Button variant="ghost" size="icon" title="Scan QR Code">
            <Scan className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}

