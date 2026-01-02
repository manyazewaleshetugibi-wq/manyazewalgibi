"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
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
  LucideIcon,
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
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  ChevronUp,
  Filter,
  CalendarDays,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"

interface Employee {
  id: string
  name: string
  email: string
  birthDate: string // Format: "YYYY-MM-DD"
  avatar?: string
  department: string
  joinDate: string
  isActive: boolean
  lotteryTickets: number
  hasWonThisMonth: boolean
  lastWinDate?: string
  totalWins: number
  points: number
  birthMonth: number // 1-12
  birthDay: number // 1-31
}

interface LotteryWinner {
  id: string
  employeeId: string
  employeeName: string
  prize: string
  winDate: string
  month: string // Format: "YYYY-MM"
  prizeValue: number
  claimed: boolean
}

interface LotteryPrize {
  id: string
  name: string
  value: number
  icon: LucideIcon
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  probability: number // 0-100
  description: string
  gradient: string
  textColor: string
}

interface SpinResult {
  winner: Employee
  prize: LotteryPrize
  spinAngle: number
  timestamp: string
  spinDuration: number
}

const BIRTHDAY_MONTHS = [
  { name: "January", value: 1, emoji: "❄️" },
  { name: "February", value: 2, emoji: "💝" },
  { name: "March", value: 3, emoji: "🍀" },
  { name: "April", value: 4, emoji: "🌸" },
  { name: "May", value: 5, emoji: "🌻" },
  { name: "June", value: 6, emoji: "☀️" },
  { name: "July", value: 7, emoji: "🏖️" },
  { name: "August", value: 8, emoji: "🌊" },
  { name: "September", value: 9, emoji: "🍂" },
  { name: "October", value: 10, emoji: "🎃" },
  { name: "November", value: 11, emoji: "🍁" },
  { name: "December", value: 12, emoji: "🎄" }
]

const PRIZES: LotteryPrize[] = [
  {
    id: "1",
    name: "Birthday Cake",
    value: 50,
    icon: Cake,
    color: "from-pink-400 to-rose-500",
    gradient: "linear-gradient(135deg, #f472b6 0%, #f43f5e 100%)",
    textColor: "text-white",
    rarity: "common",
    probability: 20,
    description: "Delicious birthday cake for celebration"
  },
  {
    id: "2",
    name: "Extra Day Off",
    value: 100,
    icon: Calendar,
    color: "from-blue-400 to-cyan-500",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)",
    textColor: "text-white",
    rarity: "rare",
    probability: 15,
    description: "Enjoy an extra paid day off"
  },
  {
    id: "3",
    name: "Gift Card",
    value: 75,
    icon: Gift,
    color: "from-purple-400 to-violet-500",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
    textColor: "text-white",
    rarity: "common",
    probability: 18,
    description: "$75 gift card to your favorite store"
  },
  {
    id: "4",
    name: "VIP Dinner",
    value: 200,
    icon: Crown,
    color: "from-amber-400 to-orange-500",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
    textColor: "text-white",
    rarity: "epic",
    probability: 12,
    description: "Fine dining experience for two"
  },
  {
    id: "5",
    name: "Tech Gadget",
    value: 300,
    icon: Zap,
    color: "from-cyan-400 to-blue-500",
    gradient: "linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)",
    textColor: "text-white",
    rarity: "legendary",
    probability: 8,
    description: "Latest tech gadget of your choice"
  },
  {
    id: "6",
    name: "Birthday Bonus",
    value: 150,
    icon: Coins,
    color: "from-emerald-400 to-green-500",
    gradient: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
    textColor: "text-white",
    rarity: "rare",
    probability: 10,
    description: "Extra cash bonus for your birthday"
  },
  {
    id: "7",
    name: "Team Lunch",
    value: 100,
    icon: Users,
    color: "from-orange-400 to-red-500",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ef4444 100%)",
    textColor: "text-white",
    rarity: "common",
    probability: 10,
    description: "Treat your team to a nice lunch"
  },
  {
    id: "8",
    name: "Luxury Spa Day",
    value: 250,
    icon: Heart,
    color: "from-rose-400 to-pink-500",
    gradient: "linear-gradient(135deg, #fb7185 0%, #ec4899 100%)",
    textColor: "text-white",
    rarity: "epic",
    probability: 5,
    description: "Relaxing spa day package"
  },
  {
    id: "9",
    name: "Gold Trophy",
    value: 500,
    icon: Trophy,
    color: "from-yellow-400 to-amber-500",
    gradient: "linear-gradient(135deg, #facc15 0%, #d97706 100%)",
    textColor: "text-white",
    rarity: "legendary",
    probability: 2,
    description: "Exclusive gold trophy and recognition"
  }
]

