"use client"

import { useState, useEffect } from "react"
import axios from 'axios'
import {
  Gift,
  Cake,
  Calendar,
  Crown,
  Heart,
  Sparkles,
  Zap,
  Coins,
  Users,
  Trophy,
  Star,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RotateCw,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Package
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-hot-toast"

// API client
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

interface Prize {
  id: string
  name: string
  value: number
  icon: string
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  probability: number
  description: string
  gradient: string
  textColor: string
  isActive: boolean
  totalWon?: number
  createdAt?: string
}

const ICON_OPTIONS = [
  { name: 'Gift', icon: Gift },
  { name: 'Cake', icon: Cake },
  { name: 'Calendar', icon: Calendar },
  { name: 'Crown', icon: Crown },
  { name: 'Heart', icon: Heart },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Zap', icon: Zap },
  { name: 'Coins', icon: Coins },
  { name: 'Users', icon: Users },
  { name: 'Trophy', icon: Trophy },
  { name: 'Star', icon: Star }
]

const RARITY_COLORS = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
}

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('list')

  // Form state
  const [formData, setFormData] = useState<Partial<Prize>>({
    name: '',
    value: 50,
    icon: 'Gift',
    rarity: 'common',
    probability: 10,
    description: '',
    isActive: true
  })

  useEffect(() => {
    fetchPrizes()
    fetchStats()
  }, [])

  const fetchPrizes = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/lottery/prizes?active=true')
      if (response.data?.success) {
        setPrizes(response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching prizes:', error)
      toast.error('Failed to load prizes')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/lottery/prizes/stats')
      if (response.data?.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      // Validate probability sum (optional)
      const totalProb = prizes.reduce((sum, p) => sum + (p.id === editingPrize?.id ? 0 : p.probability), 0)
      if (totalProb + (formData.probability || 0) > 100) {
        toast.error('Total probability cannot exceed 100%')
        return
      }

      if (editingPrize) {
        // Update existing prize
        await api.put(`/lottery/prizes/${editingPrize.id}`, formData)
        toast.success('Prize updated successfully')
      } else {
        // Create new prize
        await api.post('/lottery/prizes', formData)
        toast.success('Prize created successfully')
      }

      setShowDialog(false)
      setEditingPrize(null)
      resetForm()
      fetchPrizes()
      fetchStats()
    } catch (error) {
      console.error('Error saving prize:', error)
      toast.error('Failed to save prize')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prize?')) return

    try {
      await api.delete(`/lottery/prizes/${id}`)
      toast.success('Prize deleted successfully')
      fetchPrizes()
      fetchStats()
    } catch (error) {
      console.error('Error deleting prize:', error)
      toast.error('Failed to delete prize')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      value: 50,
      icon: 'Gift',
      rarity: 'common',
      probability: 10,
      description: '',
      isActive: true
    })
  }

  const openEditDialog = (prize: Prize) => {
    setEditingPrize(prize)
    setFormData(prize)
    setShowDialog(true)
  }

  const getIconComponent = (iconName: string) => {
    const icon = ICON_OPTIONS.find(i => i.name === iconName)
    return icon?.icon || Gift
  }

  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Prize Management</h1>
          <p className="text-gray-400">Configure and manage lottery spin prizes</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Prizes</p>
                    <p className="text-2xl font-bold text-white">{stats.totalPrizes}</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Value</p>
                    <p className="text-2xl font-bold text-white">${stats.totalValue}</p>
                  </div>
                  <Coins className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Most Valuable</p>
                    <p className="text-lg font-bold text-white">{stats.mostValuable?.name}</p>
                    <p className="text-xs text-gray-400">${stats.mostValuable?.value}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Most Common</p>
                    <p className="text-lg font-bold text-white">{stats.mostCommon?.name}</p>
                    <p className="text-xs text-gray-400">{stats.mostCommon?.probability}% chance</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="list" className="data-[state=active]:bg-gray-700">Prize List</TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-gray-700">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Spin Prizes</CardTitle>
                  <CardDescription className="text-gray-400">
                    Total probability: {totalProbability}% {totalProbability !== 100 && (
                      <span className="text-yellow-400 ml-2">
                        (Should total 100%)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingPrize(null)
                    resetForm()
                    setShowDialog(true)
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prize
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full bg-gray-700" />
                      ))}
                    </div>
                  ) : prizes.length > 0 ? (
                    <div className="space-y-4">
                      {prizes.map((prize) => {
                        const IconComponent = getIconComponent(prize.icon)
                        return (
                          <div
                            key={prize.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-700 hover:border-gray-600 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg bg-gradient-to-br ${prize.color}`}>
                                <IconComponent className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">{prize.name}</h3>
                                <p className="text-sm text-gray-400">{prize.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge className={RARITY_COLORS[prize.rarity]}>
                                    {prize.rarity}
                                  </Badge>
                                  <span className="text-sm text-gray-400">
                                    Value: ${prize.value}
                                  </span>
                                  <span className="text-sm text-gray-400">
                                    Chance: {prize.probability}%
                                  </span>
                                  {prize.totalWon ? (
                                    <span className="text-sm text-green-400">
                                      Won: {prize.totalWon}x
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(prize)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(prize.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No prizes found</p>
                      <p className="text-sm mt-1">Click "Add Prize" to create your first prize</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Prize Statistics</CardTitle>
                <CardDescription className="text-gray-400">
                  Distribution and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                        <div key={rarity} className="text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                          <p className={`text-lg font-bold capitalize ${
                            rarity === 'common' ? 'text-gray-400' :
                            rarity === 'rare' ? 'text-blue-400' :
                            rarity === 'epic' ? 'text-purple-400' :
                            'text-yellow-400'
                          }`}>
                            {count}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{rarity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <h3 className="text-white font-medium mb-3">Probability Distribution</h3>
                      <div className="space-y-3">
                        {prizes.map((prize) => (
                          <div key={prize.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300">{prize.name}</span>
                              <span className="text-gray-400">{prize.probability}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  prize.rarity === 'common' ? 'bg-gray-400' :
                                  prize.rarity === 'rare' ? 'bg-blue-400' :
                                  prize.rarity === 'epic' ? 'bg-purple-400' :
                                  'bg-yellow-400'
                                }`}
                                style={{ width: `${prize.probability}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Prize Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingPrize ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingPrize ? 'Edit Prize' : 'Add New Prize'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure the prize details and probability
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Prize Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Birthday Cake"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the prize..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                    min={0}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Probability (%)</Label>
                  <Input
                    type="number"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                    min={0}
                    max={100}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {ICON_OPTIONS.map((icon) => {
                        const IconComp = icon.icon
                        return (
                          <SelectItem key={icon.name} value={icon.name} className="text-white">
                            <div className="flex items-center gap-2">
                              <IconComp className="h-4 w-4" />
                              <span>{icon.name}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Rarity</Label>
                  <Select
                    value={formData.rarity}
                    onValueChange={(value: any) => setFormData({ ...formData, rarity: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select rarity" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {['common', 'rare', 'epic', 'legendary'].map((rarity) => (
                        <SelectItem key={rarity} value={rarity} className="text-white capitalize">
                          {rarity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="active" className="text-gray-300">Active</Label>
                  <p className="text-xs text-gray-500">Inactive prizes won't appear in spins</p>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              {!editingPrize && (
                <div className="bg-blue-900/30 border border-blue-800 p-3 rounded-lg">
                  <p className="text-sm text-blue-300 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Total probability should add up to 100%
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingPrize(null)
                  resetForm()
                }}
                className="border-gray-600 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.value || !formData.probability}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingPrize ? 'Update' : 'Save'} Prize
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function Info(props: any) {
  return <AlertCircle {...props} />
}
