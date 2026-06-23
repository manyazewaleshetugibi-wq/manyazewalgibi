// app/admin/security/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Ban,
  Clock,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle,
} from 'lucide-react';

interface SecurityLog {
  _id?: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  path: string;
  method: string;
  ip: string;
  userAgent: string;
  userRole?: string;
  userId?: string;
  userEmail?: string;
  reason?: string;
  details?: Record<string, any>;
}

interface BlockedIP {
  ip: string;
  until: number;
  reason: string;
  attempts?: number;
  createdAt?: number;
}

interface SecurityStats {
  total: number;
  types: Record<string, number>;
  severities: Record<string, number>;
  last24h: number;
  topIPs: Array<{ ip: string; count: number }>;
}

export default function SecurityDashboard() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSecurityData();
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityData, 30000);
      return () => clearInterval(interval);
    }
  }, [filter, severityFilter, autoRefresh]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch logs
      let url = `/api/admin/security-logs?limit=200`;
      if (filter !== 'all') url += `&type=${filter}`;
      if (severityFilter !== 'all') url += `&severity=${severityFilter}`;
      
      const [logsRes, blockedRes, statsRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/blocked-ips'),
        fetch('/api/admin/security-logs?action=stats'),
      ]);

      const logsData = await logsRes.json();
      const blockedData = await blockedRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) setLogs(logsData.data);
      if (blockedData.success) setBlockedIPs(blockedData.data);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockIP = async (ip: string, duration: number = 24 * 60 * 60 * 1000) => {
    if (!confirm(`Block IP ${ip}?`)) return;
    
    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ip, 
          duration, 
          reason: `Manually blocked by ${session?.user?.email}` 
        }),
      });
      if (response.ok) {
        await fetchSecurityData();
        alert(`IP ${ip} blocked successfully!`);
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert('Failed to block IP');
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
        alert(`IP ${ip} unblocked successfully!`);
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      alert('Failed to unblock IP');
    }
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'unauthorized_access': 'bg-red-100 text-red-800',
      'rate_limit_exceeded': 'bg-yellow-100 text-yellow-800',
      'blocked_ip_access': 'bg-purple-100 text-purple-800',
      'suspicious_request': 'bg-orange-100 text-orange-800',
      'malicious_redirect': 'bg-pink-100 text-pink-800',
      'login_success': 'bg-green-100 text-green-800',
      'login_failure': 'bg-red-100 text-red-800',
      'logout': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'critical': 'text-red-600',
      'error': 'text-orange-600',
      'warning': 'text-yellow-600',
      'info': 'text-blue-600',
    };
    return colors[severity] || 'text-gray-600';
  };

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, React.ReactNode> = {
      'critical': <AlertTriangle className="w-4 h-4 text-red-500" />,
      'error': <XCircle className="w-4 h-4 text-orange-500" />,
      'warning': <AlertTriangle className="w-4 h-4 text-yellow-500" />,
      'info': <CheckCircle className="w-4 h-4 text-blue-500" />,
    };
    return icons[severity] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  // Filter logs by search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.ip?.toLowerCase().includes(search) ||
      log.path?.toLowerCase().includes(search) ||
      log.userEmail?.toLowerCase().includes(search) ||
      log.type?.toLowerCase().includes(search) ||
      log.userAgent?.toLowerCase().includes(search)
    );
  });

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
          <p className="text-gray-600">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛡️ Security Dashboard</h1>
            <p className="text-gray-500">Monitor and control your website security</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg border ${autoRefresh ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
            >
              {autoRefresh ? '● Live' : '⏸ Paused'}
            </button>
            <button
              onClick={fetchSecurityData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Incidents</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Last 24 Hours</p>
                <p className="text-2xl font-bold">{stats?.last24h || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Blocked IPs</p>
                <p className="text-2xl font-bold">{blockedIPs.length}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Threats</p>
                <p className="text-2xl font-bold">
                  {stats?.severities?.critical ? stats.severities.critical + stats.severities.error || 0 : 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Blocked IPs */}
        {blockedIPs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Blocked IPs ({blockedIPs.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {blockedIPs.map((ip) => (
                <div
                  key={ip.ip}
                  className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  <span className="font-mono text-sm">{ip.ip}</span>
                  <span className="text-xs text-gray-500">
                    (expires: {new Date(ip.until).toLocaleString()})
                  </span>
                  {ip.reason && (
                    <span className="text-xs text-gray-500" title={ip.reason}>
                      • {ip.reason.substring(0, 20)}...
                    </span>
                  )}
                  <button
                    onClick={() => unblockIP(ip.ip)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by IP, path, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Severity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Path</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">IP</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr 
                    key={index} 
                    className={`border-b hover:bg-gray-50 transition cursor-pointer ${expandedRows.has(index) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleRow(index)}
                  >
                    <td className="px-4 py-3 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getSeverityIcon(log.severity)}
                        <span className={`text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {log.severity || 'info'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono max-w-[200px] truncate">
                      {log.path}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {log.ip}
                      {blockedIPs.some(b => b.ip === log.ip) && (
                        <span className="ml-1 text-xs text-red-500">🚫</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.userEmail || log.userId || 'Anonymous'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                          className="text-blue-500 hover:text-blue-700"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {log.ip && log.ip !== 'unknown' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); blockIP(log.ip); }}
                            className="text-red-500 hover:text-red-700"
                            title="Block IP"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {expandedRows.has(index) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No security logs found</p>
            </div>
          )}
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <p><strong>Type:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedLog.type)}`}>{selectedLog.type}</span></p>
                  <p><strong>Severity:</strong> <span className={`${getSeverityColor(selectedLog.severity)} font-medium`}>{selectedLog.severity || 'info'}</span></p>
                  <p><strong>Time:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</p>
                  <p><strong>Method:</strong> {selectedLog.method}</p>
                  <p className="col-span-2"><strong>Path:</strong> <span className="font-mono text-sm">{selectedLog.path}</span></p>
                  <p><strong>IP:</strong> <span className="font-mono">{selectedLog.ip}</span></p>
                  <p><strong>User Agent:</strong> <span className="text-sm">{selectedLog.userAgent}</span></p>
                  {selectedLog.userEmail && <p><strong>Email:</strong> {selectedLog.userEmail}</p>}
                  {selectedLog.userRole && <p><strong>Role:</strong> {selectedLog.userRole}</p>}
                  {selectedLog.userId && <p><strong>User ID:</strong> <span className="font-mono text-sm">{selectedLog.userId}</span></p>}
                  {selectedLog.reason && <p className="col-span-2"><strong>Reason:</strong> <span className="text-red-600">{selectedLog.reason}</span></p>}
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold">Additional Details:</p>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto max-h-[200px]">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                {selectedLog.ip && selectedLog.ip !== 'unknown' && (
                  <button
                    onClick={() => {
                      blockIP(selectedLog.ip);
                      setSelectedLog(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Block IP
                  </button>
                )}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}