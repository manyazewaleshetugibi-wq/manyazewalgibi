"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import axios from 'axios'
import {
  Sparkles,
  Gift,
  Cake,
  Calendar,
  Users,
  Trophy,
  Star,
  Crown,
  Heart,
  PartyPopper,
  Zap,
  Award,
  Clock,
  Coins,
  Flame,
  RotateCw,
  Volume2,
  VolumeX,
  Settings,
  Download,
  Share2,
  History,
  CheckCircle,
  XCircle,
  Target,
  User,
  Dice5,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  CalendarDays,
  Loader2,
  RefreshCw,
  AlertCircle,
  Info,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  Fingerprint,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "react-hot-toast"

// API client setup
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout - please try again'));
    }
    return Promise.reject(error);
  }
);

interface Employee {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  birthDate: string | null
  birthMonth: number | null
  birthDay: number | null
  formattedBirthDate: string
  gender: string
  address: string
  city: string
  location?: {
    type: string
    coordinates: [number, number]
  } | null
  locationConsent: boolean
  avatar?: string
  initials: string
  department: string
  joinDate: string
  isActive: boolean
  lotteryTickets: number
  hasWonThisMonth: boolean
  lastWinDate?: string
  totalWins: number
  points: number
  registrationSource: string
  lastLogin: string | null
  loginAttempts: number
  createdAt: string
  updatedAt: string
  __v?: number
}

interface LotteryWinner {
  id: string
  employeeId: string
  employeeName: string
  prize: string
  winDate: string
  month: string
  prizeValue: number
  claimed: boolean
  createdAt?: string
}

interface LotteryPrize {
  id: string
  name: string
  value: number
  icon: React.ElementType
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  probability: number
  description: string
  gradient: string
  textColor: string
  isActive: boolean
  totalWon?: number
}

interface SpinResult {
  winner: Employee
  prize: LotteryPrize
  spinAngle: number
  timestamp: string
  spinDuration: number
}

interface LotteryStats {
  totalSpins: number
  jackpotValue: number
  totalWinners: number
  monthWinners: number
  monthPrizeValue: number
  totalParticipants: number
  activeParticipants: number
}

interface WheelSegment extends LotteryPrize {
  startAngle: number
  endAngle: number
  segmentAngle: number
  centerAngle: number
  index: number
}

interface MonthData {
  name: string
  value: number
  emoji: string
  days: number
  count: number
  employees: Employee[]
}

const BIRTHDAY_MONTHS: MonthData[] = [
  { name: "January", value: 1, emoji: "❄️", days: 31, count: 0, employees: [] },
  { name: "February", value: 2, emoji: "💝", days: 29, count: 0, employees: [] },
  { name: "March", value: 3, emoji: "🍀", days: 31, count: 0, employees: [] },
  { name: "April", value: 4, emoji: "🌸", days: 30, count: 0, employees: [] },
  { name: "May", value: 5, emoji: "🌻", days: 31, count: 0, employees: [] },
  { name: "June", value: 6, emoji: "☀️", days: 30, count: 0, employees: [] },
  { name: "July", value: 7, emoji: "🏖️", days: 31, count: 0, employees: [] },
  { name: "August", value: 8, emoji: "🌊", days: 31, count: 0, employees: [] },
  { name: "September", value: 9, emoji: "🍂", days: 30, count: 0, employees: [] },
  { name: "October", value: 10, emoji: "🎃", days: 31, count: 0, employees: [] },
  { name: "November", value: 11, emoji: "🍁", days: 30, count: 0, employees: [] },
  { name: "December", value: 12, emoji: "🎄", days: 31, count: 0, employees: [] }
]

// Icon mapping for prize icons
const ICON_MAP: Record<string, React.ElementType> = {
  Gift, Cake, Calendar, Crown, Heart, Sparkles, Zap, Coins, Users, Trophy, Star
}

