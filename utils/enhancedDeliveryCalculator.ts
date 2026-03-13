import { DeliveryFeeDetails } from '@/types'

export interface DeliveryConfig {
  baseFee: number
  perKmRate: number
  maxDistance: number
  minOrderForDelivery: number
  freeDeliveryThreshold: number
  surgeHours: { start: number; end: number }
  surgeMultiplier: number
  zones: ZoneConfig[]
  cacheTTL: number
  enableTrafficMultiplier: boolean
  enableWeatherMultiplier: boolean
}

export interface ZoneConfig {
  id: string
  name: string
  minRadius: number
  maxRadius: number
  baseFee: number
  perKmRate: number
  isActive: boolean
  specialEventMultiplier?: number
  description?: string
}

export class DeliveryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public timestamp: Date = new Date()
  ) {
    super(message)
    this.name = 'DeliveryError'
  }
}

export type TrafficLevel = 'low' | 'medium' | 'high'
export type WeatherCondition = 'clear' | 'rainy' | 'windy' | 'stormy' | 'foggy'

export interface ExternalFactors {
  trafficLevel: TrafficLevel
  weatherCondition: WeatherCondition
  isHoliday: boolean
}

export interface Promotion {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'free_delivery'
  value: number
  minOrder?: number
  maxDiscount?: number
  validFrom: Date
  validTo: Date
  applicableZones?: string[]
  applicableDays?: number[]
  usageLimit?: number
  currentUsage?: number
}

export class EnhancedDeliveryCalculator {
  private readonly RESTAURANT_LOCATION = {
    lat: 8.99410,
    lng: 38.79260,
    address: "Bole Road, Addis Ababa, Ethiopia",
    name: "Manyazewal Eshetu Gibi Restaurant"
  }

  private config: DeliveryConfig
  private zones: ZoneConfig[]
  private distanceCache: Map<string, { distance: number; timestamp: number }> = new Map()
  private currentTrafficLevel: TrafficLevel = 'medium'
  private currentWeather: WeatherCondition = 'clear'
  private isHoliday: boolean = false
  private activePromotions: Map<string, Promotion> = new Map()

  private readonly AREA_DISTANCES: Record<string, number> = {
    'bole': 1.5,
    'bole international airport': 2.0,
    'bole airport': 2.0,
    'kazanchis': 1.8,
    'cazanchis': 1.8,
    'kazanchis addis ababa': 1.8,
    'megenagna': 3.2,
    'sarbet': 3.5,
    'mexico': 2.8,
    'lafto': 3.0,
    'saris': 3.8,
    'ayertena': 3.5,
    'summit': 3.8,
    'piassa': 4.5,
    'merkato': 5.0,
    'gerji': 4.2,
    'atlas': 4.8,
    'gotera': 5.2,
    'kera': 5.5,
    'akaki': 7.5,
    'kality': 7.0,
    'kaliti': 7.0,
    'addis ababa': 3.0
  }

