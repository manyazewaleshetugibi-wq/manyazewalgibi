'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Users, MapPin, Armchair, Store,
  CheckCircle, Coffee, Clock, AlertCircle, XCircle,
  Filter, Layers, Eye, UserCheck, Timer,
  Lock, X, Undo2, ClipboardList, User, RefreshCw, SwitchCamera
} from 'lucide-react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

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
  isAnonymous?: boolean;
  anonymousId?: string;
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
  showOrderInfo?: boolean;
  autoSwitchTables?: boolean;
}

const STATUS_CONFIG: Record<TableData['status'], { 
  color: string; 
  bgGradient: string; 
  label: string;
  badgeColor: string;
  icon: JSX.Element;
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

const FLOOR_ORDER: Record<string, number> = {
  'Ground Floor': 1,
  'First Floor': 2,
  'Second Floor': 3,
  'Third Floor': 4,
  'Rooftop': 5,
  'Basement': 6
};

const getAnonymousId = (): string => {
  if (typeof window === 'undefined') return '';
  let anonymousId = localStorage.getItem('table_selector_anonymous_id');
  if (!anonymousId) {
    anonymousId = uuidv4();
    localStorage.setItem('table_selector_anonymous_id', anonymousId);
  }
  return anonymousId;
};

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
    <div className="flex items-center gap-1 text-xs font-mono">
      <Timer className="w-3 h-3" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
};

