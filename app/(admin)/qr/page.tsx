// app/table-qr/page.tsx
"use client";

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface RestaurantInfo {
  id: string;
  name: string;
  floor: string;
}

export default function TableQRGenerator() {
  const router = useRouter();
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/tables/arrangement?fetchAll=true');
      const data = await response.json();
      if (data.success && data.data) {
        // Extract unique restaurants with their floors
        const restaurantMap = new Map();
        const restaurantsArray = Array.isArray(data.data) ? data.data : [data.data];
        restaurantsArray.forEach((r: any) => {
          if (!restaurantMap.has(r.restaurantId)) {
            restaurantMap.set(r.restaurantId, {
              id: r.restaurantId,
              name: r.restaurantName,
              floor: r.floor
            });
          }
        });
        setRestaurants(Array.from(restaurantMap.values()));
        
        // Set default selection if available
        if (restaurantMap.size > 0) {
          const first = Array.from(restaurantMap.values())[0];
          setRestaurantId(first.id);
          setFloor(first.floor);
          setRestaurantName(first.name);
        }
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get base URL with proper formatting
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // Construct URL with all parameters
  const qrUrl = tableNumber && restaurantId && floor 
    ? `${cleanBaseUrl}/?table=table-${tableNumber}&restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}`
    : "";

  const handleTableNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setTableNumber(null);
      return;
    }
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      setTableNumber(num);
    }
  };

  const handleNavigateToMenu = () => {
    if (!tableNumber || !restaurantId || !floor) {
      toast.error('Please fill in all required fields');
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

  const previewUrl = tableNumber && restaurantId && floor 
    ? `${cleanBaseUrl}/?table=table-${tableNumber}&restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}`
    : '';

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

        {/* Restaurant Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Restaurant
          </label>
          {isLoading ? (
            <div className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500 text-sm">
              Loading restaurants...
            </div>
          ) : (
            <select
              value={restaurantId}
              onChange={(e) => {
                const selected = restaurants.find(r => r.id === e.target.value);
                if (selected) {
                  setRestaurantId(selected.id);
                  setFloor(selected.floor);
                  setRestaurantName(selected.name);
                }
              }}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-sm"
            >
              <option value="">Select a restaurant...</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} - {r.floor}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Floor Display */}
        {floor && (
          <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">Floor:</span>
              <span className="text-sm font-semibold text-purple-900">{floor}</span>
            </div>
            {restaurantName && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-medium text-purple-700">Restaurant:</span>
                <span className="text-sm font-semibold text-purple-900">{restaurantName}</span>
              </div>
            )}
          </div>
        )}

        {/* Table Number Input */}
        <div className="relative mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Table Number
          </label>
          <input
            type="number"
            placeholder="Enter table number (e.g. 5)"
            value={tableNumber ?? ""}
            onChange={handleTableNumberChange}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none text-center text-lg"
            min="1"
            step="1"
          />
          {tableNumber && (
            <button
              onClick={() => setTableNumber(null)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Preview URL */}
        {tableNumber && restaurantId && floor && isClient && (
          <div className="mt-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-gray-600 truncate">
              <span className="font-medium">QR URL:</span>{' '}
              <span className="font-mono text-blue-600 text-xs break-all">{previewUrl}</span>
            </p>
          </div>
        )}

        {/* QR Code */}
        {tableNumber && restaurantId && floor && isClient && (
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
        {(!tableNumber || !restaurantId) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-1">💡 How it works:</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Select the restaurant and floor</li>
              <li>Enter a table number (e.g., 5)</li>
              <li>QR code will link to: <span className="font-mono text-gray-700 text-[10px] break-all">{cleanBaseUrl}/?table=table-5&restaurant=...&floor=...</span></li>
              <li>Customers scanning this will see the table selector with your restaurant pre-selected</li>
              <li>Download and print the QR code for the table</li>
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-400 text-center">
        <p>Generated QR codes link to your menu with table, restaurant, and floor pre-selected</p>
      </div>
    </main>
  );
}