// Enhanced sample employees with birth month/day data
const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john@company.com",
    birthDate: "1990-03-15",
    birthMonth: 3,
    birthDay: 15,
    department: "Engineering",
    joinDate: "2020-05-10",
    isActive: true,
    lotteryTickets: 5,
    hasWonThisMonth: false,
    totalWins: 2,
    points: 150
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@company.com",
    birthDate: "1985-07-22",
    birthMonth: 7,
    birthDay: 22,
    avatar: "/avatars/sarah.jpg",
    department: "Marketing",
    joinDate: "2019-11-15",
    isActive: true,
    lotteryTickets: 3,
    hasWonThisMonth: true,
    lastWinDate: "2024-01-10",
    totalWins: 3,
    points: 250
  },
  {
    id: "3",
    name: "Mike Chen",
    email: "mike@company.com",
    birthDate: "1992-01-30",
    birthMonth: 1,
    birthDay: 30,
    department: "Sales",
    joinDate: "2021-03-20",
    isActive: true,
    lotteryTickets: 2,
    hasWonThisMonth: false,
    totalWins: 1,
    points: 80
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@company.com",
    birthDate: "1988-11-05",
    birthMonth: 11,
    birthDay: 5,
    avatar: "/avatars/emma.jpg",
    department: "HR",
    joinDate: "2018-08-12",
    isActive: true,
    lotteryTickets: 4,
    hasWonThisMonth: false,
    totalWins: 0,
    points: 40
  },
  {
    id: "5",
    name: "David Brown",
    email: "david@company.com",
    birthDate: "1995-09-18",
    birthMonth: 9,
    birthDay: 18,
    department: "Finance",
    joinDate: "2022-01-05",
    isActive: true,
    lotteryTickets: 1,
    hasWonThisMonth: false,
    totalWins: 0,
    points: 20
  },
  {
    id: "6",
    name: "Lisa Wong",
    email: "lisa@company.com",
    birthDate: "1993-03-25",
    birthMonth: 3,
    birthDay: 25,
    avatar: "/avatars/lisa.jpg",
    department: "Engineering",
    joinDate: "2020-08-15",
    isActive: true,
    lotteryTickets: 3,
    hasWonThisMonth: false,
    totalWins: 1,
    points: 90
  },
  {
    id: "7",
    name: "Robert Garcia",
    email: "robert@company.com",
    birthDate: "1987-07-10",
    birthMonth: 7,
    birthDay: 10,
    department: "Operations",
    joinDate: "2017-06-20",
    isActive: true,
    lotteryTickets: 6,
    hasWonThisMonth: false,
    totalWins: 0,
    points: 60
  },
  {
    id: "8",
    name: "Maria Rodriguez",
    email: "maria@company.com",
    birthDate: "1991-11-20",
    birthMonth: 11,
    birthDay: 20,
    department: "Marketing",
    joinDate: "2019-02-14",
    isActive: true,
    lotteryTickets: 2,
    hasWonThisMonth: true,
    lastWinDate: "2024-01-05",
    totalWins: 2,
    points: 120
  }
]

const SAMPLE_WINNERS: LotteryWinner[] = [
  {
    id: "1",
    employeeId: "2",
    employeeName: "Sarah Johnson",
    prize: "VIP Dinner",
    winDate: "2024-01-10",
    month: "2024-01",
    prizeValue: 200,
    claimed: true
  },
  {
    id: "2",
    employeeId: "1",
    employeeName: "John Smith",
    prize: "Birthday Bonus",
    winDate: "2023-12-15",
    month: "2023-12",
    prizeValue: 150,
    claimed: true
  }
]

