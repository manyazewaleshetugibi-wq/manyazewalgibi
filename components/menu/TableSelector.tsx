// components/TableSelector.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Users, MapPin, Home, RefreshCw, Armchair, Store,
  CheckCircle, Coffee, Clock, AlertCircle, XCircle, Maximize2,
  ChevronDown, Filter, Layers, Eye, UserCheck, Timer,
  Lock, AlertTriangle, X, Undo2, ClipboardList
} from 'lucide-react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Types
export interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  location?: string;
  description?: string;
  features?: string[];
  floor?: string;
  restaurantId?: string;
  restaurantName?: string;
  section?: string;
  lastUpdated?: Date;
  currentOrder?: string;
  waiterId?: string;
  reservationInfo?: {
    reservedBy?: string;
    reservedByName?: string;
    reservedAt?: Date;
    expiresAt?: Date;
    orderId?: string;
    orderNumber?: string;
    customerName?: string;
    orderStatus?: string;
  };
}

interface RestaurantData {
  _id: string;
  restaurantId: string;
  restaurantName: string;
  floor: string;
  totalTables?: number;
  availableTables?: number;
  occupiedTables?: number;
  totalCapacity?: number;
}

interface ActiveSelection {
  tableId: string;
  tableNumber: number;
  selectedBy: string;
  selectedByName: string;
  selectedAt: string;
  expiresAt: string;
  orderId?: string;
}

interface TableSelectorProps {
  onTableSelect: (table: TableData | null, restaurantId: string, floor: string) => void;
  selectedTable?: TableData | null;
  isUserLoggedIn?: boolean;
  onLoginRequired?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  allowUnselect?: boolean;
  restaurantId?: string;
  floor?: string;
  arrangementId?: string;
  showOrderInfo?: boolean; // New prop to show order info on reserved tables
}

// Location icons
const LOCATION_ICONS: Record<string, string> = {
  salon: '🏠', garden: '🌳', kitchen: '🍳', terrace: '🌅',
  bar: '🍸', vip: '⭐', window: '🪟', entrance: '🚪',
  private: '🔒', outdoor: '☀️',
};

// Status config
const STATUS_CONFIG: Record<TableData['status'], { 
  color: string; 
  bgGradient: string; 
  label: string;
  badgeColor: string;
  icon: JSX.Element;
  description?: string;
}> = {
  available: {
    color: 'text-green-600',
    bgGradient: 'from-green-400 to-green-500',
    label: 'Available',
    badgeColor: 'bg-green-500 text-white',
    icon: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
  },
  occupied: {
    color: 'text-red-600',
    bgGradient: 'from-red-400 to-red-500',
    label: 'Occupied',
    badgeColor: 'bg-red-500 text-white',
    icon: <Coffee className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
  },
  reserved: {
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-400 to-yellow-500',
    label: 'Reserved',
    badgeColor: 'bg-yellow-500 text-white',
    icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
  },
  cleaning: {
    color: 'text-blue-600',
    bgGradient: 'from-blue-400 to-blue-500',
    label: 'Cleaning',
    badgeColor: 'bg-blue-500 text-white',
    icon: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
  },
  maintenance: {
    color: 'text-gray-600',
    bgGradient: 'from-gray-400 to-gray-500',
    label: 'Maintenance',
    badgeColor: 'bg-gray-500 text-white',
    icon: <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
  }
};

// Floor order for sorting
const FLOOR_ORDER: Record<string, number> = {
  'Ground Floor': 1,
  'First Floor': 2,
  'Second Floor': 3,
  'Third Floor': 4,
  'Rooftop': 5,
  'Basement': 6
};

