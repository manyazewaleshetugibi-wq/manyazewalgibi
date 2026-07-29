export type StationType = "BARISTA" | "COFFEE_MAKER" | "ALL"
export type UserRole = string | undefined

export interface CategoryStationMap {
  [categoryId: string]: StationType
}

/**
 * Determine which stations a user role should see
 */
export function getStationsForRole(role: UserRole): StationType[] {
  if (!role) return ["ALL"]
  const normalized = role.toLowerCase().trim()

  switch (normalized) {
    case "admin":
    case "kitchen":
    case "fb":
    case "pos":
      return ["BARISTA", "COFFEE_MAKER", "ALL"]
    case "barista":
      return ["BARISTA"]
    case "coffee_maker":
      return ["COFFEE_MAKER"]
    default:
      return ["BARISTA", "COFFEE_MAKER", "ALL"]
  }
}

/**
 * Check if an item should be visible to the given role based on its categoryId
 */
export function isItemVisibleForRole(
  categoryId: string | undefined,
  categoryStationMap: CategoryStationMap,
  role: UserRole
): boolean {
  if (!categoryId) return true

  const allowedStations = getStationsForRole(role)

  // If role has full access (admin, kitchen, etc.), show everything
  if (allowedStations.length === 3) return true

  const station = categoryStationMap[categoryId] || "ALL"
  return allowedStations.includes(station)
}

/**
 * Filter order items based on user role and category station mapping
 */
export function filterOrderItems<T extends { itemId?: string }>(
  items: T[],
  categoryStationMap: CategoryStationMap,
  itemCategoryMap: Record<string, string>,
  role: UserRole
): T[] {
  const allowedStations = getStationsForRole(role)

  // If role has full access, return all items
  if (allowedStations.length === 3) return items

  return items.filter((item) => {
    const categoryId = itemCategoryMap[item.itemId || ""]
    if (!categoryId) return true
    const station = categoryStationMap[categoryId] || "ALL"
    return allowedStations.includes(station)
  })
}
