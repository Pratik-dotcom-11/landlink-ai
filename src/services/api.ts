import {
  ApiResponse,
  AuditLog,
  DashboardStatistics,
  DocumentItem,
  LandRecord,
  User,
  ValidationRulesConfig,
  VerificationTask
} from '../types.js';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('dolr_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    if (!text || text.trim().length === 0) {
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      return { success: true } as unknown as ApiResponse<T>;
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('<')) {
      console.warn(`[API] Received non-JSON HTML response for ${url} (HTTP ${res.status})`);
      return {
        success: false,
        error: `Server returned HTML rather than JSON (HTTP ${res.status}). The service might be starting or the route was not found.`,
      };
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseErr: any) {
      console.warn(`[API] JSON parse error for ${url}:`, parseErr);
      return {
        success: false,
        error: 'Failed to parse JSON response from server',
      };
    }
  } catch (err: any) {
    console.warn(`[API] Network error fetching ${url}:`, err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network connection failed',
    };
  }
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    return safeRequest<{ token: string; user: User }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  async register(userData: any): Promise<ApiResponse<{ token: string; user: User }>> {
    return safeRequest<{ token: string; user: User }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return safeRequest<{ user: User }>(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
  },

  async getUsers(): Promise<ApiResponse<User[]>> {
    return safeRequest<User[]>(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders(),
    });
  },

  // Documents
  async getDocuments(): Promise<ApiResponse<DocumentItem[]>> {
    return safeRequest<DocumentItem[]>(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
  },

  async getDocumentById(id: string): Promise<ApiResponse<DocumentItem>> {
    return safeRequest<DocumentItem>(`${API_BASE}/documents/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async uploadDocument(docData: {
    filename: string;
    fileType: string;
    fileDataUrl: string;
    language?: string;
  }): Promise<ApiResponse<DocumentItem>> {
    return safeRequest<DocumentItem>(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(docData),
    });
  },

  async processDocument(id: string): Promise<ApiResponse<{
    document: DocumentItem;
    record: LandRecord;
    validation: any;
  }>> {
    return safeRequest<{
      document: DocumentItem;
      record: LandRecord;
      validation: any;
    }>(`${API_BASE}/documents/${id}/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // Land Records
  async getRecords(params?: {
    state?: string;
    district?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<LandRecord[]>> {
    const query = new URLSearchParams();
    if (params?.state) query.append('state', params.state);
    if (params?.district) query.append('district', params.district);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    return safeRequest<LandRecord[]>(`${API_BASE}/records?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
  },

  async getRecordById(id: string): Promise<ApiResponse<LandRecord>> {
    return safeRequest<LandRecord>(`${API_BASE}/records/${id}`, {
      headers: getAuthHeaders(),
    });
  },

  async updateRecord(
    id: string,
    fields: Record<string, any>,
    reason?: string
  ): Promise<ApiResponse<LandRecord>> {
    return safeRequest<LandRecord>(`${API_BASE}/records/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fields, reason }),
    });
  },

  async approveRecord(id: string, comment?: string): Promise<ApiResponse<LandRecord>> {
    return safeRequest<LandRecord>(`${API_BASE}/records/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment }),
    });
  },

  async rejectRecord(id: string, reason?: string): Promise<ApiResponse<LandRecord>> {
    return safeRequest<LandRecord>(`${API_BASE}/records/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  // Verification Tasks
  async getPendingVerification(): Promise<ApiResponse<VerificationTask[]>> {
    return safeRequest<VerificationTask[]>(`${API_BASE}/verification/pending`, {
      headers: getAuthHeaders(),
    });
  },

  async submitVerification(
    taskId: string,
    action: 'APPROVE' | 'REJECT' | 'SAVE_EDITS',
    corrections?: Record<string, any>,
    comments?: string
  ): Promise<ApiResponse<{ task: VerificationTask; record: LandRecord }>> {
    return safeRequest<{ task: VerificationTask; record: LandRecord }>(
      `${API_BASE}/verification/${taskId}/submit`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, corrections, comments }),
      }
    );
  },

  // Dashboard & Audit
  async getDashboardStats(): Promise<ApiResponse<DashboardStatistics>> {
    return safeRequest<DashboardStatistics>(`${API_BASE}/dashboard/statistics`, {
      headers: getAuthHeaders(),
    });
  },

  async getAuditLogs(params?: {
    action?: string;
    entityType?: string;
    limit?: number;
  }): Promise<ApiResponse<AuditLog[]>> {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.entityType) query.append('entityType', params.entityType);
    if (params?.limit) query.append('limit', String(params.limit));

    return safeRequest<AuditLog[]>(`${API_BASE}/audit-logs?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
  },

  // Search
  async searchRecords(params: Record<string, string>): Promise<ApiResponse<{ total: number; results: LandRecord[] }>> {
    const query = new URLSearchParams(params);
    return safeRequest<{ total: number; results: LandRecord[] }>(`${API_BASE}/search?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
  },

  // Config & Rules
  async getRulesConfig(): Promise<ApiResponse<ValidationRulesConfig>> {
    return safeRequest<ValidationRulesConfig>(`${API_BASE}/config/rules`, {
      headers: getAuthHeaders(),
    });
  },

  async updateRulesConfig(config: Partial<ValidationRulesConfig>): Promise<ApiResponse<ValidationRulesConfig>> {
    return safeRequest<ValidationRulesConfig>(`${API_BASE}/config/rules`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
  },

  // OpenAPI Specification
  async getOpenApiSpec(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/docs/openapi.json`, {
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();
      if (text.trim().startsWith('<')) return null;
      return JSON.parse(text);
    } catch {
      return null;
    }
  },

  // Sample Documents
  async getSampleDocuments(): Promise<ApiResponse<Array<{
    id: string;
    title: string;
    state: string;
    language: string;
    type: string;
    description: string;
    svgUrl: string;
  }>>> {
    return safeRequest<Array<{
      id: string;
      title: string;
      state: string;
      language: string;
      type: string;
      description: string;
      svgUrl: string;
    }>>(`${API_BASE}/sample-documents`, {
      headers: getAuthHeaders(),
    });
  },

  // Reset System / Restart Process
  async resetSystem(): Promise<ApiResponse<{ message: string }>> {
    return safeRequest<{ message: string }>(`${API_BASE}/system/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },
};
