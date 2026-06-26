'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Ban,
  RefreshCw,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle,
  Filter,
  Download,
  Clock,
  Globe,
  Server,
  User,
  Mail,
  Calendar,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Terminal,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Info,
  Loader2,
  TrendingUp,
  AlertCircle,
  ShieldOff,
  Wifi,
  WifiOff,
  Database,
  HardDrive,
  Network,
  Clock as ClockIcon,
  BarChart3,
  PieChart,
  ListFilter,
  X,
  Plus,
  Save,
} from 'lucide-react';
import React from 'react';

// ============================================
// TYPES
// ============================================
type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'KITCHEN' | 'FB' | 'MARKETING' | 'FINANCE' | 'STOCK_MANAGER' | 'PURCHASING' | 'DELIVERY' | 'POS' | 'WAITRESS' | 'DEFAULT';

interface SecurityLog {
  _id?: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  path: string;
  method: string;
  ip: string;
  ipAnonymized?: string;
  userAgent: string;
  userRole?: string;
  userId?: string;
  userEmail?: string;
  reason?: string;
  details?: Record<string, any>;
  referer?: string;
  sessionId?: string;
  query?: Record<string, string>;
  country?: string;
  city?: string;
}

interface BlockedIP {
  ip: string;
  until: number;
  reason: string;
  attempts?: number;
  createdAt?: number;
  blockedBy?: string;
}

interface SecurityStats {
  total: number;
  types: Record<string, number>;
  severities: Record<string, number>;
  last24h: number;
  topIPs: Array<{ ip: string; count: number }>;
  attackTypes: Record<string, number>;
  hourlyActivity: Array<{ hour: number; count: number }>;
}

interface FilterState {
  type: string;
  severity: string;
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  ip: string;
  userEmail: string;
  startDate?: Date;
  endDate?: Date;
}

interface AttackInsight {
  ip: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  types: string[];
  isBlocked: boolean;
  riskScore: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function normalizeRole(role: string | undefined): string {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateShort(dateString);
}

function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') return true;
  const patterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^fc00:/,
    /^fe80:/,
  ];
  return patterns.some(pattern => pattern.test(ip));
}

function getIPDisplay(ip: string): { display: string; isLocal: boolean; isPrivate: boolean; icon: React.ReactNode } {
  if (!ip || ip === 'unknown') {
    return { 
      display: 'Unknown IP', 
      isLocal: false, 
      isPrivate: true,
      icon: <WifiOff className="w-3 h-3 text-gray-400" />
    };
  }
  if (ip === '::1' || ip === '127.0.0.1') {
    return { 
      display: 'Localhost', 
      isLocal: true, 
      isPrivate: true,
      icon: <Server className="w-3 h-3 text-blue-400" />
    };
  }
  const isPrivate = isPrivateIP(ip);
  return { 
    display: ip, 
    isLocal: false, 
    isPrivate,
    icon: isPrivate ? <Lock className="w-3 h-3 text-yellow-500" /> : <Globe className="w-3 h-3 text-green-500" />
  };
}

function getRiskScore(ip: string, logs: SecurityLog[], blockedIPs: BlockedIP[]): AttackInsight['riskScore'] {
  const ipLogs = logs.filter(l => l.ip === ip);
  if (ipLogs.length === 0) return 'low';
  
  const criticalCount = ipLogs.filter(l => l.severity === 'critical').length;
  const errorCount = ipLogs.filter(l => l.severity === 'error').length;
  const uniqueTypes = new Set(ipLogs.map(l => l.type)).size;
  const isBlocked = blockedIPs.some(b => b.ip === ip);
  
  if (isBlocked || criticalCount > 3) return 'critical';
  if (criticalCount > 0 || errorCount > 5 || uniqueTypes > 3) return 'high';
  if (errorCount > 2 || uniqueTypes > 2) return 'medium';
  return 'low';
}

function getRiskColor(risk: AttackInsight['riskScore']): string {
  const colors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
  };
  return colors[risk];
}

