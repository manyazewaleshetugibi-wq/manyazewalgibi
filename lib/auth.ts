import { getSession } from "next-auth/react"
import { NextApiRequest } from "next"
import { jwtVerify } from "jose"

export async function isAuthenticated(req: NextApiRequest) {
  const session = await getSession({ req })

  if (!session) {
    return false
  }
  try {
    const token = session.user?.id as string
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch (error) {
    console.error("Token verification failed:", error)
    return false
  }
}

export async function hasRole(req: NextApiRequest, role: string) {
  const session = await getSession({ req })

  if (!session || !session.user || !session.user.role) {
    return false
  }

  return session.user.role === role
}

export async function getUser(req: NextApiRequest) {
  const session = await getSession({ req })

  if (!session || !session.user) {
    return null
  }

  return session.user
}
