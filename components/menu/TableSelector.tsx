// components/menu/TableSelector.tsx - COMPLETE FIXED VERSION

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Users, MapPin, Armchair, Store,
  CheckCircle, Coffee, Clock, AlertCircle, XCircle,
  Filter, Layers, Eye, UserCheck, Timer,
  Lock, X, Undo2, ClipboardList, User, RefreshCw, SwitchCamera,
  ChevronDown, ChevronUp, Grid3x3, List,
  Building2, Wifi, Plug, Tv, Wind, ShieldCheck
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  } | null;
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

export interface SelectedTableInfo {
  id?: string;
  number: number;
  capacity: number;
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
  selectedTable?: SelectedTableInfo | null;
  isUserLoggedIn?: boolean;
  onLoginRequired?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  allowUnselect?: boolean;
  restaurantId?: string;
  floor?: string;
  showOrderInfo?: boolean;
  autoSwitchTables?: boolean;
  arrangementId?: string;
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
    icon: <CheckCircle className="w-2.5 h-2.5" />
  },
  occupied: {
    color: 'text-red-600',
    bgGradient: 'from-red-400 to-red-500',
    label: 'Occupied',
    badgeColor: 'bg-red-500 text-white',
    icon: <Coffee className="w-2.5 h-2.5" />
  },
  reserved: {
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-400 to-yellow-500',
    label: 'Reserved',
    badgeColor: 'bg-yellow-500 text-white',
    icon: <Clock className="w-2.5 h-2.5" />
  },
  cleaning: {
    color: 'text-blue-600',
    bgGradient: 'from-blue-400 to-blue-500',
    label: 'Cleaning',
    badgeColor: 'bg-blue-500 text-white',
    icon: <AlertCircle className="w-2.5 h-2.5" />
  },
  maintenance: {
    color: 'text-gray-600',
    bgGradient: 'from-gray-400 to-gray-500',
    label: 'Maintenance',
    badgeColor: 'bg-gray-500 text-white',
    icon: <XCircle className="w-2.5 h-2.5" />
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

const SelectionTimer = ({ expiresAt, onExpire, compact = false }: { expiresAt: string; onExpire?: () => void; compact?: boolean }) => {
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
  
  if (compact) {
    return (
      <div className="flex items-center gap-0.5 text-[8px] font-mono bg-black/50 px-1 py-0.5 rounded-full text-white">
        <Timer className="w-2 h-2" />
        <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-xs font-mono bg-black/50 px-1.5 py-0.5 rounded-full text-white">
      <Timer className="w-2.5 h-2.5" />
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
  isMobile = false,
}: { 
  table: TableData; 
  isSelected: boolean;
  activeSelection: ActiveSelection | null;
  currentUserEmail?: string;
  anonymousId?: string;
  onUnselect?: (tableId: string) => void;
  onClick: (table: TableData) => void;
  allowUnselect?: boolean;
  isMobile?: boolean;
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
      base += ' ring-2 ring-purple-400 ring-opacity-50 scale-105 z-20';
    } else if (isSelectedByMe) {
      base += ' ring-2 ring-green-400 ring-opacity-50 z-10';
    } else if (isSelectedByOther) {
      base += ' ring-2 ring-yellow-400 ring-opacity-50 opacity-75';
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

  const tableWidth = isMobile ? Math.min((table.width || 75) * 0.5, 55) : (table.width || 75);
  const tableHeight = isMobile ? Math.min((table.height || 75) * 0.5, 55) : (table.height || 75);

  return (
    <motion.div
      className={getShapeStyle()}
      style={{
        left: isMobile ? (table.x || 50) * 0.55 : table.x,
        top: isMobile ? (table.y || 50) * 0.55 : table.y,
        width: tableWidth,
        height: tableHeight,
      }}
      onClick={handleClick}
      whileHover={{ scale: (isAvailable && !isSelectedByOther && !isSelectedByMe && !isReservedByOrder) ? 1.05 : 1 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-0.5">
        <div className="font-bold text-white text-[9px] drop-shadow-md">T{table.number}</div>
        <div className="flex items-center gap-0.5 text-white text-[7px] drop-shadow">
          <Users className="w-1.5 h-1.5" />
          {table.capacity}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 drop-shadow">
          {config.icon}
        </div>
        
        {isSelectedByOther && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-white" />
          </div>
        )}
        
        {isSelectedByMe && (
          <div className="absolute inset-0 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-[6px] font-bold text-green-700 bg-white/80 px-0.5 rounded">
              YOU
            </span>
          </div>
        )}
        
        {isSelectedByMe && activeSelection && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
            <SelectionTimer 
              expiresAt={activeSelection.expiresAt} 
              onExpire={() => onUnselect && onUnselect(table.id)}
              compact={true}
            />
          </div>
        )}

        {isSelectedByMe && allowUnselect && (
          <button
            onClick={handleUnselectClick}
            className="absolute -top-1 -right-1 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center shadow-lg transition-all duration-200 text-[6px]"
          >
            <X className="w-1.5 h-1.5" />
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
  isSelecting,
  compact = false,
}: { 
  selectedTable: SelectedTableInfo | null;
  activeSelection: ActiveSelection | null;
  onUnselect: () => void;
  isSelecting: boolean;
  compact?: boolean;
}) => {
  if (!selectedTable || !activeSelection) return null;
  
  if (compact) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-green-600" />
            <span className="text-[10px] font-semibold text-green-800">Table {selectedTable.number}</span>
            {activeSelection.expiresAt && (
              <SelectionTimer expiresAt={activeSelection.expiresAt} onExpire={onUnselect} compact={true} />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnselect}
            disabled={isSelecting}
            className="border-red-300 text-red-600 hover:bg-red-50 h-5 px-1.5 text-[8px] rounded-full"
          >
            <Undo2 className="w-2 h-2 mr-0.5" />
            Unselect
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 py-2 rounded-xl">
      <UserCheck className="h-3 w-3 text-green-600" />
      <AlertTitle className="text-green-800 text-xs font-semibold">
        Selected: Table {selectedTable.number}
      </AlertTitle>
      <AlertDescription className="text-green-700 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-1 mt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 px-1.5 py-0.5 rounded-full">{selectedTable.capacity} seats</span>
            {activeSelection.expiresAt && (
              <SelectionTimer 
                expiresAt={activeSelection.expiresAt} 
                onExpire={onUnselect}
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnselect}
            disabled={isSelecting}
            className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs px-2 rounded-full"
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
  isMobile = false,
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
  isMobile?: boolean;
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

  const getFeatureIcon = (feature: string) => {
    const f = feature.toLowerCase();
    if (f.includes('wifi')) return <Wifi className="w-2.5 h-2.5" />;
    if (f.includes('outlet') || f.includes('plug')) return <Plug className="w-2.5 h-2.5" />;
    if (f.includes('tv') || f.includes('screen')) return <Tv className="w-2.5 h-2.5" />;
    if (f.includes('ac') || f.includes('cooling')) return <Wind className="w-2.5 h-2.5" />;
    return <ShieldCheck className="w-2.5 h-2.5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[92vw]' : 'sm:max-w-[420px]'} bg-gradient-to-br from-white to-purple-50/40 rounded-2xl p-0 overflow-hidden`}>
        <div className={`h-1 w-full bg-gradient-to-r ${config.bgGradient}`} />
        <div className={`${isMobile ? 'p-3' : 'p-5'}`}>
          <DialogHeader className={`${isMobile ? 'pb-1' : 'pb-2'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`${isMobile ? 'w-7 h-7' : 'w-10 h-10'} rounded-xl bg-gradient-to-br ${config.bgGradient} flex items-center justify-center shadow-md`}>
                  <Armchair className={`${isMobile ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
                </div>
                <div>
                  <DialogTitle className={`${isMobile ? 'text-base' : 'text-xl'} font-bold`}>Table {table.number}</DialogTitle>
                  <DialogDescription className="text-[10px] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {table.location || table.section || 'Main Area'}
                  </DialogDescription>
                </div>
              </div>
              <Badge className={`${config.badgeColor} text-[8px] px-1.5 py-0 rounded-full`}>
                {isReservedByOrder ? 'Reserved (Order)' : config.label}
              </Badge>
            </div>
          </DialogHeader>

          <div className={`space-y-2 ${isMobile ? 'py-1' : 'py-2'}`}>
            {isSelectedByMe && activeSelection && (
              <div className="p-2 rounded-xl border bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-2.5 h-2.5 text-green-600" />
                    <span className="text-[10px] font-medium text-green-800">
                      You have selected this table
                    </span>
                  </div>
                  <div className="bg-green-100 rounded-full px-1.5 py-0.5">
                    <SelectionTimer expiresAt={activeSelection.expiresAt} onExpire={handleUnselect} compact={true} />
                  </div>
                </div>
              </div>
            )}

            {isSelectedByOther && (
              <div className="p-2 rounded-xl border bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-2.5 h-2.5 text-yellow-600" />
                  <span className="text-[10px] font-medium text-yellow-800">
                    Selected by another customer
                  </span>
                </div>
              </div>
            )}

            {isReservedByOrder && table.reservationInfo && (
              <div className="p-2 rounded-xl border bg-orange-50 border-orange-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <ClipboardList className="w-2.5 h-2.5 text-orange-600" />
                  <span className="text-[10px] font-medium text-orange-800">Active Order</span>
                </div>
                {table.reservationInfo.orderNumber && (
                  <p className="text-[9px] text-orange-700">Order #{table.reservationInfo.orderNumber}</p>
                )}
                {table.reservationInfo.customerName && (
                  <p className="text-[9px] text-orange-700">Customer: {table.reservationInfo.customerName}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> Capacity
                </span>
                <span className="font-semibold text-[10px]">{table.capacity} seats</span>
              </div>

              {table.floor && (
                <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                  <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                    <Layers className="w-2.5 h-2.5" /> Floor
                  </span>
                  <span className="font-semibold text-[10px]">{table.floor}</span>
                </div>
              )}

              {table.restaurantName && (
                <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg col-span-2">
                  <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                    <Store className="w-2.5 h-2.5" /> Restaurant
                  </span>
                  <span className="font-semibold text-[10px] truncate max-w-[180px]">{table.restaurantName}</span>
                </div>
              )}
            </div>

            {table.description && (
              <div className="p-1.5 bg-gray-50 rounded-lg">
                <span className="text-[9px] text-gray-600 block mb-0.5">Description</span>
                <p className="text-[10px]">{table.description}</p>
              </div>
            )}

            {table.features && table.features.length > 0 && (
              <div className="p-1.5 bg-gray-50 rounded-lg">
                <span className="text-[9px] text-gray-600 block mb-1">Features & Amenities</span>
                <div className="flex flex-wrap gap-1">
                  {table.features.slice(0, 3).map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-[7px] py-0 gap-0.5 bg-purple-100 text-purple-700">
                      {getFeatureIcon(feature)}
                      {feature.length > 10 ? feature.slice(0, 8)+'...' : feature}
                    </Badge>
                  ))}
                  {table.features.length > 3 && (
                    <Badge variant="secondary" className="text-[7px] py-0 bg-gray-100">+{table.features.length-3}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" className="flex-1 rounded-lg h-8 text-xs" onClick={() => onOpenChange(false)} disabled={isActionLoading}>
              Cancel
            </Button>
            {canUnselect ? (
              <Button
                className="flex-1 rounded-lg h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={handleUnselect}
                disabled={isActionLoading}
              >
                <Undo2 className="w-3 h-3 mr-1" />
                Unselect
              </Button>
            ) : (
              <Button
                className={`flex-1 rounded-lg h-8 text-xs ${canSelect ? 'bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 shadow-md' : 'bg-gray-400 cursor-not-allowed'}`}
                onClick={handleSelect}
                disabled={!canSelect || isActionLoading}
              >
                {isActionLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : isSelectedByMe ? 'Already Selected' : 
                 isSelectedByOther ? 'Selected by Another' : 
                 isReservedByOrder ? 'Has Active Order' : 
                 !isAvailable ? `Not Available` : 
                 'Select Table'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Modern Floor & Restaurant Selector Component (Mobile Optimized)
const ModernFloorSelector = ({
  floors,
  restaurants,
  selectedFloor,
  selectedRestaurantId,
  onSelect,
  isMobile = false,
}: {
  floors: string[];
  restaurants: RestaurantData[];
  selectedFloor: string;
  selectedRestaurantId: string;
  onSelect: (restaurantId: string, floor: string) => void;
  isMobile?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const restaurantsByFloor = useMemo(() => {
    const map = new Map<string, RestaurantData[]>();
    floors.forEach(floor => {
      map.set(floor, restaurants.filter(r => r.floor === floor));
    });
    return map;
  }, [floors, restaurants]);

  const currentRestaurant = restaurants.find(r => r.restaurantId === selectedRestaurantId);
  const currentFloorRestaurants = restaurantsByFloor.get(selectedFloor) || [];

  if (isMobile) {
    return (
      <div className="space-y-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between rounded-lg bg-white/80 backdrop-blur-sm border-purple-100 h-8 text-xs">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-purple-600" />
                <span className="font-medium text-xs">{currentRestaurant?.restaurantName || 'Select Restaurant'}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-sm rounded-xl">
            {floors.map(floor => {
              const floorRestaurants = restaurantsByFloor.get(floor) || [];
              if (floorRestaurants.length === 0) return null;
              return (
                <div key={floor} className="px-2 py-1">
                  <div className="text-[10px] font-semibold text-purple-600 px-2 py-0.5">{floor}</div>
                  {floorRestaurants.map(r => (
                    <DropdownMenuItem
                      key={r.restaurantId}
                      onClick={() => onSelect(r.restaurantId, floor)}
                      className={`cursor-pointer rounded-lg text-xs ${selectedRestaurantId === r.restaurantId ? 'bg-purple-50 text-purple-700' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{r.restaurantName}</span>
                        <Badge variant="outline" className="text-[7px] bg-gray-50 px-1">
                          {r.availableTables || 0} free
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <Separator className="my-1" />
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => {
                const firstRestaurant = restaurantsByFloor.get(floor)?.[0];
                if (firstRestaurant) onSelect(firstRestaurant.restaurantId, floor);
              }}
              className={`px-2 py-1 rounded-full text-[9px] font-medium whitespace-nowrap transition-all ${
                selectedFloor === floor
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {floor.length > 12 ? floor.slice(0, 10)+'…' : floor}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-600" />
          Select Your Floor & Restaurant
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-purple-600 h-7">
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      
      <div className={`grid gap-3 transition-all duration-300 ${isExpanded ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {floors.map(floor => {
          const floorRestaurants = restaurantsByFloor.get(floor) || [];
          const isActiveFloor = selectedFloor === floor;
          const totalAvailable = floorRestaurants.reduce((sum, r) => sum + (r.availableTables || 0), 0);
          
          return (
            <div
              key={floor}
              className={`rounded-xl border-2 transition-all overflow-hidden ${
                isActiveFloor ? 'border-purple-300 bg-purple-50/30 shadow-md' : 'border-gray-100 bg-white hover:border-purple-200'
              }`}
            >
              <div
                className={`px-3 py-2 cursor-pointer ${isActiveFloor ? 'bg-purple-100/50' : 'bg-gray-50'}`}
                onClick={() => {
                  const firstRestaurant = floorRestaurants[0];
                  if (firstRestaurant) onSelect(firstRestaurant.restaurantId, floor);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${isActiveFloor ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="font-semibold text-sm">{floor}</span>
                  </div>
                  <Badge variant={isActiveFloor ? 'default' : 'secondary'} className="text-[10px]">
                    {totalAvailable} available
                  </Badge>
                </div>
              </div>
              
              <div className="p-2 space-y-1.5">
                {floorRestaurants.map(r => (
                  <div
                    key={r.restaurantId}
                    onClick={() => onSelect(r.restaurantId, floor)}
                    className={`px-2 py-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      selectedRestaurantId === r.restaurantId && isActiveFloor
                        ? 'bg-purple-100 border border-purple-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-medium">{r.restaurantName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-600">{r.availableTables || 0}</span>
                      <span className="text-xs text-gray-400">/ {r.totalTables || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Component - Fully Responsive & Mobile Optimized
export function TableSelector({
  onTableSelect,
  selectedTable = null,
  isUserLoggedIn = false,
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isDesktop = !isMobile;

  const isAuthenticated = useCallback(() => {
    if (!isUserLoggedIn) return true;
    return sessionStatus === 'authenticated' && session?.user?.email;
  }, [isUserLoggedIn, sessionStatus, session]);

  const handleSessionExpired = useCallback(() => {
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
      const response = await axios.get<{ success: boolean; data?: RestaurantData | RestaurantData[] }>('/api/tables/arrangement', { params: { fetchAll: true }, ...getAxiosConfig() });
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
        unselectTable: true,
        ...(anonymousId ? { anonymousId, guestId: anonymousId } : {})
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

  // FIXED: Handle switch table with better error handling
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
        requestBody.guestId = anonymousId;
      }
      
      // FIXED: Use the correct API endpoint with full URL
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
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to switch table');
      }
    } catch (error: any) {
      console.error('Switch table error:', error);
      
      // FIXED: Better error handling
      if (error.response?.status === 401) {
        handleSessionExpired();
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 404) {
        toast.error('Table service unavailable. Please try again.');
        // Refresh tables
        await fetchTablesForSelection();
      } else if (error.response?.status === 409) {
        toast.error(`Table ${newTable.number} was just taken by another customer`);
        await fetchTablesForSelection();
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Cannot switch to this table');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Failed to switch tables. Please try again.');
      }
      return false;
    } finally {
      setIsSwitchingTable(false);
      selectionLockRef.current = false;
    }
  };

  // FIXED: Handle select table with better error handling
  const handleSelectTable = async (table: TableData) => {
    const now = Date.now();
    
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
    
    if (autoSwitchTables) {
      const success = await handleSwitchTableAtomic(table);
      if (success) {
        setOpen(false);
      }
      return;
    }
    
    lastSelectionAttemptRef.current = now;
    
    if (activeSelection && activeSelection.tableId === table.id) {
      toast(`Table ${table.number} already selected`);
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
        requestBody.guestId = anonymousId;
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

  const scaledWidth = isMobile ? dimensions.width * 0.45 : dimensions.width;
  const scaledHeight = isMobile ? dimensions.height * 0.45 : dimensions.height;

  const isTableSelectedByMe = activeSelection && (
    (isUserLoggedIn && activeSelection.selectedBy === session?.user?.email) ||
    (!isUserLoggedIn && activeSelection.anonymousId === anonymousId)
  );

  // Table List View for Mobile (Compact)
  const TableListView = () => (
    <ScrollArea className="h-[320px] pr-1">
      <div className="space-y-1.5">
        {filteredTables.map(table => {
          const config = STATUS_CONFIG[table.status];
          const isAvailable = table.status === 'available';
          const isSelectedByAny = activeSelection && activeSelection.tableId === table.id;
          const isSelectedByMe = isSelectedByAny && (
            (isUserLoggedIn && activeSelection?.selectedBy === session?.user?.email) ||
            (!isUserLoggedIn && activeSelection?.anonymousId === anonymousId)
          );
          
          return (
            <div
              key={table.id}
              onClick={() => isAvailable && !isSelectedByAny && handleTableClick(table)}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                isAvailable && !isSelectedByAny
                  ? 'cursor-pointer hover:border-purple-300 hover:bg-purple-50/30'
                  : 'opacity-70 cursor-not-allowed'
              } ${isSelectedByMe ? 'border-green-300 bg-green-50/50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${config.bgGradient} flex items-center justify-center shadow-sm`}>
                  <Armchair className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">Table {table.number}</span>
                    <Badge className={`${config.badgeColor} text-[7px] px-1 py-0`}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] text-gray-500 flex items-center gap-0.5">
                      <Users className="w-2 h-2" /> {table.capacity} seats
                    </span>
                    {table.location && (
                      <span className="text-[8px] text-gray-400">• {table.location.length > 12 ? table.location.slice(0, 10)+'…' : table.location}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {isSelectedByMe && (
                <div className="flex items-center gap-1">
                  <div className="bg-green-100 rounded-full px-1.5 py-0.5">
                    <span className="text-[7px] font-medium text-green-700">Selected</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselectTable(table.id);
                    }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              )}
              
              {!isSelectedByMe && isAvailable && !isSelectedByAny && (
                <Button
                  size="sm"
                  className="rounded-full bg-purple-600 hover:bg-purple-700 text-white h-6 px-2 text-[9px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTable(table);
                  }}
                >
                  Select
                </Button>
              )}
              
              {!isAvailable && !isSelectedByAny && (
                <div className="text-[8px] text-gray-400 flex items-center gap-0.5">
                  <Lock className="w-2 h-2" />
                  Unavailable
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  if (isSessionExpired) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] text-center rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center justify-center gap-2 text-base">
              <AlertCircle className="w-4 h-4" />
              Session Expired
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs text-gray-600 mb-3">Your session has expired. Please log in again to continue.</p>
            <Button onClick={() => { if (onLoginRequired) onLoginRequired(); else window.location.reload(); }} className="bg-purple-600 hover:bg-purple-700 rounded-lg h-8 text-xs">
              Log In Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile optimized main content - fits on one screen
  const mainContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Compact */}
      <div className="px-3 pt-2 pb-1 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-purple-700 to-purple-900 rounded-lg shadow-sm">
              <Armchair className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-800">Select Table</h2>
              <p className="text-[9px] text-gray-500 flex items-center gap-1">
                <span>{currentRestaurantName?.slice(0, 15) || 'Restaurant'}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                <span>{selectedFloor?.slice(0, 12)}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-medium text-green-700">{stats.available}</span>
            </div>
            
            {!isUserLoggedIn && (
              <div className="bg-purple-100 rounded-full px-1.5 py-0.5">
                <span className="text-[8px] font-medium text-purple-700">Guest</span>
              </div>
            )}
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[90px] h-7 text-[10px] rounded-full border-gray-200 bg-white/80">
                <Filter className="w-2.5 h-2.5 mr-0.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all" className="text-xs">All ({stats.total})</SelectItem>
                <SelectItem value="available" className="text-xs">Free ({stats.available})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selected Table Banner - Compact */}
      {selectedTable && isTableSelectedByMe && (
        <div className="px-3 pt-1.5">
          <SelectedTableBanner 
            selectedTable={selectedTable}
            activeSelection={activeSelection}
            onUnselect={() => handleUnselectTable()}
            isSelecting={isSelecting}
            compact={true}
          />
        </div>
      )}

      {/* Floor Selector - Compact */}
      <div className="px-3 py-1.5">
        <ModernFloorSelector
          floors={uniqueFloors}
          restaurants={restaurants}
          selectedFloor={selectedFloor}
          selectedRestaurantId={selectedRestaurantId}
          onSelect={handleRestaurantSelect}
          isMobile={true}
        />
      </div>

      {/* View Mode Toggle */}
      {filteredTables.length > 0 && (
        <div className="px-3 pb-1">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'map' | 'list')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 p-0.5 h-8">
              <TabsTrigger value="map" className="rounded-md text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm py-1">
                <Grid3x3 className="w-2.5 h-2.5 mr-1" />
                Map
              </TabsTrigger>
              <TabsTrigger value="list" className="rounded-md text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm py-1">
                <List className="w-2.5 h-2.5 mr-1" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main Content Area - Compact */}
      <div className="flex-1 px-2 pb-2 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <Armchair className="w-10 h-10 text-gray-200 mb-1" />
            <p className="text-[10px] text-gray-500">No tables available</p>
          </div>
        ) : viewMode === 'list' ? (
          <TableListView />
        ) : (
          <div className="overflow-x-auto pb-1">
            <div 
              className="relative mx-auto"
              style={{ 
                width: scaledWidth + 20,
                height: scaledHeight + 20,
              }}
            >
              <div 
                className="relative"
                style={{ 
                  width: scaledWidth, 
                  height: scaledHeight,
                  margin: '10px auto',
                }}
              >
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
                    isMobile={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Hint - Compact */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[7px] text-gray-400 text-center flex items-center justify-center gap-1">
          <Clock className="w-2 h-2" />
          {autoSwitchTables ? "Tap green table to switch • 3 min hold" : "Select green table • 3 min hold"}
        </p>
      </div>
    </div>
  );
  
  // Responsive Dialog/Sheet based on device
  return (
    <>
      {controlledOpen !== undefined || !isMobile ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[900px] max-w-[95vw] max-h-[90vh] bg-white rounded-2xl overflow-hidden p-0 shadow-2xl">
            {/* Required for accessibility */}
            <DialogTitle className="sr-only">
              Select Table
            </DialogTitle>
            <div className="h-full overflow-y-auto">
              {mainContent}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0 bg-white">
            {/* Required for accessibility */}
            <SheetTitle className="sr-only">
              Select Table
            </SheetTitle>
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full z-50" />
            <div className="pt-3 h-full overflow-y-auto">
              {mainContent}
            </div>
          </SheetContent>
        </Sheet>
      )}
      
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
        isMobile={isMobile}
      />
    </>
  );
}
 
export default TableSelector;