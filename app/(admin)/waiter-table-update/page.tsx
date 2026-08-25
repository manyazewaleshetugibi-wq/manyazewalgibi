// app/(admin)/waiter-table-update/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
    RefreshCw, Armchair, Store, Layers, Users, Coffee, Clock, AlertCircle,
    CheckCircle, XCircle, Home, Building2, Search, Filter,
    Eye, ChevronLeft, ChevronRight, X, Utensils, LogOut
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface Table {
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
    floor?: string;
    restaurantId?: string;
    restaurantName?: string;
}

interface RestaurantData {
    restaurantId: string;
    restaurantName: string;
    floor: string;
}

// Status Config
const STATUS_CONFIG: Record<Table['status'], { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
    available: { label: 'Available', color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="w-3 h-3" /> },
    occupied: { label: 'Occupied', color: 'text-red-600', bgColor: 'bg-red-100', icon: <Coffee className="w-3 h-3" /> },
    reserved: { label: 'Reserved', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <Clock className="w-3 h-3" /> },
    cleaning: { label: 'Cleaning', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <AlertCircle className="w-3 h-3" /> },
    maintenance: { label: 'Maintenance', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <XCircle className="w-3 h-3" /> }
};

// Floor order
const FLOOR_ORDER: Record<string, number> = {
    'Ground Floor': 1, 'First Floor': 2, 'Second Floor': 3, 'Rooftop': 4, 'Basement': 5
};

// Available floors
const AVAILABLE_FLOORS = ['Ground Floor', 'First Floor', 'Second Floor', 'Rooftop'];

// Restaurant options
const RESTAURANTS = [
    { id: 'manyazewal1', name: 'Manyazewal Eshetu Gibi 1', icon: '🏠' },
    { id: 'manyazewal2', name: 'Manyazewal Eshetu Gibi 2', icon: '🏢' },
];

// Table Card Component
function TableCard({ table, onClick, isUpdating }: { table: Table; onClick: () => void; isUpdating: boolean }) {
    const config = STATUS_CONFIG[table.status];
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
        >
            <Card className={`overflow-hidden border-2 transition-all hover:shadow-xl ${
                table.status === 'available' ? 'border-green-200 bg-green-50/30' :
                table.status === 'occupied' ? 'border-red-200 bg-red-50/30' :
                table.status === 'reserved' ? 'border-yellow-200 bg-yellow-50/30' :
                table.status === 'cleaning' ? 'border-blue-200 bg-blue-50/30' :
                'border-gray-200 bg-gray-50/30'
            }`} onClick={onClick}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                                table.status === 'available' ? 'from-green-400 to-green-500' :
                                table.status === 'occupied' ? 'from-red-400 to-red-500' :
                                table.status === 'reserved' ? 'from-yellow-400 to-yellow-500' :
                                table.status === 'cleaning' ? 'from-blue-400 to-blue-500' :
                                'from-gray-400 to-gray-500'
                            } flex items-center justify-center shadow`}>
                                <Armchair className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Table {table.number}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Users className="w-3 h-3" />
                                    <span>{table.capacity} seats</span>
                                    {table.location && <span>• {table.location}</span>}
                                </div>
                            </div>
                        </div>
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                        </Badge>
                    </div>
                    
                    {table.location && (
                        <div className="text-xs text-gray-500 mt-2">
                            📍 {table.location}
                        </div>
                    )}
                    
                    <div className="mt-3">
                        <Button 
                            size="sm" 
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            disabled={isUpdating}
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                        >
                            {isUpdating ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            ) : table.status === 'available' ? (
                                'Seat Customer'
                            ) : table.status === 'occupied' ? (
                                'Complete Order'
                            ) : table.status === 'cleaning' ? (
                                'Mark Ready'
                            ) : table.status === 'reserved' ? (
                                'Seat Customer'
                            ) : (
                                'Mark Available'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Status Filter Button
function StatusFilterButton({ status, label, count, isActive, onClick }: { 
    status: string; label: string; count: number; isActive: boolean; onClick: () => void;
}) {
    return (
        <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={onClick}
            className={`rounded-full ${isActive ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
        >
            {label}
            <Badge className="ml-1 bg-white/20 text-white border-0">{count}</Badge>
        </Button>
    );
}

