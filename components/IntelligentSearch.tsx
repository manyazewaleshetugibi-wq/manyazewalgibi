'use client';

import { useState, useRef } from 'react';

interface SearchResult {
  success: boolean;
  summary: string;
  insights: string[];
  data: any;
  metadata: {
    queryType: string;
    total: number;
    collectionsUsed: string[];
    filtersApplied?: any;
    limit?: number;
  };
}

export default function IntelligentSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const exampleQueries = [
    "most frequently sold 10 food items this month",
    "least frequently sold food items this month",
    "most frequently sold 5 beverage items this week",
    "top 5 hot drinks this month",
    "best selling juices",
    "most sold soft drinks",
    "popular mocktails",
    "best performer waitress this week",
    "delivery acceptance",
    "low stock items",
    "vip customers",
    "deleted orders",
    "pending orders today",
    "table status"
  ];

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      const data = await res.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Search failed');
        setResult(null);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to connect to search service');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 500);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    performSearch(example);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryBadge = (item: any) => {
    if (item.isHotDrink) return { bg: 'bg-red-100', text: 'text-red-800', label: '☕ Hot Drink' };
    if (item.isJuice) return { bg: 'bg-orange-100', text: 'text-orange-800', label: '🧃 Juice' };
    if (item.isMocktail) return { bg: 'bg-purple-100', text: 'text-purple-800', label: '🍹 Mocktail' };
    if (item.isSoftDrink) return { bg: 'bg-blue-100', text: 'text-blue-800', label: '🥤 Soft Drink' };
    if (item.isExtras) return { bg: 'bg-gray-100', text: 'text-gray-800', label: '➕ Extras' };
    if (item.isBeverage) return { bg: 'bg-green-100', text: 'text-green-800', label: '🥤 Beverage' };
    if (item.isFood) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🍔 Food' };
    return { bg: 'bg-gray-100', text: 'text-gray-800', label: '🍽️ Item' };
  };

  const renderOrdersCard = (order: any, index: number) => {
    const isExpanded = expandedItem === index;
    return (
      <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{order.orderNumber || 'Order'}</h3>
              <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(order.finalAmount || 0)} birr</p>
              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div>
              <p className="text-gray-500">Table</p>
              <p className="font-semibold">{order.tableNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment</p>
              <p className="font-semibold">{order.paymentMethod || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-semibold">{order.customerId === 'walk-in' ? 'Walk-in' : order.customerId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Items</p>
              <p className="font-semibold">{order.items?.length || 0} items</p>
            </div>
          </div>
          
          <button
            onClick={() => setExpandedItem(isExpanded ? null : index)}
            className="text-blue-600 text-sm hover:text-blue-800 font-medium"
          >
            {isExpanded ? '▼ Show Less' : '▶ Show Details'}
          </button>
               
          {isExpanded && order.items && (
            <div className="mt-3 pt-3 border-t">
              <p className="font-semibold text-sm mb-2">Order Items:</p>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.itemName}</span>
                      <span>{item.quantity} x {formatCurrency(item.unitPrice)} birr</span>
                    </div>
                    <div className="text-gray-600 text-xs">Total: {formatCurrency(item.total)} birr</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTopSellingCard = (item: any, index: number, isTop: boolean = false) => {
    const categoryBadge = getCategoryBadge(item);
    
    return (
      <div key={index} className={`bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow ${isTop ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-white' : 'border-gray-200'}`}>
        <div className="p-4">
          {isTop && (
            <div className="absolute top-2 right-2">
              <span className="text-2xl">🏆</span>
            </div>
          )}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-gray-800">
                  {index === 0 && '🥇 '}
                  {index === 1 && '🥈 '}
                  {index === 2 && '🥉 '}
                  {item.itemName}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadge.bg} ${categoryBadge.text}`}>
                  {categoryBadge.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{item.description || 'No description'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{item.totalQuantity}</p>
              <p className="text-xs text-gray-600">Units Sold</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(item.totalRevenue)}</p>
              <p className="text-xs text-gray-600">Revenue</p>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <p className="text-xl font-bold text-purple-600">{item.orderCount}</p>
              <p className="text-xs text-gray-600">Orders</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <p className="text-xl font-bold text-orange-600">{formatCurrency(item.avgPrice)}</p>
              <p className="text-xs text-gray-600">Avg Price</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStaffCard = (staff: any, index: number, isTop: boolean = false) => {
    return (
      <div key={index} className={`bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow ${isTop ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-white' : 'border-gray-200'}`}>
        <div className="p-4">
          {isTop && (
            <div className="absolute top-2 right-2">
              <span className="text-2xl">⭐</span>
            </div>
          )}
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {staff.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="ml-3">
              <h3 className="font-bold text-lg text-gray-800">{staff.name || 'Unknown'}</h3>
              {staff.shift && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 mt-1">
                  {staff.shift} Shift
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{formatCurrency(staff.totalSales)}</p>
              <p className="text-xs text-gray-600">Total Sales</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{staff.orderCount}</p>
              <p className="text-xs text-gray-600">Orders</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <p className="text-lg font-bold text-orange-600">{formatCurrency(staff.avgOrderValue)}</p>
              <p className="text-xs text-gray-600">Avg Order</p>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">{staff.tablesCount || 0}</p>
              <p className="text-xs text-gray-600">Tables</p>
            </div>
          </div>
          
          {staff.email && (
            <div className="text-xs text-gray-500 mt-2">
              📧 {staff.email}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInventoryCard = (stock: any, index: number) => {
    const isCritical = stock.currentStock < stock.minimumStock;
    const isLow = !isCritical && stock.currentStock < 20;
    
    return (
      <div key={index} className={`bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow ${
        isCritical ? 'border-red-400 bg-red-50' : isLow ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
      }`}>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-gray-800">{stock.name}</h3>
            {isCritical && <span className="text-red-600 text-sm font-bold">⚠️ CRITICAL</span>}
            {isLow && !isCritical && <span className="text-yellow-600 text-sm font-bold">⚠️ LOW</span>}
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Stock Level</span>
              <span className="font-semibold">{stock.currentStock} / {stock.minimumStock} {stock.unit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (stock.currentStock / stock.minimumStock) * 100)}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-500">Minimum Stock</p>
              <p className="font-semibold">{stock.minimumStock} {stock.unit}</p>
            </div>
            <div>
              <p className="text-gray-500">To Reorder</p>
              <p className="font-semibold text-red-600">{Math.max(0, stock.minimumStock - stock.currentStock)} {stock.unit}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeliveryCard = (accepter: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
              🚚
            </div>
            <div className="ml-3">
              <h3 className="font-bold text-lg text-gray-800">{accepter.name}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{accepter.totalAcceptances}</p>
              <p className="text-xs text-gray-600">Acceptances</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(accepter.totalAmount)}</p>
              <p className="text-xs text-gray-600">Total Value</p>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            <p>📦 Unique Orders: {accepter.uniqueOrdersCount}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerCard = (customer: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              {customer.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="ml-3">
              <h3 className="font-bold text-gray-800">{customer.name}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
              <p className="text-xs text-gray-600">Total Spent</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{customer.orderCount}</p>
              <p className="text-xs text-gray-600">Visits</p>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            <p>💵 Avg per Visit: {formatCurrency(customer.avgSpent)}</p>
            {customer.lastOrder && <p>📅 Last Visit: {formatDate(customer.lastOrder)}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderExpenseCard = (expense: any, index: number, type: string) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-800">{expense.title || expense.name || 'Expense'}</h3>
            <span className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">{expense.category || 'Uncategorized'}</p>
          {type === 'recurring' && expense.frequency && (
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
              🔄 {expense.frequency}
            </span>
          )}
          {expense.date && (
            <p className="text-xs text-gray-400 mt-2">📅 {formatDate(expense.date)}</p>
          )}
        </div>
      </div>
    );
  };

  const renderDataCards = () => {
    if (!result?.data) return null;
    
    const queryType = result.metadata.queryType;
    const dataArray = Array.isArray(result.data) ? result.data : 
                     (result.data.data || result.data.results || result.data.items || 
                      result.data.orders || result.data.stocks || result.data.customers || 
                      result.data.prizes || result.data.recipes || []);
    
    if (queryType === 'top_selling_items' && Array.isArray(dataArray)) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataArray.map((item, idx) => renderTopSellingCard(item, idx, idx === 0))}
        </div>
      );
    }
    
    if (queryType === 'top_performers' && Array.isArray(dataArray)) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataArray.map((staff, idx) => renderStaffCard(staff, idx, idx === 0))}
        </div>
      );
    }
    
    if (queryType === 'delivery_acceptance' && Array.isArray(dataArray)) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataArray.map((accepter, idx) => renderDeliveryCard(accepter, idx))}
        </div>
      );
    }
    
    if (queryType === 'inventory' && result.data.all && Array.isArray(result.data.all)) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.all.map((stock: any, idx: number) => renderInventoryCard(stock, idx))}
        </div>
      );
    }
    
    if (queryType === 'customers' && Array.isArray(dataArray)) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataArray.map((customer, idx) => renderCustomerCard(customer, idx))}
        </div>
      );
    }
    
    if (queryType === 'orders' && Array.isArray(dataArray)) {
      return (
        <div className="space-y-3">
          {dataArray.map((order, idx) => renderOrdersCard(order, idx))}
        </div>
      );
    }
    
    if (queryType === 'tables' && Array.isArray(dataArray)) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {dataArray.map((table: any, idx: number) => (
            <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <h3 className="font-bold text-lg">{table.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{table.floor}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{table.availableTables || 0}</p>
                  <p className="text-xs text-gray-600">Available</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{table.occupiedTables || 0}</p>
                  <p className="text-xs text-gray-600">Occupied</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (Array.isArray(dataArray) && dataArray.length > 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataArray.slice(0, 20).map((item: any, idx: number) => (
            <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-2">
                {Object.entries(item)
                  .filter(([key]) => !key.startsWith('_') && key !== 'password')
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-semibold text-gray-600 capitalize">{key}:</span>{' '}
                      <span className="text-gray-800">
                        {typeof value === 'number' ? formatCurrency(value) : 
                         typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : 
                         String(value).substring(0, 100)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <p className="text-gray-500 text-center py-8">No data to display</p>;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🧠 Restaurant Business Intelligence
        </h1>
        <p className="text-gray-600">
          Ask anything about sales, staff, inventory, customers, and more
        </p>
      </div>
      
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="e.g., 'most frequently sold 10 food items this month' or 'best performer waitress this week'"
          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        />
      </div>
      
      <div className="mb-8">
        <p className="text-sm text-gray-600 mb-3">💡 Try these queries:</p>
        <div className="flex flex-wrap gap-2">
          {exampleQueries.map((example, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Analyzing your data...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">⚠️ {error}</p>
        </div>
      )}
      
      {result && result.success && !loading && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
            <p className="text-sm opacity-90 mb-1">🔍 Analysis Result</p>
            <p className="text-xl font-semibold">{result.summary}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {result.metadata.collectionsUsed.map((collection, i) => (
                <span key={i} className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                  {collection}
                </span>
              ))}
            </div>
          </div>
          
          {result.insights && result.insights.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Key Insights</h3>
              <ul className="space-y-1">
                {result.insights.map((insight, i) => (
                  <li key={i} className="text-blue-800 text-sm">• {insight}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              📋 Detailed Results ({result.metadata.total} items)
            </h3>
            {renderDataCards()}
          </div>
        </div>
      )}
      
      {result && !result.success && !loading && (
        <div className="text-center py-8 text-red-500">
          <p>{result.summary}</p>
        </div>
      )}
      
      {!query && !loading && !result && !error && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg">Ask anything about your restaurant business</p>
          <p className="text-sm mt-2">Sales, staff performance, inventory, customers, finances, and more</p>
        </div>
      )}
    </div>
  );
}
