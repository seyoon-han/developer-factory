'use client';

import { useState, useEffect } from 'react';
import { 
  Server, Plus, Edit2, Trash2, Power, PowerOff, TestTube, 
  ChevronDown, ChevronRight, Check, X, Loader2,
  Monitor, Globe, Terminal
} from 'lucide-react';

interface McpServer {
  id: number;
  serverName: string;
  description?: string;
  version?: string;
  serverAddress: string; // Command for STDIO
  port?: number;
  protocolType: string;
  connectionPath: string;
  authType: string;
  authToken?: string;
  authKeyName?: string;
  additionalHeaders?: Record<string, string>;
  serverArgs?: string[];
  serverEnv?: Record<string, string>;
  isActive: boolean;
  lastTestAt?: string;
  lastTestStatus?: string;
  lastTestError?: string;
  availableTools?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function McpServersPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [expandedServerId, setExpandedServerId] = useState<number | null>(null);
  const [testingServerId, setTestingServerId] = useState<number | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/mcp-servers');
      const data = await response.json();
      if (data.success) {
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return;

    try {
      const response = await fetch(`/api/mcp-servers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchServers();
      }
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const response = await fetch(`/api/mcp-servers/${id}/toggle`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchServers();
      }
    } catch (error) {
      console.error('Error toggling server status:', error);
    }
  };

  const handleTestConnection = async (id: number) => {
    setTestingServerId(id);
    try {
      const response = await fetch(`/api/mcp-servers/${id}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Connection successful!\n\nEndpoint: ${data.result?.endpoint}\nStatus: ${data.result?.status}`);
      } else {
        alert(`❌ Connection failed\n\nError: ${data.error}`);
      }

      fetchServers(); // Refresh to show test results
    } catch (error: any) {
      alert(`❌ Test error: ${error.message}`);
    } finally {
      setTestingServerId(null);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedServerId(expandedServerId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Source MCPs</h1>
          <p className="text-muted-foreground mt-1">
            Manage Model Context Protocol servers for AI data access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add MCP Server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No MCP Servers</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first MCP server
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Add MCP Server
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Server Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpanded(server.id)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {expandedServerId === server.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {server.serverName}
                          </h3>
                          {server.version && (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                              v{server.version}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                            server.protocolType === 'stdio' 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                          }`}>
                            {server.protocolType === 'stdio' ? <Terminal className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {server.protocolType === 'stdio' ? 'Local' : 'Remote'}
                          </span>
                          {server.isActive ? (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                              <Power className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded">
                              <PowerOff className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">
                          {server.protocolType === 'stdio' 
                            ? `${server.serverAddress} ${server.serverArgs?.join(' ') || ''}`
                            : `${server.protocolType}://${server.serverAddress}:${server.port}${server.connectionPath}`
                          }
                        </p>
                        {server.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {server.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {server.lastTestStatus && (
                      <div className="text-xs">
                        {server.lastTestStatus === 'success' ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Check className="w-3 h-3" />
                            Tested
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <X className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleTestConnection(server.id)}
                      disabled={testingServerId === server.id}
                      className="p-2 hover:bg-accent rounded transition-colors disabled:opacity-50"
                      title="Test Connection"
                    >
                      {testingServerId === server.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleActive(server.id)}
                      className="p-2 hover:bg-accent rounded transition-colors"
                      title={server.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {server.isActive ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingServer(server)}
                      className="p-2 hover:bg-accent rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedServerId === server.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Protocol</div>
                      <div className="text-sm font-medium">{server.protocolType}</div>
                    </div>
                    {server.protocolType !== 'stdio' && (
                      <>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Auth Type</div>
                          <div className="text-sm font-medium">{server.authType}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Port</div>
                          <div className="text-sm font-medium">{server.port}</div>
                        </div>
                      </>
                    )}
                    {server.authKeyName && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Auth Key Name</div>
                        <div className="text-sm font-medium font-mono">{server.authKeyName}</div>
                      </div>
                    )}
                    {server.lastTestAt && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Last Tested</div>
                        <div className="text-sm font-medium">
                          {new Date(server.lastTestAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Environment Variables */}
                  {server.serverEnv && Object.keys(server.serverEnv).length > 0 && (
                     <div>
                      <div className="text-xs text-muted-foreground mb-2">Environment Variables</div>
                      <div className="bg-background border border-border rounded p-2 text-xs font-mono">
                        {Object.entries(server.serverEnv).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="font-bold">{k}=</span>
                            <span className="text-muted-foreground">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {server.additionalHeaders && Object.keys(server.additionalHeaders).length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Additional Headers</div>
                      <div className="bg-background border border-border rounded p-2 text-xs font-mono">
                        {JSON.stringify(server.additionalHeaders, null, 2)}
                      </div>
                    </div>
                  )}

                  {server.availableTools && server.availableTools.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Available Tools ({server.availableTools.length})
                      </div>
                      <div className="bg-background border border-border rounded p-2 max-h-60 overflow-y-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(server.availableTools, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {server.lastTestError && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
                      <div className="text-xs font-semibold text-destructive mb-1">Last Error</div>
                      <div className="text-xs text-destructive/80">{server.lastTestError}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingServer) && (
        <McpServerModal
          server={editingServer}
          onClose={() => {
            setShowCreateModal(false);
            setEditingServer(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingServer(null);
            fetchServers();
          }}
        />
      )}
    </div>
  );
}

// Modal component for creating/editing MCP servers
interface McpServerModalProps {
  server: McpServer | null;
  onClose: () => void;
  onSuccess: () => void;
}

function McpServerModal({ server, onClose, onSuccess }: McpServerModalProps) {
  const [configType, setConfigType] = useState<'local' | 'remote'>(
    server?.protocolType === 'stdio' ? 'local' : 'remote'
  );

  const [formData, setFormData] = useState({
    serverName: server?.serverName || '',
    description: server?.description || '',
    version: server?.version || '',
    // For remote: Address/Host. For local: Command
    serverAddress: server?.serverAddress || '',
    port: server?.port || 443,
    protocolType: server?.protocolType || 'https',
    connectionPath: server?.connectionPath || '/',
    authType: server?.authType || 'none',
    authToken: server?.authToken || '',
    authKeyName: server?.authKeyName || 'X-API-Key',
    additionalHeaders: server?.additionalHeaders ? JSON.stringify(server.additionalHeaders, null, 2) : '',
    // Local specific
    serverArgs: server?.serverArgs || [],
    serverEnv: server?.serverEnv ? Object.entries(server.serverEnv).map(([k, v]) => ({ key: k, value: v })) : [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Parse additional headers
      let additionalHeaders = null;
      if (configType === 'remote' && formData.additionalHeaders.trim()) {
        try {
          additionalHeaders = JSON.parse(formData.additionalHeaders);
        } catch (e) {
          setError('Invalid JSON in additional headers');
          setSubmitting(false);
          return;
        }
      }

      // Prepare Env vars for local
      let serverEnv = null;
      if (configType === 'local' && formData.serverEnv.length > 0) {
        serverEnv = formData.serverEnv.reduce((acc, curr) => {
          if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
          return acc;
        }, {} as Record<string, string>);
      }

      const payload = {
        ...formData,
        protocolType: configType === 'local' ? 'stdio' : formData.protocolType,
        port: configType === 'local' ? 0 : parseInt(formData.port.toString()),
        additionalHeaders,
        serverArgs: configType === 'local' ? formData.serverArgs : null,
        serverEnv,
      };

      const url = server ? `/api/mcp-servers/${server.id}` : '/api/mcp-servers';
      const method = server ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to save server');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {server ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Config Type Selector */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setConfigType('remote')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                configType === 'remote' 
                  ? 'bg-background shadow text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-4 h-4" />
              Remote Server
            </button>
            <button
              type="button"
              onClick={() => setConfigType('local')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                configType === 'local' 
                  ? 'bg-background shadow text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Local Process (stdio)
            </button>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Server Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.serverName}
                onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={configType === 'local' ? "Local Filesystem" : "Production Analytics"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              maxLength={500}
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Description of what this MCP server provides..."
            />
          </div>

          <div className="border-t border-border pt-4">
            {configType === 'local' ? (
              /* Local Process Config */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Command <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.serverAddress}
                      onChange={(e) => setFormData({ ...formData, serverAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      placeholder="npx, python, docker, etc."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The executable to run (must be in PATH or absolute path).
                  </p>
                </div>

                {/* Arguments */}
                <div>
                  <label className="block text-sm font-medium mb-2">Arguments</label>
                  <div className="space-y-2">
                    {formData.serverArgs.map((arg, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={arg}
                          onChange={(e) => {
                            const newArgs = [...formData.serverArgs];
                            newArgs[idx] = e.target.value;
                            setFormData({ ...formData, serverArgs: newArgs });
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newArgs = formData.serverArgs.filter((_, i) => i !== idx);
                            setFormData({ ...formData, serverArgs: newArgs });
                          }}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, serverArgs: [...formData.serverArgs, ''] })}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Argument
                    </button>
                  </div>
                </div>

                {/* Environment Variables */}
                <div>
                  <label className="block text-sm font-medium mb-2">Environment Variables</label>
                  <div className="space-y-2">
                    {formData.serverEnv.map((env, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="KEY"
                          value={env.key}
                          onChange={(e) => {
                            const newEnv = [...formData.serverEnv];
                            newEnv[idx].key = e.target.value;
                            setFormData({ ...formData, serverEnv: newEnv });
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={env.value}
                          onChange={(e) => {
                            const newEnv = [...formData.serverEnv];
                            newEnv[idx].value = e.target.value;
                            setFormData({ ...formData, serverEnv: newEnv });
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newEnv = formData.serverEnv.filter((_, i) => i !== idx);
                            setFormData({ ...formData, serverEnv: newEnv });
                          }}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, serverEnv: [...formData.serverEnv, { key: '', value: '' }] })}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Variable
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Remote Server Config */
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Server Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.serverAddress}
                      onChange={(e) => setFormData({ ...formData, serverAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="mcp.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Port <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={65535}
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Protocol <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={formData.protocolType}
                      onChange={(e) => setFormData({ ...formData, protocolType: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="ws">WebSocket (WS)</option>
                      <option value="wss">WebSocket Secure (WSS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Connection Path</label>
                    <input
                      type="text"
                      value={formData.connectionPath}
                      onChange={(e) => setFormData({ ...formData, connectionPath: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="/"
                    />
                  </div>
                </div>

                {/* Auth Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Authentication Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={formData.authType}
                    onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="none">None</option>
                    <option value="apiKey">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="oauth">OAuth</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {/* Auth Token (if auth type is not none) */}
                {formData.authType !== 'none' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Auth Token <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="password"
                        required={formData.authType !== 'none'}
                        value={formData.authToken}
                        onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="sk-abc123xyz..."
                      />
                    </div>

                    {formData.authType === 'apiKey' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Auth Key Header Name</label>
                        <input
                          type="text"
                          value={formData.authKeyName}
                          onChange={(e) => setFormData({ ...formData, authKeyName: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                          placeholder="X-API-Key"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Additional Headers */}
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Headers (JSON)</label>
                  <textarea
                    rows={4}
                    value={formData.additionalHeaders}
                    onChange={(e) => setFormData({ ...formData, additionalHeaders: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder={'{\n  "X-Custom-Header": "value"\n}'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : server ? 'Update Server' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