// ============================================
// SUB-COMPONENTS
// ============================================

const SeverityBadge = ({ severity }: { severity: string }) => {
  const config = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: <AlertOctagon className="w-3 h-3" /> },
    error: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', icon: <AlertTriangle className="w-3 h-3" /> },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: <AlertCircle className="w-3 h-3" /> },
    info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: <Info className="w-3 h-3" /> },
  };
  const c = config[severity as keyof typeof config] || config.info;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      {severity.toUpperCase()}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'unauthorized_access': { bg: 'bg-red-100', text: 'text-red-800', label: 'Unauthorized' },
    'rate_limit_exceeded': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Rate Limit' },
    'blocked_ip_access': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Blocked IP' },
    'suspicious_request': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Suspicious' },
    'malicious_redirect': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Malicious Redirect' },
    'login_success': { bg: 'bg-green-100', text: 'text-green-800', label: 'Login Success' },
    'login_failure': { bg: 'bg-red-100', text: 'text-red-800', label: 'Login Failure' },
    'logout': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Logout' },
    'page_view': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Page View' },
    'api_access': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'API Access' },
    'user_action': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'User Action' },
    'csrf_attack': { bg: 'bg-red-200', text: 'text-red-900', label: 'CSRF Attack' },
    'sql_injection': { bg: 'bg-red-300', text: 'text-red-900', label: 'SQL Injection' },
    'xss_attack': { bg: 'bg-red-200', text: 'text-red-900', label: 'XSS Attack' },
  };
  
  const c = config[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type.replace(/_/g, ' ') };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => (
  <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${color} hover:shadow-md transition`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`text-xs mt-1 ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
          </div>
        )}
      </div>
      <Icon className={`w-8 h-8 ${color.replace('border-', 'text-')} opacity-75`} />
    </div>
  </div>
);

