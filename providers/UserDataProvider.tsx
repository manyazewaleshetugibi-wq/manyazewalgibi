'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { UserData, ExtendedUser } from '@/types'

interface UserDataContextType {
  userData: UserData | null
  isLoading: boolean
  error: string | null
  isLoggedIn: boolean
  refetch: () => Promise<void>
  updateUserData: (data: Partial<UserData>) => void
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined)

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const user = session?.user as ExtendedUser | undefined
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = useCallback(async () => {
    if (!user?.id) {
      setUserData(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.get('/users/current')
      
      if (response.data?.data) {
        setUserData(response.data.data)
      } else {
        // Fallback to session data
        setUserData({
          _id: user.id,
          id: user.id,
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: '',
          address: '',
          location: null,
          role: user.role || 'user',
          registrationSource: 'website',
          locationConsent: false,
          createdAt: '',
          updatedAt: '',
          lastLogin: '',
          loginAttempts: 0
        })
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err)
      setError('Could not load user profile data')
      
      // Set minimal user data from session
      if (user) {
        setUserData({
          _id: user.id,
          id: user.id,
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: '',
          address: '',
          location: null,
          role: user.role || 'user',
          registrationSource: 'website',
          locationConsent: false,
          createdAt: '',
          updatedAt: '',
          lastLogin: '',
          loginAttempts: 0
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const updateUserData = useCallback((data: Partial<UserData>) => {
    setUserData(prev => prev ? { ...prev, ...data } : null)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserData()
    } else {
      setUserData(null)
    }
  }, [status, fetchUserData])

  return (
    <UserDataContext.Provider value={{
      userData,
      isLoading,
      error,
      isLoggedIn: !!user,
      refetch: fetchUserData,
      updateUserData
    }}>
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserData() {
  const context = useContext(UserDataContext)
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider')
  }
  return context
}