  constructor(config?: Partial<DeliveryConfig>) {
    this.config = {
      baseFee: 60,
      perKmRate: 20,
      maxDistance: 6,
      minOrderForDelivery: 600,
      freeDeliveryThreshold: 10000,
      surgeHours: { start: 18, end: 21 },
      surgeMultiplier: 1.3,
      cacheTTL: 5 * 60 * 1000,
      enableTrafficMultiplier: true,
      enableWeatherMultiplier: true,
      zones: [
        {
          id: 'zone1',
          name: 'Zone 1 (0-2km)',
          minRadius: 0,
          maxRadius: 2,
          baseFee: 60,
          perKmRate: 15,
          isActive: true,
          description: 'Very close areas'
        },
        {
          id: 'zone2',
          name: 'Zone 2 (2-4km)',
          minRadius: 2,
          maxRadius: 4,
          baseFee: 80,
          perKmRate: 18,
          isActive: true,
          description: 'Mid-range areas'
        },
        {
          id: 'zone3',
          name: 'Zone 3 (4-6km)',
          minRadius: 4,
          maxRadius: 6,
          baseFee: 100,
          perKmRate: 20,
          isActive: true,
          description: 'Outer areas within limit'
        }
      ],
      ...config
    }

    this.zones = [...this.config.zones]
    this.startCacheCleanup()
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.distanceCache.entries()) {
        if (now - value.timestamp > this.config.cacheTTL) {
          this.distanceCache.delete(key)
        }
      }
    }, this.config.cacheTTL)
  }

  setExternalFactors(factors: Partial<ExternalFactors>): void {
    if (factors.trafficLevel) this.currentTrafficLevel = factors.trafficLevel
    if (factors.weatherCondition) this.currentWeather = factors.weatherCondition
    if (factors.isHoliday !== undefined) this.isHoliday = factors.isHoliday
  }

  getExternalFactors(): ExternalFactors {
    return {
      trafficLevel: this.currentTrafficLevel,
      weatherCondition: this.currentWeather,
      isHoliday: this.isHoliday
    }
  }

  addPromotion(promotion: Promotion): void {
    this.activePromotions.set(promotion.code, promotion)
  }

  removePromotion(code: string): void {
    this.activePromotions.delete(code)
  }

  getPromotion(code: string): Promotion | undefined {
    return this.activePromotions.get(code)
  }

  getAllPromotions(): Promotion[] {
    return Array.from(this.activePromotions.values())
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const cacheKey = `${lat1.toFixed(4)},${lon1.toFixed(4)},${lat2.toFixed(4)},${lon2.toFixed(4)}`
    const cached = this.distanceCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.distance
    }

    const R = 6371
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = Number((R * c).toFixed(1))

    this.distanceCache.set(cacheKey, { distance, timestamp: Date.now() })
    return distance
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private validateDeliveryRequest(distance: number, orderAmount: number, zone?: ZoneConfig): void {
    if (orderAmount < this.config.minOrderForDelivery) {
      throw new DeliveryError(
        `Minimum order amount for delivery is ${this.config.minOrderForDelivery} ETB`,
        'MIN_ORDER_NOT_MET',
        { orderAmount, minRequired: this.config.minOrderForDelivery }
      )
    }

    if (distance > this.config.maxDistance) {
      throw new DeliveryError(
        `Delivery not available beyond ${this.config.maxDistance}km. Your location is ${distance}km away.`,
        'OUT_OF_RANGE',
        { distance, maxDistance: this.config.maxDistance }
      )
    }

    if (zone && !zone.isActive) {
      throw new DeliveryError(
        `Delivery temporarily unavailable in ${zone.name}`,
        'ZONE_INACTIVE',
        { zoneId: zone.id, zoneName: zone.name }
      )
    }
  }

  private findZone(distance: number): ZoneConfig | undefined {
    return this.zones.find(z =>
      distance > z.minRadius && distance <= z.maxRadius && z.isActive
    )
  }

  private calculateExternalFactorMultiplier(): number {
    let multiplier = 1

    if (this.config.enableTrafficMultiplier) {
      const trafficMultipliers: Record<TrafficLevel, number> = {
        low: 1,
        medium: 1.1,
        high: 1.25
      }
      multiplier *= trafficMultipliers[this.currentTrafficLevel]
    }

    if (this.config.enableWeatherMultiplier) {
      const weatherMultipliers: Record<WeatherCondition, number> = {
        clear: 1,
        rainy: 1.15,
        windy: 1.05,
        stormy: 1.3,
        foggy: 1.1
      }
      multiplier *= weatherMultipliers[this.currentWeather]
    }

    if (this.isHoliday) {
      multiplier *= 1.2
    }

    return Number(multiplier.toFixed(2))
  }

  private isPromotionValid(
    promotion: Promotion,
    orderAmount: number,
    zoneId: string,
    currentDate: Date = new Date()
  ): boolean {
    if (currentDate < promotion.validFrom || currentDate > promotion.validTo) {
      return false
    }

    if (promotion.minOrder && orderAmount < promotion.minOrder) {
      return false
    }

    if (promotion.applicableZones && !promotion.applicableZones.includes(zoneId)) {
      return false
    }

    if (promotion.applicableDays && !promotion.applicableDays.includes(currentDate.getDay())) {
      return false
    }

    if (promotion.usageLimit && (promotion.currentUsage || 0) >= promotion.usageLimit) {
      return false
    }

    return true
  }

  private applyPromotion(fee: number, promotion: Promotion): number {
    let discountedFee = fee

    switch (promotion.type) {
      case 'percentage':
        discountedFee = fee * (1 - promotion.value / 100)
        if (promotion.maxDiscount) {
          discountedFee = Math.max(fee - promotion.maxDiscount, discountedFee)
        }
        break
      case 'fixed':
        discountedFee = Math.max(0, fee - promotion.value)
        break
      case 'free_delivery':
        discountedFee = 0
        break
    }

    promotion.currentUsage = (promotion.currentUsage || 0) + 1
    return Math.round(discountedFee)
  }

  private calculateDeliveryFeeInternal(
    distance: number,
    orderAmount: number,
    currentHour: number,
    zone?: ZoneConfig
  ): Omit<DeliveryFeeDetails, 'breakdown'> & { breakdown: DeliveryFeeDetails['breakdown'] } {
    if (orderAmount >= this.config.freeDeliveryThreshold) {
      return {
        fee: 0,
        distance: Math.round(distance * 10) / 10,
        zone: zone?.name || 'Unknown',
        maxDistance: this.config.maxDistance,
        breakdown: {
          baseFee: 0,
          distanceCharge: 0,
          freeDeliveryReason: `Free delivery for orders above ${this.config.freeDeliveryThreshold} ETB`
        }
      }
    }

    const zoneToUse = zone || this.zones[0]
    let baseFee = zoneToUse.baseFee
    let distanceCharge = 0

    if (distance <= 2) {
      distanceCharge = distance * zoneToUse.perKmRate * 0.7
    } else if (distance <= 4) {
      distanceCharge = (2 * zoneToUse.perKmRate * 0.7) + ((distance - 2) * zoneToUse.perKmRate * 0.9)
    } else {
      distanceCharge = (2 * zoneToUse.perKmRate * 0.7) +
        (2 * zoneToUse.perKmRate * 0.9) +
        ((distance - 4) * zoneToUse.perKmRate)
    }

    let totalFee = baseFee + distanceCharge

    const isSurgeHour = currentHour >= this.config.surgeHours.start &&
      currentHour < this.config.surgeHours.end
    const surgeMultiplier = isSurgeHour ? this.config.surgeMultiplier : 1

    if (isSurgeHour) {
      totalFee *= surgeMultiplier
    }

    const externalMultiplier = this.calculateExternalFactorMultiplier()
    totalFee *= externalMultiplier

    if (zoneToUse.specialEventMultiplier) {
      totalFee *= zoneToUse.specialEventMultiplier
    }

    const finalFee = Math.round(totalFee)

    const breakdown: any = {
      baseFee: Math.round(baseFee),
      distanceCharge: Math.round(distanceCharge),
      totalBeforeSurge: Math.round(totalFee / (isSurgeHour ? surgeMultiplier : 1))
    }

    if (isSurgeHour) {
      breakdown.surgeMultiplier = surgeMultiplier
    }

    if (externalMultiplier !== 1) {
      breakdown.externalMultiplier = externalMultiplier
    }

    return {
      fee: finalFee,
      distance: Math.round(distance * 10) / 10,
      zone: zoneToUse.name,
      maxDistance: this.config.maxDistance,
      breakdown
    }
  }

  async calculateDeliveryFeeFromCoordinates(
    userLat: number,
    userLng: number,
    orderAmount: number,
    currentHour?: number,
    promotionCode?: string
  ): Promise<DeliveryFeeDetails> {
    try {
      const distance = this.calculateDistance(
        this.RESTAURANT_LOCATION.lat,
        this.RESTAURANT_LOCATION.lng,
        userLat,
        userLng
      )

      const zone = this.findZone(distance)
      this.validateDeliveryRequest(distance, orderAmount, zone)

      const hour = currentHour || new Date().getHours()
      const result = this.calculateDeliveryFeeInternal(distance, orderAmount, hour, zone)

      if (promotionCode && this.activePromotions.has(promotionCode)) {
        const promotion = this.activePromotions.get(promotionCode)!
        if (this.isPromotionValid(promotion, orderAmount, zone?.id || 'unknown')) {
          result.fee = this.applyPromotion(result.fee, promotion)
          result.breakdown.appliedPromotion = {
            code: promotion.code,
            type: promotion.type,
            value: promotion.value
          }
        }
      }

      return result as DeliveryFeeDetails
    } catch (error) {
      if (error instanceof DeliveryError) {
        throw error
      }
      throw new DeliveryError('Calculation failed', 'CALCULATION_ERROR', { originalError: error })
    }
  }

  calculateEstimatedDeliveryFee(
    city: string,
    area: string,
    orderAmount: number,
    promotionCode?: string
  ): DeliveryFeeDetails {
    try {
      const normalizedArea = area?.toLowerCase().trim() || ''
      let distance = this.AREA_DISTANCES[normalizedArea]

      if (!distance) {
        for (const [key, value] of Object.entries(this.AREA_DISTANCES)) {
          if (normalizedArea.includes(key) || key.includes(normalizedArea)) {
            distance = value
            break
          }
        }
      }

      distance = distance || 3.0

      const zone = this.findZone(distance)
      this.validateDeliveryRequest(distance, orderAmount, zone)

      const result = this.calculateDeliveryFeeInternal(distance, orderAmount, new Date().getHours(), zone)

      if (promotionCode && this.activePromotions.has(promotionCode)) {
        const promotion = this.activePromotions.get(promotionCode)!
        if (this.isPromotionValid(promotion, orderAmount, zone?.id || 'unknown')) {
          result.fee = this.applyPromotion(result.fee, promotion)
          result.breakdown.appliedPromotion = {
            code: promotion.code,
            type: promotion.type,
            value: promotion.value
          }
        }
      }

      return result as DeliveryFeeDetails
    } catch (error) {
      if (error instanceof DeliveryError) {
        throw error
      }
      throw new DeliveryError('Calculation failed', 'CALCULATION_ERROR', { originalError: error })
    }
  }

  extractAreaFromAddress(address: string): string {
    if (!address) return 'addis ababa'

    const addressParts = address.split(',')
    const areaKeywords = Object.keys(this.AREA_DISTANCES)

    for (const part of addressParts) {
      const trimmedPart = part.trim().toLowerCase()
      for (const keyword of areaKeywords) {
        if (trimmedPart.includes(keyword)) {
          return keyword
        }
      }
    }

    return addressParts[0]?.trim().toLowerCase() || 'addis ababa'
  }

  isWithinDeliveryRange(distance: number): boolean {
    return distance <= this.config.maxDistance
  }

  getDeliveryRangeInfo() {
    return {
      maxDistance: this.config.maxDistance,
      zones: this.zones.map(zone => ({
        name: zone.name,
        radius: zone.maxRadius,
        description: zone.description || `${zone.name}: ${zone.baseFee} ETB base fee`
      })),
      restaurant: {
        name: this.RESTAURANT_LOCATION.name,
        address: this.RESTAURANT_LOCATION.address
      }
    }
  }

  getRestaurantInfo() {
    return {
      name: this.RESTAURANT_LOCATION.name,
      address: this.RESTAURANT_LOCATION.address,
      coordinates: {
        lat: this.RESTAURANT_LOCATION.lat,
        lng: this.RESTAURANT_LOCATION.lng
      },
      deliveryRange: this.config.maxDistance
    }
  }

  clearCache(): void {
    this.distanceCache.clear()
  }
}

export const deliveryCalculator = new EnhancedDeliveryCalculator()