const TableIcon = ({ 
  table, 
  isSelected, 
  activeSelection,
  currentUserEmail,
  anonymousId,
  onUnselect,
  onClick,
  allowUnselect = true,
}: { 
  table: TableData; 
  isSelected: boolean;
  activeSelection: ActiveSelection | null;
  currentUserEmail?: string;
  anonymousId?: string;
  onUnselect?: (tableId: string) => void;
  onClick: (table: TableData) => void;
  allowUnselect?: boolean;
}) => {
  const config = STATUS_CONFIG[table.status];
  const isAvailable = table.status === 'available';
  const isReservedByOrder = table.status === 'reserved' && table.reservationInfo?.orderId;
  
  const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
  const isSelectedByMe = isSelectedByAny && (
    (currentUserEmail && activeSelection?.selectedBy === currentUserEmail) ||
    (anonymousId && activeSelection?.anonymousId === anonymousId)
  );
  const isSelectedByOther = isSelectedByAny && !isSelectedByMe;
  
  const getShapeStyle = () => {
    let base = `absolute cursor-pointer bg-gradient-to-br ${config.bgGradient} 
      border-2 shadow-md hover:shadow-lg transition-all duration-200`;
    
    if (isSelected) {
      base += ' ring-4 ring-purple-400 ring-opacity-50 scale-105 z-20';
    } else if (isSelectedByMe) {
      base += ' ring-4 ring-green-400 ring-opacity-50 z-10';
    } else if (isSelectedByOther) {
      base += ' ring-4 ring-yellow-400 ring-opacity-50 opacity-75';
    } else if (isReservedByOrder) {
      base += ' ring-2 ring-orange-400 ring-opacity-50';
    }
    
    if (!isAvailable || isSelectedByOther || isReservedByOrder) {
      base += ' opacity-50 cursor-not-allowed';
    } else if (!isSelectedByOther && !isSelectedByMe) {
      base += ' hover:scale-105 hover:z-30';
    }
    
    switch (table.shape) {
      case 'circle': return `${base} rounded-full flex items-center justify-center`;
      case 'square': return `${base} rounded-lg flex items-center justify-center`;
      default: return `${base} rounded-full flex items-center justify-center`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectedByOther) {
      toast.error(`Table ${table.number} is being selected by another customer.`);
      return;
    }
    if (isReservedByOrder) {
      toast.error(`Table ${table.number} has an active order.`);
      return;
    }
    if (!isAvailable) {
      toast.error(`Table ${table.number} is currently ${table.status}.`);
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
      transition={{ duration: 0.2 }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-1">
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
        
        {isSelectedByMe && (
          <div className="absolute inset-0 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-green-700 bg-white/80 px-1 rounded">
              YOU
            </span>
          </div>
        )}
        
        {isSelectedByMe && activeSelection && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
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

const SelectedTableBanner = ({ 
  selectedTable, 
  activeSelection, 
  onUnselect, 
  isSelecting 
}: { 
  selectedTable: TableData | null;
  activeSelection: ActiveSelection | null;
  onUnselect: () => void;
  isSelecting: boolean;
}) => {
  if (!selectedTable || !activeSelection) return null;
  
  return (
    <Alert className="bg-green-50 border-green-200">
      <UserCheck className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 text-sm font-medium">
        Currently Selected Table
      </AlertTitle>
      <AlertDescription className="text-green-700">
        <div className="flex items-center justify-between flex-wrap gap-2 mt-1">
          <div>
            <span className="font-bold">Table {selectedTable.number}</span>
            <span className="text-xs ml-2 text-green-600">
              ({selectedTable.capacity} seats)
            </span>
            {activeSelection.expiresAt && (
              <div className="text-xs mt-1">
                <SelectionTimer 
                  expiresAt={activeSelection.expiresAt} 
                  onExpire={onUnselect}
                />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnselect}
            disabled={isSelecting}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Undo2 className="w-3 h-3 mr-1" />
            Unselect
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

const TableDetailDialog = ({
  table,
  activeSelection,
  currentUserEmail,
  anonymousId,
  open,
  onOpenChange,
  onSelect,
  onUnselect,
  isUserLoggedIn,
  onLoginRequired,
  allowUnselect = true,
}: {
  table: TableData | null;
  activeSelection: ActiveSelection | null;
  currentUserEmail?: string;
  anonymousId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (table: TableData) => Promise<void>;
  onUnselect?: () => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  allowUnselect?: boolean;
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  if (!table) return null;
  
  const config = STATUS_CONFIG[table.status];
  const isAvailable = table.status === 'available';
  const isReservedByOrder = table.status === 'reserved' && table.reservationInfo?.orderId;
  const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
  const isSelectedByOther = isSelectedByAny && 
    activeSelection?.selectedBy !== currentUserEmail && 
    activeSelection?.anonymousId !== anonymousId;
  const isSelectedByMe = isSelectedByAny && 
    ((currentUserEmail && activeSelection?.selectedBy === currentUserEmail) ||
     (anonymousId && activeSelection?.anonymousId === anonymousId));
  
  const canSelect = isAvailable && !isSelectedByAny && !isReservedByOrder;
  const canUnselect = isSelectedByMe && allowUnselect;

  const handleSelect = async () => {
    if (isActionLoading) return;
    if (isReservedByOrder) {
      toast.error(`Table ${table.number} has an active order.`);
      return;
    }
    if (!canSelect) {
      if (isSelectedByOther) {
        toast.error(`Table ${table.number} is being selected by another customer.`);
      } else if (!isAvailable) {
        toast.error(`Table ${table.number} is currently ${table.status}.`);
      }
      return;
    }
    setIsActionLoading(true);
    try {
      await onSelect(table);
      onOpenChange(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnselect = () => {
    if (isActionLoading) return;
    if (canUnselect && onUnselect) {
      onUnselect();
      onOpenChange(false);
    }
  };

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
          {isSelectedByMe && activeSelection && (
            <div className="p-3 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    You have selected this table
                  </span>
                </div>
                <SelectionTimer 
                  expiresAt={activeSelection.expiresAt} 
                  onExpire={handleUnselect}
                />
              </div>
            </div>
          )}

          {isSelectedByOther && (
            <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Selected by another customer
                </span>
              </div>
            </div>
          )}

          {isReservedByOrder && table.reservationInfo && (
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
            </div>
          )}

          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-600">Status</span>
            <Badge className={`${config.badgeColor} text-xs`}>
              {isReservedByOrder ? 'Reserved (Order)' : config.label}
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
              <span className="font-semibold text-sm">{table.location}</span>
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
          <Button variant="outline" className="flex-1 text-sm" onClick={() => onOpenChange(false)} disabled={isActionLoading}>
            Cancel
          </Button>
          {canUnselect ? (
            <Button
              className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white"
              onClick={handleUnselect}
              disabled={isActionLoading}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Unselect Table
            </Button>
          ) : (
            <Button
              className={`flex-1 text-sm ${canSelect ? 'bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleSelect}
              disabled={!canSelect || isActionLoading}
            >
              {isActionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isSelectedByMe ? 'Already Selected' : 
               isSelectedByOther ? 'Selected by Another' : 
               isReservedByOrder ? 'Has Active Order' : 
               !isAvailable ? `Not Available` : 
               'Select Table'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

// Main Component - COMPLETE WITH GUEST SUPPORT
export function TableSelector({
  onTableSelect,
  selectedTable = null,
  isUserLoggedIn = false, // Default to false for guest access
  onLoginRequired,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  allowUnselect = true,
  restaurantId: propRestaurantId,
  floor: propFloor,
  showOrderInfo = true,
  autoSwitchTables = true,
}: TableSelectorProps) {
  const { data: session, status: sessionStatus } = useSession();
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
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isSwitchingTable, setIsSwitchingTable] = useState(false);
  
  const selectionLockRef = useRef(false);
  const lastSelectionAttemptRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL = 3000;
  
  const anonymousId = useMemo(() => {
    if (isUserLoggedIn) return undefined;
    return getAnonymousId();
  }, [isUserLoggedIn]);
  
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const isAuthenticated = useCallback(() => {
    // Guest users are always "authenticated" for table selection
    if (!isUserLoggedIn) return true;
    return sessionStatus === 'authenticated' && session?.user?.email;
  }, [isUserLoggedIn, sessionStatus, session]);

  const handleSessionExpired = useCallback(() => {
    // Don't expire for guests
    if (!isUserLoggedIn) return;
    
    if (isSessionExpired) return;
    setIsSessionExpired(true);
    setActiveSelection(null);
    if (selectedTable) {
      onTableSelect(null, selectedRestaurantId, selectedFloor);
    }
    toast.error('Session expired. Please log in again.');
    if (onLoginRequired) onLoginRequired();
  }, [isSessionExpired, selectedTable, selectedRestaurantId, selectedFloor, onTableSelect, onLoginRequired, isUserLoggedIn]);

  const getAxiosConfig = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isUserLoggedIn && anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
    return { headers, withCredentials: isUserLoggedIn, timeout: 30000 };
  }, [isUserLoggedIn, anonymousId]);

  const fetchSelectionStatus = useCallback(async () => {
    if (!selectedRestaurantId || !selectedFloor || isSessionExpired) return;
    
    try {
      const response = await axios.get('/api/tables/arrangement', {
        params: { restaurantId: selectedRestaurantId, floor: selectedFloor, includeSelections: true, skipSync: false },
        ...getAxiosConfig()
      });
      
      if (response.data.success && response.data.activeSelection) {
        const selection = response.data.activeSelection;
        const isUsersSelection = (isUserLoggedIn && selection.selectedBy === session?.user?.email) ||
          (!isUserLoggedIn && selection.anonymousId === anonymousId);
        
        if (isUsersSelection) {
          setActiveSelection(selection);
        } else if (!isUsersSelection && activeSelection?.tableId === selection.tableId) {
          setActiveSelection(null);
          if (selectedTable?.id === selection.tableId) {
            onTableSelect(null, selectedRestaurantId, selectedFloor);
          }
        }
      } else if (response.data.success && !response.data.activeSelection) {
        if (activeSelection) {
          setActiveSelection(null);
        }
      }
    } catch (error) {
      console.debug('Polling error:', error);
    }
  }, [selectedRestaurantId, selectedFloor, isSessionExpired, getAxiosConfig, isUserLoggedIn, session, anonymousId, activeSelection, selectedTable, onTableSelect]);

  useEffect(() => {
    if (!selectedRestaurantId || !selectedFloor || !open || isSessionExpired) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    pollingIntervalRef.current = setInterval(fetchSelectionStatus, POLLING_INTERVAL);
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [selectedRestaurantId, selectedFloor, open, fetchSelectionStatus, isSessionExpired]);

  const fetchAllRestaurants = useCallback(async () => {
    if (isSessionExpired) return;
    try {
      const response = await axios.get('/api/tables/arrangement', { params: { fetchAll: true }, ...getAxiosConfig() });
      if (response.data.success && response.data.data) {
        const restaurantsArray = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        setRestaurants(restaurantsArray);
        
        if (!propRestaurantId && restaurantsArray.length > 0 && !selectedFloor) {
          const floors = [...new Set(restaurantsArray.map(r => r.floor))];
          floors.sort((a, b) => (FLOOR_ORDER[a] || 999) - (FLOOR_ORDER[b] || 999));
          setSelectedFloor(floors[0]);
          const firstRestaurant = restaurantsArray.find(r => r.floor === floors[0]);
          if (firstRestaurant) {
            setSelectedRestaurantId(firstRestaurant.restaurantId);
            setCurrentRestaurantName(firstRestaurant.restaurantName);
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
    }
  }, [propRestaurantId, selectedFloor, getAxiosConfig, isSessionExpired]);

  const fetchTablesForSelection = useCallback(async () => {
    if (!selectedRestaurantId || !selectedFloor || isSessionExpired) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get('/api/tables/arrangement', {
        params: { restaurantId: selectedRestaurantId, floor: selectedFloor, includeSelections: true },
        ...getAxiosConfig()
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
        }));
        setTables(tableData);
        setDimensions(arrangement.dimensions || { width: 800, height: 500 });
        setCurrentRestaurantName(arrangement.restaurantName);
        setLastSyncTime(new Date());
        
        if (response.data.activeSelection) {
          const selection = response.data.activeSelection;
          const isUsersSelection = (isUserLoggedIn && selection.selectedBy === session?.user?.email) ||
            (!isUserLoggedIn && selection.anonymousId === anonymousId);
          if (isUsersSelection) {
            setActiveSelection(selection);
          } else {
            setActiveSelection(null);
          }
        } else {
          setActiveSelection(null);
        }
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRestaurantId, selectedFloor, getAxiosConfig, isSessionExpired, isUserLoggedIn, session, anonymousId]);

  useEffect(() => {
    fetchAllRestaurants();
  }, [fetchAllRestaurants]);

  useEffect(() => {
    if (open && selectedRestaurantId && selectedFloor && !isSessionExpired && isAuthenticated()) {
      fetchTablesForSelection();
    }
  }, [open, selectedRestaurantId, selectedFloor, fetchTablesForSelection, isSessionExpired, isAuthenticated]);

  const handleRestaurantSelect = (restaurantId: string, floor: string) => {
    if (isSessionExpired) {
      toast.error('Session expired. Please refresh the page.');
      return;
    }
    setSelectedRestaurantId(restaurantId);
    setSelectedFloor(floor);
    const restaurant = restaurants.find(r => r.restaurantId === restaurantId);
    if (restaurant) setCurrentRestaurantName(restaurant.restaurantName);
  };

  const handleTableClick = (table: TableData) => {
    if (isSessionExpired) {
      toast.error('Session expired. Please refresh the page.');
      return;
    }
    setSelectedTableForDetail(table);
    setShowDetailDialog(true);
  };

  const handleUnselectTable = async (tableId?: string, skipToast: boolean = false) => {
    const targetTableId = tableId || activeSelection?.tableId;
    if (!targetTableId) {
      if (!skipToast) toast.error('No active table selection');
      return;
    }
    if (selectionLockRef.current) return;
    
    selectionLockRef.current = true;
    
    try {
      if (!isUserLoggedIn) {
        setActiveSelection(null);
        setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: 'available' as const, lastUpdated: new Date() } : t));
        onTableSelect(null, selectedRestaurantId, selectedFloor);
        if (!skipToast) toast.success('Table unselected');
        selectionLockRef.current = false;
        return;
      }
      
      if (!isAuthenticated()) {
        handleSessionExpired();
        selectionLockRef.current = false;
        return;
      }
      
      await axios.patch('/api/tables/arrangement', {
        restaurantId: selectedRestaurantId,
        floor: selectedFloor,
        tableId: targetTableId,
        unselectTable: true
      }, getAxiosConfig());
      
      setActiveSelection(null);
      setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: 'available' as const, lastUpdated: new Date(), reservationInfo: null } : t));
      onTableSelect(null, selectedRestaurantId, selectedFloor);
      if (!skipToast) toast.success('Table unselected');
    } catch (error: any) {
      console.error('Unselect error:', error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      } else {
        if (activeSelection?.tableId === targetTableId) {
          setActiveSelection(null);
          setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: 'available' as const, lastUpdated: new Date() } : t));
          onTableSelect(null, selectedRestaurantId, selectedFloor);
          if (!skipToast) toast.success('Table selection cleared');
        } else if (!skipToast) {
          toast.error('Failed to unselect table');
        }
      }
    } finally {
      selectionLockRef.current = false;
    }
  };

  // Atomic switch table function - works for both guests and logged-in users
  const handleSwitchTableAtomic = async (newTable: TableData) => {
    if (isSwitchingTable) return;
    if (selectionLockRef.current) return;
    
    setIsSwitchingTable(true);
    selectionLockRef.current = true;
    
    try {
      const requestBody: Record<string, any> = {
        restaurantId: selectedRestaurantId,
        floor: selectedFloor,
        tableId: newTable.id,
        switchTable: true,
        duration: 3,
      };
      
      if (!isUserLoggedIn && anonymousId) {
        requestBody.anonymousId = anonymousId;
      }
      
      const response = await axios.patch('/api/tables/arrangement', requestBody, getAxiosConfig());
      
      if (response.data.success) {
        const selectionData = response.data.data.selection;
        const newSelection: ActiveSelection = {
          tableId: newTable.id,
          tableNumber: newTable.number,
          selectedBy: selectionData.selectedBy,
          selectedByName: selectionData.selectedByName,
          selectedAt: selectionData.selectedAt,
          expiresAt: selectionData.expiresAt,
          isAnonymous: !isUserLoggedIn,
          anonymousId: !isUserLoggedIn ? anonymousId : undefined
        };
        setActiveSelection(newSelection);
        
        setTables(prev => prev.map(t => {
          if (t.id === newTable.id) {
            return { ...t, status: 'reserved' as const, lastUpdated: new Date(), reservationInfo: selectionData };
          }
          if (response.data.data.previousTableId === t.id) {
            return { ...t, status: 'available' as const, lastUpdated: new Date(), reservationInfo: null };
          }
          return t;
        }));
        
        onTableSelect({ ...newTable, restaurantId: selectedRestaurantId, restaurantName: currentRestaurantName, floor: selectedFloor }, selectedRestaurantId, selectedFloor);
        toast.success(`Switched to Table ${newTable.number}`);
      }
    } catch (error: any) {
      console.error('Switch table error:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
      } else if (error.response?.status === 409) {
        toast.error(`Table ${newTable.number} was just taken by another customer`);
        await fetchTablesForSelection();
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Cannot switch to this table');
      } else {
        toast.error('Failed to switch tables. Please try again.');
      }
    } finally {
      setIsSwitchingTable(false);
      selectionLockRef.current = false;
    }
  };

  const handleSelectTable = async (table: TableData) => {
    const now = Date.now();
    
    // Rate limiting for manual mode only
    if (!autoSwitchTables && now - lastSelectionAttemptRef.current < 2000) {
      toast.loading('Please wait before selecting again...', { duration: 1000 });
      return;
    }
    
    if (selectionLockRef.current) return;
    if (isSessionExpired) {
      toast.error('Session expired. Please refresh the page.');
      return;
    }
    
    if (table.status !== 'available') {
      toast.error(`Table ${table.number} is currently ${table.status}`);
      return;
    }
    
    if (isUserLoggedIn && !isAuthenticated()) {
      handleSessionExpired();
      return;
    }
    
    // If auto-switch is enabled, use atomic switch operation
    if (autoSwitchTables) {
      await handleSwitchTableAtomic(table);
      return;
    }
    
    // Manual mode - original logic (works for guests)
    lastSelectionAttemptRef.current = now;
    
    if (activeSelection && activeSelection.tableId === table.id) {
      toast.info(`Table ${table.number} already selected`);
      setOpen(false);
      onTableSelect({ ...table, restaurantId: selectedRestaurantId, restaurantName: currentRestaurantName, floor: selectedFloor }, selectedRestaurantId, selectedFloor);
      return;
    }
    
    if (activeSelection && activeSelection.tableId !== table.id && isUserLoggedIn) {
      toast.error(`You already have Table ${activeSelection.tableNumber} selected. Please unselect it first.`);
      return;
    }
    
    selectionLockRef.current = true;
    setIsSelecting(true);
    
    try {
      const requestBody: Record<string, any> = {
        restaurantId: selectedRestaurantId,
        floor: selectedFloor,
        tableId: table.id,
        selectTable: true,
        duration: 3,
      };
      
      if (!isUserLoggedIn && anonymousId) {
        requestBody.anonymousId = anonymousId;
      }
      
      const response = await axios.patch('/api/tables/arrangement', requestBody, getAxiosConfig());
      
      if (response.data.success) {
        const selectionData = response.data.data.selection;
        const newSelection: ActiveSelection = {
          tableId: table.id,
          tableNumber: table.number,
          selectedBy: selectionData.selectedBy,
          selectedByName: selectionData.selectedByName,
          selectedAt: selectionData.selectedAt,
          expiresAt: selectionData.expiresAt,
          isAnonymous: !isUserLoggedIn,
          anonymousId: !isUserLoggedIn ? anonymousId : undefined
        };
        setActiveSelection(newSelection);
        
        setTables(prev => prev.map(t => 
          t.id === table.id 
            ? { ...t, status: 'reserved' as const, lastUpdated: new Date() }
            : t
        ));
        
        onTableSelect({ ...table, restaurantId: selectedRestaurantId, restaurantName: currentRestaurantName, floor: selectedFloor }, selectedRestaurantId, selectedFloor);
        setOpen(false);
        toast.success(`Table ${table.number} selected! You have 3 minutes.`);
      }
    } catch (error: any) {
      console.error('Select error:', error);
      
      if (error.response?.status === 401) {
        handleSessionExpired();
      } else if (error.response?.status === 409) {
        const errorData = error.response?.data;
        if (errorData?.currentSelection) {
          toast.error(`You already have Table ${errorData.currentSelection.tableNumber} selected. Please unselect it first.`);
        } else {
          toast.error(`Table ${table.number} was just taken by another customer`);
          await fetchTablesForSelection();
        }
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again.');
      } else {
        toast.error(error.response?.data?.error || 'Unable to select table. Please try again.');
      }
    } finally {
      selectionLockRef.current = false;
      setIsSelecting(false);
    }
  };

  const filteredTables = useMemo(() => {
    return statusFilter === 'all' ? tables : tables.filter(t => t.status === statusFilter);
  }, [tables, statusFilter]);

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
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const scaledWidth = isMobile ? Math.min(dimensions.width * 0.7, 500) : dimensions.width;
  const scaledHeight = isMobile ? Math.min(dimensions.height * 0.7, 400) : dimensions.height;

  const isTableSelectedByMe = activeSelection && (
    (isUserLoggedIn && activeSelection.selectedBy === session?.user?.email) ||
    (!isUserLoggedIn && activeSelection.anonymousId === anonymousId)
  );

  if (isSessionExpired) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Session Expired
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-gray-600 mb-4">Your session has expired. Please log in again to continue.</p>
            <Button onClick={() => { if (onLoginRequired) onLoginRequired(); else window.location.reload(); }} className="bg-purple-600 hover:bg-purple-700">
              Log In Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        
        {!isUserLoggedIn && (
          <div className="bg-purple-100 rounded-full px-2 py-1 text-xs text-purple-700">
            <User className="w-3 h-3 inline mr-1" />
            Guest Mode
          </div>
        )}

        {autoSwitchTables && (
          <div className="bg-blue-100 rounded-full px-2 py-1 text-xs text-blue-700 flex items-center gap-1">
            <SwitchCamera className="w-3 h-3" />
            Auto-Switch ON
          </div>
        )}
      </div>

      {selectedTable && isTableSelectedByMe && (
        <SelectedTableBanner 
          selectedTable={selectedTable}
          activeSelection={activeSelection}
          onUnselect={() => handleUnselectTable()}
          isSelecting={isSelecting}
        />
      )}

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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'layout' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setViewMode('layout')}>Layout</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setViewMode('list')}>List</Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            <SelectItem value="available">Available Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <div className="bg-green-50 rounded-lg px-2 py-1 text-center"><div className="text-sm font-bold text-green-600">{stats.available}</div><div className="text-[8px] text-gray-500">Free</div></div>
        <div className="bg-red-50 rounded-lg px-2 py-1 text-center"><div className="text-sm font-bold text-red-600">{stats.occupied}</div><div className="text-[8px] text-gray-500">Used</div></div>
        <div className="bg-yellow-50 rounded-lg px-2 py-1 text-center"><div className="text-sm font-bold text-yellow-600">{stats.reserved}</div><div className="text-[8px] text-gray-500">Reserved</div></div>
        <div className="bg-gray-50 rounded-lg px-2 py-1 text-center"><div className="text-sm font-bold">{stats.total}</div><div className="text-[8px] text-gray-500">Total</div></div>
      </div>

      {autoSwitchTables && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg text-center">
          💡 Auto-switch is enabled. Click any available table to automatically switch your selection.
        </div>
      )}

      {!isUserLoggedIn && (
        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-lg text-center">
          🍽️ Guest Mode: You can select a table without logging in. Your selection will be held for 3 minutes.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]"><RefreshCw className="w-8 h-8 text-purple-600 animate-spin" /></div>
      ) : filteredTables.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Armchair className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No tables found</p></CardContent></Card>
      ) : viewMode === 'layout' ? (
        <div className="relative bg-gradient-to-br from-purple-50/30 to-white rounded-xl border border-purple-100 overflow-auto" style={{ height: '400px', maxHeight: '60vh' }}>
          <div className="relative" style={{ width: scaledWidth * (zoom / 100), height: scaledHeight * (zoom / 100), transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {filteredTables.map((table) => (
              <TableIcon
                key={table.id}
                table={table}
                isSelected={selectedTable?.id === table.id}
                activeSelection={activeSelection}
                currentUserEmail={session?.user?.email}
                anonymousId={anonymousId}
                onUnselect={handleUnselectTable}
                onClick={handleTableClick}
                allowUnselect={allowUnselect}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTables.map((table) => {
            const isSelectedByMe = activeSelection?.tableId === table.id && 
              ((session?.user?.email && activeSelection?.selectedBy === session?.user?.email) ||
               (anonymousId && activeSelection?.anonymousId === anonymousId));
            
            return (
              <div
                key={table.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTable?.id === table.id 
                    ? 'border-purple-500 bg-purple-50' 
                    : isSelectedByMe
                    ? 'border-green-500 bg-green-50'
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
                      <div className="font-medium">Table {table.number}</div>
                      <div className="text-xs text-gray-500">{table.capacity} seats</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelectedByMe && (
                      <Badge className="bg-green-500 text-white text-xs">Selected</Badge>
                    )}
                    <Badge className={STATUS_CONFIG[table.status].badgeColor}>{STATUS_CONFIG[table.status].label}</Badge>
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
                    <SelectionTimer expiresAt={activeSelection.expiresAt} onExpire={() => handleUnselectTable(table.id)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="text-xs text-gray-400 text-center">
        {autoSwitchTables 
          ? "💡 Click any available table to automatically switch your selection"
          : "💡 Click on a green available table to select it • Selected tables are held for 3 minutes"}
      </div>
    </div>
  );
  
  return (
    <>
      {controlledOpen !== undefined ? (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[800px] max-w-[95vw] max-h-[90vh] bg-gradient-to-br from-white to-purple-50/30 rounded-xl overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Armchair className="w-5 h-5 text-purple-600" />Select a Table</DialogTitle><DialogDescription>Browse tables by floor and restaurant</DialogDescription></DialogHeader>
              {content}
            </DialogContent>
          </Dialog>
          <TableDetailDialog
            table={selectedTableForDetail}
            activeSelection={activeSelection}
            currentUserEmail={session?.user?.email}
            anonymousId={anonymousId}
            open={showDetailDialog}
            onOpenChange={setShowDetailDialog}
            onSelect={handleSelectTable}
            onUnselect={() => handleUnselectTable(selectedTableForDetail?.id)}
            isUserLoggedIn={isUserLoggedIn}
            onLoginRequired={onLoginRequired}
            allowUnselect={allowUnselect}
          />
        </>
      ) : (
        <>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-xl p-0">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full z-50" />
              <SheetHeader className="pt-4 px-4"><SheetTitle className="flex items-center gap-2 text-base"><Armchair className="w-4 h-4 text-purple-600" />Select a Table</SheetTitle></SheetHeader>
              <div className="pt-2 px-4 pb-4 h-full overflow-y-auto">{content}</div>
            </SheetContent>
          </Sheet>
          <TableDetailDialog
            table={selectedTableForDetail}
            activeSelection={activeSelection}
            currentUserEmail={session?.user?.email}
            anonymousId={anonymousId}
            open={showDetailDialog}
            onOpenChange={setShowDetailDialog}
            onSelect={handleSelectTable}
            onUnselect={() => handleUnselectTable(selectedTableForDetail?.id)}
            isUserLoggedIn={isUserLoggedIn}
            onLoginRequired={onLoginRequired}
            allowUnselect={allowUnselect}
          />
        </>
      )}
    </>
  );
}

export default TableSelector;