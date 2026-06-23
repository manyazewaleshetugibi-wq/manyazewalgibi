'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchResult {
  success: boolean;
  query: string;
  aiResponse: string;
  insights: string[];
  data: any[];
  suggestedQuestions: string[];
  metadata: {
    intent: string;
    collectionsUsed: string[];
    total: number;
    processingTime: number;
    filtersApplied: Record<string, any>;
  };
}

export default function AISearchInterface() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiStatus('available');
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      const data = await res.json();
      
      if (data.success) {
        setResult(data);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to connect to search service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSuggestedClick = (question: string) => {
    setQuery(question);
    performSearch(question);
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const getIntentIcon = (intent: string) => {
    const icons: Record<string, string> = {
      revenue: '💰',
      comparison: '📊',
      'total revenue': '💰',
      'low stock': '⚠️',
      inventory: '📦',
      staff: '👥',
      customers: '👤',
      expenses: '💸',
      delivery: '🚚',
      tables: '🪑',
      prizes: '🎁',
      'admin users': '👑',
      'pos users': '💳',
      general: '🔍'
    };
    return icons[intent] || '🔍';
  };

  const isComparisonResult = (data: any[]) => {
    return data.some(item => item._period === 'current' || item._period === 'previous');
  };

  const isAggregatedResult = (data: any[]) => {
    return data.length === 1 && (data[0].totalRevenue !== undefined || data[0].total !== undefined);
  };

  const renderComparisonCard = () => {
    if (!result?.data) return null;
    
    const current = result.data.find((d: any) => d._period === 'current') || result.data[0];
    const previous = result.data.find((d: any) => d._period === 'previous') || result.data[1];
    
    if (!current || !previous) return null;
    
    const currentRevenue = current.totalRevenue || 0;
    const previousRevenue = previous.totalRevenue || 0;
    const difference = currentRevenue - previousRevenue;
    const percentChange = previousRevenue > 0 ? (difference / previousRevenue) * 100 : 0;
    const isPositive = difference >= 0;
    
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-3 text-white shadow">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-lg">📊</span>
          <span className="text-xs opacity-80">Revenue Comparison</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
            <p className="text-xs opacity-80 mb-0.5">Current Period</p>
            <p className="text-lg font-bold">{formatCurrency(currentRevenue)} birr</p>
            <p className="text-xs opacity-70 mt-0.5">{current.orderCount || 0} orders</p>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
            <p className="text-xs opacity-80 mb-0.5">Previous Period</p>
            <p className="text-lg font-bold">{formatCurrency(previousRevenue)} birr</p>
            <p className="text-xs opacity-70 mt-0.5">{previous.orderCount || 0} orders</p>
          </div>
          
          <div className={`rounded-lg p-2 text-center ${isPositive ? 'bg-green-500' : 'bg-red-500'} bg-opacity-80`}>
            <p className="text-xs opacity-90 mb-0.5">Change</p>
            <p className="text-lg font-bold">{isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(difference))} birr</p>
            <p className="text-xs font-semibold mt-0.5">{isPositive ? '+' : ''}{percentChange.toFixed(1)}%</p>
          </div>
        </div>
        
        <p className="text-center text-xs opacity-90">
          {isPositive ? '📈 Increase' : '📉 Decrease'} of {formatCurrency(Math.abs(difference))} birr ({Math.abs(percentChange).toFixed(1)}% change)
        </p>
      </div>
    );
  };

  const renderRevenueCard = () => {
    if (!result?.data || !isAggregatedResult(result.data)) return null;
    
    const data = result.data[0];
    const totalRevenue = data.totalRevenue || data.total || 0;
    const orderCount = data.orderCount || 0;
    
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 text-white shadow">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-lg">💰</span>
          <span className="text-xs opacity-80">Revenue Summary</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
            <p className="text-xs opacity-80 mb-0.5">Total Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)} birr</p>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
            <p className="text-xs opacity-80 mb-0.5">Total Orders</p>
            <p className="text-xl font-bold">{formatNumber(orderCount)}</p>
          </div>
        </div>
        
        <div className="mt-2 text-center text-xs opacity-90">
          <p>Avg Order: {formatCurrency(orderCount > 0 ? totalRevenue / orderCount : 0)} birr</p>
        </div>
      </div>
    );
  };

  const renderUserCard = (user: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-800 truncate">{user.name || 'No Name'}</h4>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {user.role || 'No Role'}
              </span>
              {user.status && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {user.status}
                </span>
              )}
            </div>
            {user.phone && <p className="text-xs text-gray-400 mt-0.5">📞 {user.phone}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderStockCard = (stock: any, index: number) => {
    const isCritical = stock.currentStock < stock.minimumStock;
    const isLow = !isCritical && stock.currentStock < 20;
    
    return (
      <div key={index} className={`bg-white rounded-lg shadow-sm border p-2 hover:shadow transition-shadow ${
        isCritical ? 'border-red-300 bg-red-50' : isLow ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'
      }`}>
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-gray-800 truncate">{stock.name}</h4>
            <p className="text-xs text-gray-500">{stock.unit || 'unit'}</p>
          </div>
          {isCritical && <span className="text-red-600 text-xs font-bold px-1.5 py-0.5 bg-red-100 rounded-full ml-1">⚠️ CRITICAL</span>}
          {isLow && !isCritical && <span className="text-yellow-600 text-xs font-bold px-1.5 py-0.5 bg-yellow-100 rounded-full ml-1">⚠️ LOW</span>}
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-600">Stock Level</span>
            <span className="font-semibold">{stock.currentStock} / {stock.minimumStock}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all ${isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (stock.currentStock / stock.minimumStock) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="mt-2 text-xs">
          <p className="text-gray-600">To Reorder: <span className="font-semibold text-red-600">{Math.max(0, stock.minimumStock - stock.currentStock)}</span></p>
        </div>
      </div>
    );
  };

  const renderOrderCard = (order: any, index: number) => {
    const statusColors: Record<string, string> = {
      'COMPLETED': 'bg-green-100 text-green-700',
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'CONFIRMED': 'bg-blue-100 text-blue-700'
    };
    
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-gray-800 truncate">{order.orderNumber || 'Order'}</h4>
            <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs mt-0.5 ${statusColors[order.status] || 'bg-gray-100'}`}>
              {order.status || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-base font-bold text-green-600 ml-2">{formatCurrency(order.finalAmount)} birr</p>
        </div>
        
        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
          {order.tableNumber && <p className="text-gray-600">📋 Table: {order.tableNumber}</p>}
          {order.paymentMethod && <p className="text-gray-600">💳 {order.paymentMethod}</p>}
          {order.items?.length > 0 && <p className="text-gray-600">🍽️ {order.items.length} items</p>}
          {order.createdAt && <p className="text-gray-500 text-xs col-span-2 mt-0.5">📅 {formatDate(order.createdAt)}</p>}
        </div>
      </div>
    );
  };

  const renderWaitressCard = (staff: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
            {staff.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-800 truncate">{staff.name}</h4>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {staff.shift && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">🕐 {staff.shift}</span>}
              {staff.isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✅ Active</span>}
            </div>
            {staff.phone && <p className="text-xs text-gray-500 mt-0.5 truncate">📞 {staff.phone}</p>}
            {staff.email && <p className="text-xs text-gray-400 truncate">📧 {staff.email}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderTableCard = (table: any, index: number) => {
    const utilization = ((table.occupiedTables + table.reservedTables) / table.totalTables) * 100;
    
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
        <h4 className="font-semibold text-sm text-gray-800 truncate">{table.name || table.floor}</h4>
        <p className="text-xs text-gray-500 mb-2">{table.floor}</p>
        
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-green-50 rounded-md p-1">
            <p className="text-base font-bold text-green-600">{table.availableTables || 0}</p>
            <p className="text-xs text-gray-600">Available</p>
          </div>
          <div className="bg-yellow-50 rounded-md p-1">
            <p className="text-base font-bold text-yellow-600">{table.reservedTables || 0}</p>
            <p className="text-xs text-gray-600">Reserved</p>
          </div>
          <div className="bg-red-50 rounded-md p-1">
            <p className="text-base font-bold text-red-600">{table.occupiedTables || 0}</p>
            <p className="text-xs text-gray-600">Occupied</p>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span>Utilization</span>
            <span>{utilization.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-orange-500 h-1 rounded-full" style={{ width: `${utilization}%` }} />
          </div>
        </div>
      </div>
    );
  };

  const renderExpenseCard = (expense: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-gray-800 truncate">{expense.title || expense.category || 'Expense'}</h4>
            <p className="text-xs text-gray-500">{expense.category || 'Uncategorized'}</p>
          </div>
          <p className="text-base font-bold text-red-600 ml-2">{formatCurrency(expense.amount)} birr</p>
        </div>
        {expense.date && <p className="text-xs text-gray-400 mt-1">📅 {formatDate(expense.date)}</p>}
        {expense.frequency && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1 inline-block">🔄 {expense.frequency}</span>}
      </div>
    );
  };

  const renderPrizeCard = (prize: any, index: number) => {
    const rarityColors: Record<string, string> = {
      legendary: 'from-yellow-400 to-orange-500',
      epic: 'from-purple-400 to-pink-500',
      rare: 'from-blue-400 to-cyan-500',
      common: 'from-gray-400 to-gray-500'
    };
    
    return (
      <div key={index} className={`bg-gradient-to-r ${rarityColors[prize.rarity] || 'from-gray-400 to-gray-500'} rounded-lg p-2 text-white shadow`}>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-2xl">{prize.icon || '🎁'}</span>
          <h4 className="font-bold text-sm">{prize.name}</h4>
        </div>
        <p className="text-xs opacity-90 truncate">{prize.description}</p>
        <div className="flex justify-between mt-2 text-xs">
          <span>⭐ {prize.rarity}</span>
          <span>💎 {prize.value} pts</span>
        </div>
      </div>
    );
  };

  const renderDataCards = () => {
    if (!result?.data || result.data.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-700 text-sm">No results found for "{result?.query}"</p>
          <p className="text-xs text-yellow-600 mt-1">Try different keywords or check your data</p>
        </div>
      );
    }
    
    if (isComparisonResult(result.data)) {
      return renderComparisonCard();
    }
    
    if (isAggregatedResult(result.data)) {
      return renderRevenueCard();
    }
    
    const intent = result.metadata.intent || '';
    const collection = result.metadata.collectionsUsed?.[0] || '';
    
    if (collection === 'users' || intent.includes('user') || intent.includes('admin')) {
      return (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderUserCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'stocks' || intent === 'low stock') {
      return (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderStockCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'orders' || intent.includes('order')) {
      return (
        <div className="space-y-2">
          {result.data.map((item, idx) => renderOrderCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'waitresses' || intent.includes('staff')) {
      return (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderWaitressCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'tablearrangements' || intent === 'tables') {
      return (
        <div className="grid gap-2 md:grid-cols-2">
          {result.data.map((item, idx) => renderTableCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'expenses' || intent === 'expenses') {
      return (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderExpenseCard(item, idx))}
        </div>
      );
    }
    
    if (collection === 'prizes') {
      return (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderPrizeCard(item, idx))}
        </div>
      );
    }
    
    return (
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {result.data.slice(0, 20).map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 hover:shadow transition-shadow">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(item, null, 2).substring(0, 200)}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-2 md:p-4">
        
        {/* Header - Minimized */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">🍽️</span>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Manyazewal Gibi AI Search
            </h1>
            <span className="text-3xl">🤖</span>
          </div>
          <p className="text-gray-600 text-sm">
            Ask anything naturally — AI understands and finds answers instantly
          </p>
          
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              🤖 AI Active (Groq API)
            </span>
          </div>
        </div>

        {/* Search Form - Minimized */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... e.g., 'total revenue this month', 'compare revenue with last month', 'low stock items', 'admin users'"
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Thinking...' : '🔍 Search'}
            </button>
          </div>
        </form>

        {/* Example Queries - Minimized */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">💡 Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "total revenue this month",
              "compare revenue with last month",
              "sales vs last week",
              "low stock items",
              "show me all admin users",
              "pending orders today",
              "available tables",
              "best performer waitress this month"
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(example);
                  performSearch(example);
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display - Minimized */}
        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Results - Minimized */}
        {result && result.success && (
          <div ref={resultsRef} className="space-y-3">
            {/* AI Response Card */}
            {!isComparisonResult(result.data) && !isAggregatedResult(result.data) && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-3 text-white shadow">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-xs opacity-80">AI Assistant</span>
                </div>
                <p className="text-base md:text-lg font-medium leading-relaxed">
                  {result.aiResponse}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">
                    {getIntentIcon(result.metadata.intent)} {result.metadata.intent}
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">
                    ⏱️ {result.metadata.processingTime}ms
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">
                    📊 {result.metadata.total} results
                  </span>
                </div>
              </div>
            )}

            {/* Insights - Minimized */}
            {result.insights.length > 0 && !isComparisonResult(result.data) && !isAggregatedResult(result.data) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="font-semibold text-blue-900 text-sm mb-1 flex items-center gap-1">
                  <span>💡</span> Key Insights
                </h3>
                <ul className="space-y-0.5">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="text-blue-800 text-xs flex items-start gap-1">
                      <span>•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Questions - Minimized */}
            {result.suggestedQuestions.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h3 className="font-semibold text-purple-900 text-sm mb-2 flex items-center gap-1">
                  <span>❓</span> Suggested Follow-up Questions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedClick(question)}
                      className="px-2 py-1 bg-white border border-purple-300 rounded-full text-xs text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data Cards - Minimized */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                📋 Results ({result.metadata.total} items)
              </h3>
              {renderDataCards()}
            </div>
          </div>
        )}

        {/* Initial State - Minimized */}
        {!result && !loading && !error && (
          <div className="text-center py-8">
            <div className="text-5xl mb-2">🔍</div>
            <p className="text-gray-500 text-sm">Ask anything about your restaurant</p>
            <p className="text-xs text-gray-400 mt-1">
              Revenue, sales, inventory, staff, orders, expenses, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}