// app/table-qr/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Loader2, AlertCircle, CheckCircle, XCircle, Table as TableIcon } from "lucide-react";

interface RestaurantInfo {
  id: string;
  name: string;
  floor: string;
}

interface TableInfo {
  id: string;
  number: number;
  capacity: number;
  shape: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  location?: string;
  description?: string;
  features?: string[];
}

interface ArrangementData {
  _id?: string;
  restaurantId: string;
  restaurantName: string;
  floor: string;
  name?: string;
  layoutType?: string;
  totalTables: number;
  availableTables?: number;
  occupiedTables?: number;
  reservedTables?: number;
  totalCapacity?: number;
  tables: TableInfo[];
  dimensions?: {
    width: number;
    height: number;
  };
  updatedAt?: Date;
  createdAt?: Date;
  isActive?: boolean;
}

export default function TableQRGenerator() {
  const router = useRouter();
  
  // State
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [arrangements, setArrangements] = useState<ArrangementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [tableValidation, setTableValidation] = useState<{
    isValid: boolean;
    message: string;
    tableInfo?: TableInfo;
    availableTables?: TableInfo[];
  }>({ isValid: false, message: "" });
  
  // Selected arrangement
  const [selectedArrangement, setSelectedArrangement] = useState<ArrangementData | null>(null);
  const [showTableList, setShowTableList] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchArrangements();
  }, []);

  // Fetch all arrangements
  const fetchArrangements = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tables/arrangement?fetchAll=true');
      const data = await response.json();
      
      if (data.success && data.data) {
        const arrangementsData = Array.isArray(data.data) ? data.data : [data.data];
        setArrangements(arrangementsData);
        
        // Group by restaurant for unique restaurant list
        const uniqueRestaurants = new Map<string, { id: string; name: string; floors: string[] }>();
        
        arrangementsData.forEach((arr: ArrangementData) => {
          if (!uniqueRestaurants.has(arr.restaurantId)) {
            uniqueRestaurants.set(arr.restaurantId, {
              id: arr.restaurantId,
              name: arr.restaurantName || arr.restaurantId,
              floors: [arr.floor]
            });
          } else {
            const existing = uniqueRestaurants.get(arr.restaurantId)!;
            if (!existing.floors.includes(arr.floor)) {
              existing.floors.push(arr.floor);
            }
          }
        });
        
        // Set default selection if available
        if (arrangementsData.length > 0) {
          const first = arrangementsData[0];
          setRestaurantId(first.restaurantId);
          setRestaurantName(first.restaurantName || first.restaurantId);
          setFloor(first.floor);
          setSelectedArrangement(first);
        }
      }
    } catch (error) {
      console.error('Error fetching arrangements:', error);
      toast.error('Failed to load table arrangements');
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique restaurants from arrangements
  const getUniqueRestaurants = useCallback(() => {
    const restaurantMap = new Map<string, { id: string; name: string; floors: string[] }>();
    
    arrangements.forEach(arr => {
      if (!restaurantMap.has(arr.restaurantId)) {
        restaurantMap.set(arr.restaurantId, {
          id: arr.restaurantId,
          name: arr.restaurantName || arr.restaurantId,
          floors: [arr.floor]
        });
      } else {
        const existing = restaurantMap.get(arr.restaurantId)!;
        if (!existing.floors.includes(arr.floor)) {
          existing.floors.push(arr.floor);
        }
      }
    });
    
    return Array.from(restaurantMap.values());
  }, [arrangements]);

  // Get arrangements for a specific restaurant
  const getRestaurantArrangements = useCallback((restId: string) => {
    return arrangements.filter(arr => arr.restaurantId === restId);
  }, [arrangements]);

  // Get available floors for a restaurant
  const getAvailableFloors = useCallback((restId: string) => {
    const floors = new Set<string>();
    arrangements.forEach(arr => {
      if (arr.restaurantId === restId) {
        floors.add(arr.floor);
      }
    });
    return Array.from(floors);
  }, [arrangements]);

  // Handle restaurant change
  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const restaurant = getUniqueRestaurants().find(r => r.id === id);
    
    if (restaurant) {
      setRestaurantId(id);
      setRestaurantName(restaurant.name);
      
      // Get first floor for this restaurant
      const floors = getAvailableFloors(id);
      if (floors.length > 0) {
        const firstFloor = floors[0];
        setFloor(firstFloor);
        
        // Find arrangement for this floor
        const arrangement = arrangements.find(
          arr => arr.restaurantId === id && arr.floor === firstFloor
        );
        if (arrangement) {
          setSelectedArrangement(arrangement);
        }
      }
      
      // Reset table selection
      setTableNumber(null);
      setTableValidation({ isValid: false, message: "" });
    }
  };

  // Handle floor change
  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const floorName = e.target.value;
    setFloor(floorName);
    setTableNumber(null);
    setTableValidation({ isValid: false, message: "" });
    
    // Find arrangement for this floor
    const arrangement = arrangements.find(
      arr => arr.restaurantId === restaurantId && arr.floor === floorName
    );
    if (arrangement) {
      setSelectedArrangement(arrangement);
    }
  };

  // Validate table number against arrangement
  const validateTableNumber = useCallback((tableNum: number) => {
    if (!selectedArrangement) {
      setTableValidation({
        isValid: false,
        message: "Please select a restaurant and floor first"
      });
      return false;
    }

    if (!tableNum || tableNum <= 0) {
      setTableValidation({
        isValid: false,
        message: "Please enter a valid table number"
      });
      return false;
    }

    // Find table in arrangement
    const tableInfo = selectedArrangement.tables.find(
      t => t.number === tableNum
    );

    if (tableInfo) {
      const statusMessage = tableInfo.status === 'available' 
        ? 'Available' 
        : `Currently ${tableInfo.status}`;
      
      setTableValidation({
        isValid: true,
        message: `Table ${tableNum} found (${statusMessage}, Capacity: ${tableInfo.capacity})`,
        tableInfo: tableInfo,
        availableTables: selectedArrangement.tables
      });
      return true;
    } else {
      // Get available table numbers for suggestions
      const existingTableNumbers = selectedArrangement.tables.map(t => t.number).sort((a, b) => a - b);
      const suggestedTables = existingTableNumbers.slice(0, 10);
      
      // Check if table is within range but not existing
      const maxTable = selectedArrangement.totalTables;
      
      let errorMessage = `Table ${tableNum} not found in ${selectedArrangement.restaurantName} (${selectedArrangement.floor})`;
      if (tableNum > maxTable) {
        errorMessage += `. Maximum table number is ${maxTable}`;
      }
      
      if (suggestedTables.length > 0) {
        errorMessage += `. Available tables: ${suggestedTables.join(', ')}${suggestedTables.length < existingTableNumbers.length ? `... (${existingTableNumbers.length} total)` : ''}`;
      }
      
      setTableValidation({
        isValid: false,
        message: errorMessage,
        availableTables: selectedArrangement.tables
      });
      return false;
    }
  }, [selectedArrangement]);

  // Handle table number input with validation
  const handleTableNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === "") {
      setTableNumber(null);
      setTableValidation({ isValid: false, message: "" });
      return;
    }
    
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      setTableNumber(num);
      // Validate in real-time
      validateTableNumber(num);
    }
  };

  // Base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // Construct URL
  const qrUrl = tableNumber && restaurantId && floor && tableValidation.isValid
    ? `${cleanBaseUrl}/?table=table-${tableNumber}&restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}`
    : "";

  const handleNavigateToMenu = () => {
    if (!tableNumber || !restaurantId || !floor) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!tableValidation.isValid) {
      toast.error('Please enter a valid table number');
      return;
    }
    
    router.push(`/?table=table-${tableNumber}&restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}`);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success('URL copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `table-${tableNumber}-${restaurantName}-qr.png`;
      link.click();
      toast.success(`QR code for Table ${tableNumber} downloaded!`);
    } else {
      toast.error('Failed to download QR code');
    }
  };

  const previewUrl = tableNumber && restaurantId && floor && tableValidation.isValid
    ? `${cleanBaseUrl}/?table=table-${tableNumber}&restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}`
    : '';

  // Get table status color and label
  const getTableStatusInfo = (status: string) => {
    const info: Record<string, { color: string; label: string; bgColor: string }> = {
      available: { 
        color: 'text-green-700', 
        label: 'Available',
        bgColor: 'bg-green-100'
      },
      occupied: { 
        color: 'text-red-700', 
        label: 'Occupied',
        bgColor: 'bg-red-100'
      },
      reserved: { 
        color: 'text-yellow-700', 
        label: 'Reserved',
        bgColor: 'bg-yellow-100'
      },
      cleaning: { 
        color: 'text-blue-700', 
        label: 'Cleaning',
        bgColor: 'bg-blue-100'
      },
      maintenance: { 
        color: 'text-gray-700', 
        label: 'Maintenance',
        bgColor: 'bg-gray-100'
      }
    };
    return info[status] || { color: 'text-gray-700', label: status, bgColor: 'bg-gray-100' };
  };

  const uniqueRestaurants = getUniqueRestaurants();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-gray-50 p-4 md:p-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-red-600 mb-2 text-center">Generate Table QR Code</h1>
        <p className="text-gray-600 mb-6 text-sm text-center">
          Create a QR code that links customers directly to their table
        </p>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading table arrangements...</span>
          </div>
        ) : arrangements.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
            <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-yellow-800">No table arrangements found.</p>
            <p className="text-xs text-yellow-600 mt-1">Please create a table arrangement first in the admin panel.</p>
            <button
              onClick={() => router.push('/admin/table-arrangement')}
              className="mt-3 text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
            >
              Go to Table Arrangement
            </button>
          </div>
        ) : (
          <>
            {/* Restaurant Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Restaurant
              </label>
              <select
                value={restaurantId}
                onChange={handleRestaurantChange}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-sm"
                disabled={isLoading}
              >
                <option value="">Select a restaurant...</option>
                {uniqueRestaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.floors.length} {r.floors.length === 1 ? 'floor' : 'floors'})
                  </option>
                ))}
              </select>
            </div>

            {/* Floor Selection */}
            {restaurantId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Floor
                </label>
                <select
                  value={floor}
                  onChange={handleFloorChange}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-sm"
                >
                  {getAvailableFloors(restaurantId).map((f) => {
                    const arr = arrangements.find(a => a.restaurantId === restaurantId && a.floor === f);
                    return (
                      <option key={f} value={f}>
                        {f} {arr ? `(${arr.totalTables} tables)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Selected Arrangement Info */}
            {selectedArrangement && (
              <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-700">Restaurant:</span>
                  <span className="text-sm font-semibold text-purple-900">{selectedArrangement.restaurantName}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-purple-700">Floor:</span>
                  <span className="text-sm font-semibold text-purple-900">{selectedArrangement.floor}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-medium text-purple-700">Total Tables:</span>
                  <span className="text-sm font-semibold text-purple-900">{selectedArrangement.totalTables}</span>
                </div>
                {selectedArrangement.totalCapacity && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium text-purple-700">Total Capacity:</span>
                    <span className="text-sm font-semibold text-purple-900">{selectedArrangement.totalCapacity} seats</span>
                  </div>
                )}
                <button
                  onClick={() => setShowTableList(!showTableList)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                >
                  <TableIcon className="w-3 h-3" />
                  {showTableList ? 'Hide' : 'Show'} Table List
                </button>
                {showTableList && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-1">
                      {selectedArrangement.tables.map((t) => {
                        const statusInfo = getTableStatusInfo(t.status);
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setTableNumber(t.number);
                              validateTableNumber(t.number);
                            }}
                            className={`text-xs p-1 rounded text-center ${statusInfo.bgColor} ${statusInfo.color} hover:ring-2 hover:ring-purple-400 transition-all`}
                            title={`Table ${t.number} - ${statusInfo.label}`}
                          >
                            T{t.number}
                            <span className="block text-[8px] opacity-75">{t.capacity}p</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table Number Input */}
            <div className="relative mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Table Number {selectedArrangement && `(1-${selectedArrangement.totalTables})`}
              </label>
              <input
                type="number"
                placeholder={`Enter table number (e.g. 5)`}
                value={tableNumber ?? ""}
                onChange={handleTableNumberChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:outline-none text-center text-lg transition-colors ${
                  tableNumber !== null
                    ? tableValidation.isValid
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-red-500'
                }`}
                min="1"
                max={selectedArrangement?.totalTables || 999}
                step="1"
                disabled={!selectedArrangement}
              />
              {tableNumber !== null && (
                <button
                  onClick={() => {
                    setTableNumber(null);
                    setTableValidation({ isValid: false, message: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Validation Message */}
            {tableNumber !== null && tableValidation.message && (
              <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${
                tableValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {tableValidation.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${tableValidation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                    {tableValidation.message}
                  </p>
                  {!tableValidation.isValid && tableValidation.availableTables && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-600">Quick select:</span>
                      {tableValidation.availableTables.slice(0, 8).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTableNumber(t.number);
                            validateTableNumber(t.number);
                          }}
                          className={`text-xs px-2 py-0.5 rounded-full transition ${
                            t.status === 'available'
                              ? 'bg-green-100 hover:bg-green-200 text-green-700'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          T{t.number}
                        </button>
                      ))}
                      {tableValidation.availableTables.length > 8 && (
                        <span className="text-xs text-gray-400">
                          +{tableValidation.availableTables.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview URL */}
            {tableNumber && restaurantId && floor && tableValidation.isValid && isClient && (
              <div className="mt-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-gray-600 truncate">
                  <span className="font-medium">QR URL:</span>{' '}
                  <span className="font-mono text-blue-600 text-xs break-all">{previewUrl}</span>
                </p>
              </div>
            )}

            {/* QR Code */}
            {tableNumber && restaurantId && floor && tableValidation.isValid && isClient && (
              <div className="flex flex-col items-center space-y-4 mt-4">
                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 relative">
                  <QRCodeCanvas 
                    value={qrUrl} 
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#dc2626"
                    level="H"
                    includeMargin={true}
                  />
                  {/* Overlay with table info */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                    Table {tableNumber} • {restaurantName}
                  </div>
                </div>
                
                <div className="w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Table {tableNumber}</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{floor}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{restaurantName}</span>
                    {tableValidation.tableInfo && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {tableValidation.tableInfo.capacity} seats
                      </span>
                    )}
                    {tableValidation.tableInfo && (
                      <span className={`px-2 py-0.5 rounded-full ${getTableStatusInfo(tableValidation.tableInfo.status).bgColor} ${getTableStatusInfo(tableValidation.tableInfo.status).color}`}>
                        {getTableStatusInfo(tableValidation.tableInfo.status).label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download QR Code
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyUrl}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy URL
                      </button>
                      
                      <button
                        onClick={handleNavigateToMenu}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        Go to Menu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help text */}
            {(!tableNumber || !restaurantId || !tableValidation.isValid) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 font-medium mb-1">💡 How it works:</p>
                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                  <li>Select a restaurant and floor with existing table arrangements</li>
                  <li>Enter a valid table number that exists in the arrangement</li>
                  <li>Click on any table in the list to quickly select it</li>
                  <li>QR code will link customers directly to their table</li>
                  <li>Download and print the QR code for the table</li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-400 text-center">
        <p>Generated QR codes link to your menu with table, restaurant, and floor pre-selected</p>
        <p className="mt-1 text-gray-300">Table numbers are validated against existing arrangements</p>
        <p className="mt-1 text-gray-300">
          {arrangements.length} arrangement{arrangements.length !== 1 ? 's' : ''} loaded
        </p>
      </div>
    </main>
  );
}