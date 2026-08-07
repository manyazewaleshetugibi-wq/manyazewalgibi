// app/table-qr/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { encryptTableToken } from "@/lib/urlParamHandler";
import {
    Store,
    Home,
    Table,
    QrCode,
    Download,
    Copy,
    Check,
    RefreshCw,
    ArrowLeft,
    Users,
    MapPin,
    Tag,
    Sparkles,
    Loader2,
    Printer,
    Share2,
    Link2,
    Eye,
    EyeOff,
    Settings,
    ChevronDown,
    ChevronUp,
    Grid3X3,
    LayoutGrid,
    Circle,
    Square,
    AlertCircle,
    CheckCircle,
    Clock,
    Coffee,
    XCircle,
    Building2,
    Phone,
    Mail,
    Globe
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";

// Types
interface Restaurant {
    _id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    cuisine: string[];
    isActive: boolean;
    logo?: string;
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
    location?: string;
    description?: string;
    tags?: string[];
    features?: string[];
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
}

interface QRHistory {
    id: string;
    restaurantId: string;
    restaurantName: string;
    floor: string;
    tableNumber: number;
    tableId: string;
    qrCode: string;
    generatedAt: Date;
    scans: number;
    lastScanned?: Date;
}

export default function TableQRGenerator() {
    const router = useRouter();

    // State
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
    const [selectedFloor, setSelectedFloor] = useState<string>("Ground Floor");
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [arrangement, setArrangement] = useState<TableArrangement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [qrHistory, setQrHistory] = useState<QRHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [customUrl, setCustomUrl] = useState("");
    const [includeTableNumber, setIncludeTableNumber] = useState(true);
    const [includeRestaurantName, setIncludeRestaurantName] = useState(true);
    const [includeFloor, setIncludeFloor] = useState(true);
    const [qrSize, setQrSize] = useState(200);
    const [qrColor, setQrColor] = useState("#000000");
    const [qrBgColor, setQrBgColor] = useState("#ffffff");
    const [showQR, setShowQR] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

    // Available floors (could be fetched from DB)
    const availableFloors = ["Ground Floor", "First Floor", "Second Floor", "Rooftop", "Basement"];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ;
    const menuPath = process.env.NEXT_PUBLIC_MENU_PATH || "/";

    // Fetch restaurants
    useEffect(() => {
        fetchRestaurants();
        fetchQRHistory();
    }, []);

    // Fetch arrangement when restaurant or floor changes
    useEffect(() => {
        if (selectedRestaurantId) {
            fetchArrangement();
        }
    }, [selectedRestaurantId, selectedFloor]);

    const fetchRestaurants = async () => {
        try {
            const response = await axios.get('/api/restaurants');
            if (response.data.success && response.data.data) {
                const activeRestaurants = response.data.data.filter((r: Restaurant) => r.isActive !== false);
                setRestaurants(activeRestaurants);
                if (activeRestaurants.length > 0) {
                    setSelectedRestaurantId(activeRestaurants[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            toast.error('Failed to load restaurants');
        }
    };

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
            } else {
                setArrangement(null);
                setTables([]);
            }
        } catch (error) {
            console.error('Error fetching arrangement:', error);
            setTables([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQRHistory = async () => {
        try {
            const response = await axios.get('/api/qr-history');
            if (response.data.success) {
                setQrHistory(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching QR history:', error);
        }
    };

    // Generate QR URL
    const generateQRUrl = (table: Table) => {
        const params = new URLSearchParams();
        
        if (includeTableNumber) {
            params.append('table', table.number.toString());
        }
        if (includeRestaurantName && selectedRestaurant) {
            params.append('restaurant', selectedRestaurant.name);
        }
        if (includeFloor) {
            params.append('floor', selectedFloor);
        }
        if (table.id) {
            params.append('tableId', table.id);
        }
        if (selectedRestaurantId) {
            params.append('restaurantId', selectedRestaurantId);
        }

        // Add table-specific data
        if (table.capacity) {
            params.append('capacity', table.capacity.toString());
        }
        if (table.location) {
            params.append('location', table.location);
        }
        if (table.tags && table.tags.length > 0) {
            params.append('tags', table.tags.join(','));
        }

        // Encrypt the internal table/restaurant ids so they are not readable
        // or guessable in the URL. Readers fall back to plaintext params when
        // no token is present (e.g. older QR codes).
        const token = encryptTableToken(table.id || '', selectedRestaurantId || '');
        if (token) {
            params.append('t', token);
        }

        const queryString = params.toString();
        return customUrl || `${baseUrl}${menuPath}${queryString ? `?${queryString}` : ''}`;
    };

    // Handle table selection
    const handleTableSelect = (table: Table) => {
        setSelectedTable(table);
        setSelectedTableId(table.id);
        setShowQR(true);
        // Track QR generation
        trackQRGeneration(table);
    };

    // Track QR generation
    const trackQRGeneration = async (table: Table) => {
        try {
            const qrUrl = generateQRUrl(table);
            const historyEntry = {
                restaurantId: selectedRestaurantId,
                restaurantName: selectedRestaurant?.name || '',
                floor: selectedFloor,
                tableNumber: table.number,
                tableId: table.id,
                qrCode: qrUrl,
                generatedAt: new Date(),
                scans: 0
            };

            // Save to history
            const response = await axios.post('/api/qr-history', historyEntry);
            if (response.data.success) {
                setQrHistory(prev => [response.data.data, ...prev]);
            }
        } catch (error) {
            console.error('Error tracking QR generation:', error);
        }
    };

    // Download QR Code
    const downloadQR = () => {
        const canvas = document.querySelector<HTMLCanvasElement>('.qr-code-canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `table-${selectedTable?.number}-qr-${selectedRestaurant?.name?.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('QR Code downloaded successfully!');
        }
    };

    // Copy QR URL
    const copyQRUrl = () => {
        if (selectedTable) {
            const url = generateQRUrl(selectedTable);
            navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('URL copied to clipboard!');
            setTimeout(() => setCopied(false), 3000);
        }
    };

    // Print QR Code
    const printQR = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow && selectedTable) {
            const qrUrl = generateQRUrl(selectedTable);
            printWindow.document.write(`
                <html>
                    <head><title>QR Code - Table ${selectedTable.number}</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial">
                        <h1>${selectedRestaurant?.name || 'Restaurant'}</h1>
                        <h2>Table ${selectedTable.number}</h2>
                        <img src="${document.querySelector<HTMLCanvasElement>('.qr-code-canvas')?.toDataURL('image/png')}" />
                        <p>${qrUrl}</p>
                        <p style="margin-top:20px;color:#666">Floor: ${selectedFloor}</p>
                        <p style="color:#666">Capacity: ${selectedTable.capacity} guests</p>
                        ${selectedTable.location ? `<p style="color:#666">Location: ${selectedTable.location}</p>` : ''}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Share QR Code
    const shareQR = async () => {
        if (selectedTable) {
            try {
                const canvas = document.querySelector<HTMLCanvasElement>('.qr-code-canvas');
                if (canvas) {
                    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!)));
                    const file = new File([blob], `table-${selectedTable.number}-qr.png`, { type: 'image/png' });
                    
                    if (navigator.share) {
                        await navigator.share({
                            title: `Table ${selectedTable.number} QR Code - ${selectedRestaurant?.name}`,
                            text: `Scan to view menu for Table ${selectedTable.number} at ${selectedRestaurant?.name}`,
                            files: [file]
                        });
                    } else {
                        // Fallback: Copy URL
                        copyQRUrl();
                    }
                }
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    };

    // Generate multiple QR codes
    const generateMultipleQRs = async () => {
        setIsGenerating(true);
        try {
            const selectedTables = tables.filter(t => t.status !== 'maintenance');
            let generated = 0;
            
            for (const table of selectedTables) {
                await trackQRGeneration(table);
                generated++;
                // Add small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            toast.success(`Generated ${generated} QR codes successfully!`);
        } catch (error) {
            console.error('Error generating multiple QRs:', error);
            toast.error('Failed to generate some QR codes');
        } finally {
            setIsGenerating(false);
        }
    };

    // Filter tables
    const filteredTables = useMemo(() => {
        let filtered = tables;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.number.toString().includes(term) ||
                t.location?.toLowerCase().includes(term) ||
                t.tags?.some(tag => tag.toLowerCase().includes(term)) ||
                t.description?.toLowerCase().includes(term)
            );
        }
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(t => t.status === filterStatus);
        }
        
        return filtered;
    }, [tables, searchTerm, filterStatus]);

    // Get selected restaurant
    const selectedRestaurant = restaurants.find(r => r._id === selectedRestaurantId);

    // Get table stats
    const tableStats = useMemo(() => ({
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        cleaning: tables.filter(t => t.status === 'cleaning').length,
        maintenance: tables.filter(t => t.status === 'maintenance').length,
        totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0)
    }), [tables]);

    // Loading state
    if (isLoading && restaurants.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading restaurants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/admin')}
                            className="rounded-full"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" />
                                Table QR Generator
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Generate QR codes for tables to link customers directly to your menu
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="rounded-full"
                        >
                            {showHistory ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                            History ({qrHistory.length})
                        </Button>
                        <Button
                            size="sm"
                            onClick={generateMultipleQRs}
                            disabled={isGenerating || tables.length === 0}
                            className="bg-red-600 hover:bg-red-700 rounded-full"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Generate All
                        </Button>
                    </div>
                </div>

                {/* Restaurant & Floor Selection */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label className="text-sm font-medium">Restaurant</Label>
                                <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                                    <SelectTrigger className="mt-1">
                                        <Store className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Select Restaurant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {restaurants.map((r) => (
                                            <SelectItem key={r._id} value={r._id}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Floor</Label>
                                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                                    <SelectTrigger className="mt-1">
                                        <Home className="w-4 h-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFloors.map((floor) => (
                                            <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="text-sm font-medium">Search Tables</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        placeholder="Search by number, location, tags..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="occupied">Occupied</SelectItem>
                                            <SelectItem value="reserved">Reserved</SelectItem>
                                            <SelectItem value="cleaning">Cleaning</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Restaurant Info Banner */}
                {selectedRestaurant && (
                    <Alert className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                        <Building2 className="h-4 w-4 text-red-600" />
                        <AlertDescription className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold">{selectedRestaurant.name}</span>
                            {selectedRestaurant.address && (
                                <span className="text-gray-600">• {selectedRestaurant.address}</span>
                            )}
                            {selectedRestaurant.phone && (
                                <span className="text-gray-600">• {selectedRestaurant.phone}</span>
                            )}
                            {selectedRestaurant.cuisine && selectedRestaurant.cuisine.length > 0 && (
                                <span className="text-gray-600">• {selectedRestaurant.cuisine.join(', ')}</span>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Table List */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Table Stats */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold">{tableStats.total}</div>
                                    <div className="text-xs text-gray-600">Total</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold text-green-600">{tableStats.available}</div>
                                    <div className="text-xs text-gray-600">Free</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold text-red-600">{tableStats.occupied}</div>
                                    <div className="text-xs text-gray-600">Used</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold text-yellow-600">{tableStats.reserved}</div>
                                    <div className="text-xs text-gray-600">Reserved</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold text-blue-600">{tableStats.cleaning}</div>
                                    <div className="text-xs text-gray-600">Cleaning</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-2 text-center">
                                    <div className="text-lg font-bold">{tableStats.totalCapacity}</div>
                                    <div className="text-xs text-gray-600">Seats</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Table Grid */}
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                            </div>
                        ) : tables.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Table className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No tables found on this floor</p>
                                    <p className="text-gray-400 text-sm">Please add tables in the Table Arrangement section</p>
                                </CardContent>
                            </Card>
                        ) : filteredTables.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No tables match your search</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredTables.map((table) => (
                                    <motion.div
                                        key={table.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            className={`cursor-pointer transition-all hover:shadow-lg ${
                                                selectedTableId === table.id ? 'ring-2 ring-red-500 shadow-lg' : ''
                                            }`}
                                            onClick={() => handleTableSelect(table)}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg">#{table.number}</span>
                                                            <Badge
                                                                variant={
                                                                    table.status === 'available' ? 'default' :
                                                                    table.status === 'occupied' ? 'destructive' :
                                                                    table.status === 'reserved' ? 'warning' :
                                                                    'secondary'
                                                                }
                                                                className="text-xs"
                                                            >
                                                                {table.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                            <Users className="w-3 h-3" />
                                                            {table.capacity} guests
                                                        </div>
                                                        {table.location && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {table.location}
                                                            </div>
                                                        )}
                                                        {table.tags && table.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {table.tags.slice(0, 2).map((tag) => (
                                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                                {table.tags.length > 2 && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        +{table.tags.length - 2}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {table.shape === 'circle' && <Circle className="w-5 h-5 text-gray-400" />}
                                                    {table.shape === 'square' && <Square className="w-5 h-5 text-gray-400" />}
                                                    {table.shape === 'rectangle' && <LayoutGrid className="w-5 h-5 text-gray-400" />}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel - QR Code Generator */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-red-600" />
                                    QR Code Generator
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {!selectedTable ? (
                                    <div className="text-center py-8">
                                        <Table className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">Select a table to generate QR code</p>
                                        <p className="text-gray-400 text-sm">Click on any table from the list</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Selected Table Info */}
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">Table #{selectedTable.number}</span>
                                                <Badge
                                                    variant={
                                                        selectedTable.status === 'available' ? 'default' :
                                                        selectedTable.status === 'occupied' ? 'destructive' :
                                                        selectedTable.status === 'reserved' ? 'warning' :
                                                        'secondary'
                                                    }
                                                >
                                                    {selectedTable.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> {selectedTable.capacity}
                                                </span>
                                                {selectedTable.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {selectedTable.location}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedTable.tags && selectedTable.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedTable.tags.map((tag) => (
                                                        <Badge key={tag} variant="outline" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* QR Code Settings */}
                                        <div className="space-y-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-between"
                                                onClick={() => setShowQR(!showQR)}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Settings className="w-4 h-4" />
                                                    QR Settings
                                                </span>
                                                {showQR ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>

                                            <AnimatePresence>
                                                {showQR && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="space-y-3 overflow-hidden"
                                                    >
                                                        <div>
                                                            <Label className="text-xs">Custom URL (Optional)</Label>
                                                            <Input
                                                                placeholder="https://yourdomain.com/menu"
                                                                value={customUrl}
                                                                onChange={(e) => setCustomUrl(e.target.value)}
                                                                className="mt-1 text-sm"
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeTableNumber}
                                                                onChange={(e) => setIncludeTableNumber(e.target.checked)}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <Label className="text-sm">Include Table Number</Label>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeRestaurantName}
                                                                onChange={(e) => setIncludeRestaurantName(e.target.checked)}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <Label className="text-sm">Include Restaurant Name</Label>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={includeFloor}
                                                                onChange={(e) => setIncludeFloor(e.target.checked)}
                                                                className="rounded border-gray-300"
                                                            />
                                                            <Label className="text-sm">Include Floor</Label>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-xs">Size</Label>
                                                                <Select
                                                                    value={qrSize.toString()}
                                                                    onValueChange={(v) => setQrSize(Number(v))}
                                                                >
                                                                    <SelectTrigger className="mt-1 h-8">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="150">Small</SelectItem>
                                                                        <SelectItem value="200">Medium</SelectItem>
                                                                        <SelectItem value="250">Large</SelectItem>
                                                                        <SelectItem value="300">XL</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs">Color</Label>
                                                                <div className="flex gap-1 mt-1">
                                                                    <input
                                                                        type="color"
                                                                        value={qrColor}
                                                                        onChange={(e) => setQrColor(e.target.value)}
                                                                        className="w-8 h-8 rounded border p-0 cursor-pointer"
                                                                    />
                                                                    <input
                                                                        type="color"
                                                                        value={qrBgColor}
                                                                        onChange={(e) => setQrBgColor(e.target.value)}
                                                                        className="w-8 h-8 rounded border p-0 cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* QR Code Display */}
                                        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg border">
                                            <div className="relative">
                                                <QRCodeCanvas
                                                    value={generateQRUrl(selectedTable)}
                                                    size={qrSize}
                                                    fgColor={qrColor}
                                                    bgColor={qrBgColor}
                                                    level="H"
                                                    includeMargin={true}
                                                    className="qr-code-canvas"
                                                />
                                                {selectedTable.status === 'occupied' && (
                                                    <div className="absolute -top-2 -right-2">
                                                        <Badge variant="destructive" className="animate-pulse">
                                                            <Coffee className="w-3 h-3 mr-1" /> Occupied
                                                        </Badge>
                                                    </div>
                                                )}
                                                {selectedTable.status === 'reserved' && (
                                                    <div className="absolute -top-2 -right-2">
                                                        <Badge variant="warning" className="animate-pulse">
                                                            <Clock className="w-3 h-3 mr-1" /> Reserved
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-700">
                                                    Table #{selectedTable.number}
                                                </p>
                                                <p className="text-xs text-gray-500 break-all">
                                                    {generateQRUrl(selectedTable)}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap justify-center gap-2 w-full">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button size="sm" onClick={downloadQR} className="bg-red-600 hover:bg-red-700">
                                                                <Download className="w-4 h-4 mr-1" />
                                                                Download
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Download QR Code</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button size="sm" variant="outline" onClick={copyQRUrl}>
                                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Copy URL</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button size="sm" variant="outline" onClick={printQR}>
                                                                <Printer className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Print QR</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button size="sm" variant="outline" onClick={shareQR}>
                                                                <Share2 className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Share QR</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>

                                        {/* Table Info for QR */}
                                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-gray-500">Restaurant:</span>
                                                    <p className="font-medium">{selectedRestaurant?.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Floor:</span>
                                                    <p className="font-medium">{selectedFloor}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Capacity:</span>
                                                    <p className="font-medium">{selectedTable.capacity} guests</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Status:</span>
                                                    <p className="font-medium capitalize">{selectedTable.status}</p>
                                                </div>
                                                {selectedTable.location && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500">Location:</span>
                                                        <p className="font-medium">{selectedTable.location}</p>
                                                    </div>
                                                )}
                                                {selectedTable.description && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500">Description:</span>
                                                        <p className="font-medium">{selectedTable.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* QR History */}
                {showHistory && qrHistory.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-gray-500" />
                                    QR Code History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-3">Restaurant</th>
                                                <th className="text-left py-2 px-3">Table</th>
                                                <th className="text-left py-2 px-3">Floor</th>
                                                <th className="text-left py-2 px-3">Generated</th>
                                                <th className="text-left py-2 px-3">Scans</th>
                                                <th className="text-left py-2 px-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {qrHistory.slice(0, 20).map((item) => (
                                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                                    <td className="py-2 px-3">{item.restaurantName}</td>
                                                    <td className="py-2 px-3 font-medium">#{item.tableNumber}</td>
                                                    <td className="py-2 px-3">{item.floor}</td>
                                                    <td className="py-2 px-3 text-gray-500">
                                                        {new Date(item.generatedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-2 px-3">{item.scans}</td>
                                                    <td className="py-2 px-3">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                const table = tables.find(t => t.id === item.tableId);
                                                                if (table) handleTableSelect(table);
                                                            }}
                                                        >
                                                            <QrCode className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}