const RiskBadge = ({ risk }: { risk: AttackInsight['riskScore'] }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(risk)}`}>
    {risk.toUpperCase()}
  </span>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function SecurityDashboard() {
  const { data: session } = useSession();
  
  // State
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedIP, setCopiedIP] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockTarget, setBlockTarget] = useState<string>('');
  const [blockDuration, setBlockDuration] = useState(24);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'logs' | 'insights' | 'blocked'>('logs');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    severity: 'all',
    search: '',
    dateRange: 'all',
    ip: '',
    userEmail: '',
  });

  const userRole = normalizeRole(session?.user?.role);

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/security-logs?limit=1000`;
      if (filters.type !== 'all') url += `&type=${filters.type}`;
      if (filters.severity !== 'all') url += `&severity=${filters.severity}`;
      
      const [logsRes, blockedRes, statsRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/blocked-ips'),
        fetch('/api/admin/security-logs?action=stats'),
      ]);

      const logsData = await logsRes.json();
      const blockedData = await blockedRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) setLogs(logsData.data || []);
      if (blockedData.success) setBlockedIPs(blockedData.data || []);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.severity]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchSecurityData]);

  // ============================================
  // ACTIONS
  // ============================================
  const blockIP = async (ip: string, duration: number = 24, reason?: string) => {
    if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      alert('❌ Cannot block localhost or unknown IP addresses');
      return;
    }
    
    if (!confirm(`Block IP ${ip} for ${duration} hours?`)) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ip, 
          duration: duration * 60 * 60 * 1000,
          reason: reason || `Manually blocked by ${session?.user?.email || 'Admin'}`
        }),
      });
      
      if (response.ok) {
        await fetchSecurityData();
        alert(`✅ IP ${ip} blocked successfully for ${duration} hours!`);
        setShowBlockModal(false);
        setBlockTarget('');
        setBlockReason('');
      } else {
        const data = await response.json();
        alert(`❌ Failed to block IP: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert('❌ Failed to block IP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unblockIP = async (ip: string) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;
    
    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      
      if (response.ok) {
        await fetchSecurityData();
        alert(`✅ IP ${ip} unblocked successfully!`);
      } else {
        const data = await response.json();
        alert(`❌ Failed to unblock IP: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      alert('❌ Failed to unblock IP');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIP(text);
    setTimeout(() => setCopiedIP(null), 2000);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const clearAllFilters = () => {
    setFilters({
      type: 'all',
      severity: 'all',
      search: '',
      dateRange: 'all',
      ip: '',
      userEmail: '',
    });
  };

  // ============================================
  // FILTERING & ANALYSIS
  // ============================================
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log =>
        log.ip?.toLowerCase().includes(searchLower) ||
        log.path?.toLowerCase().includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.type?.toLowerCase().includes(searchLower) ||
        log.userAgent?.toLowerCase().includes(searchLower) ||
        log.reason?.toLowerCase().includes(searchLower)
      );
    }

    // IP filter
    if (filters.ip) {
      result = result.filter(log => log.ip?.includes(filters.ip));
    }

    // User email filter
    if (filters.userEmail) {
      result = result.filter(log => log.userEmail?.toLowerCase().includes(filters.userEmail.toLowerCase()));
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (filters.dateRange === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (filters.dateRange === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (filters.dateRange === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }
      result = result.filter(log => new Date(log.timestamp) >= cutoff);
    }

    // Type filter (additional)
    if (selectedType) {
      result = result.filter(log => log.type === selectedType);
    }

    return result;
  }, [logs, filters, selectedType]);

  // Attack insights
  const attackInsights = useMemo((): AttackInsight[] => {
    const ipMap = new Map<string, AttackInsight>();
    
    logs.forEach(log => {
      if (log.type === 'rate_limit_exceeded' || log.type === 'suspicious_request' || log.type === 'unauthorized_access') {
        const ip = log.ip || 'unknown';
        if (!ipMap.has(ip)) {
          ipMap.set(ip, {
            ip,
            count: 0,
            firstSeen: log.timestamp,
            lastSeen: log.timestamp,
            types: [],
            isBlocked: blockedIPs.some(b => b.ip === ip),
            riskScore: 'low',
          });
        }
        const entry = ipMap.get(ip)!;
        entry.count++;
        if (new Date(log.timestamp) < new Date(entry.firstSeen)) entry.firstSeen = log.timestamp;
        if (new Date(log.timestamp) > new Date(entry.lastSeen)) entry.lastSeen = log.timestamp;
        if (!entry.types.includes(log.type)) entry.types.push(log.type);
      }
    });

    // Calculate risk scores
    const entries = Array.from(ipMap.values());
    entries.forEach(entry => {
      entry.riskScore = getRiskScore(entry.ip, logs, blockedIPs);
    });

    return entries.sort((a, b) => b.count - a.count);
  }, [logs, blockedIPs]);

  // ============================================
  // RENDER HELPERS
  // ============================================
  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, React.ReactNode> = {
      'critical': <AlertOctagon className="w-4 h-4 text-red-500" />,
      'error': <XCircle className="w-4 h-4 text-orange-500" />,
      'warning': <AlertTriangle className="w-4 h-4 text-yellow-500" />,
      'info': <CheckCircle className="w-4 h-4 text-blue-500" />,
    };
    return icons[severity] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  // ============================================
  // ACCESS CONTROL
  // ============================================
  if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin privileges required to view this dashboard</p>
          <p className="text-sm text-gray-400 mt-4">Contact your system administrator</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Security Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Monitor, analyze, and control your application security</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('logs')}
              className={`px-3 py-2 rounded-lg border transition ${
                viewMode === 'logs' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ListFilter className="w-4 h-4 inline mr-1" />
              Logs
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`px-3 py-2 rounded-lg border transition ${
                viewMode === 'insights' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Insights
            </button>
            <button
              onClick={() => setViewMode('blocked')}
              className={`px-3 py-2 rounded-lg border transition ${
                viewMode === 'blocked' 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Ban className="w-4 h-4 inline mr-1" />
              Blocked ({blockedIPs.length})
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                autoRefresh 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}
            >
              {autoRefresh ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={fetchSecurityData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Incidents"
            value={stats?.total || 0}
            icon={Shield}
            color="border-blue-500"
            subtitle={`${stats?.types ? Object.keys(stats.types).length : 0} unique types`}
          />
          <StatCard
            title="Last 24 Hours"
            value={stats?.last24h || 0}
            icon={Activity}
            color="border-green-500"
            subtitle={stats?.last24h ? `${Math.round((stats.last24h / (stats.total || 1)) * 100)}% of total` : 'No activity'}
          />
          <StatCard
            title="Blocked IPs"
            value={blockedIPs.length}
            icon={Ban}
            color="border-red-500"
            subtitle={blockedIPs.length > 0 ? `${blockedIPs.length} IPs currently blocked` : 'No active blocks'}
          />
          <StatCard
            title="Active Threats"
            value={(stats?.severities?.critical || 0) + (stats?.severities?.error || 0)}
            icon={AlertTriangle}
            color="border-yellow-500"
            subtitle={`Critical: ${stats?.severities?.critical || 0}, Error: ${stats?.severities?.error || 0}`}
          />
        </div>

        {/* Attack Detection Alert */}
        {attackInsights.filter(a => a.riskScore === 'critical' || a.riskScore === 'high').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">
                  🚨 Active Threats Detected
                </h3>
                <p className="text-sm text-red-700">
                  {attackInsights.filter(a => a.riskScore === 'critical').length} critical and {attackInsights.filter(a => a.riskScore === 'high').length} high-risk IP addresses detected
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {attackInsights.filter(a => a.riskScore === 'critical' || a.riskScore === 'high').slice(0, 5).map(insight => (
                    <button
                      key={insight.ip}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, ip: insight.ip }));
                        setViewMode('logs');
                      }}
                      className="text-xs bg-white border border-red-300 rounded-full px-3 py-1 hover:bg-red-50 transition"
                    >
                      {getIPDisplay(insight.ip).display} ({insight.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* VIEW: BLOCKED IPs */}
        {/* ============================================ */}
        {viewMode === 'blocked' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                Blocked IPs ({blockedIPs.length})
              </h2>
              <button
                onClick={() => {
                  setBlockTarget('');
                  setBlockReason('');
                  setBlockDuration(24);
                  setShowBlockModal(true);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Block IP
              </button>
            </div>
            
            {blockedIPs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No IPs currently blocked</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {blockedIPs.map((block) => {
                  const ipInfo = getIPDisplay(block.ip);
                  return (
                    <div
                      key={block.ip}
                      className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3 hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {ipInfo.icon}
                          <span className="font-mono font-medium">{ipInfo.display}</span>
                          {block.attempts && (
                            <span className="text-xs text-gray-500">({block.attempts} attempts)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {block.reason && <span>Reason: {block.reason}</span>}
                          {block.createdAt && (
                            <span className="ml-2">Blocked: {formatDateShort(new Date(block.createdAt).toISOString())}</span>
                          )}
                          <span className="ml-2">Expires: {formatDateShort(new Date(block.until).toISOString())}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockIP(block.ip)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium hover:underline px-3 py-1 rounded hover:bg-red-100 transition"
                      >
                        Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* VIEW: INSIGHTS */}
        {/* ============================================ */}
        {viewMode === 'insights' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Attack Insights
            </h2>
            
            {attackInsights.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShieldCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p>No attacks detected. Your system is secure!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attackInsights.map(insight => {
                  const ipInfo = getIPDisplay(insight.ip);
                  const isBlocked = blockedIPs.some(b => b.ip === insight.ip);
                  
                  return (
                    <div
                      key={insight.ip}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        insight.riskScore === 'critical' ? 'bg-red-50 border-red-300' :
                        insight.riskScore === 'high' ? 'bg-orange-50 border-orange-300' :
                        insight.riskScore === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                        'bg-green-50 border-green-300'
                      } hover:shadow-md transition`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {ipInfo.icon}
                          <span className="font-mono font-medium">{ipInfo.display}</span>
                          <RiskBadge risk={insight.riskScore} />
                          {isBlocked && (
                            <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">Blocked</span>
                          )}
                          <span className="text-sm text-gray-500">{insight.count} requests</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                          <span>First: {getTimeAgo(insight.firstSeen)}</span>
                          <span>Last: {getTimeAgo(insight.lastSeen)}</span>
                          <span>Types: {insight.types.join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, ip: insight.ip }));
                            setViewMode('logs');
                          }}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          View Logs
                        </button>
                        {!isBlocked && insight.ip !== 'unknown' && !ipInfo.isLocal && (
                          <button
                            onClick={() => blockIP(insight.ip, 24, `Auto-blocked due to ${insight.count} suspicious requests`)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* VIEW: LOGS */}
        {/* ============================================ */}
        {viewMode === 'logs' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by IP, path, email..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="unauthorized_access">Unauthorized</option>
                  <option value="rate_limit_exceeded">Rate Limit</option>
                  <option value="blocked_ip_access">Blocked IP</option>
                  <option value="suspicious_request">Suspicious</option>
                  <option value="malicious_redirect">Malicious Redirect</option>
                  <option value="login_success">Login Success</option>
                  <option value="login_failure">Login Failure</option>
                  <option value="logout">Logout</option>
                  <option value="page_view">Page View</option>
                  <option value="api_access">API Access</option>
                  <option value="user_action">User Action</option>
                </select>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Path</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No security logs found</p>
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => {
                        const ipInfo = getIPDisplay(log.ip);
                        const isBlocked = blockedIPs.some(b => b.ip === log.ip);
                        const isExpanded = expandedRows.has(index);
                        
                        return (
                          <React.Fragment key={log._id || index}>
                            <tr 
                              className={`border-b hover:bg-gray-50 transition cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
                              onClick={() => toggleRow(index)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-sm">{formatDateShort(log.timestamp)}</span>
                                  <span className="text-xs text-gray-400">{getTimeAgo(log.timestamp)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <SeverityBadge severity={log.severity} />
                              </td>
                              <td className="px-4 py-3">
                                <TypeBadge type={log.type} />
                              </td>
                              <td className="px-4 py-3">
                                {log.userEmail ? (
                                  <div>
                                    <div className="text-sm font-medium flex items-center gap-1">
                                      <User className="w-3 h-3 text-gray-400" />
                                      <span className="truncate max-w-[120px]">{log.userEmail}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">{log.userRole || 'No role'}</div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">Anonymous</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {ipInfo.icon}
                                  <span className={`text-sm font-mono ${ipInfo.isLocal ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {ipInfo.display}
                                  </span>
                                  {isBlocked && <Ban className="w-3 h-3 text-red-500" />}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(log.ip); }}
                                    className="ml-1 text-gray-400 hover:text-gray-600"
                                    title="Copy IP"
                                  >
                                    {copiedIP === log.ip ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-gray-600 truncate max-w-[150px] block" title={log.path}>
                                  {log.path}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {log.ip && log.ip !== 'unknown' && !ipInfo.isLocal && !isBlocked && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); 
                                        setBlockTarget(log.ip);
                                        setBlockReason(`Blocked due to ${log.type} on ${log.path}`);
                                        setBlockDuration(24);
                                        setShowBlockModal(true);
                                      }}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                      title="Block IP"
                                    >
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleRow(index); }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* Expanded row */}
                            {isExpanded && (
                              <tr className="bg-gray-50">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-xs text-gray-500">User Agent</span>
                                      <p className="break-all">{log.userAgent}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">Method</span>
                                      <p className="font-mono">{log.method}</p>
                                    </div>
                                    {log.reason && (
                                      <div className="sm:col-span-2">
                                        <span className="text-xs text-gray-500">Reason</span>
                                        <p className="text-red-600 bg-red-50 p-2 rounded">{log.reason}</p>
                                      </div>
                                    )}
                                    {log.details && Object.keys(log.details).length > 0 && (
                                      <div className="sm:col-span-2">
                                        <span className="text-xs text-gray-500">Details</span>
                                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-[100px]">
                                          {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap justify-between items-center text-sm text-gray-500 gap-2">
                <span>Showing {filteredLogs.length} of {logs.length} logs</span>
                <span className="flex items-center gap-2">
                  <Activity className={`w-3 h-3 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* LOG DETAIL MODAL */}
        {/* ============================================ */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Log Details
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Header info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-xs text-gray-500">Type</span>
                    <div><TypeBadge type={selectedLog.type} /></div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Severity</span>
                    <div><SeverityBadge severity={selectedLog.severity} /></div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Time</span>
                    <p className="text-sm">{formatDate(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Method</span>
                    <p className="text-sm font-mono">{selectedLog.method}</p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <span className="text-xs text-gray-500">Path</span>
                    <p className="text-sm font-mono break-all">{selectedLog.path}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">IP Address</span>
                    <p className="text-sm font-mono flex items-center gap-2">
                      {selectedLog.ip}
                      <button
                        onClick={() => copyToClipboard(selectedLog.ip)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copiedIP === selectedLog.ip ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </p>
                  </div>
                  {selectedLog.userEmail && (
                    <div>
                      <span className="text-xs text-gray-500">User</span>
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {selectedLog.userEmail}
                      </p>
                    </div>
                  )}
                  {selectedLog.userRole && (
                    <div>
                      <span className="text-xs text-gray-500">Role</span>
                      <p className="text-sm">{selectedLog.userRole}</p>
                    </div>
                  )}
                  {selectedLog.userId && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-500">User ID</span>
                      <p className="text-sm font-mono">{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-500">User Agent</span>
                      <p className="text-sm break-all">{selectedLog.userAgent}</p>
                    </div>
                  )}
                  {selectedLog.referer && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-500">Referer</span>
                      <p className="text-sm break-all">{selectedLog.referer}</p>
                    </div>
                  )}
                  {selectedLog.reason && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-500">Reason</span>
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.reason}</p>
                    </div>
                  )}
                  {selectedLog.sessionId && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-gray-500">Session ID</span>
                      <p className="text-sm font-mono">{selectedLog.sessionId}</p>
                    </div>
                  )}
                </div>

                {/* Query params */}
                {selectedLog.query && Object.keys(selectedLog.query).length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Query Parameters</span>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto max-h-[200px]">
                      {JSON.stringify(selectedLog.query, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Additional details */}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Additional Details</span>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto max-h-[200px]">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                {selectedLog.ip && selectedLog.ip !== 'unknown' && !getIPDisplay(selectedLog.ip).isLocal && !blockedIPs.some(b => b.ip === selectedLog.ip) && (
                  <button
                    onClick={() => {
                      blockIP(selectedLog.ip, 24, `Blocked due to ${selectedLog.type} on ${selectedLog.path}`);
                      setSelectedLog(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Block IP
                  </button>
                )}
                <button
                  onClick={() => {
                    if (selectedLog.path.startsWith('/')) {
                      window.open(selectedLog.path, '_blank');
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Path
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* BLOCK IP MODAL */}
        {/* ============================================ */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Block IP Address
                </h2>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={blockTarget}
                    onChange={(e) => setBlockTarget(e.target.value)}
                    placeholder="Enter IP address to block"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                  <select
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                    <option value={168}>7 days</option>
                    <option value={720}>30 days</option>
                    <option value={8760}>Permanent (1 year)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Reason for blocking this IP"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-20"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    if (blockTarget && blockTarget !== 'unknown') {
                      blockIP(blockTarget, blockDuration, blockReason || undefined);
                    } else {
                      alert('Please enter a valid IP address');
                    }
                  }}
                  disabled={isSubmitting || !blockTarget}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Block IP
                </button>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}