// Main Component
export default function WaiterTableUpdatePage() {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    
    // State
    const [restaurants] = useState(RESTAURANTS);
    const [selectedRestaurant, setSelectedRestaurant] = useState('manyazewal1');
    const [selectedFloor, setSelectedFloor] = useState('Ground Floor');
    const [tables, setTables] = useState<Table[]>([]);
    const [filteredTables, setFilteredTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    
    // Check auth
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.push('/login?callbackUrl=/waiter-table-update');
        }
    }, [sessionStatus, router]);
    
    // Fetch tables
    const fetchTables = useCallback(async () => {
        if (!selectedRestaurant || !selectedFloor) return;
        
        try {
            setIsLoading(true);
            const response = await axios.get('/api/tables/arrangement', {
                params: { restaurantId: selectedRestaurant, floor: selectedFloor }
            });
            
            if (response.data.data) {
                const arrangement = response.data.data;
                const tableData = (arrangement.tables || []).map((t: any) => ({
                    ...t,
                    floor: selectedFloor,
                    restaurantId: selectedRestaurant,
                    restaurantName: arrangement.restaurantName,
                }));
                setTables(tableData);
            } else {
                setTables([]);
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Failed to load tables');
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedRestaurant, selectedFloor]);
    
    useEffect(() => {
        fetchTables();
    }, [fetchTables]);
    
    // Filter tables
    useEffect(() => {
        let filtered = [...tables];
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.number.toString().includes(term) ||
                t.location?.toLowerCase().includes(term)
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
        
        setFilteredTables(filtered);
    }, [tables, searchTerm, statusFilter]);
    
    // Update table status
    const updateTableStatus = async (table: Table, newStatus: Table['status']) => {
        setUpdatingTableId(table.id);
        
        try {
            await axios.patch('/api/tables/arrangement', {
                restaurantId: selectedRestaurant,
                floor: selectedFloor,
                tableId: table.id,
                status: newStatus,
                updates: { lastUpdated: new Date() }
            });
            
            // Update local state
            setTables(prev => prev.map(t => 
                t.id === table.id ? { ...t, status: newStatus, lastUpdated: new Date() } : t
            ));
            
            // Show success message
            const messages = {
                available: 'Table is now available',
                occupied: 'Customer seated',
                cleaning: 'Table sent for cleaning',
                reserved: 'Customer seated',
                maintenance: 'Table status updated'
            };
            toast.success(messages[newStatus] || 'Status updated');
            
        } catch (error) {
            console.error('Error updating table:', error);
            toast.error('Failed to update table status');
        } finally {
            setUpdatingTableId(null);
            setShowConfirmDialog(false);
            setSelectedTable(null);
        }
    };
    
    // Handle table click - determine next status
    const handleTableClick = (table: Table) => {
        let nextStatus: Table['status'];
        switch (table.status) {
            case 'available': nextStatus = 'occupied'; break;
            case 'occupied': nextStatus = 'cleaning'; break;
            case 'reserved': nextStatus = 'occupied'; break;
            case 'cleaning': nextStatus = 'available'; break;
            case 'maintenance': nextStatus = 'available'; break;
            default: nextStatus = 'available';
        }
        setSelectedTable(table);
        setShowConfirmDialog(true);
    };
    
    const handleConfirm = () => {
        if (selectedTable) {
            let nextStatus: Table['status'];
            switch (selectedTable.status) {
                case 'available': nextStatus = 'occupied'; break;
                case 'occupied': nextStatus = 'cleaning'; break;
                case 'reserved': nextStatus = 'occupied'; break;
                case 'cleaning': nextStatus = 'available'; break;
                default: nextStatus = 'available';
            }
            updateTableStatus(selectedTable, nextStatus);
        }
    };
    
    // Stats
    const stats = useMemo(() => ({
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        cleaning: tables.filter(t => t.status === 'cleaning').length,
    }), [tables]);
    
    const selectedRestaurantData = restaurants.find(r => r.id === selectedRestaurant);
    
    if (sessionStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/menu')}
                            className="rounded-full"
                        >
                            <Utensils className="w-4 h-4" />
                            <span className="hidden sm:inline ml-2">Menu</span>
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Armchair className="w-6 h-6 text-purple-600" />
                            Waiter Panel
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>{session?.user?.name || session?.user?.email || 'Waiter'}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-red-600 hover:text-red-700"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                
                {/* Restaurant & Floor Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Restaurant</label>
                        <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                            <SelectTrigger className="bg-white border-2 border-purple-200 rounded-xl">
                                <Store className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {restaurants.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium mb-1 block">Floor</label>
                        <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                            <SelectTrigger className="bg-white border-2 border-purple-200 rounded-xl">
                                <Layers className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AVAILABLE_FLOORS.map(floor => (
                                    <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {/* Current Location */}
                <Alert className="mb-6 bg-purple-50 border-purple-200">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800">
                        <strong>{selectedRestaurantData?.name}</strong> - {selectedFloor}
                    </AlertDescription>
                </Alert>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-2 mb-6">
                    <Card><CardContent className="p-2 text-center"><div className="text-xl font-bold">{stats.total}</div><div className="text-xs text-gray-500">Total</div></CardContent></Card>
                    <Card><CardContent className="p-2 text-center"><div className="text-xl font-bold text-green-600">{stats.available}</div><div className="text-xs text-gray-500">Free</div></CardContent></Card>
                    <Card><CardContent className="p-2 text-center"><div className="text-xl font-bold text-red-600">{stats.occupied}</div><div className="text-xs text-gray-500">Used</div></CardContent></Card>
                    <Card><CardContent className="p-2 text-center"><div className="text-xl font-bold text-yellow-600">{stats.reserved}</div><div className="text-xs text-gray-500">Reserved</div></CardContent></Card>
                    <Card><CardContent className="p-2 text-center"><div className="text-xl font-bold text-blue-600">{stats.cleaning}</div><div className="text-xs text-gray-500">Clean</div></CardContent></Card>
                </div>
                
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search table number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white border-2 border-purple-200 rounded-xl"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <StatusFilterButton status="all" label="All" count={stats.total} isActive={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                        <StatusFilterButton status="available" label="Free" count={stats.available} isActive={statusFilter === 'available'} onClick={() => setStatusFilter('available')} />
                        <StatusFilterButton status="occupied" label="Used" count={stats.occupied} isActive={statusFilter === 'occupied'} onClick={() => setStatusFilter('occupied')} />
                        <StatusFilterButton status="reserved" label="Reserved" count={stats.reserved} isActive={statusFilter === 'reserved'} onClick={() => setStatusFilter('reserved')} />
                        <StatusFilterButton status="cleaning" label="Clean" count={stats.cleaning} isActive={statusFilter === 'cleaning'} onClick={() => setStatusFilter('cleaning')} />
                    </div>
                    
                    <Button variant="outline" onClick={fetchTables} disabled={isLoading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                
                {/* Tables Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Card key={i}><CardContent className="p-4"><div className="h-32 bg-gray-100 rounded-lg animate-pulse" /></CardContent></Card>
                        ))}
                    </div>
                ) : filteredTables.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Armchair className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No tables found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTables.map(table => (
                            <TableCard
                                key={table.id}
                                table={table}
                                onClick={() => handleTableClick(table)}
                                isUpdating={updatingTableId === table.id}
                            />
                        ))}
                    </div>
                )}
                
                {/* Quick Guide */}
                <div className="mt-8 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="flex items-center gap-1"><Badge className="bg-green-500">Free</Badge> → <Badge className="bg-red-500">Used</Badge></div>
                        <div className="flex items-center gap-1"><Badge className="bg-red-500">Used</Badge> → <Badge className="bg-blue-500">Clean</Badge></div>
                        <div className="flex items-center gap-1"><Badge className="bg-blue-500">Clean</Badge> → <Badge className="bg-green-500">Free</Badge></div>
                        <div className="flex items-center gap-1"><Badge className="bg-yellow-500">Reserved</Badge> → <Badge className="bg-red-500">Used</Badge></div>
                        <div className="flex items-center gap-1"><span>Click table</span> → <span>Update status</span></div>
                    </div>
                </div>
            </div>
            
            {/* Confirm Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="w-[90vw] max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Table Status</DialogTitle>
                        <DialogDescription>
                            {selectedTable && (
                                <>Table {selectedTable.number} is currently <strong>{STATUS_CONFIG[selectedTable.status].label}</strong>.
                                Change to <strong>{
                                    selectedTable.status === 'available' ? 'Occupied' :
                                    selectedTable.status === 'occupied' ? 'Cleaning' :
                                    selectedTable.status === 'reserved' ? 'Occupied' :
                                    selectedTable.status === 'cleaning' ? 'Available' : 'Available'
                                }</strong>?</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700">Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