export default function BirthdayLotteryPage() {
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES)
  const [winners, setWinners] = useState<LotteryWinner[]>(SAMPLE_WINNERS)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinAngle, setSpinAngle] = useState(0)
  const [spinDuration, setSpinDuration] = useState(3)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1) // Current month (1-12)
  const [showResult, setShowResult] = useState(false)
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [totalSpins, setTotalSpins] = useState(47)
  const [jackpotValue, setJackpotValue] = useState(1250)
  const [isJackpotActive, setIsJackpotActive] = useState(true)
  const [lotteryMode, setLotteryMode] = useState<'two-step' | 'spin-only'>('two-step')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [wheelScale, setWheelScale] = useState(1)
  const [isAutoSpin, setIsAutoSpin] = useState(false)
  const [spinStage, setSpinStage] = useState<'select-winner' | 'select-prize'>('select-winner')
  const [showMonthSelector, setShowMonthSelector] = useState(true)
  const [isSelectingWinner, setIsSelectingWinner] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const spinAudioRef = useRef<HTMLAudioElement | null>(null)
  const winAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio
  useEffect(() => {
    spinAudioRef.current = new Audio('/sounds/spin.mp3')
    winAudioRef.current = new Audio('/sounds/win.mp3')
  }, [])

  // Filter employees by selected month
  const eligibleEmployees = useMemo(() => {
    return employees.filter(emp => {
      return emp.birthMonth === selectedMonth && emp.isActive
    })
  }, [employees, selectedMonth])

  // Get current month's winners
  const currentMonthWinners = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const monthStr = `${currentYear}-${selectedMonth.toString().padStart(2, '0')}`
    return winners.filter(winner => winner.month === monthStr)
  }, [winners, selectedMonth])

  const monthlyPrizeValue = useMemo(() => {
    return currentMonthWinners.reduce((sum, winner) => sum + winner.prizeValue, 0)
  }, [currentMonthWinners])

  const calculateOdds = useCallback((employee: Employee) => {
    const baseOdds = 10
    const ticketBonus = employee.lotteryTickets * 2
    const winPenalty = employee.hasWonThisMonth ? -20 : 0
    const pointsBonus = Math.floor(employee.points / 50)
    const seniorityBonus = Math.floor((Date.now() - new Date(employee.joinDate).getTime()) / (365 * 24 * 60 * 60 * 1000)) * 2
    
    return Math.max(1, Math.min(50, baseOdds + ticketBonus + winPenalty + pointsBonus + seniorityBonus))
  }, [])

  const wheelSegments = useMemo(() => {
    const segments = []
    const totalProbability = PRIZES.reduce((sum, prize) => sum + prize.probability, 0)
    let currentAngle = 0

    PRIZES.forEach((prize, index) => {
      const angle = (prize.probability / totalProbability) * 360
      const segment = {
        ...prize,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        segmentAngle: angle,
        centerAngle: currentAngle + angle / 2,
        index: index
      }
      segments.push(segment)
      currentAngle += angle
    })

    return segments
  }, [])

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

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'shadow-gray-500/20'
      case 'rare': return 'shadow-blue-500/30'
      case 'epic': return 'shadow-purple-500/40'
      case 'legendary': return 'shadow-yellow-500/50'
      default: return 'shadow-gray-500/20'
    }
  }

  const selectBirthdayWinner = () => {
    if (eligibleEmployees.length === 0) {
      toast.error("No employees have birthdays this month!")
      return
    }

    if (selectedEmployee) {
      // Already selected, move to prize selection
      setSpinStage('select-prize')
      toast.success(`Ready to spin for ${selectedEmployee.name}'s prize!`)
      return
    }

    setIsSelectingWinner(true)
    
    // Shuffle animation
    let duration = 2000
    let interval = 100
    let elapsed = 0
    
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleEmployees.length)
      setSelectedEmployee(eligibleEmployees[randomIndex])
      
      elapsed += interval
      if (elapsed >= duration) {
        clearInterval(timer)
        
        // Weighted random selection based on odds
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

  const spinForPrize = () => {
    if (!selectedEmployee) {
      toast.error("Please select a birthday winner first!")
      return
    }

    if (isSpinning) return

    setIsSpinning(true)
    setShowResult(false)

    // Play spin sound
    if (isSoundEnabled && spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0
      spinAudioRef.current.play().catch(() => {})
    }

    // Select prize
    const totalProbability = PRIZES.reduce((sum, prize) => sum + prize.probability, 0)
    let random = Math.random() * totalProbability
    let selectedPrize = PRIZES[0]
    let accumulatedProbability = 0

    for (const prize of PRIZES) {
      accumulatedProbability += prize.probability
      if (random <= accumulatedProbability) {
        selectedPrize = prize
        break
      }
    }

    // Find segment for the selected prize
    const prizeSegment = wheelSegments.find(seg => seg.id === selectedPrize.id)
    const spins = 5 + Math.random() * 3
    const targetAngle = spins * 360 + (prizeSegment?.centerAngle || 180)
    const startTime = Date.now()

    // Add wobble effect
    setWheelScale(1.02)

    const animateSpin = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (spinDuration * 1000), 1)
      
      // Enhanced easing with bounce effect
      const easeOut = progress < 0.9 
        ? 1 - Math.pow(1 - progress, 3)
        : 1 - Math.pow(1 - progress, 4) + Math.sin(progress * Math.PI * 4) * 0.1
      
      const currentAngle = easeOut * targetAngle
      
      setSpinAngle(currentAngle)

      // Add wobble during spin
      if (progress < 0.8) {
        const wobble = Math.sin(elapsed / 50) * 0.01
        setWheelScale(1.02 + wobble)
      } else {
        setWheelScale(1)
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin)
      } else {
        // Spin complete
        const result: SpinResult = {
          winner: selectedEmployee,
          prize: selectedPrize,
          spinAngle: targetAngle % 360,
          timestamp: new Date().toISOString(),
          spinDuration: elapsed
        }
        
        setSpinResult(result)
        setIsSpinning(false)

        // Play win sound
        if (isSoundEnabled && winAudioRef.current) {
          winAudioRef.current.currentTime = 0
          winAudioRef.current.play().catch(() => {})
        }

        // Add winner
        const currentYear = new Date().getFullYear()
        const monthStr = `${currentYear}-${selectedMonth.toString().padStart(2, '0')}`
        
        const newWinner: LotteryWinner = {
          id: Date.now().toString(),
          employeeId: selectedEmployee.id,
          employeeName: selectedEmployee.name,
          prize: selectedPrize.name,
          winDate: new Date().toISOString().split('T')[0],
          month: monthStr,
          prizeValue: selectedPrize.value,
          claimed: false
        }
        
        setWinners(prev => [newWinner, ...prev])
        
        // Update employee
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? { 
                ...emp, 
                hasWonThisMonth: true,
                lastWinDate: new Date().toISOString().split('T')[0],
                totalWins: emp.totalWins + 1,
                points: emp.points + selectedPrize.value,
                lotteryTickets: Math.max(0, emp.lotteryTickets - 1)
              }
            : emp
        ))

        // Update stats
        setTotalSpins(prev => prev + 1)
        setJackpotValue(prev => prev - selectedPrize.value)

        // Reset for next spin
        setSpinStage('select-winner')
        setSelectedEmployee(null)

        // Show result
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
            {
              duration: 5000,
              style: {
                border: `2px solid ${getRarityColor(selectedPrize.rarity).split(' ')[1]}`,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              }
            }
          )
        }, 1000)
      }
    }

    requestAnimationFrame(animateSpin)
  }

  const triggerConfetti = () => {
    // Main burst
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    })

    // Side bursts
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

    // Top burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.3 },
        colors: ['#fdcb6e', '#e17055', '#00cec9']
      })
    }, 500)
  }

  const claimPrize = (winnerId: string) => {
    setWinners(prev => prev.map(winner => 
      winner.id === winnerId ? { ...winner, claimed: true } : winner
    ))
    toast.success("Prize claimed successfully!")
  }

  const exportWinners = () => {
    const csvContent = [
      ['Date', 'Employee', 'Prize', 'Value', 'Claimed'],
      ...winners.map(winner => [
        winner.winDate,
        winner.employeeName,
        winner.prize,
        winner.prizeValue.toString(),
        winner.claimed ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lottery-winners.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareResult = () => {
    if (spinResult) {
      const monthName = BIRTHDAY_MONTHS.find(m => m.value === selectedMonth)?.name
      const text = `🎉 Congratulations to ${spinResult.winner.name} for winning ${spinResult.prize.name} in our ${monthName} Birthday Lottery! 🎂`
      
      if (navigator.share) {
        navigator.share({
          title: 'Birthday Lottery Winner!',
          text: text,
          url: window.location.href
        })
      } else {
        navigator.clipboard.writeText(text)
        toast.success('Result copied to clipboard!')
      }
    }
  }

  const getCurrentMonthName = () => {
    return BIRTHDAY_MONTHS.find(m => m.value === selectedMonth)?.name || 'Unknown'
  }

  const getBirthdayCountByDay = useMemo(() => {
    const counts: Record<number, number> = {}
    eligibleEmployees.forEach(emp => {
      counts[emp.birthDay] = (counts[emp.birthDay] || 0) + 1
    })
    return counts
  }, [eligibleEmployees])

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
                size="icon"
                onClick={() => setShowSettings(true)}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHistory(true)}
                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Total Spins", value: totalSpins, icon: <Flame className="h-8 w-8 text-orange-500" />, color: "from-orange-500/10 to-orange-600/20" },
              { label: "Jackpot Value", value: `$${jackpotValue}`, icon: <Coins className="h-8 w-8 text-yellow-500" />, color: "from-yellow-500/10 to-yellow-600/20" },
              { label: `${getCurrentMonthName()} Winners`, value: currentMonthWinners.length, icon: <Trophy className="h-8 w-8 text-blue-500" />, color: "from-blue-500/10 to-blue-600/20" },
              { label: "Birthdays This Month", value: eligibleEmployees.length, icon: <Cake className="h-8 w-8 text-pink-500" />, color: "from-pink-500/10 to-pink-600/20" }
            ].map((stat, idx) => (
              <Card key={idx} className={`bg-gradient-to-br ${stat.color} border-gray-700 backdrop-blur-sm`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    {stat.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Month Selection - Always Visible */}
        <Card className="mb-6 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CalendarDays className="h-5 w-5 text-blue-400" />
              Select Birthday Month
              <Badge variant="outline" className="ml-2 border-blue-600 text-blue-400">
                {getCurrentMonthName()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose a month to see employees celebrating birthdays and spin for winners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Month Selection Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {BIRTHDAY_MONTHS.map((month) => {
                  const employeesInMonth = employees.filter(emp => emp.birthMonth === month.value)
                  const isSelected = selectedMonth === month.value
                  const hasWinners = winners.some(w => {
                    const winnerMonth = parseInt(w.month.split('-')[1])
                    return winnerMonth === month.value
                  })
                  
                  return (
                    <Button
                      key={month.value}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => setSelectedMonth(month.value)}
                      className={`h-16 flex-col gap-1 relative transition-all ${isSelected ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-0' : 'border-gray-700 bg-gray-900/50 hover:bg-gray-800/50'}`}
                    >
                      {hasWinners && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-green-500">
                          <Star className="h-3 w-3" />
                        </Badge>
                      )}
                      <span className="text-lg">{month.emoji}</span>
                      <span className="text-xs font-medium">{month.name.slice(0, 3)}</span>
                      <span className="text-[10px] text-gray-400">
                        {employeesInMonth.length} {employeesInMonth.length === 1 ? 'person' : 'people'}
                      </span>
                    </Button>
                  )
                })}
              </div>

              {/* Selected Month Info */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl">{BIRTHDAY_MONTHS.find(m => m.value === selectedMonth)?.emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{getCurrentMonthName()} Birthdays</h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{eligibleEmployees.length} employees celebrating</span>
                      <span className="mx-2">•</span>
                      <Cake className="h-4 w-4" />
                      <span>{currentMonthWinners.length} winners this month</span>
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

              {/* Birthday Calendar Preview */}
              {eligibleEmployees.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Birthday Days this Month:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(getBirthdayCountByDay)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([day, count]) => (
                        <Badge 
                          key={day} 
                          variant="outline"
                          className="bg-gray-900/50 border-gray-700 text-gray-300"
                        >
                          {day}th: {count} {count === 1 ? 'person' : 'people'}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                    {/* Progress Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-700 -translate-y-1/2"></div>
                    <div 
                      className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 -translate-y-1/2 transition-all duration-300"
                      style={{ width: spinStage === 'select-winner' ? '50%' : '100%' }}
                    ></div>

                    {/* Stage 1: Select Winner */}
                    <div className="relative flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 z-10 transition-all ${spinStage === 'select-winner' ? 'bg-gradient-to-br from-blue-600 to-purple-600 scale-110' : 'bg-green-600'}`}>
                        {spinStage === 'select-winner' ? (
                          <Users className="h-5 w-5 text-white" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${spinStage === 'select-winner' ? 'text-white' : 'text-gray-400'}`}>
                          Select Birthday Winner
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {eligibleEmployees.length} eligible
                        </p>
                      </div>
                    </div>

                    {/* Stage 2: Spin for Prize */}
                    <div className="absolute top-0 right-0 flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 z-10 transition-all ${spinStage === 'select-prize' ? 'bg-gradient-to-br from-blue-600 to-purple-600 scale-110' : selectedEmployee ? 'bg-green-600' : 'bg-gray-700'}`}>
                        {spinStage === 'select-prize' ? (
                          <Sparkles className="h-5 w-5 text-white" />
                        ) : selectedEmployee ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <Gift className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${spinStage === 'select-prize' ? 'text-white' : selectedEmployee ? 'text-green-400' : 'text-gray-400'}`}>
                          Spin for Prize
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedEmployee ? 'Ready!' : 'Select winner first'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage Actions */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    onClick={selectBirthdayWinner}
                    disabled={eligibleEmployees.length === 0 || (spinStage === 'select-prize' && !selectedEmployee) || isSelectingWinner}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0"
                  >
                    {isSelectingWinner ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Selecting Winner...
                      </>
                    ) : selectedEmployee ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Winner Selected: {selectedEmployee.name}
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
                    disabled={!selectedEmployee || isSpinning || isSelectingWinner}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                  >
                    {isSpinning ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
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

            {/* Enhanced Lottery Wheel */}
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
                  {selectedEmployee 
                    ? `Spinning for ${selectedEmployee.name}'s birthday prize!` 
                    : 'Select a birthday winner to spin the wheel'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative flex flex-col items-center justify-center">
                  {/* Wheel Container */}
                  <div className="relative w-full max-w-lg aspect-square">
                    {/* Enhanced Wheel */}
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
                      {/* Prize Values */}
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

                      {/* Segment Icons */}
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
                            <div className={`p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 ${getRarityGlow(segment.rarity)}`}>
                              <segment.icon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )
                      })}
                    </motion.div>

                    {/* Center Spin Button */}
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
                              <RotateCw className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
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

                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
                      <div className="relative">
                        <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[40px] border-l-transparent border-r-transparent border-b-red-500"></div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="mt-8 space-y-4 w-full max-w-md">
                    <div className="flex items-center justify-between">
                      <Label className="text-white">Spin Speed: {spinDuration}s</Label>
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

                    {!selectedEmployee && (
                      <div className="text-center text-blue-400 bg-blue-900/20 p-3 rounded-lg border border-blue-800">
                        <Users className="h-5 w-5 inline mr-2" />
                        Select a birthday winner first to spin for their prize!
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Selected Winner Info */}
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
                        <AvatarImage src={selectedEmployee.avatar} alt={selectedEmployee.name} />
                        <AvatarFallback className="bg-blue-900 text-blue-300">
                          {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
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

            {/* Birthday Employees List */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Cake className="h-5 w-5 text-pink-400" />
                  {getCurrentMonthName()} Birthdays
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
                  {eligibleEmployees.length > 0 ? (
                    <div className="space-y-3 pr-4">
                      {eligibleEmployees.map((employee) => {
                        const isSelected = selectedEmployee?.id === employee.id
                        return (
                          <div 
                            key={employee.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-900/30 border-blue-600' : 'border-gray-700 hover:bg-gray-700/50'}`}
                            onClick={() => {
                              if (spinStage === 'select-winner') {
                                setSelectedEmployee(employee)
                                setSpinStage('select-prize')
                                toast.success(`${employee.name} selected!`)
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.avatar} alt={employee.name} />
                                <AvatarFallback className={isSelected ? 'bg-blue-900 text-blue-300' : 'bg-gray-700'}>
                                  {employee.name.split(' ').map(n => n[0]).join('')}
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

              <div className="relative z-10 overflow-y-auto flex-1 p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl">
                      <AvatarImage src={spinResult.winner.avatar} alt={spinResult.winner.name} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-600 to-pink-600">
                        {spinResult.winner.name.split(' ').map(n => n[0]).join('')}
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
                  onClick={shareResult}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  onClick={() => {
                    claimPrize(winners[0].id)
                    setShowResult(false)
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
            <div className="space-y-3">
              {winners.length > 0 ? winners.map((winner) => (
                <div key={winner.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
                      {winner.employeeName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{winner.employeeName}</p>
                      <p className="text-xs text-gray-400">{winner.winDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-yellow-400">{winner.prize}</p>
                    <p className="text-xs text-gray-400">${winner.prizeValue}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-8">No history available</div>
              )}
            </div>
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

// Custom Chevron icons
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}