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
    // Check if API is available (using our own API, not Ollama directly)
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

  // Check if this is a comparison result
  const isComparisonResult = (data: any[]) => {
    return data.some(item => item._period === 'current' || item._period === 'previous');
  };

  // Check if this is an aggregated result (revenue total)
  const isAggregatedResult = (data: any[]) => {
    return data.length === 1 && (data[0].totalRevenue !== undefined || data[0].total !== undefined);
  };

  // Render Comparison Card
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          <span className="text-sm opacity-80">Revenue Comparison</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <p className="text-sm opacity-80 mb-1">Current Period</p>
            <p className="text-2xl font-bold">{formatCurrency(currentRevenue)} birr</p>
            <p className="text-xs opacity-70 mt-1">{current.orderCount || 0} orders</p>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <p className="text-sm opacity-80 mb-1">Previous Period</p>
            <p className="text-2xl font-bold">{formatCurrency(previousRevenue)} birr</p>
            <p className="text-xs opacity-70 mt-1">{previous.orderCount || 0} orders</p>
          </div>
          
          <div className={`rounded-xl p-4 text-center ${isPositive ? 'bg-green-500' : 'bg-red-500'} bg-opacity-80`}>
            <p className="text-sm opacity-90 mb-1">Change</p>
            <p className="text-2xl font-bold">{isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(difference))} birr</p>
            <p className="text-sm font-semibold mt-1">{isPositive ? '+' : ''}{percentChange.toFixed(1)}%</p>
          </div>
        </div>
        
        <p className="text-center text-sm opacity-90">
          {isPositive ? '📈 Increase' : '📉 Decrease'} of {formatCurrency(Math.abs(difference))} birr ({Math.abs(percentChange).toFixed(1)}% change)
        </p>
      </div>
    );
  };

  // Render Revenue Card (Aggregated)
  const renderRevenueCard = () => {
    if (!result?.data || !isAggregatedResult(result.data)) return null;
    
    const data = result.data[0];
    const totalRevenue = data.totalRevenue || data.total || 0;
    const orderCount = data.orderCount || 0;
    
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💰</span>
          <span className="text-sm opacity-80">Revenue Summary</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <p className="text-sm opacity-80 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)} birr</p>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <p className="text-sm opacity-80 mb-1">Total Orders</p>
            <p className="text-3xl font-bold">{formatNumber(orderCount)}</p>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm opacity-90">
          <p>Average Order Value: {formatCurrency(orderCount > 0 ? totalRevenue / orderCount : 0)} birr</p>
        </div>
      </div>
    );
  };

  // Render User Card
  const renderUserCard = (user: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800">{user.name || 'No Name'}</h4>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {user.role || 'No Role'}
              </span>
              {user.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {user.status}
                </span>
              )}
            </div>
            {user.phone && <p className="text-xs text-gray-400 mt-1">📞 {user.phone}</p>}
          </div>
        </div>
      </div>
    );
  };

  // Render Stock Card
  const renderStockCard = (stock: any, index: number) => {
    const isCritical = stock.currentStock < stock.minimumStock;
    const isLow = !isCritical && stock.currentStock < 20;
    
    return (
      <div key={index} className={`bg-white rounded-xl shadow-md border p-4 hover:shadow-lg transition-shadow ${
        isCritical ? 'border-red-300 bg-red-50' : isLow ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-gray-800">{stock.name}</h4>
            <p className="text-sm text-gray-500">{stock.unit || 'unit'}</p>
          </div>
          {isCritical && <span className="text-red-600 text-xs font-bold px-2 py-1 bg-red-100 rounded-full">⚠️ CRITICAL</span>}
          {isLow && !isCritical && <span className="text-yellow-600 text-xs font-bold px-2 py-1 bg-yellow-100 rounded-full">⚠️ LOW</span>}
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Stock Level</span>
            <span className="font-semibold">{stock.currentStock} / {stock.minimumStock}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (stock.currentStock / stock.minimumStock) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="mt-3 text-sm">
          <p className="text-gray-600">To Reorder: <span className="font-semibold text-red-600">{Math.max(0, stock.minimumStock - stock.currentStock)}</span></p>
        </div>
      </div>
    );
  };

  // Render Order Card
  const renderOrderCard = (order: any, index: number) => {
    const statusColors: Record<string, string> = {
      'COMPLETED': 'bg-green-100 text-green-700',
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'CONFIRMED': 'bg-blue-100 text-blue-700'
    };
    
    return (
      <div key={index} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-gray-800">{order.orderNumber || 'Order'}</h4>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs mt-1 ${statusColors[order.status] || 'bg-gray-100'}`}>
              {order.status || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatCurrency(order.finalAmount)} birr</p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          {order.tableNumber && <p className="text-gray-600">📋 Table: {order.tableNumber}</p>}
          {order.paymentMethod && <p className="text-gray-600">💳 {order.paymentMethod}</p>}
          {order.items?.length > 0 && <p className="text-gray-600">🍽️ {order.items.length} items</p>}
          {order.createdAt && <p className="text-gray-500 text-xs mt-2">📅 {formatDate(order.createdAt)}</p>}
        </div>
      </div>
    );
  };

  // Render Waitress Card
  const renderWaitressCard = (staff: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
            {staff.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800">{staff.name}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {staff.shift && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🕐 {staff.shift}</span>}
              {staff.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Active</span>}
            </div>
            {staff.phone && <p className="text-xs text-gray-500 mt-1">📞 {staff.phone}</p>}
            {staff.email && <p className="text-xs text-gray-400">📧 {staff.email}</p>}
          </div>
        </div>
      </div>
    );
  };

  // Render Table Card
  const renderTableCard = (table: any, index: number) => {
    const utilization = ((table.occupiedTables + table.reservedTables) / table.totalTables) * 100;
    
    return (
      <div key={index} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
        <h4 className="font-semibold text-gray-800">{table.name || table.floor}</h4>
        <p className="text-sm text-gray-500 mb-3">{table.floor}</p>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-xl font-bold text-green-600">{table.availableTables || 0}</p>
            <p className="text-xs text-gray-600">Available</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2">
            <p className="text-xl font-bold text-yellow-600">{table.reservedTables || 0}</p>
            <p className="text-xs text-gray-600">Reserved</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <p className="text-xl font-bold text-red-600">{table.occupiedTables || 0}</p>
            <p className="text-xs text-gray-600">Occupied</p>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Utilization</span>
            <span>{utilization.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${utilization}%` }} />
          </div>
        </div>
      </div>
    );
  };

  // Render Expense Card
  const renderExpenseCard = (expense: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-gray-800">{expense.title || expense.category || 'Expense'}</h4>
            <p className="text-sm text-gray-500">{expense.category || 'Uncategorized'}</p>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)} birr</p>
        </div>
        {expense.date && <p className="text-xs text-gray-400 mt-2">📅 {formatDate(expense.date)}</p>}
        {expense.frequency && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-2 inline-block">🔄 {expense.frequency}</span>}
      </div>
    );
  };

  // Render Prize Card
  const renderPrizeCard = (prize: any, index: number) => {
    const rarityColors: Record<string, string> = {
      legendary: 'from-yellow-400 to-orange-500',
      epic: 'from-purple-400 to-pink-500',
      rare: 'from-blue-400 to-cyan-500',
      common: 'from-gray-400 to-gray-500'
    };
    
    return (
      <div key={index} className={`bg-gradient-to-r ${rarityColors[prize.rarity] || 'from-gray-400 to-gray-500'} rounded-xl p-4 text-white shadow-lg`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">{prize.icon || '🎁'}</span>
          <h4 className="font-bold text-lg">{prize.name}</h4>
        </div>
        <p className="text-sm opacity-90">{prize.description}</p>
        <div className="flex justify-between mt-3 text-sm">
          <span>⭐ {prize.rarity}</span>
          <span>💎 {prize.value} points</span>
        </div>
      </div>
    );
  };

  // Main render function
  const renderDataCards = () => {
    if (!result?.data || result.data.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <p className="text-yellow-700">No results found for "{result?.query}"</p>
          <p className="text-sm text-yellow-600 mt-2">Try different keywords or check your data</p>
        </div>
      );
    }
    
    // Handle comparison results
    if (isComparisonResult(result.data)) {
      return renderComparisonCard();
    }
    
    // Handle aggregated revenue results
    if (isAggregatedResult(result.data)) {
      return renderRevenueCard();
    }
    
    const intent = result.metadata.intent || '';
    const collection = result.metadata.collectionsUsed?.[0] || '';
    
    // Users
    if (collection === 'users' || intent.includes('user') || intent.includes('admin')) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderUserCard(item, idx))}
        </div>
      );
    }
    
    // Stocks / Inventory
    if (collection === 'stocks' || intent === 'low stock') {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderStockCard(item, idx))}
        </div>
      );
    }
    
    // Orders
    if (collection === 'orders' || intent.includes('order')) {
      return (
        <div className="space-y-3">
          {result.data.map((item, idx) => renderOrderCard(item, idx))}
        </div>
      );
    }
    
    // Waitresses / Staff
    if (collection === 'waitresses' || intent.includes('staff')) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderWaitressCard(item, idx))}
        </div>
      );
    }
    
    // Tables
    if (collection === 'tablearrangements' || intent === 'tables') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {result.data.map((item, idx) => renderTableCard(item, idx))}
        </div>
      );
    }
    
    // Expenses
    if (collection === 'expenses' || intent === 'expenses') {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderExpenseCard(item, idx))}
        </div>
      );
    }
    
    // Prizes
    if (collection === 'prizes') {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((item, idx) => renderPrizeCard(item, idx))}
        </div>
      );
    }
    
    // Default card for other data types
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {result.data.slice(0, 20).map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(item, null, 2).substring(0, 300)}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-5xl">🍽️</span>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Manyazewal Gibi AI Search
            </h1>
            <span className="text-5xl">🤖</span>
          </div>
          <p className="text-gray-600 text-lg">
            Ask anything naturally — AI understands and finds answers instantly
          </p>
          
          {/* AI Status Badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
              🤖 AI Active (Groq API)
            </span>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... e.g., 'total revenue this month', 'compare revenue with last month', 'low stock items', 'admin users'"
                className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Thinking...' : '🔍 Search'}
            </button>
          </div>
        </form>

        {/* Example Queries */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-3">💡 Try asking:</p>
          <div className="flex flex-wrap gap-2">
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
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700">⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div ref={resultsRef} className="space-y-6">
            {/* AI Response Card - Only for non-comparison/revenue results */}
            {!isComparisonResult(result.data) && !isAggregatedResult(result.data) && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🤖</span>
                  <span className="text-sm opacity-80">AI Assistant</span>
                </div>
                <p className="text-xl md:text-2xl font-medium leading-relaxed">
                  {result.aiResponse}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    {getIntentIcon(result.metadata.intent)} {result.metadata.intent}
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    ⏱️ {result.metadata.processingTime}ms
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    📊 {result.metadata.total} results
                  </span>
                </div>
              </div>
            )}

            {/* Insights */}
            {result.insights.length > 0 && !isComparisonResult(result.data) && !isAggregatedResult(result.data) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <span>💡</span> Key Insights
                </h3>
                <ul className="space-y-1">
                  {result.insights.map((insight, i) => (
                    <li key={i} className="text-blue-800 text-sm flex items-start gap-2">
                      <span>•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Questions */}
            {result.suggestedQuestions.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <span>❓</span> Suggested Follow-up Questions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedClick(question)}
                      className="px-3 py-1.5 bg-white border border-purple-300 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data Cards */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                📋 Results ({result.metadata.total} items)
              </h3>
              {renderDataCards()}
            </div>
          </div>
        )}

        {/* Initial State */}
        {!result && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">Ask anything about your restaurant</p>
            <p className="text-sm text-gray-400 mt-2">
              Revenue, sales, inventory, staff, orders, expenses, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