// Countdown timer component
const SelectionTimer = ({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    const updateTimer = () => {
      const expiry = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  if (timeLeft <= 0) return null;
  
  return (
    <div className="flex items-center gap-1 text-xs">
      <Timer className="w-3 h-3" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
};

// Table Icon for Layout View
const TableIcon = ({ 
  table, 
  isSelected, 
  activeSelection,
  currentUserEmail,
  onUnselect,
  onClick,
  allowUnselect = true,
  showOrderInfo = false
}: { 
  table: TableData; 
  isSelected: boolean;
  activeSelection: ActiveSelection | null;
  currentUserEmail?: string;
  onUnselect?: (tableId: string) => void;
  onClick: (table: TableData) => void;
  allowUnselect?: boolean;
  showOrderInfo?: boolean;
}) => {
  const config = STATUS_CONFIG[table.status];
  const locationIcon = table.location ? LOCATION_ICONS[table.location] || '📍' : '';
  const isAvailable = table.status === 'available';
  const isReservedByOrder = table.status === 'reserved' && table.reservationInfo?.orderId;
  
  const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
  const isSelectedByMe = isSelectedByAny && activeSelection?.selectedBy === currentUserEmail;
  const isSelectedByOther = isSelectedByAny && !isSelectedByMe;
  
  const getShapeStyle = () => {
    let base = `absolute cursor-pointer bg-gradient-to-br ${config.bgGradient} 
      border-2 shadow-md hover:shadow-lg transition-all`;
    
    if (isSelected) {
      base += ' ring-4 ring-purple-400 ring-opacity-50 scale-105';
    } else if (isSelectedByMe) {
      base += ' ring-4 ring-green-400 ring-opacity-50';
    } else if (isSelectedByOther) {
      base += ' ring-4 ring-yellow-400 ring-opacity-50 opacity-75';
    } else if (isReservedByOrder) {
      base += ' ring-2 ring-orange-400 ring-opacity-50';
    }
    
    if (!isAvailable || isSelectedByOther || isReservedByOrder) {
      base += ' opacity-50 cursor-not-allowed';
    } else if (!isSelectedByOther && !isSelectedByMe) {
      base += ' hover:scale-105';
    }
    
    switch (table.shape) {
      case 'circle': return `${base} rounded-full flex items-center justify-center`;
      case 'square': return `${base} rounded-lg flex items-center justify-center`;
      case 'rectangle': return `${base} rounded-lg flex items-center justify-center`;
      default: return `${base} rounded-full flex items-center justify-center`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectedByOther) {
      toast.error(`Table ${table.number} is currently selected by ${activeSelection?.selectedByName}`);
      return;
    }
    if (isReservedByOrder) {
      toast.error(`Table ${table.number} has an active order and cannot be selected`);
      return;
    }
    if (!isAvailable) {
      toast.error(`Table ${table.number} is currently ${table.status} and cannot be selected`);
      return;
    }
    onClick(table);
  };

  const handleUnselectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnselect && isSelectedByMe && allowUnselect) {
      onUnselect(table.id);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const tableWidth = isMobile ? Math.min((table.width || 75) * 0.7, 60) : (table.width || 75);
  const tableHeight = isMobile ? Math.min((table.height || 75) * 0.7, 60) : (table.height || 75);

  return (
    <motion.div
      className={getShapeStyle()}
      style={{
        left: isMobile ? (table.x || 50) * 0.7 : table.x,
        top: isMobile ? (table.y || 50) * 0.7 : table.y,
        width: tableWidth,
        height: tableHeight,
      }}
      onClick={handleClick}
      whileHover={{ scale: (isAvailable && !isSelectedByOther && !isSelectedByMe && !isReservedByOrder) ? 1.05 : 1 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-1">
        {table.location && (
          <div className="absolute -top-1 -left-1">
            <Badge className="bg-purple-600 text-white text-[6px] sm:text-[8px] px-1 py-0.5">
              {locationIcon}
            </Badge>
          </div>
        )}
        
        {table.floor && (
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-blue-600 text-white text-[6px] sm:text-[8px] px-1 py-0.5">
              {table.floor === 'Ground Floor' ? 'GF' : table.floor === 'First Floor' ? '1F' : table.floor === 'Second Floor' ? '2F' : 'RF'}
            </Badge>
          </div>
        )}
        
        {isSelectedByAny && (
          <div className="absolute -top-2 -right-2">
            <Badge className={`${isSelectedByMe ? 'bg-green-500' : 'bg-yellow-500'} text-white text-[6px] sm:text-[8px] px-1 py-0.5 animate-pulse`}>
              {isSelectedByMe ? <UserCheck className="w-2 h-2" /> : <Eye className="w-2 h-2" />}
            </Badge>
          </div>
        )}

        {isReservedByOrder && showOrderInfo && (
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-orange-500 text-white text-[6px] sm:text-[8px] px-1 py-0.5">
              <ClipboardList className="w-2 h-2" />
            </Badge>
          </div>
        )}
        
        <div className="font-bold text-white text-[8px] sm:text-xs">T{table.number}</div>
        <div className="flex items-center gap-0.5 text-white text-[7px] sm:text-[10px]">
          <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          {table.capacity}
        </div>
        <div className="absolute -bottom-1 -right-1">
          {config.icon}
        </div>
        
        {isSelectedByOther && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
        
        {isReservedByOrder && showOrderInfo && (
          <div className="absolute inset-0 bg-orange-500/20 rounded-full flex items-center justify-center">
            <span className="text-[6px] font-bold text-orange-700 bg-white/80 px-1 rounded">ORDER</span>
          </div>
        )}
        
        {isSelectedByMe && (
          <div className="absolute inset-0 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-green-700 bg-white/80 px-1 rounded">YOU</span>
          </div>
        )}
        
        {isSelectedByMe && activeSelection && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <SelectionTimer 
              expiresAt={activeSelection.expiresAt} 
              onExpire={() => onUnselect && onUnselect(table.id)} 
            />
          </div>
        )}

        {isSelectedByMe && allowUnselect && (
          <button
            onClick={handleUnselectClick}
            className="absolute -top-2 -right-2 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg transition-all duration-200"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Table Detail Dialog
const TableDetailDialog = ({
  table,
  activeSelection,
  currentUserEmail,
  open,
  onOpenChange,
  onSelect,
  onUnselect,
  isUserLoggedIn,
  onLoginRequired,
  allowUnselect = true,
  showOrderInfo = false,
}: {
  table: TableData | null;
  activeSelection: ActiveSelection | null;
  currentUserEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (table: TableData) => void;
  onUnselect?: () => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  allowUnselect?: boolean;
  showOrderInfo?: boolean;
}) => {
  if (!table) return null;
  
  const config = STATUS_CONFIG[table.status];
  const locationIcon = table.location ? LOCATION_ICONS[table.location] || '📍' : '';
  const isAvailable = table.status === 'available';
  const isReservedByOrder = table.status === 'reserved' && table.reservationInfo?.orderId;
  const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
  const isSelectedByOther = isSelectedByAny && activeSelection?.selectedBy !== currentUserEmail;
  const isSelectedByMe = isSelectedByAny && activeSelection?.selectedBy === currentUserEmail;
  
  const canSelect = isAvailable && !isSelectedByAny && !isReservedByOrder;
  const canUnselect = isSelectedByMe && allowUnselect;

  const handleSelect = () => {
    if (!isUserLoggedIn) {
      onLoginRequired?.();
      return;
    }
    if (isReservedByOrder) {
      toast.error(`Table ${table.number} has an active order and cannot be selected`);
      return;
    }
    if (!canSelect) {
      if (isSelectedByOther) {
        toast.error(`Table ${table.number} is currently selected by ${activeSelection?.selectedByName}`);
      } else if (!isAvailable) {
        toast.error(`Table ${table.number} is currently ${table.status} and cannot be selected`);
      }
      return;
    }
    onSelect(table);
    onOpenChange(false);
    toast.success(`Table ${table.number} selected!`);
  };

  const handleUnselect = () => {
    if (canUnselect && onUnselect) {
      onUnselect();
      onOpenChange(false);
      toast.success(`Table ${table.number} unselected`);
    }
  };

  const getTimeRemaining = () => {
    if (!activeSelection || activeSelection.tableId !== table.id) return null;
    const expiry = new Date(activeSelection.expiresAt).getTime();
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((expiry - now) / 60000));
    return remaining;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-w-[95vw] bg-gradient-to-br from-white to-purple-50/30 rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${config.bgGradient} flex items-center justify-center`}>
              <Armchair className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            Table {table.number}
          </DialogTitle>
          <DialogDescription>
            Table details and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Show order info for reserved tables */}
          {isReservedByOrder && showOrderInfo && table.reservationInfo && (
            <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Active Order</span>
              </div>
              {table.reservationInfo.orderNumber && (
                <p className="text-xs text-orange-700">Order #{table.reservationInfo.orderNumber}</p>
              )}
              {table.reservationInfo.customerName && (
                <p className="text-xs text-orange-700">Customer: {table.reservationInfo.customerName}</p>
              )}
              {table.reservationInfo.orderStatus && (
                <p className="text-xs text-orange-700">Status: {table.reservationInfo.orderStatus}</p>
              )}
            </div>
          )}

          {isSelectedByAny && (
            <div className={`p-3 rounded-lg border ${isSelectedByMe ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSelectedByMe ? (
                    <UserCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className={`text-sm font-medium ${isSelectedByMe ? 'text-green-800' : 'text-yellow-800'}`}>
                    {isSelectedByMe 
                      ? 'You have selected this table' 
                      : `Selected by ${activeSelection?.selectedByName}`}
                  </span>
                </div>
                {isSelectedByMe && activeSelection && (
                  <div className="text-xs text-green-600">
                    <SelectionTimer 
                      expiresAt={activeSelection.expiresAt} 
                      onExpire={handleUnselect}
                    />
                  </div>
                )}
              </div>
              {isSelectedByOther && timeRemaining !== null && (
                <p className="text-xs text-yellow-600 mt-2">
                  Selection expires in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600">Status</span>
            <Badge className={`${config.badgeColor} text-xs`}>
              {isReservedByOrder && showOrderInfo ? 'Reserved (Order)' : config.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" /> Capacity
            </span>
            <span className="font-semibold text-sm sm:text-base">{table.capacity} seats</span>
          </div>

          {table.floor && (
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <Layers className="w-3 h-3 sm:w-4 sm:h-4" /> Floor
              </span>
              <span className="font-semibold text-sm">{table.floor}</span>
            </div>
          )}

          {table.restaurantName && (
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <Store className="w-3 h-3 sm:w-4 sm:h-4" /> Restaurant
              </span>
              <span className="font-semibold text-sm">{table.restaurantName}</span>
            </div>
          )}

          {table.location && (
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" /> Location
              </span>
              <span className="font-semibold text-sm">{locationIcon} {table.location}</span>
            </div>
          )}

          {table.description && (
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600 block mb-1">Description</span>
              <p className="text-xs sm:text-sm">{table.description}</p>
            </div>
          )}

          {table.features && table.features.length > 0 && (
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600 block mb-2">Features</span>
              <div className="flex flex-wrap gap-1">
                {table.features.slice(0, 3).map((feature, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] sm:text-xs bg-purple-50">
                    {feature}
                  </Badge>
                ))}
                {table.features.length > 3 && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    +{table.features.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1 text-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canUnselect ? (
            <Button
              className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white"
              onClick={handleUnselect}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Unselect Table
            </Button>
          ) : (
            <Button
              className={`flex-1 text-sm ${canSelect ? 'bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950' : 'bg-gray-400'}`}
              onClick={handleSelect}
              disabled={!canSelect || !isUserLoggedIn || isSelectedByOther || isReservedByOrder}
            >
              {isSelectedByMe ? 'Already Selected' : 
               isSelectedByOther ? 'Selected by Another' : 
               isReservedByOrder ? 'Has Active Order' : 
               !isAvailable ? `Not Available (${config.label})` : 
               'Select Table'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Floor Card Component
const FloorCard = ({ 
  floor, 
  restaurants, 
  onRestaurantSelect,
  selectedRestaurantId,
  selectedFloor
}: { 
  floor: string;
  restaurants: RestaurantData[];
  onRestaurantSelect: (restaurantId: string, floor: string) => void;
  selectedRestaurantId: string;
  selectedFloor: string;
}) => {
  const floorRestaurants = restaurants.filter(r => r.floor === floor);
  const totalTables = floorRestaurants.reduce((sum, r) => sum + (r.totalTables || 0), 0);
  const totalAvailable = floorRestaurants.reduce((sum, r) => sum + (r.availableTables || 0), 0);
  const isActive = selectedFloor === floor;

  return (
    <Card 
      className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}`}
      onClick={() => {
        if (floorRestaurants.length === 1) {
          onRestaurantSelect(floorRestaurants[0].restaurantId, floor);
        }
      }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className="font-medium text-sm">{floor}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-green-600">{totalAvailable} free</span>
            <span className="text-gray-400">|</span>
            <span>{totalTables} total</span>
          </div>
        </div>
        {floorRestaurants.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {floorRestaurants.map(r => (
              <Badge 
                key={r.restaurantId}
                variant={selectedRestaurantId === r.restaurantId && isActive ? 'default' : 'outline'}
                className={`text-xs cursor-pointer ${selectedRestaurantId === r.restaurantId && isActive ? 'bg-purple-600' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRestaurantSelect(r.restaurantId, floor);
                }}
              >
                {r.restaurantName}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Component
export function TableSelector({
  onTableSelect,
  selectedTable = null,
  isUserLoggedIn = true,
  onLoginRequired,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  allowUnselect = true,
  restaurantId: propRestaurantId,
  floor: propFloor,
  showOrderInfo = true, // Default to true to show order info
}: TableSelectorProps) {
  const { data: session } = useSession();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(propRestaurantId || '');
  const [selectedFloor, setSelectedFloor] = useState<string>(propFloor || '');
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableData | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string>('');
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'layout' | 'list'>('layout');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL = 5000;

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const fetchSelectionStatus = useCallback(async () => {
    if (!selectedRestaurantId || !selectedFloor) return;
    
    try {
      const response = await axios.get('/api/tables/arrangement', {
        params: {
          restaurantId: selectedRestaurantId,
          floor: selectedFloor,
          includeSelections: true,
          skipSync: false // Ensure we get synced data
        }
      });
      
      if (response.data.success) {
        if (response.data.activeSelection) {
          setActiveSelection(response.data.activeSelection);
        } else {
          setActiveSelection(null);
        }
      }
    } catch (error) {
      // Silently fail polling
    }
  }, [selectedRestaurantId, selectedFloor]);

  const setupPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      fetchSelectionStatus();
    }, POLLING_INTERVAL);
  }, [fetchSelectionStatus]);

  useEffect(() => {
    const currentRestaurantId = selectedRestaurantId;
    const currentFloor = selectedFloor;
    
    if (!currentRestaurantId || !currentFloor || !open) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    let sseFailed = false;

    try {
      const es = new EventSource(`/api/tables/arrangement/selection-status?restaurantId=${currentRestaurantId}&floor=${currentFloor}`);
      
      es.onopen = () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        sseFailed = false;
      };
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'selection') {
            const newSelection = data.data;
            
            setActiveSelection(prev => {
              // If selection was cleared (by timer or user), update table status to available
              if (newSelection === null && prev !== null) {
                setTables(currentTables => currentTables.map(t => 
                  t.id === prev.tableId ? { ...t, status: 'available' as const, lastUpdated: new Date() } : t
                ));
              } 
              // If a new selection is detected, sync the table status to reserved
              else if (newSelection !== null && (!prev || prev.tableId !== newSelection.tableId)) {
                setTables(currentTables => currentTables.map(t => 
                  t.id === newSelection.tableId ? { ...t, status: 'reserved' as const, lastUpdated: new Date() } : t
                ));
              }
              return newSelection;
            });
            
            if (newSelection && newSelection.selectedBy !== session?.user?.email && newSelection.selectedBy !== 'anonymous') {
              toast(`${newSelection.selectedByName} selected Table ${newSelection.tableNumber}`, {
                icon: '🪑',
                duration: 2000,
              });
            }
            if (newSelection === null && activeSelection !== null) {
              toast(`Table selection has been released`, {
                icon: '🔓',
                duration: 2000,
              });
            }
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      es.onerror = () => {
        if (!sseFailed) {
          sseFailed = true;
          es.close();
          setupPolling();
        }
      };

      eventSourceRef.current = es;
    } catch (error) {
      setupPolling();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedRestaurantId, selectedFloor, open, session, setupPolling, activeSelection]);

  const fetchAllRestaurants = useCallback(async () => {
    try {
      const response = await axios.get('/api/tables/arrangement', {
        params: { fetchAll: true }
      });
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const restaurantsArray = Array.isArray(data) ? data : [data];
        setRestaurants(restaurantsArray);
        
        const floors = [...new Set(restaurantsArray.map(r => r.floor))];
        floors.sort((a, b) => (FLOOR_ORDER[a] || 999) - (FLOOR_ORDER[b] || 999));
        
        if (!propRestaurantId && floors.length > 0 && !selectedFloor) {
          setSelectedFloor(floors[0]);
          const firstRestaurantOnFloor = restaurantsArray.find(r => r.floor === floors[0]);
          if (firstRestaurantOnFloor) {
            setSelectedRestaurantId(firstRestaurantOnFloor.restaurantId);
            setCurrentRestaurantName(firstRestaurantOnFloor.restaurantName);
          }
        } else if (propRestaurantId) {
          const propRestaurant = restaurantsArray.find(r => r.restaurantId === propRestaurantId);
          if (propRestaurant) {
            setSelectedRestaurantId(propRestaurant.restaurantId);
            setSelectedFloor(propRestaurant.floor);
            setCurrentRestaurantName(propRestaurant.restaurantName);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setRestaurants([]);
    }
  }, [selectedFloor, propRestaurantId, propFloor]);

  const fetchTablesForSelection = useCallback(async () => {
    if (!selectedRestaurantId || !selectedFloor) return;
    
    try {
      setIsLoading(true);
      // This GET request now automatically syncs with pending orders
      const response = await axios.get('/api/tables/arrangement', {
        params: { 
          restaurantId: selectedRestaurantId, 
          floor: selectedFloor,
          includeSelections: true
        }
      });
      
      if (response.data.success && response.data.data) {
        const arrangement = response.data.data;
        const tableData = (arrangement.tables || []).map((t: any) => ({
          ...t,
          shape: t.shape || 'circle',
          x: t.x || 50,
          y: t.y || 50,
          width: t.width || 75,
          height: t.height || 75,
          floor: selectedFloor,
          restaurantId: selectedRestaurantId,
          restaurantName: arrangement.restaurantName,
          reservationInfo: t.reservationInfo || null, // Include reservation info from sync
        }));
        setTables(tableData);
        setDimensions(arrangement.dimensions || { width: 800, height: 500 });
        setCurrentRestaurantName(arrangement.restaurantName);
        setLastSyncTime(new Date());
        
        if (response.data.activeSelection) {
          setActiveSelection(response.data.activeSelection);
        }
        
        // Log sync info if present
        if (response.data.syncInfo) {
          console.log('[TableSelector] Auto-sync performed:', response.data.syncInfo);
        }
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRestaurantId, selectedFloor]);

  useEffect(() => {
    fetchAllRestaurants();
  }, [fetchAllRestaurants]);

  useEffect(() => {
    if (open && selectedRestaurantId && selectedFloor) {
      fetchTablesForSelection();
    }
  }, [open, selectedRestaurantId, selectedFloor, fetchTablesForSelection]);

  const handleRestaurantSelect = (restaurantId: string, floor: string) => {
    setSelectedRestaurantId(restaurantId);
    setSelectedFloor(floor);
    const restaurant = restaurants.find(r => r.restaurantId === restaurantId);
    if (restaurant) {
      setCurrentRestaurantName(restaurant.restaurantName);
    }
  };

  const handleTableClick = (table: TableData) => {
    setSelectedTableForDetail(table);
    setShowDetailDialog(true);
  };

  const handleUnselectTable = async (tableId?: string) => {
    const targetTableId = tableId || activeSelection?.tableId;
    
    if (!targetTableId) {
      toast.error('You have no active table selection');
      return;
    }

    // Find the specific table to ensure we use its correct restaurant and floor context
    const targetTable = tables.find(t => t.id === targetTableId);
    const rId = targetTable?.restaurantId || selectedRestaurantId;
    const fName = targetTable?.floor || selectedFloor;

    if (!rId || !fName) {
      toast.error('Missing restaurant or floor information');
      return;
    }

    const clearLocalState = () => {
      setActiveSelection(null);
      setTables(prev => prev.map(t => 
        t.id === targetTableId 
          ? { ...t, status: 'available' as const, lastUpdated: new Date() }
          : t
      ));
      onTableSelect(null, rId, fName);
    };

    try {
      setIsSelecting(true);
      const response = await axios.patch('/api/tables/arrangement', {
        restaurantId: rId,
        floor: fName,
        tableId: targetTableId,
        unselectTable: true
      });
      
      if (response.data.success) {
        clearLocalState();
        toast.success(`Table unselected successfully`);
      }
    } catch (error: any) {
      console.error('Error unselecting table:', error);
      // If 400 or 404, the selection likely already expired on the server.
      // We should still clear local state to unblock the UI.
      if (error.response?.status === 400 || error.response?.status === 404) {
        clearLocalState();
      } else {
        toast.error(error.response?.data?.error || 'Failed to unselect table.');
      }
    } finally {
      setIsSelecting(false);
    }
  };

  const handleSelectTable = async (table: TableData) => {
    if (!isUserLoggedIn) {
      onLoginRequired?.();
      return;
    }
    
    if (isSelecting) {
      toast.loading('Processing selection...');
      return;
    }
    
    // Check if table has active order before attempting selection
    if (table.status === 'reserved' && table.reservationInfo?.orderId) {
      toast.error(`Table ${table.number} has an active order and cannot be selected`);
      return;
    }
    
    try {
      setIsSelecting(true);
      
      const response = await axios.patch('/api/tables/arrangement', {
        restaurantId: selectedRestaurantId,
        floor: selectedFloor,
        tableId: table.id,
        selectTable: true,
        duration: 3,
        updates: { temporaryReserve: true }
      });
      
      if (response.data.success) {
        setActiveSelection(response.data.data.selection);
        
        setTables(prev => prev.map(t => 
          t.id === table.id 
            ? { ...t, status: 'reserved' as const, lastUpdated: new Date() }
            : t
        ));
        
        // Pass complete table data including restaurant info
        const selectedTableWithDetails = {
          ...table,
          restaurantId: selectedRestaurantId,
          restaurantName: currentRestaurantName,
          floor: selectedFloor
        };
        
        onTableSelect(selectedTableWithDetails, selectedRestaurantId, selectedFloor);
        setOpen(false);
        toast.success(`Table ${table.number} selected successfully!`);
      }
    } catch (error: any) {
      console.error('Error selecting table:', error);
      
      if (error.response?.status === 409) {
        const conflictData = error.response.data;
        toast.error(conflictData.error || 'Table already selected by another customer');
        
        if (conflictData.currentSelection) {
          setActiveSelection(conflictData.currentSelection);
        }
      } else if (error.response?.status === 401) {
        toast.error('Please login to select a table');
        onLoginRequired?.();
      } else if (error.response?.status === 404) {
        toast.error('Table arrangement not found. Please contact restaurant staff.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to select table. Please try again.');
      }
    } finally {
      setIsSelecting(false);
    }
  };

  // Filter tables by status
  const filteredTables = useMemo(() => {
    return statusFilter === 'all' 
      ? tables 
      : tables.filter(t => t.status === statusFilter);
  }, [tables, statusFilter]);

  // Get unique floors for display - always show all floors
  const uniqueFloors = useMemo(() => {
    const floors = [...new Set(restaurants.map(r => r.floor))];
    floors.sort((a, b) => (FLOOR_ORDER[a] || 999) - (FLOOR_ORDER[b] || 999));
    return floors;
  }, [restaurants]);

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const scaledWidth = isMobile ? Math.min(dimensions.width * 0.7, 500) : dimensions.width;
  const scaledHeight = isMobile ? Math.min(dimensions.height * 0.7, 400) : dimensions.height;

  const isTableSelectedByMe = activeSelection && activeSelection.selectedBy === session?.user?.email;

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-purple-800 to-purple-900 rounded-xl">
            <Armchair className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Select a Table</h3>
            {currentRestaurantName && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Store className="w-3 h-3" />
                {currentRestaurantName} • {selectedFloor}
              </p>
            )}
          </div>
        </div>
        
        {allowUnselect && isTableSelectedByMe && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUnselectTable()}
            disabled={isSelecting}
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Undo2 className="w-4 h-4" />
            Unselect Table {activeSelection?.tableNumber}
          </Button>
        )}
      </div>

      {/* Last sync info - helpful for customers to know data is current */}
      {lastSyncTime && (
        <div className="text-[10px] text-gray-400 text-right">
          Updated: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}

      {/* Floor Selection - Always visible with full filtering functionality */}
      {uniqueFloors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Select Floor
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {uniqueFloors.map((floor) => (
              <FloorCard
                key={floor}
                floor={floor}
                restaurants={restaurants}
                onRestaurantSelect={handleRestaurantSelect}
                selectedRestaurantId={selectedRestaurantId}
                selectedFloor={selectedFloor}
              />
            ))}
          </div>
        </div>
      )}

      {/* View Mode Toggle & Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'layout' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode('layout')}
          >
            Layout View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            <SelectItem value="available">Available Only</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-5 gap-1">
        <div className="bg-green-50 rounded-lg px-2 py-1 text-center">
          <div className="text-sm font-bold text-green-600">{stats.available}</div>
          <div className="text-[8px] text-gray-500">Free</div>
        </div>
        <div className="bg-red-50 rounded-lg px-2 py-1 text-center">
          <div className="text-sm font-bold text-red-600">{stats.occupied}</div>
          <div className="text-[8px] text-gray-500">Used</div>
        </div>
        <div className="bg-yellow-50 rounded-lg px-2 py-1 text-center">
          <div className="text-sm font-bold text-yellow-600">{stats.reserved}</div>
          <div className="text-[8px] text-gray-500">Reserved</div>
        </div>
        <div className="bg-blue-50 rounded-lg px-2 py-1 text-center">
          <div className="text-sm font-bold text-blue-600">{stats.cleaning}</div>
          <div className="text-[8px] text-gray-500">Cleaning</div>
        </div>
        <div className="bg-gray-50 rounded-lg px-2 py-1 text-center">
          <div className="text-sm font-bold">{stats.total}</div>
          <div className="text-[8px] text-gray-500">Total</div>
        </div>
      </div>

      {/* Selected Table Preview */}
      {selectedTable && (
        <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${STATUS_CONFIG[selectedTable.status].bgGradient} flex items-center justify-center`}>
              <Armchair className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-medium text-purple-900">Table {selectedTable.number}</span>
              <div className="text-xs text-gray-600">
                {selectedTable.capacity} seats • {selectedTable.location || 'No location'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_CONFIG[selectedTable.status].badgeColor}>
              {selectedTable.reservationInfo?.orderId && showOrderInfo ? 'Reserved (Order)' : STATUS_CONFIG[selectedTable.status].label}
            </Badge>
            {allowUnselect && isTableSelectedByMe && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnselectTable()}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tables Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : filteredTables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Armchair className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tables found</p>
            <p className="text-xs text-gray-400 mt-1">Try changing the filter or selecting a different floor</p>
          </CardContent>
        </Card>
      ) : viewMode === 'layout' ? (
        <div className="relative">
          {/* Zoom controls for mobile */}
          {isMobile && (
            <div className="flex items-center justify-end gap-2 mb-2">
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setZoom(Math.max(50, zoom - 10))}>-</Button>
              <span className="text-xs">{zoom}%</span>
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setZoom(Math.min(150, zoom + 10))}>+</Button>
              <Maximize2 className="w-3 h-3 cursor-pointer" onClick={() => setZoom(100)} />
            </div>
          )}
          
          <div 
            className="relative bg-gradient-to-br from-purple-50/30 to-white rounded-xl border border-purple-100 overflow-auto"
            style={{ height: '400px', maxHeight: '60vh' }}
          >
            <div 
              className="relative"
              style={{ 
                width: scaledWidth * (zoom / 100),
                height: scaledHeight * (zoom / 100),
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              {filteredTables.map((table) => (
                <TableIcon
                  key={table.id}
                  table={table}
                  isSelected={selectedTable?.id === table.id}
                  activeSelection={activeSelection}
                  currentUserEmail={session?.user?.email}
                  onUnselect={handleUnselectTable}
                  onClick={handleTableClick}
                  allowUnselect={allowUnselect}
                  showOrderInfo={showOrderInfo}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTables.map((table) => {
            const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
            const isSelectedByOther = isSelectedByAny && activeSelection?.selectedBy !== session?.user?.email;
            const isSelectedByMe = isSelectedByAny && activeSelection?.selectedBy === session?.user?.email;
            const isReservedByOrder = table.status === 'reserved' && table.reservationInfo?.orderId;
              
            return (
              <div
                key={table.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTable?.id === table.id 
                    ? 'border-purple-500 bg-purple-50' 
                    : isSelectedByMe
                    ? 'border-green-500 bg-green-50'
                    : isSelectedByOther
                    ? 'border-yellow-500 bg-yellow-50 opacity-75'
                    : isReservedByOrder
                    ? 'border-orange-500 bg-orange-50/30'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
                onClick={() => handleTableClick(table)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${STATUS_CONFIG[table.status].bgGradient} flex items-center justify-center`}>
                      <Armchair className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Table {table.number}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{table.capacity} seats</span>
                        {table.location && <span>{LOCATION_ICONS[table.location]} {table.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelectedByMe && (
                      <Badge className="bg-green-500 text-white text-xs">Selected by You</Badge>
                    )}
                    {isSelectedByOther && (
                      <Badge className="bg-yellow-500 text-white text-xs">Selected</Badge>
                    )}
                    {isReservedByOrder && showOrderInfo && (
                      <Badge className="bg-orange-500 text-white text-xs">Order Active</Badge>
                    )}
                    <Badge className={STATUS_CONFIG[table.status].badgeColor}>
                      {isReservedByOrder && showOrderInfo ? 'Reserved' : STATUS_CONFIG[table.status].label}
                    </Badge>
                    {isSelectedByMe && allowUnselect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnselectTable(table.id);
                        }}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {isSelectedByMe && activeSelection && (
                  <div className="mt-2 text-xs text-green-600">
                    <SelectionTimer expiresAt={activeSelection.expiresAt} />
                  </div>
                )}
                {isSelectedByOther && activeSelection && (
                  <div className="mt-1 text-xs text-yellow-600">
                    by {activeSelection.selectedByName}
                  </div>
                )}
                {isReservedByOrder && showOrderInfo && table.reservationInfo?.orderNumber && (
                  <div className="mt-1 text-xs text-orange-600">
                    Order #{table.reservationInfo.orderNumber} in progress
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="text-xs text-gray-400 text-center">
        💡 Click on a table to view details • Only available tables can be selected
        {allowUnselect && " • Click X to unselect your selected table"}
      </div>
    </div>
  );

  if (controlledOpen !== undefined) {
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[800px] max-w-[95vw] max-h-[90vh] bg-gradient-to-br from-white to-purple-50/30 rounded-xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Armchair className="w-5 h-5 text-purple-600" />
                Select a Table
              </DialogTitle>
              <DialogDescription>
                Browse tables by floor and restaurant, then click on an available table to select
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>

        <TableDetailDialog
          table={selectedTableForDetail}
          activeSelection={activeSelection}
          currentUserEmail={session?.user?.email}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onSelect={handleSelectTable}
          onUnselect={() => handleUnselectTable(selectedTableForDetail?.id)}
          isUserLoggedIn={isUserLoggedIn}
          onLoginRequired={onLoginRequired}
          allowUnselect={allowUnselect}
          showOrderInfo={showOrderInfo}
        />
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-xl p-0">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full z-50" />
          <SheetHeader className="pt-4 px-4">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Armchair className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              Select a Table
            </SheetTitle>
          </SheetHeader>
          <div className="pt-2 px-4 pb-4 h-full overflow-y-auto">
            {content}
          </div>
        </SheetContent>
      </Sheet>

      <TableDetailDialog
        table={selectedTableForDetail}
        activeSelection={activeSelection}
        currentUserEmail={session?.user?.email}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onSelect={handleSelectTable}
        onUnselect={() => handleUnselectTable(selectedTableForDetail?.id)}
        isUserLoggedIn={isUserLoggedIn}
        onLoginRequired={onLoginRequired}
        allowUnselect={allowUnselect}
        showOrderInfo={showOrderInfo}
      />
    </>
  );
}

export default TableSelector;