export default function BirthdayLotteryPage() {
  const [allParticipants, setAllParticipants] = useState<Employee[]>([])
  const [participants, setParticipants] = useState<Employee[]>([])
  const [winners, setWinners] = useState<LotteryWinner[]>([])
  const [prizes, setPrizes] = useState<LotteryPrize[]>([])
  const [stats, setStats] = useState<LotteryStats>({
    totalSpins: 0,
    jackpotValue: 1000,
    totalWinners: 0,
    monthWinners: 0,
    monthPrizeValue: 0,
    totalParticipants: 0,
    activeParticipants: 0
  })
  const [monthsData, setMonthsData] = useState<MonthData[]>(BIRTHDAY_MONTHS)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPrizes, setIsLoadingPrizes] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingWinners, setIsLoadingWinners] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<Employee | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinAngle, setSpinAngle] = useState(0)
  const [spinDuration, setSpinDuration] = useState(3)
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [spinStage, setSpinStage] = useState<'select-winner' | 'select-prize'>('select-winner')
  const [isSelectingWinner, setIsSelectingWinner] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [wheelScale, setWheelScale] = useState(1)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [totalProbability, setTotalProbability] = useState(0)
  
  const wheelRef = useRef<HTMLDivElement>(null)
  const spinAudioRef = useRef<HTMLAudioElement | null>(null)
  const winAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio
  useEffect(() => {
    spinAudioRef.current = new Audio('/sounds/spin.mp3')
    winAudioRef.current = new Audio('/sounds/win.mp3')
    
    // Handle audio errors silently
    spinAudioRef.current.onerror = () => console.log('Spin sound not available')
    winAudioRef.current.onerror = () => console.log('Win sound not available')
  }, [])

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (allParticipants.length > 0) {
      filterParticipantsByMonth(selectedMonth)
      updateMonthsData()
    }
  }, [selectedMonth, allParticipants])

  const fetchAllData = async () => {
    await Promise.all([
      fetchAllParticipants(),
      fetchPrizes(),
      fetchWinners(),
      fetchStats()
    ])
  }

  const fetchAllParticipants = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.get(`/lottery/participants?active=true`)
      
      if (response.data?.success) {
        setAllParticipants(response.data.data || [])
        filterParticipantsByMonth(selectedMonth)
        updateMonthsDataWithParticipants(response.data.data || [])
      } else {
        setAllParticipants([])
      }
    } catch (err: any) {
      console.error('Error fetching participants:', err)
      setError('Failed to load lottery participants')
      toast.error('Failed to load participants')
      setAllParticipants([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPrizes = async () => {
    try {
      setIsLoadingPrizes(true)
      const response = await api.get('/lottery/prizes?active=true')
      
      if (response.data?.success) {
        // Map string icons to actual components
        const mappedPrizes = response.data.data.map((prize: any) => ({
          ...prize,
          icon: ICON_MAP[prize.icon] || Gift
        }))
        setPrizes(mappedPrizes)
        
        // Calculate total probability
        const total = mappedPrizes.reduce((sum: number, p: LotteryPrize) => sum + p.probability, 0)
        setTotalProbability(total)
        
        if (total !== 100) {
          console.warn(`Total probability is ${total}%, should be 100%`)
        }
      }
    } catch (err) {
      console.error('Error fetching prizes:', err)
      toast.error('Failed to load prizes')
    } finally {
      setIsLoadingPrizes(false)
    }
  }

  const updateMonthsDataWithParticipants = (participantsList: Employee[]) => {
    const updatedMonths = BIRTHDAY_MONTHS.map(month => {
      const monthEmployees = participantsList.filter(p => p.birthMonth === month.value && p.isActive)
      return {
        ...month,
        count: monthEmployees.length,
        employees: monthEmployees
      }
    })
    setMonthsData(updatedMonths)
  }

  const filterParticipantsByMonth = (month: number) => {
    const filtered = allParticipants.filter(p => p.birthMonth === month && p.isActive)
    setParticipants(filtered)
  }

  const updateMonthsData = () => {
    setMonthsData(prev => prev.map(month => ({
      ...month,
      count: allParticipants.filter(p => p.birthMonth === month.value && p.isActive).length
    })))
  }

  const fetchWinners = async () => {
    try {
      setIsLoadingWinners(true)
      const currentYear = new Date().getFullYear()
      const response = await api.get(`/lottery/winners?year=${currentYear}`)
      
      if (response.data?.success) {
        setWinners(response.data.data || [])
      } else {
        setWinners([])
      }
    } catch (err) {
      console.error('Error fetching winners:', err)
      setWinners([])
    } finally {
      setIsLoadingWinners(false)
    }
  }

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true)
      const response = await api.get(`/lottery/stats`)
      
      if (response.data?.success) {
        setStats(response.data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const saveWinner = async (winner: Employee, prize: LotteryPrize) => {
    try {
      const currentYear = new Date().getFullYear()
      const monthStr = `${currentYear}-${selectedMonth.toString().padStart(2, '0')}`
      
      const winnerData = {
        employeeId: winner.id,
        employeeName: winner.name,
        prize: prize.name,
        winDate: new Date().toISOString().split('T')[0],
        month: monthStr,
        prizeValue: prize.value,
        claimed: false
      }
      
      const response = await api.post('/lottery/winners', winnerData)
      
      if (response.data?.success) {
        setWinners(prev => [response.data.data, ...prev])
        
        // Update participant data
        await api.patch(`/lottery/participants/${winner.id}`, {
          hasWonThisMonth: true,
          lastWinDate: new Date().toISOString().split('T')[0],
          totalWins: (winner.totalWins || 0) + 1,
          points: (winner.points || 0) + prize.value,
          lotteryTickets: Math.max(0, (winner.lotteryTickets || 1) - 1)
        })
        
        // Update local state
        setAllParticipants(prev => prev.map(p => 
          p.id === winner.id 
            ? { 
                ...p, 
                hasWonThisMonth: true,
                lastWinDate: new Date().toISOString().split('T')[0],
                totalWins: p.totalWins + 1,
                points: p.points + prize.value,
                lotteryTickets: Math.max(0, p.lotteryTickets - 1)
              }
            : p
        ))
        
        setParticipants(prev => prev.map(p => 
          p.id === winner.id 
            ? { 
                ...p, 
                hasWonThisMonth: true,
                lastWinDate: new Date().toISOString().split('T')[0],
                totalWins: p.totalWins + 1,
                points: p.points + prize.value,
                lotteryTickets: Math.max(0, p.lotteryTickets - 1)
              }
            : p
        ))
        
        fetchStats()
      }
    } catch (err) {
      console.error('Error saving winner:', err)
      toast.error('Failed to save winner data')
      throw err
    }
  }

  const claimPrize = async (winnerId: string) => {
    try {
      const response = await api.patch(`/lottery/winners/${winnerId}`, {
        claimed: true
      })
      
      if (response.data?.success) {
        setWinners(prev => prev.map(w => 
          w.id === winnerId ? { ...w, claimed: true } : w
        ))
        toast.success("Prize claimed successfully!")
      }
    } catch (err) {
      console.error('Error claiming prize:', err)
      toast.error('Failed to claim prize')
    }
  }

  const eligibleEmployees = useMemo(() => {
    return participants.filter(emp => emp.isActive)
  }, [participants])

  const currentMonthName = useMemo(() => {
    return BIRTHDAY_MONTHS.find(m => m.value === selectedMonth)?.name || 'Unknown'
  }, [selectedMonth])

  const currentMonthEmoji = useMemo(() => {
    return BIRTHDAY_MONTHS.find(m => m.value === selectedMonth)?.emoji || '🎂'
  }, [selectedMonth])

  const calculateOdds = useCallback((employee: Employee) => {
    const baseOdds = 10
    const ticketBonus = (employee.lotteryTickets || 1) * 2
    const winPenalty = employee.hasWonThisMonth ? -20 : 0
    const pointsBonus = Math.floor((employee.points || 0) / 50)
    
    let seniorityBonus = 0
    if (employee.joinDate) {
      const joinYear = new Date(employee.joinDate).getFullYear()
      const currentYear = new Date().getFullYear()
      seniorityBonus = (currentYear - joinYear) * 2
    }
    
    return Math.max(1, Math.min(50, baseOdds + ticketBonus + winPenalty + pointsBonus + seniorityBonus))
  }, [])

  const wheelSegments = useMemo((): WheelSegment[] => {
    if (prizes.length === 0) return []
    
    const segments: WheelSegment[] = []
    const totalProb = prizes.reduce((sum, prize) => sum + prize.probability, 0)
    let currentAngle = 0

    prizes.forEach((prize, index) => {
      const angle = (prize.probability / totalProb) * 360
      segments.push({
        ...prize,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        segmentAngle: angle,
        centerAngle: currentAngle + angle / 2,
        index: index
      })
      currentAngle += angle
    })

    return segments
  }, [prizes])

  const getBirthdayCountByDay = useMemo(() => {
    const counts: Record<number, number> = {}
    eligibleEmployees.forEach(emp => {
      if (emp.birthDay) {
        counts[emp.birthDay] = (counts[emp.birthDay] || 0) + 1
      }
    })
    return counts
  }, [eligibleEmployees])

  const totalBirthdaysThisMonth = useMemo(() => {
    return eligibleEmployees.length
  }, [eligibleEmployees])

  const totalCustomers = useMemo(() => {
    return allParticipants.length
  }, [allParticipants])

  const activeCustomers = useMemo(() => {
    return allParticipants.filter(p => p.isActive).length
  }, [allParticipants])

  const selectBirthdayWinner = () => {
    if (eligibleEmployees.length === 0) {
      toast.error("No employees have birthdays this month!")
      return
    }

    if (prizes.length === 0) {
      toast.error("No prizes available! Please add prizes first.")
      return
    }

    if (selectedEmployee) {
      setSpinStage('select-prize')
      toast.success(`Ready to spin for ${selectedEmployee.name}'s prize!`)
      return
    }

    setIsSelectingWinner(true)
    
    let duration = 2000
    let interval = 100
    let elapsed = 0
    
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleEmployees.length)
      setSelectedEmployee(eligibleEmployees[randomIndex])
      
      elapsed += interval
      if (elapsed >= duration) {
        clearInterval(timer)
        
        const weightedEmployees = eligibleEmployees.map(emp => ({
          ...emp,
          weight: calculateOdds(emp)
        }))

        const totalWeight = weightedEmployees.reduce((sum, emp) => sum + emp.weight, 0)
        let random = Math.random() * totalWeight
        let winner = weightedEmployees[0]

        for (const emp of weightedEmployees) {
          random -= emp.weight
          if (random <= 0) {
            winner = emp
            break
          }
        }

        setSelectedEmployee(winner)
        setIsSelectingWinner(false)
        setSpinStage('select-prize')
        toast.success(`${winner.name} selected! Now spin for their prize.`)
      }
    }, interval)
  }

  const spinForPrize = async () => {
    if (!selectedEmployee) {
      toast.error("Please select a birthday winner first!")
      return
    }

    if (prizes.length === 0) {
      toast.error("No prizes available!")
      return
    }

    if (isSpinning) return

    setIsSpinning(true)
    setShowResult(false)

    if (isSoundEnabled && spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0
      spinAudioRef.current.play().catch(() => {})
    }

    // Select prize based on probability
    const totalProb = prizes.reduce((sum, prize) => sum + prize.probability, 0)
    let random = Math.random() * totalProb
    let selectedPrize = prizes[0]
    let accumulatedProbability = 0

    for (const prize of prizes) {
      accumulatedProbability += prize.probability
      if (random <= accumulatedProbability) {
        selectedPrize = prize
        break
      }
    }

    const prizeSegment = wheelSegments.find(seg => seg.id === selectedPrize.id)
    const spins = 5 + Math.random() * 3
    const targetAngle = spins * 360 + (prizeSegment?.centerAngle || 180)
    const startTime = Date.now()

    setWheelScale(1.02)

    const animateSpin = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (spinDuration * 1000), 1)
      
      const easeOut = progress < 0.9 
        ? 1 - Math.pow(1 - progress, 3)
        : 1 - Math.pow(1 - progress, 4) + Math.sin(progress * Math.PI * 4) * 0.1
      
      const currentAngle = easeOut * targetAngle
      
      setSpinAngle(currentAngle)

      if (progress < 0.8) {
        const wobble = Math.sin(elapsed / 50) * 0.01
        setWheelScale(1.02 + wobble)
      } else {
        setWheelScale(1)
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin)
      } else {
        const result: SpinResult = {
          winner: selectedEmployee,
          prize: selectedPrize,
          spinAngle: targetAngle % 360,
          timestamp: new Date().toISOString(),
          spinDuration: elapsed
        }
        
        setSpinResult(result)
        setIsSpinning(false)

        if (isSoundEnabled && winAudioRef.current) {
          winAudioRef.current.currentTime = 0
          winAudioRef.current.play().catch(() => {})
        }

        saveWinner(selectedEmployee, selectedPrize).then(() => {
          setStats(prev => ({
            ...prev,
            totalSpins: prev.totalSpins + 1,
            jackpotValue: prev.jackpotValue - selectedPrize.value,
            monthWinners: prev.monthWinners + 1,
            monthPrizeValue: prev.monthPrizeValue + selectedPrize.value
          }))
        })

        setSpinStage('select-winner')
        setSelectedEmployee(null)

        setTimeout(() => {
          setShowResult(true)
          triggerConfetti()
          
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-yellow-500" />
                <span className="font-bold">Congratulations!</span>
              </div>
              <span>{selectedEmployee.name} won {selectedPrize.name}!</span>
            </div>,
            { duration: 5000 }
          )
        }, 1000)
      }
    }

    requestAnimationFrame(animateSpin)
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    })

    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.6 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1']
      })
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.6 },
        colors: ['#96ceb4', '#ffeaa7', '#d45087']
      })
    }, 250)

    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.3 },
        colors: ['#fdcb6e', '#e17055', '#00cec9']
      })
    }, 500)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300'
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300'
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Star className="h-3 w-3" />
      case 'rare': return <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
      case 'epic': return <Star className="h-3 w-3 fill-purple-500 text-purple-500" />
      case 'legendary': return <Crown className="h-3 w-3 text-yellow-500" />
      default: return <Star className="h-3 w-3" />
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                🎂 Birthday Fortune Wheel 🎂
              </h1>
              <p className="text-gray-300 mt-2">
                Two-step lottery: First select birthday winner, then spin for their prize!
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
              >
                {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHistory(true)}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                onClick={fetchAllData}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {isLoadingStats ? (
              [...Array(4)].map((_, idx) => (
                <Card key={idx} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2 bg-gray-700" />
                    <Skeleton className="h-8 w-16 bg-gray-700" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Total Customers</p>
                        <p className="text-2xl font-bold text-white">{totalCustomers}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Active Customers</p>
                        <p className="text-2xl font-bold text-white">{activeCustomers}</p>
                      </div>
                      <User className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Total Spins</p>
                        <p className="text-2xl font-bold text-white">{stats.totalSpins}</p>
                      </div>
                      <Flame className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/20 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Jackpot Value</p>
                        <p className="text-2xl font-bold text-white">${stats.jackpotValue}</p>
                      </div>
                      <Coins className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Prize Probability Warning */}
          {prizes.length > 0 && totalProbability !== 100 && (
            <div className="mt-4 bg-yellow-900/30 border border-yellow-800 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Warning: Total prize probability is {totalProbability}%. It should be 100% for fair spins.</span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800/50 border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
            <TabsTrigger value="birthdays" className="data-[state=active]:bg-gray-700">Birthdays</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-gray-700">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Month Selection Grid */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CalendarDays className="h-5 w-5 text-blue-400" />
                  Birthday Months Overview
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Total customers: {totalCustomers} | Active: {activeCustomers}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {monthsData.map((month) => (
                    <Button
                      key={month.value}
                      variant={selectedMonth === month.value ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMonth(month.value)
                        setActiveTab("birthdays")
                      }}
                      className={`h-auto py-4 px-2 flex-col gap-2 relative transition-all ${
                        selectedMonth === month.value 
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-0' 
                          : 'border-gray-700 bg-gray-900/50 hover:bg-gray-800/50'
                      }`}
                    >
                      {month.count > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white border-0">
                          {month.count}
                        </Badge>
                      )}
                      <span className="text-3xl">{month.emoji}</span>
                      <span className="text-sm font-medium">{month.name.slice(0, 3)}</span>
                      <span className="text-xs text-gray-400">
                        {month.count} {month.count === 1 ? 'person' : 'people'}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Winners */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Recent Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {isLoadingWinners ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full bg-gray-800" />
                      ))}
                    </div>
                  ) : winners.length > 0 ? (
                    <div className="space-y-3">
                      {winners.slice(0, 10).map((winner) => (
                        <div key={winner.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{winner.employeeName}</p>
                              <p className="text-xs text-gray-400">{formatDate(winner.winDate)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-yellow-400">{winner.prize}</p>
                            <p className="text-xs text-gray-400">${winner.prizeValue}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No winners yet</p>
                      <p className="text-sm mt-1">Start spinning to see winners here!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="birthdays" className="space-y-6">
            {/* Current Month Header */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-800 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl">
                      {currentMonthEmoji}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{currentMonthName} Birthdays</h2>
                      <div className="flex items-center gap-4 mt-2 text-gray-300">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {totalBirthdaysThisMonth} celebrating
                        </span>
                        <span className="flex items-center gap-1">
                          <Cake className="h-4 w-4" />
                          {Object.keys(getBirthdayCountByDay).length} different days
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
                        setSelectedMonth(prevMonth)
                      }}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
                        setSelectedMonth(nextMonth)
                      }}
                      className="border-gray-600 hover:bg-gray-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Wheel and Controls */}
              <div className="lg:col-span-2 space-y-6">
                {/* Lottery Stage Indicator */}
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Target className="h-5 w-5 text-purple-400" />
                      Lottery Stage
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Two-step process: Select winner → Spin for prize
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center">
                      <div className="relative w-full max-w-2xl">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-700 -translate-y-1/2"></div>
                        <div 
                          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 -translate-y-1/2 transition-all duration-300"
                          style={{ width: spinStage === 'select-winner' ? '50%' : '100%' }}
                        ></div>

                        <div className="relative flex flex-col items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 z-10 transition-all ${
                            spinStage === 'select-winner' 
                              ? 'bg-gradient-to-br from-blue-600 to-purple-600 scale-110' 
                              : selectedEmployee ? 'bg-green-600' : 'bg-gray-700'
                          }`}>
                            {spinStage === 'select-winner' ? (
                              <Users className="h-5 w-5 text-white" />
                            ) : selectedEmployee ? (
                              <CheckCircle className="h-5 w-5 text-white" />
                            ) : (
                              <Users className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="text-center">
                            <p className={`font-medium ${
                              spinStage === 'select-winner' ? 'text-white' : 
                              selectedEmployee ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              Select Birthday Winner
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {eligibleEmployees.length} eligible
                            </p>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 flex flex-col items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 z-10 transition-all ${
                            spinStage === 'select-prize' 
                              ? 'bg-gradient-to-br from-blue-600 to-purple-600 scale-110' 
                              : selectedEmployee ? 'bg-green-600' : 'bg-gray-700'
                          }`}>
                            {spinStage === 'select-prize' ? (
                              <Sparkles className="h-5 w-5 text-white" />
                            ) : selectedEmployee ? (
                              <CheckCircle className="h-5 w-5 text-white" />
                            ) : (
                              <Gift className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="text-center">
                            <p className={`font-medium ${
                              spinStage === 'select-prize' ? 'text-white' : 
                              selectedEmployee ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              Spin for Prize
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedEmployee ? 'Ready!' : 'Select winner first'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        onClick={selectBirthdayWinner}
                        disabled={eligibleEmployees.length === 0 || isSelectingWinner || isLoading || prizes.length === 0}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0"
                      >
                        {isSelectingWinner ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Selecting Winner...
                          </>
                        ) : selectedEmployee ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Winner Selected: {selectedEmployee.name}
                          </>
                        ) : prizes.length === 0 ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            No Prizes Available
                          </>
                        ) : (
                          <>
                            <Dice5 className="h-4 w-4 mr-2" />
                            Select Random Birthday Winner
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={spinForPrize}
                        disabled={!selectedEmployee || isSpinning || isSelectingWinner || prizes.length === 0}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                      >
                        {isSpinning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Spinning...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Spin for Prize
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lottery Wheel */}
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                          Prize Wheel of Fortune
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                          {spinStage === 'select-winner' ? 'SELECT WINNER FIRST' : 'READY TO SPIN!'}
                        </Badge>
                        {selectedEmployee && (
                          <Badge variant="outline" className="border-green-600 text-green-400">
                            <User className="h-3 w-3 mr-1" />
                            {selectedEmployee.name.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {isLoadingPrizes ? (
                        "Loading prizes..."
                      ) : prizes.length === 0 ? (
                        "No prizes available. Please add prizes first."
                      ) : selectedEmployee ? (
                        `Spinning for ${selectedEmployee.name}'s birthday prize!` 
                      ) : (
                        'Select a birthday winner to spin the wheel'
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPrizes ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                      </div>
                    ) : prizes.length > 0 ? (
                      <div className="relative flex flex-col items-center justify-center">
                        <div className="relative w-full max-w-lg aspect-square">
                          <motion.div
                            ref={wheelRef}
                            className="absolute inset-8 rounded-full border-4 border-gray-800 shadow-2xl overflow-hidden"
                            animate={{ 
                              rotate: spinAngle,
                              scale: wheelScale
                            }}
                            transition={{ 
                              duration: spinDuration, 
                              ease: [0.23, 1, 0.32, 1]
                            }}
                            style={{
                              background: `conic-gradient(${wheelSegments.map((seg, i) => 
                                `${seg.color} ${seg.startAngle}deg ${seg.endAngle}deg`
                              ).join(', ')})`,
                              boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5)'
                            }}
                          >
                            {wheelSegments.map((segment) => {
                              const rad = (segment.centerAngle * Math.PI) / 180
                              const radius = 35
                              const x = 50 + radius * Math.cos(rad)
                              const y = 50 + radius * Math.sin(rad)
                              
                              return (
                                <div
                                  key={segment.id}
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                  style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    transform: `translate(-50%, -50%) rotate(${segment.centerAngle + 90}deg)`,
                                  }}
                                >
                                  <div className={`px-2 py-1 rounded-md ${segment.textColor} text-[10px] font-bold whitespace-nowrap backdrop-blur-sm bg-black/40 border border-white/20 shadow-lg`}>
                                    {segment.name}
                                  </div>
                                </div>
                              )
                            })}

                            {wheelSegments.map((segment) => {
                              const rad = (segment.centerAngle * Math.PI) / 180
                              const radius = 25
                              const x = 50 + radius * Math.cos(rad)
                              const y = 50 + radius * Math.sin(rad)
                              
                              return (
                                <div
                                  key={`icon-${segment.id}`}
                                  className="absolute"
                                  style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    transform: `translate(-50%, -50%) rotate(${segment.centerAngle + 90}deg)`,
                                  }}
                                >
                                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                                    <segment.icon className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )
                            })}
                          </motion.div>

                          <motion.div 
                            className="absolute inset-0 flex items-center justify-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <button
                              onClick={spinForPrize}
                              disabled={isSpinning || !selectedEmployee || isSelectingWinner}
                              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 group"
                              style={{
                                boxShadow: '0 0 40px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)'
                              }}
                            >
                              <div className="relative z-10 flex flex-col items-center justify-center">
                                {isSpinning ? (
                                  <>
                                    <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
                                    <span className="text-xs md:text-sm font-bold text-white mt-1">SPINNING...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white group-hover:scale-110 transition-transform" />
                                    <span className="text-xs md:text-sm font-bold text-white mt-1">SPIN!</span>
                                  </>
                                )}
                              </div>
                            </button>
                          </motion.div>

                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
                            <div className="relative">
                              <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[40px] border-l-transparent border-r-transparent border-b-red-500"></div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 space-y-4 w-full max-w-md">
                          <div className="flex items-center justify-between">
                            <span className="text-white">Spin Speed: {spinDuration}s</span>
                            <Slider
                              min={1}
                              max={10}
                              step={0.5}
                              value={[spinDuration]}
                              onValueChange={([value]) => setSpinDuration(value)}
                              disabled={isSpinning}
                              className="w-48"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No prizes available</p>
                        <p className="text-sm mt-1">Please add prizes in the admin panel</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Participants List */}
              <div className="space-y-6">
                {selectedEmployee && (
                  <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Cake className="h-5 w-5 text-pink-400" />
                        Birthday Winner
                      </CardTitle>
                      <CardDescription className="text-blue-300">
                        Ready to spin for their birthday prize!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/30 border border-blue-800">
                          <Avatar className="h-12 w-12 border-2 border-blue-500">
                            {selectedEmployee.avatar ? (
                              <AvatarImage src={selectedEmployee.avatar} alt={selectedEmployee.name} />
                            ) : null}
                            <AvatarFallback className="bg-blue-900 text-blue-300">
                              {selectedEmployee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-bold text-white">{selectedEmployee.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-blue-300">
                              <span>{selectedEmployee.department}</span>
                              <span>•</span>
                              <span>Birthday: {selectedEmployee.birthDay}th</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEmployee(null)
                              setSpinStage('select-winner')
                              toast.success("Winner selection cleared!")
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                            <p className="text-sm text-gray-400">Win Chance</p>
                            <p className="text-2xl font-bold text-white">{calculateOdds(selectedEmployee)}%</p>
                          </div>
                          <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                            <p className="text-sm text-gray-400">Tickets</p>
                            <p className="text-2xl font-bold text-white">{selectedEmployee.lotteryTickets}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Cake className="h-5 w-5 text-pink-400" />
                      {currentMonthName} Birthdays
                      <Badge variant="outline" className="ml-2 border-pink-600 text-pink-400">
                        {eligibleEmployees.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Employees celebrating birthdays this month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {isLoading ? (
                        <div className="space-y-3 pr-4">
                          {[...Array(5)].map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-700">
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32 bg-gray-700" />
                                  <Skeleton className="h-3 w-24 bg-gray-700" />
                                </div>
                              </div>
                              <Skeleton className="h-6 w-16 bg-gray-700" />
                            </div>
                          ))}
                        </div>
                      ) : eligibleEmployees.length > 0 ? (
                        <div className="space-y-3 pr-4">
                          {eligibleEmployees.map((employee) => {
                            const isSelected = selectedEmployee?.id === employee.id
                            return (
                              <div 
                                key={employee.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-blue-900/30 border-blue-600' 
                                    : 'border-gray-700 hover:bg-gray-700/50'
                                }`}
                                onClick={() => {
                                  if (spinStage === 'select-winner') {
                                    setSelectedEmployee(employee)
                                    setSpinStage('select-prize')
                                    toast.success(`${employee.name} selected!`)
                                  }
                                }}
                                onDoubleClick={() => setSelectedUserForDetails(employee)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    {employee.avatar ? (
                                      <AvatarImage src={employee.avatar} alt={employee.name} />
                                    ) : null}
                                    <AvatarFallback className={isSelected ? 'bg-blue-900 text-blue-300' : 'bg-gray-700'}>
                                      {employee.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className={`font-medium text-sm ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                                      {employee.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span>{employee.department}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {employee.birthDay}th
                                      </span>
                                    </div>
                                    {employee.phone && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        📞 {employee.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {calculateOdds(employee)}%
                                  </Badge>
                                  {employee.hasWonThisMonth && (
                                    <Badge className="bg-green-900/30 text-green-400 border-green-700 text-[10px]">
                                      Won
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Cake className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No birthdays this month</p>
                          <p className="text-sm mt-1">Select a different month to see birthday celebrations</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Customer Statistics</CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed breakdown of all customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Total Customers</p>
                    <p className="text-3xl font-bold text-white">{totalCustomers}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Active Customers</p>
                    <p className="text-3xl font-bold text-green-400">{activeCustomers}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Inactive Customers</p>
                    <p className="text-3xl font-bold text-gray-400">{totalCustomers - activeCustomers}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-3">Birthday Distribution</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {monthsData.map((month) => (
                    <div key={month.value} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 text-center">
                      <span className="text-2xl block mb-1">{month.emoji}</span>
                      <p className="text-xs text-gray-400">{month.name.slice(0, 3)}</p>
                      <p className="text-lg font-bold text-blue-400">{month.count}</p>
                    </div>
                  ))}
                </div>

                {/* Prize Statistics */}
                {prizes.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-3 mt-6">Prize Distribution</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {prizes.map((prize) => (
                        <div key={prize.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <prize.icon className="h-4 w-4" style={{ color: prize.color }} />
                            <p className="text-sm font-medium text-white truncate">{prize.name}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Value:</span>
                              <span className="text-yellow-400">${prize.value}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Chance:</span>
                              <span className="text-blue-400">{prize.probability}%</span>
                            </div>
                            {prize.totalWon ? (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Won:</span>
                                <span className="text-green-400">{prize.totalWon}x</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Result Dialog */}
      <AnimatePresence>
        {showResult && spinResult && (
          <Dialog open={showResult} onOpenChange={setShowResult}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col border-0 bg-gradient-to-br from-gray-900 to-gray-800 p-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
              
              <DialogHeader className="relative z-10 p-6 pb-0">
                <DialogTitle className="flex items-center gap-3 text-3xl text-center justify-center">
                  <PartyPopper className="h-8 w-8 text-yellow-500 animate-bounce" />
                  <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                    🎉 BIRTHDAY WINNER! 🎉
                  </span>
                  <PartyPopper className="h-8 w-8 text-yellow-500 animate-bounce delay-150" />
                </DialogTitle>
                <DialogDescription className="text-lg text-center text-gray-300">
                  Happy Birthday {spinResult.winner.name}!
                </DialogDescription>
              </DialogHeader>

              <div className="relative z-10 overflow-y-auto flex-1 p-6 space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl">
                      {spinResult.winner.avatar ? (
                        <AvatarImage src={spinResult.winner.avatar} alt={spinResult.winner.name} />
                      ) : null}
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-600 to-pink-600">
                        {spinResult.winner.initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {spinResult.winner.name}
                      </h3>
                      <div className="flex items-center justify-center gap-3 mt-2 text-gray-300">
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          {spinResult.winner.department}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Cake className="h-4 w-4" />
                          Birthday: {spinResult.winner.birthDay}th
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm ${getRarityColor(spinResult.prize.rarity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${spinResult.prize.color} shadow-lg`}>
                        <spinResult.prize.icon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">{spinResult.prize.name}</h4>
                        <p className="text-sm text-muted-foreground">{spinResult.prize.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        ${spinResult.prize.value}
                      </div>
                      <Badge className={`mt-2 ${getRarityColor(spinResult.prize.rarity)} flex items-center gap-1`}>
                        {getRarityIcon(spinResult.prize.rarity)}
                        <span className="capitalize">{spinResult.prize.rarity} Prize</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Spin Time", value: `${(spinResult.spinDuration / 1000).toFixed(2)}s`, icon: <Clock className="h-4 w-4" /> },
                    { label: "Win Chance", value: `${calculateOdds(spinResult.winner)}%`, icon: <Target className="h-4 w-4" /> },
                    { label: "Total Wins", value: spinResult.winner.totalWins, icon: <Trophy className="h-4 w-4" /> }
                  ].map((stat, idx) => (
                    <div key={idx} className="text-center p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                      <div className="flex items-center justify-center gap-2 text-gray-400 mb-1">
                        {stat.icon}
                        <p className="text-sm">{stat.label}</p>
                      </div>
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="relative z-10 flex-col sm:flex-row gap-2 p-6 pt-0">
                <Button 
                  variant="outline" 
                  onClick={() => setShowResult(false)}
                  className="border-gray-600 hover:bg-gray-800 flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Birthday Lottery Winner!',
                        text: `🎉 Congratulations to ${spinResult.winner.name} for winning ${spinResult.prize.name}!`,
                        url: window.location.href
                      })
                    } else {
                      navigator.clipboard.writeText(
                        `🎉 Congratulations to ${spinResult.winner.name} for winning ${spinResult.prize.name}!`
                      )
                      toast.success('Result copied to clipboard!')
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  onClick={() => {
                    const winner = winners.find(w => w.employeeId === spinResult.winner.id)
                    if (winner) {
                      claimPrize(winner.id)
                      setShowResult(false)
                    }
                  }} 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Claim Prize
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUserForDetails} onOpenChange={() => setSelectedUserForDetails(null)}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Customer Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete profile information
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForDetails && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-blue-500">
                    {selectedUserForDetails.avatar ? (
                      <AvatarImage src={selectedUserForDetails.avatar} alt={selectedUserForDetails.name} />
                    ) : null}
                    <AvatarFallback className="bg-blue-900 text-blue-300 text-lg">
                      {selectedUserForDetails.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedUserForDetails.name}</h3>
                    <p className="text-sm text-gray-400">{selectedUserForDetails.email}</p>
                  </div>
                </div>

                <Separator className="bg-gray-800" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </p>
                    <p className="font-medium">{selectedUserForDetails.phone || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Gender
                    </p>
                    <p className="font-medium capitalize">{selectedUserForDetails.gender || 'Not specified'}</p>
                  </div>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" /> Birth Date
                  </p>
                  <p className="font-medium">
                    {selectedUserForDetails.formattedBirthDate || 'Not provided'}
                  </p>
                </div>

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3" /> Address
                  </p>
                  <p className="text-sm">{selectedUserForDetails.address || 'No address provided'}</p>
                  {selectedUserForDetails.city && (
                    <p className="text-xs text-gray-400 mt-1">City: {selectedUserForDetails.city}</p>
                  )}
                </div>

                {selectedUserForDetails.location?.coordinates && (
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3" /> Location Coordinates
                    </p>
                    <p className="text-xs font-mono">
                      Lat: {selectedUserForDetails.location.coordinates[1].toFixed(6)}, 
                      Lng: {selectedUserForDetails.location.coordinates[0].toFixed(6)}
                    </p>
                  </div>
                )}

                <Separator className="bg-gray-800" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Joined
                    </p>
                    <p className="text-xs">{formatDate(selectedUserForDetails.joinDate)}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last Login
                    </p>
                    <p className="text-xs">{formatDate(selectedUserForDetails.lastLogin)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Registration
                    </p>
                    <p className="text-xs capitalize">{selectedUserForDetails.registrationSource}</p>
                  </div>
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Fingerprint className="h-3 w-3" /> Login Attempts
                    </p>
                    <p className="text-xs">{selectedUserForDetails.loginAttempts}</p>
                  </div>
                </div>

                <Separator className="bg-gray-800" />

                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Lottery Stats</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-yellow-400">{selectedUserForDetails.lotteryTickets}</p>
                      <p className="text-xs text-gray-400">Tickets</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{selectedUserForDetails.totalWins}</p>
                      <p className="text-xs text-gray-400">Wins</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-400">{selectedUserForDetails.points}</p>
                      <p className="text-xs text-gray-400">Points</p>
                    </div>
                  </div>
                </div>

                {selectedUserForDetails.hasWonThisMonth && (
                  <div className="bg-green-900/30 border border-green-800 p-3 rounded-lg">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Already won this month!
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-3xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-400" />
              Lottery History
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Past winners and their prizes
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {isLoadingWinners ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <Skeleton key={idx} className="h-16 w-full bg-gray-800" />
                ))}
              </div>
            ) : winners.length > 0 ? (
              <div className="space-y-3">
                {winners.map((winner) => (
                  <div key={winner.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
                        {winner.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{winner.employeeName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(winner.winDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-400">{winner.prize}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">${winner.prizeValue}</p>
                        {winner.claimed ? (
                          <Badge className="bg-green-900/30 text-green-400 border-green-700">
                            Claimed
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No history available</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-400">
        <p className="text-lg mb-2">🎂 Two-Step Birthday Lottery System</p>
        <p className="text-sm">
          1. Select month → 2. Pick birthday winner → 3. Spin for their prize
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Select Month
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            Choose Winner
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            Spin for Prize
          </span>
        </div>
      </div>
    </div>
  )
}