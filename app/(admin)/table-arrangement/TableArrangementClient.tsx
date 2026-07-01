// app/admin/table-arrangement/TableArrangementClient.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
    ArrowLeft, Save, RotateCcw, Plus, Minus, Trash2, Edit3,
    Circle, Square, Users, Coffee, Clock, AlertCircle, Settings,
    CheckCircle, XCircle, Home, Store, Building2, X,
    Eye, EyeOff, RefreshCw, Menu, Maximize2, Rows,
    Copy, Compass, LayoutGrid, Table, Grid3X3,
    MapPin, Sparkles, Tag, FileText, MessageSquare, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import axios from "axios";

// Types
interface Restaurant {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    cuisine: string[];
    isActive: boolean;
    location?: {
        lat: number;
        lng: number;
        address: string;
    };
}

interface Table {
    id: string;
    number: number;
    capacity: number;
    shape: 'circle' | 'square' | 'rectangle';
    x: number;
    y: number;
    width: number;
    height: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
    rotation?: number;
    location?: string;
    description?: string;
    tags?: string[];
    features?: string[];
    lastUpdated?: Date;
}

interface TableArrangement {
    _id?: string;
    restaurantId: string;
    restaurantName: string;
    name: string;
    floor: string;
    layoutType: 'grid' | 'rows' | 'custom';
    totalTables: number;
    tables: Table[];
    dimensions: {
        width: number;
        height: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

// Predefined location options
const LOCATION_OPTIONS = [
    { value: 'salon', label: 'Salon', icon: '🏠' },
    { value: 'garden', label: 'Garden', icon: '🌳' },
    { value: 'kitchen', label: 'Kitchen View', icon: '🍳' },
    { value: 'terrace', label: 'Terrace', icon: '🌅' },
    { value: 'bar', label: 'Bar Area', icon: '🍸' },
    { value: 'vip', label: 'VIP Section', icon: '⭐' },
    { value: 'window', label: 'Window Side', icon: '🪟' },
    { value: 'entrance', label: 'Near Entrance', icon: '🚪' },
    { value: 'private', label: 'Private Room', icon: '🚪' },
    { value: 'outdoor', label: 'Outdoor', icon: '☀️' },
];

// Predefined feature options
const FEATURE_OPTIONS = [
    'Window View', 'Private', 'Heated', 'Air Conditioned',
    'TV Screen', 'Power Outlet', 'Wheelchair Accessible',
    'High Chair Available', 'Romantic Setting', 'Group Seating'
];

// Predefined tags
const TAG_OPTIONS = [
    'Popular', 'Quiet', 'Romantic', 'Business', 'Family',
    'Date Night', 'Large Groups', 'Intimate'
];

// Table Icon Component
const TableIcon: React.FC<{
    table: Table;
    isSelected: boolean;
    isEditMode: boolean;
    layoutType: string;
    gridSize: number;
    snapToGrid: boolean;
    onSelect: () => void;
    onMove: (id: string, x: number, y: number) => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (table: Table) => void;
    onCapacityChange?: (id: string, capacity: number) => void;
}> = ({
    table, isSelected, isEditMode, layoutType, gridSize, snapToGrid,
    onSelect, onMove, onDelete, onDuplicate, onCapacityChange
}) => {
        const [isDragging, setIsDragging] = useState(false);
        const dragStartRef = useRef({ x: 0, y: 0, tableX: 0, tableY: 0 });
        const longPressTimer = useRef<NodeJS.Timeout | null>(null);

        const getStatusColor = (status: string) => {
            const colors: Record<string, string> = {
                available: 'from-green-400 to-green-500 border-green-600',
                occupied: 'from-red-400 to-red-500 border-red-600',
                reserved: 'from-yellow-400 to-yellow-500 border-yellow-600',
                cleaning: 'from-blue-400 to-blue-500 border-blue-600',
                maintenance: 'from-gray-400 to-gray-500 border-gray-600'
            };
            return colors[status] || 'from-gray-400 to-gray-500 border-gray-600';
        };

        const getStatusIcon = () => {
            const icons: Record<string, JSX.Element> = {
                available: <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />,
                occupied: <Coffee className="w-3 h-3 sm:w-4 sm:h-4 text-white" />,
                reserved: <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-white" />,
                cleaning: <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />,
                maintenance: <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            };
            return icons[table.status] || null;
        };

        const getLocationIcon = () => {
            const location = LOCATION_OPTIONS.find(l => l.value === table.location);
            return location?.icon || '📍';
        };

        const getShapeStyle = () => {
            const canDrag = isEditMode && layoutType === 'custom';
            const base = `absolute ${canDrag ? 'cursor-move touch-none' : 'cursor-pointer'} 
      bg-gradient-to-br ${getStatusColor(table.status)} 
      border-2 shadow-lg hover:shadow-xl transition-shadow
      ${isSelected ? 'ring-4 ring-purple-400 ring-opacity-50' : ''}
      ${isDragging ? 'opacity-50 shadow-2xl' : ''}`;

            switch (table.shape) {
                case 'circle': return `${base} rounded-full`;
                case 'square': return `${base} rounded-lg`;
                case 'rectangle': return `${base} rounded-lg`;
                default: return `${base} rounded-lg`;
            }
        };

        const handleMouseDown = (e: React.MouseEvent) => {
            if (!isEditMode || layoutType !== 'custom') return;
            e.stopPropagation();
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY, tableX: table.x, tableY: table.y };

            const handleMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                let newX = dragStartRef.current.tableX + dx;
                let newY = dragStartRef.current.tableY + dy;

                if (snapToGrid) {
                    newX = Math.round(newX / gridSize) * gridSize;
                    newY = Math.round(newY / gridSize) * gridSize;
                }

                onMove(table.id, newX, newY);
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleTouchStart = (e: React.TouchEvent) => {
            if (!isEditMode || layoutType !== 'custom') return;
            const touch = e.touches[0];
            
            longPressTimer.current = setTimeout(() => {
                e.stopPropagation();
                setIsDragging(true);
                dragStartRef.current = { 
                    x: touch.clientX, 
                    y: touch.clientY, 
                    tableX: table.x, 
                    tableY: table.y 
                };
            }, 300);
        };

        const handleTouchMove = (e: React.TouchEvent) => {
            if (!isDragging) {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                return;
            }
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - dragStartRef.current.x;
            const dy = touch.clientY - dragStartRef.current.y;
            let newX = dragStartRef.current.tableX + dx;
            let newY = dragStartRef.current.tableY + dy;

            if (snapToGrid) {
                newX = Math.round(newX / gridSize) * gridSize;
                newY = Math.round(newY / gridSize) * gridSize;
            }

            onMove(table.id, newX, newY);
        };

        const handleTouchEnd = () => {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            setIsDragging(false);
        };

        return (
            <>
                <motion.div
                    className={getShapeStyle()}
                    style={{
                        left: table.x, top: table.y,
                        width: table.width || 80, height: table.height || 80,
                        transform: `rotate(${table.rotation || 0}deg)`,
                    }}
                    onClick={onSelect}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    whileHover={{ scale: isEditMode && layoutType === 'custom' ? 1.02 : 1.05 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                        {table.location && (
                            <div className="absolute -top-2 -left-2">
                                <Badge className="bg-purple-600 text-white text-[8px] sm:text-xs px-1 py-0.5">
                                    {getLocationIcon()}
                                </Badge>
                            </div>
                        )}
                        {table.description && (
                            <div className="absolute -top-2 -right-2">
                                <Badge className="bg-blue-600 text-white text-[8px] sm:text-xs px-1 py-0.5">
                                    <MessageSquare className="w-2 h-2 sm:w-3 sm:h-3" />
                                </Badge>
                            </div>
                        )}
                        <div className="font-bold text-white text-xs sm:text-sm">T{table.number}</div>
                        <div className="flex items-center gap-0.5 sm:gap-1 text-white text-[10px] sm:text-xs">
                            <Users className="w-2 h-2 sm:w-3 sm:h-3" />{table.capacity}
                        </div>
                        <div className="absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1">{getStatusIcon()}</div>
                    </div>
                    {isSelected && isEditMode && (
                        <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-white rounded-lg shadow-lg p-0.5 sm:p-1">
                            <Button size="sm" variant="outline" className="h-5 w-5 sm:h-6 sm:w-6 p-0" onClick={() => onCapacityChange?.(table.id, Math.max(1, table.capacity - 1))}>
                                <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                            <span className="text-[10px] sm:text-xs font-bold px-1 sm:px-2">{table.capacity}</span>
                            <Button size="sm" variant="outline" className="h-5 w-5 sm:h-6 sm:w-6 p-0" onClick={() => onCapacityChange?.(table.id, Math.min(20, table.capacity + 1))}>
                                <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </>
        );
    };

// Table Detail Panel Component
function TableDetailPanel({
    table,
    onClose,
    onStatusChange,
    onLocationChange,
    onDescriptionChange,
    onToggleFeature,
    onAddTag,
    onRemoveTag,
    onDuplicate,
    onDelete,
    onShowTagDialog,
}: {
    table: Table;
    onClose: () => void;
    onStatusChange: (id: string, status: Table['status']) => void;
    onLocationChange: (id: string, location: string) => void;
    onDescriptionChange: (id: string, description: string) => void;
    onToggleFeature: (id: string, feature: string) => void;
    onAddTag: (id: string, tag: string) => void;
    onRemoveTag: (id: string, tag: string) => void;
    onDuplicate: (table: Table) => void;
    onDelete: (id: string) => void;
    onShowTagDialog: () => void;
}) {
    return (
        <>
            <div className="flex items-center justify-between mb-4 lg:hidden">
                <h3 className="font-bold text-lg">Table {table.number}</h3>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <XCircle className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-4">
                <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <Select value={table.status} onValueChange={(v) => onStatusChange(table.id, v as Table['status'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="available">🟢 Available</SelectItem>
                            <SelectItem value="occupied">🔴 Occupied</SelectItem>
                            <SelectItem value="reserved">🟡 Reserved</SelectItem>
                            <SelectItem value="cleaning">🔵 Cleaning</SelectItem>
                            <SelectItem value="maintenance">⚫ Maintenance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location
                    </Label>
                    <Select
                        value={table.location || 'none'}
                        onValueChange={(v) => onLocationChange(table.id, v === 'none' ? '' : v)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">📍 None</SelectItem>
                            {LOCATION_OPTIONS.map((loc) => (
                                <SelectItem key={loc.value} value={loc.value}>{loc.icon} {loc.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Description
                    </Label>
                    <Textarea
                        placeholder="e.g., Near window..."
                        value={table.description || ''}
                        onChange={(e) => onDescriptionChange(table.id, e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                    />
                </div>

                <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Features
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {FEATURE_OPTIONS.map((feature) => (
                            <Badge
                                key={feature}
                                variant={table.features?.includes(feature) ? 'default' : 'outline'}
                                className={`cursor-pointer text-xs ${table.features?.includes(feature) ? 'bg-purple-600' : ''}`}
                                onClick={() => onToggleFeature(table.id, feature)}
                            >
                                {feature}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Tags
                        </Label>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onShowTagDialog}>
                            <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {table.tags?.map((tag) => (
                            <Badge key={tag} className="bg-blue-100 text-blue-800 text-xs">
                                {tag}
                                <button onClick={() => onRemoveTag(table.id, tag)} className="ml-1 hover:text-red-500">
                                    <XCircle className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                        {TAG_OPTIONS.filter(t => !table.tags?.includes(t)).slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-gray-100 text-xs" onClick={() => onAddTag(table.id, tag)}>
                                + {tag}
                            </Badge>
                        ))}
                    </div>
                </div>

                {table.lastUpdated && (
                    <div className="text-xs text-gray-400">
                        Updated: {new Date(table.lastUpdated).toLocaleString()}
                    </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => onDuplicate(table)}>
                        <Copy className="w-3 h-3 mr-1" /> Duplicate
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(table.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                </div>
            </div>
        </>
    );
}

// Main Component
export default function TableArrangementClient() {
    const router = useRouter();

    // Restaurant State - Dynamic from database
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

    // Setup State
    const [totalTables, setTotalTables] = useState<number>(20);
    const [layoutType, setLayoutType] = useState<'grid' | 'rows' | 'custom'>('custom');
    const [inputRows, setInputRows] = useState<number>(0);
    const [inputCols, setInputCols] = useState<number>(0);
    const [defaultCapacity, setDefaultCapacity] = useState<number>(4);
    const [defaultShape, setDefaultShape] = useState<'circle' | 'square' | 'rectangle'>('circle');

    // Arrangement State
    const [arrangement, setArrangement] = useState<TableArrangement | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<string>('Ground Floor');

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editMode, setEditMode] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize, setGridSize] = useState(20);
    const [zoom, setZoom] = useState(100);
    const [showStats, setShowStats] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Dialog states
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [newTag, setNewTag] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const availableFloors = ['Ground Floor', 'First Floor', 'Second Floor', 'Rooftop'];

    // Check if mobile
    const isMobile = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024;
        }
        return false;
    }, []);

    // Fetch restaurants from database
    useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            setIsLoadingRestaurants(true);
            const response = await axios.get('/api/restaurants');
            
            if (response.data.success && response.data.data) {
                const activeRestaurants = response.data.data.filter((r: Restaurant) => r.isActive !== false);
                setRestaurants(activeRestaurants);
                
                // Select first restaurant by default
                if (activeRestaurants.length > 0) {
                    setSelectedRestaurantId(activeRestaurants[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            toast.error('Failed to load restaurants');
        } finally {
            setIsLoadingRestaurants(false);
        }
    };

    // Generate tables function
    const generateTables = useCallback((
        total: number,
        type: 'grid' | 'rows' | 'custom',
        rowsCount: number,
        colsCount: number
    ): Table[] => {
        if (total <= 0) return [];

        let newRows = rowsCount;
        let newCols = colsCount;
        const newTables: Table[] = [];
        let tableNumber = 1;

        if (type === 'rows' || type === 'grid') {
            if (rowsCount <= 0 || colsCount <= 0) {
                newCols = Math.ceil(Math.sqrt(total));
                newRows = Math.ceil(total / newCols);
            } else {
                newRows = rowsCount;
                newCols = colsCount;
            }

            for (let i = 0; i < newRows; i++) {
                for (let j = 0; j < newCols && newTables.length < total; j++) {
                    newTables.push({
                        id: `${i}-${j}-${Date.now()}`,
                        number: tableNumber++,
                        capacity: defaultCapacity,
                        shape: defaultShape,
                        x: j * 120 + 50,
                        y: i * 120 + 50,
                        width: defaultShape === 'rectangle' ? 120 : 80,
                        height: 80,
                        status: 'available',
                        location: '',
                        description: '',
                        tags: [],
                        features: [],
                        lastUpdated: new Date(),
                    });
                }
            }
        } else if (type === 'custom') {
            newCols = Math.min(total, 8);
            newRows = Math.ceil(total / newCols);

            for (let i = 0; i < newRows; i++) {
                for (let j = 0; j < newCols && newTables.length < total; j++) {
                    newTables.push({
                        id: `custom-${i}-${j}-${Date.now()}`,
                        number: tableNumber++,
                        capacity: defaultCapacity,
                        shape: defaultShape,
                        x: j * 120 + 50,
                        y: i * 120 + 50,
                        width: defaultShape === 'rectangle' ? 120 : 80,
                        height: 80,
                        status: 'available',
                        location: '',
                        description: '',
                        tags: [],
                        features: [],
                        lastUpdated: new Date(),
                    });
                }
            }
        }

        return newTables;
    }, [defaultCapacity, defaultShape]);

    const handleGenerate = useCallback(() => {
        const newTables = generateTables(totalTables, layoutType, inputRows, inputCols);
        setTables(newTables);
    }, [totalTables, layoutType, inputRows, inputCols, generateTables]);

    const validateInputs = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (totalTables <= 0) newErrors.totalTables = "Total tables must be greater than 0.";
        if (totalTables > 100) newErrors.totalTables = "Total tables cannot exceed 100.";
        if ((layoutType === 'rows' || layoutType === 'grid') && inputRows <= 0) {
            newErrors.rows = "Rows must be greater than 0.";
        }
        if ((layoutType === 'rows' || layoutType === 'grid') && inputCols <= 0) {
            newErrors.cols = "Columns must be greater than 0.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [totalTables, layoutType, inputRows, inputCols]);

    const applyArrangement = useCallback(() => {
        if (!validateInputs()) return;
        handleGenerate();
        toast.success('Tables generated successfully!');
    }, [validateInputs, handleGenerate]);

    // Fetch arrangement when restaurant or floor changes
    useEffect(() => {
        if (selectedRestaurantId) {
            fetchArrangement();
        }
    }, [selectedRestaurantId, selectedFloor]);

    const fetchArrangement = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get('/api/tables/arrangement', {
                params: { restaurantId: selectedRestaurantId, floor: selectedFloor }
            });

            if (response.data.data) {
                const data = response.data.data;
                setArrangement(data);
                setTables(data.tables || []);
                setTotalTables(data.totalTables || data.tables?.length || 0);
                setLayoutType(data.layoutType || 'custom');
            } else {
                setArrangement(null);
                setTables([]);
                setTotalTables(20);
            }
        } catch (error) {
            console.error('Error fetching arrangement:', error);
            setArrangement(null);
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Sync with orders
    const syncWithOrders = useCallback(async () => {
        try {
            setIsSyncing(true);
            toast.loading('Syncing tables with pending orders...');
            
            const response = await axios.put('/api/tables/arrangement', {
                restaurantId: selectedRestaurantId,
                floor: selectedFloor,
                syncWithOrders: true
            });
            
            if (response.data.success) {
                toast.success(response.data.message);
                await fetchArrangement();
            } else {
                toast.error(response.data.message || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync tables with orders');
        } finally {
            setIsSyncing(false);
        }
    }, [selectedRestaurantId, selectedFloor]);

    // Update table with timestamp
    const updateTableWithTimestamp = useCallback((tableId: string, updates: Partial<Table>) => {
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, ...updates, lastUpdated: new Date() } : t
        ));
        if (selectedTable?.id === tableId) {
            setSelectedTable(prev => prev ? { ...prev, ...updates, lastUpdated: new Date() } : null);
        }
    }, [selectedTable]);

    const moveTable = useCallback((tableId: string, newX: number, newY: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        const boundedX = Math.max(0, Math.min(newX, 1200 - (table.width || 80)));
        const boundedY = Math.max(0, Math.min(newY, 800 - (table.height || 80)));

        updateTableWithTimestamp(tableId, { x: boundedX, y: boundedY });
    }, [tables, updateTableWithTimestamp]);

    const deleteTable = useCallback((tableId: string) => {
        setTables(prev => prev.filter(t => t.id !== tableId));
        setTotalTables(prev => prev - 1);
        if (selectedTable?.id === tableId) {
            closeSidebar();
        }
        toast.success('Table deleted');
    }, [selectedTable]);

    const duplicateTable = useCallback((table: Table) => {
        const newTable: Table = {
            ...table,
            id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            number: tables.length + 1,
            x: Math.min(table.x + 30, 1120),
            y: Math.min(table.y + 30, 720),
            lastUpdated: new Date(),
        };
        setTables(prev => [...prev, newTable]);
        setTotalTables(prev => prev + 1);
        toast.success(`Table ${newTable.number} duplicated`);
    }, [tables]);

    const updateTableCapacity = useCallback((tableId: string, capacity: number) => {
        updateTableWithTimestamp(tableId, { capacity });
    }, [updateTableWithTimestamp]);

    const updateTableStatus = useCallback((tableId: string, status: Table['status']) => {
        updateTableWithTimestamp(tableId, { status });
        toast.success(`Status updated to ${status}`);
    }, [updateTableWithTimestamp]);

    const updateTableLocation = useCallback((tableId: string, location: string) => {
        updateTableWithTimestamp(tableId, { location });
    }, [updateTableWithTimestamp]);

    const updateTableDescription = useCallback((tableId: string, description: string) => {
        updateTableWithTimestamp(tableId, { description });
    }, [updateTableWithTimestamp]);

    const addTag = useCallback((tableId: string, tag: string) => {
        if (!tag.trim()) return;
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, tags: [...(t.tags || []), tag.trim()], lastUpdated: new Date() } : t
        ));
        if (selectedTable?.id === tableId) {
            setSelectedTable(prev => prev ? { ...prev, tags: [...(prev.tags || []), tag.trim()], lastUpdated: new Date() } : null);
        }
        setNewTag('');
        setShowTagDialog(false);
    }, [selectedTable]);

    const removeTag = useCallback((tableId: string, tag: string) => {
        setTables(prev => prev.map(t =>
            t.id === tableId ? { ...t, tags: t.tags?.filter(tg => tg !== tag) || [], lastUpdated: new Date() } : t
        ));
        if (selectedTable?.id === tableId) {
            setSelectedTable(prev => prev ? { ...prev, tags: prev.tags?.filter(tg => tg !== tag) || [], lastUpdated: new Date() } : null);
        }
    }, [selectedTable]);

    const toggleFeature = useCallback((tableId: string, feature: string) => {
        setTables(prev => prev.map(t => {
            if (t.id !== tableId) return t;
            const features = t.features || [];
            const newFeatures = features.includes(feature)
                ? features.filter(f => f !== feature)
                : [...features, feature];
            return { ...t, features: newFeatures, lastUpdated: new Date() };
        }));
        if (selectedTable?.id === tableId) {
            setSelectedTable(prev => {
                if (!prev) return null;
                const features = prev.features || [];
                const newFeatures = features.includes(feature)
                    ? features.filter(f => f !== feature)
                    : [...features, feature];
                return { ...prev, features: newFeatures, lastUpdated: new Date() };
            });
        }
    }, [selectedTable]);

    // Save arrangement
    const saveArrangement = useCallback(async () => {
        const selectedRestaurant = restaurants.find(r => r._id === selectedRestaurantId);
        
        const dataToSave = {
            restaurantId: selectedRestaurantId,
            restaurantName: selectedRestaurant?.name || 'Unknown Restaurant',
            name: `${selectedRestaurant?.name || 'Restaurant'} - ${selectedFloor} Layout`,
            floor: selectedFloor,
            layoutType,
            totalTables: tables.length,
            tables: tables.map(t => ({
                id: t.id,
                number: t.number,
                capacity: t.capacity,
                shape: t.shape,
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                status: t.status,
                rotation: t.rotation || 0,
                location: t.location || '',
                description: t.description || '',
                tags: t.tags || [],
                features: t.features || [],
                lastUpdated: new Date(),
            })),
            dimensions: { width: 1200, height: 800 },
            updatedAt: new Date(),
        };

        try {
            setIsSaving(true);
            const response = await axios.post('/api/tables/arrangement', dataToSave);
            setArrangement(response.data.data);
            toast.success(`${selectedRestaurant?.name} arrangement saved!`);
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save arrangement');
        } finally {
            setIsSaving(false);
        }
    }, [tables, layoutType, selectedFloor, selectedRestaurantId, restaurants]);

    const resetLayout = useCallback(() => {
        handleGenerate();
        toast.success('Layout reset');
    }, [handleGenerate]);

    const autoArrange = useCallback(() => {
        const cols = Math.ceil(Math.sqrt(tables.length));
        const spacing = 120;
        setTables(prev => prev.map((table, i) => ({
            ...table,
            x: 50 + (i % cols) * spacing,
            y: 50 + Math.floor(i / cols) * spacing,
            rotation: 0,
            lastUpdated: new Date(),
        })));
        toast.success('Tables auto-arranged');
    }, [tables.length]);

    const stats = useMemo(() => ({
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
    }), [tables]);

    const selectedRestaurantData = restaurants.find(r => r._id === selectedRestaurantId);

    // SIDEBAR HANDLING FUNCTIONS
    const openSidebar = useCallback((table: Table) => {
        setSelectedTable(table);
        
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsMobileSheetOpen(true);
        } else {
            setIsSidebarOpen(true);
        }
    }, []);

    const closeSidebar = useCallback(() => {
        setSelectedTable(null);
        setIsSidebarOpen(false);
        setIsMobileSheetOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        if (isSidebarOpen) {
            closeSidebar();
        } else if (selectedTable) {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setIsMobileSheetOpen(true);
            } else {
                setIsSidebarOpen(true);
            }
        }
    }, [isSidebarOpen, selectedTable, closeSidebar]);

    const handleTableSelect = useCallback((table: Table) => {
        openSidebar(table);
    }, [openSidebar]);

    // Handle escape key
    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (isSidebarOpen || isMobileSheetOpen)) {
                closeSidebar();
            }
        };
        
        document.addEventListener('keydown', handleEscapeKey);
        return () => document.removeEventListener('keydown', handleEscapeKey);
    }, [isSidebarOpen, isMobileSheetOpen, closeSidebar]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024 && isSidebarOpen) {
                const target = e.target as HTMLElement;
                if (sidebarRef.current && !sidebarRef.current.contains(target) && 
                    !target.closest('.table-icon') && !target.closest('.table-click-area')) {
                    closeSidebar();
                }
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSidebarOpen, closeSidebar]);

    // Loading state
    if (isLoadingRestaurants) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading restaurants...</p>
                </div>
            </div>
        );
    }

    // No restaurants found
    if (restaurants.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">No Restaurants Found</h2>
                    <p className="text-gray-500 mb-4">Please create a restaurant first before setting up table arrangements.</p>
                    <Button onClick={() => router.push('/admin/restaurants/new')} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" /> Create Restaurant
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 overflow-x-hidden">
            {/* Main Content */}
            <div className={`transition-all duration-500 ease-in-out ${
                isSidebarOpen && selectedTable && !isMobile ? 'lg:pr-80' : ''
            }`}>
                <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/admin')}
                                className="rounded-full"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline ml-2">Back</span>
                            </Button>
                            
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <Table className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                                <span className="hidden xs:inline">Tables</span>
                            </h1>
                        </div>

                        {/* Desktop Controls */}
                        <div className="hidden md:flex items-center gap-3 flex-wrap">
                            {/* Dynamic Restaurant Selector */}
                            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                                <SelectTrigger className="w-56 lg:w-64">
                                    <Store className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Select Restaurant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurants.map((r) => (
                                        <SelectItem key={r._id} value={r._id}>
                                            {r.name}
                                            {!r.isActive && <Badge variant="destructive" className="ml-2 text-xs">Inactive</Badge>}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                                <SelectTrigger className="w-40">
                                    <Home className="w-4 h-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFloors.map((floor) => (
                                        <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button onClick={syncWithOrders} disabled={isSyncing} variant="outline" className="rounded-full">
                                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync Orders'}
                            </Button>

                            <Button onClick={saveArrangement} disabled={isSaving} className="rounded-full bg-green-600 hover:bg-green-700">
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>

                            {selectedTable && (
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={toggleSidebar}
                                    className="rounded-full"
                                >
                                    {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                </Button>
                            )}
                        </div>

                        {/* Mobile Controls */}
                        <div className="flex md:hidden items-center gap-2 w-full justify-between">
                            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurants.map((r) => (
                                        <SelectItem key={r._id} value={r._id}>
                                            {r.name.substring(0, 20)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <div className="flex items-center gap-2">
                                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                                    <SelectTrigger className="w-28">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFloors.map((floor) => (
                                            <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button onClick={syncWithOrders} disabled={isSyncing} size="sm" variant="outline">
                                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                </Button>

                                <Button onClick={saveArrangement} disabled={isSaving} size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Save className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Current Restaurant Banner */}
                    <Alert className="mb-3 sm:mb-4 bg-purple-50 border-purple-200 text-xs sm:text-sm">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800 truncate">
                            <span className="hidden xs:inline">Editing: </span>
                            <strong>{selectedRestaurantData?.name || 'No restaurant selected'}</strong> - {selectedFloor}
                            {selectedRestaurantData?.address && (
                                <span className="hidden sm:inline ml-2 text-gray-500">
                                    • {selectedRestaurantData.address}
                                </span>
                            )}
                        </AlertDescription>
                    </Alert>

                    {/* Setup Panel */}
                    <Card className="mb-3 sm:mb-4">
                        <CardHeader className="py-2 sm:py-4">
                            <CardTitle className="text-base sm:text-lg">Table Setup</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                                <div>
                                    <Label className="text-xs sm:text-sm">Total Tables</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={totalTables}
                                        onChange={(e) => setTotalTables(parseInt(e.target.value) || 0)}
                                        className="h-8 sm:h-10 text-sm"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs sm:text-sm">Layout</Label>
                                    <Select value={layoutType} onValueChange={(v) => setLayoutType(v as 'grid' | 'rows' | 'custom')}>
                                        <SelectTrigger className="h-8 sm:h-10 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom">Custom</SelectItem>
                                            <SelectItem value="rows">Rows</SelectItem>
                                            <SelectItem value="grid">Grid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(layoutType === 'rows' || layoutType === 'grid') && (
                                    <>
                                        <div>
                                            <Label className="text-xs sm:text-sm">Rows</Label>
                                            <Input type="number" min="1" value={inputRows} onChange={(e) => setInputRows(parseInt(e.target.value) || 0)} className="h-8 sm:h-10" />
                                        </div>
                                        <div>
                                            <Label className="text-xs sm:text-sm">Cols</Label>
                                            <Input type="number" min="1" value={inputCols} onChange={(e) => setInputCols(parseInt(e.target.value) || 0)} className="h-8 sm:h-10" />
                                        </div>
                                    </>
                                )}

                                {layoutType === 'custom' && (
                                    <>
                                        <div>
                                            <Label className="text-xs sm:text-sm">Capacity</Label>
                                            <div className="flex items-center gap-1">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setDefaultCapacity(Math.max(1, defaultCapacity - 1))}>
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm">{defaultCapacity}</span>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setDefaultCapacity(Math.min(20, defaultCapacity + 1))}>
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs sm:text-sm">Shape</Label>
                                            <Select value={defaultShape} onValueChange={(v) => setDefaultShape(v as 'circle' | 'square' | 'rectangle')}>
                                                <SelectTrigger className="h-8 sm:h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="circle">Round</SelectItem>
                                                    <SelectItem value="square">Square</SelectItem>
                                                    <SelectItem value="rectangle">Rect</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                                <Button onClick={applyArrangement} size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm">
                                    <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Generate
                                </Button>
                                {tables.length > 0 && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={resetLayout} className="text-xs sm:text-sm">
                                            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Reset
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={autoArrange} className="text-xs sm:text-sm">
                                            <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Auto
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Bar */}
                    {showStats && tables.length > 0 && (
                        <div className="grid grid-cols-4 gap-1 sm:gap-3 mb-3 sm:mb-4">
                            <Card><CardContent className="p-2 sm:p-3 text-center"><div className="text-lg sm:text-2xl font-bold">{stats.total}</div><div className="text-[8px] sm:text-xs text-gray-600">Total</div></CardContent></Card>
                            <Card><CardContent className="p-2 sm:p-3 text-center"><div className="text-lg sm:text-2xl font-bold text-green-600">{stats.available}</div><div className="text-[8px] sm:text-xs text-gray-600">Free</div></CardContent></Card>
                            <Card><CardContent className="p-2 sm:p-3 text-center"><div className="text-lg sm:text-2xl font-bold text-red-600">{stats.occupied}</div><div className="text-[8px] sm:text-xs text-gray-600">Used</div></CardContent></Card>
                            <Card><CardContent className="p-2 sm:p-3 text-center"><div className="text-lg sm:text-2xl font-bold">{stats.totalCapacity}</div><div className="text-[8px] sm:text-xs text-gray-600">Seats</div></CardContent></Card>
                        </div>
                    )}

                    {/* Canvas */}
                    {tables.length > 0 && (
                        <Card className="overflow-hidden">
                            <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <CardTitle className="text-sm sm:text-base">{selectedFloor} Layout</CardTitle>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setShowGrid(!showGrid)}>
                                                        {showGrid ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Toggle Grid</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(!editMode)} className="h-7 text-xs">
                                            <Edit3 className="w-3 h-3 mr-1" /> {editMode ? 'Edit' : 'View'}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div
                                    ref={containerRef}
                                    className="relative bg-white overflow-auto touch-pan-x touch-pan-y"
                                    style={{
                                        height: 'min(500px, 70vh)',
                                        maxWidth: '100%',
                                        backgroundImage: showGrid ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)` : 'none',
                                        backgroundSize: `${gridSize}px ${gridSize}px`,
                                    }}
                                >
                                    <div
                                        className="relative"
                                        style={{ 
                                            width: 1200 * (zoom / 100), 
                                            height: 800 * (zoom / 100), 
                                            transform: `scale(${zoom / 100})`, 
                                            transformOrigin: 'top left' 
                                        }}
                                    >
                                        {tables.map((table) => (
                                            <TableIcon
                                                key={table.id}
                                                table={table}
                                                isSelected={selectedTable?.id === table.id}
                                                isEditMode={editMode}
                                                layoutType={layoutType}
                                                gridSize={gridSize}
                                                snapToGrid={snapToGrid}
                                                onSelect={() => handleTableSelect(table)}
                                                onMove={moveTable}
                                                onDelete={deleteTable}
                                                onDuplicate={duplicateTable}
                                                onCapacityChange={updateTableCapacity}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Zoom Control */}
                    {tables.length > 0 && (
                        <div className="flex items-center justify-end gap-2 mt-2 sm:mt-3">
                            <Label className="text-[10px] sm:text-xs">Zoom:</Label>
                            <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={50} max={150} step={10} className="w-24 sm:w-32" />
                            <span className="text-[10px] sm:text-xs w-8 sm:w-10">{zoom}%</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {tables.length === 0 && (
                        <Card className="mt-4">
                            <CardContent className="py-8 sm:py-12 text-center">
                                <Table className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm sm:text-base">No tables generated yet</p>
                                <p className="text-gray-400 text-xs sm:text-sm mt-1">Use the setup panel above to generate tables</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && selectedTable && typeof window !== 'undefined' && window.innerWidth >= 1024 && (
                    <motion.div
                        ref={sidebarRef}
                        initial={{ opacity: 0, x: 320 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 320 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="table-panel fixed top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-40 overflow-y-auto"
                        style={{ maxHeight: '100vh' }}
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-3 flex items-center justify-between z-10">
                            <h2 className="font-semibold text-gray-800">Table Details</h2>
                            <Button variant="ghost" size="icon" onClick={closeSidebar} className="h-8 w-8 rounded-full">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-4">
                            <TableDetailPanel
                                table={selectedTable}
                                onClose={closeSidebar}
                                onStatusChange={updateTableStatus}
                                onLocationChange={updateTableLocation}
                                onDescriptionChange={updateTableDescription}
                                onToggleFeature={toggleFeature}
                                onAddTag={addTag}
                                onRemoveTag={removeTag}
                                onDuplicate={duplicateTable}
                                onDelete={deleteTable}
                                onShowTagDialog={() => setShowTagDialog(true)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Bottom Sheet */}
            <Sheet open={isMobileSheetOpen} onOpenChange={(open) => {
                setIsMobileSheetOpen(open);
                if (!open) closeSidebar();
            }}>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full z-50" />
                    <div className="sticky top-0 bg-white border-b border-gray-100 p-3 flex items-center justify-between z-10">
                        <h2 className="font-semibold text-gray-800">Table Details</h2>
                        <Button variant="ghost" size="icon" onClick={closeSidebar} className="h-8 w-8 rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="p-4 pt-2 h-full overflow-y-auto">
                        {selectedTable && (
                            <TableDetailPanel
                                table={selectedTable}
                                onClose={closeSidebar}
                                onStatusChange={updateTableStatus}
                                onLocationChange={updateTableLocation}
                                onDescriptionChange={updateTableDescription}
                                onToggleFeature={toggleFeature}
                                onAddTag={addTag}
                                onRemoveTag={removeTag}
                                onDuplicate={duplicateTable}
                                onDelete={deleteTable}
                                onShowTagDialog={() => setShowTagDialog(true)}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Add Tag Dialog */}
            <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                <DialogContent className="w-[90vw] max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Custom Tag</DialogTitle>
                        <DialogDescription>Enter a custom tag for this table.</DialogDescription>
                    </DialogHeader>
                    <Input
                        placeholder="e.g., Birthday Special"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && selectedTable && addTag(selectedTable.id, newTag)}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTagDialog(false)}>Cancel</Button>
                        <Button onClick={() => selectedTable && addTag(selectedTable.id, newTag)}>Add Tag</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}