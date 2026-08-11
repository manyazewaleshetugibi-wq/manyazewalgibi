"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { UserRole } from "@/models/User"

export default function RoleBasedContent() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  if (!session?.user?.role) {
    return <div>Error: User role not found</div>
  }

  switch (session.user.role) {
    case UserRole.ADMIN:
      return <AdminContent />
    case UserRole.CUSTOMER:
      return <UserContent />
    default:
      return <div>Error: Unknown user role</div>
  }
}

function AdminContent() {
  return (
    <div className="p-4 bg-red-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
      <p>Welcome, Admin! Here you can manage users and system settings.</p>
    </div>
  )
}

function UserContent() {
  return (
    <div className="p-4 bg-blue-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-2">User Dashboard</h2>
      <p>Welcome, User! Here you can view your profile and account settings.</p>
    </div>
  )
}

