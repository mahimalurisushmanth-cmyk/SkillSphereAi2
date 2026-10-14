export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'mentor' | 'admin';
  avatar_url?: string;
  learning_goal?: string;
  target_role?: string;
  skill_level?: string;
  created_at: string;
}

export interface MentorDirectoryItem {
  id: number;
  user_id: number;
  full_name: string;
  avatar_url?: string;
  title: string;
  bio: string;
  skills: string;
  expertise_domain: string;
  education?: string;
  years_of_experience: number;
  linkedin_url?: string;
  portfolio_url?: string;
  languages: string;
  meeting_preference: 'online' | 'in-person' | 'both';
  available_days: string;
  available_times: string;
  rating: number;
}

export interface MentorProfile {
  id: number;
  user_id: number;
  title: string;
  bio: string;
  skills: string;
  expertise_domain: string;
  education?: string;
  years_of_experience: number;
  linkedin_url?: string;
  portfolio_url?: string;
  languages: string;
  meeting_preference: 'online' | 'in-person' | 'both';
  available_days: string;
  available_times: string;
  is_published: boolean;
  rating: number;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface MentorshipRequest {
  id: number;
  student_id: number;
  mentor_id: number;
  learning_goals: string;
  message: string;
  preferred_times: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  mentor_response?: string;
  alternative_times?: string;
  created_at: string;
  updated_at: string;
  student: User;
  mentor: User;
  conversation_id?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  mentorship_request_id: number;
  student: User;
  mentor: User;
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

export interface SessionItem {
  id: number;
  mentorship_request_id?: number;
  student_id: number;
  mentor_id: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_method: 'online' | 'in-person';
  meeting_link_or_location: string;
  status: 'proposed' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
  notes?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  student: User;
  mentor: User;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface AITrendItem {
  id: number;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  category: string;
  published_at: string;
  retrieved_at: string;
  tags?: string;
}

export interface AIToolItem {
  id: number;
  name: string;
  description: string;
  category: string;
  use_cases: string;
  website_url: string;
  pricing_model: string;
  pricing_details?: string;
  verified_at: string;
}

export interface AITrendsStatus {
  last_successful_refresh: string | null;
  next_scheduled_refresh: string | null;
  items_retrieved_count: number;
  freshness: 'fresh' | 'cached' | 'stale';
  status_message: string;
  source_health: Record<string, string>;
  total_trends: number;
  total_tools: number;
}

const TOKEN_KEY = 'skillsphere_auth_token';

export const api = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = api.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch {
        // empty
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  // Auth
  async register(data: { email: string; password: string; full_name: string; role: string; learning_goal?: string; target_role?: string; skill_level?: string }) {
    const res = await api.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      api.setToken(res.access_token);
    }
    return res;
  },

  async login(email: string, password: string) {
    const res = await api.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      api.setToken(res.access_token);
    }
    return res;
  },

  async getMe(): Promise<User> {
    return api.fetch('/api/auth/me');
  },

  async updateMe(data: Partial<User>): Promise<User> {
    return api.fetch('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async logout() {
    api.clearToken();
    try {
      await api.fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
  },

  // Mentors
  async getMentors(params: { q?: string; domain?: string; language?: string; meeting_preference?: string; min_experience?: number; available_day?: string } = {}): Promise<MentorDirectoryItem[]> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.domain && params.domain !== 'all') query.set('domain', params.domain);
    if (params.language && params.language !== 'all') query.set('language', params.language);
    if (params.meeting_preference && params.meeting_preference !== 'all') query.set('meeting_preference', params.meeting_preference);
    if (params.min_experience) query.set('min_experience', String(params.min_experience));
    if (params.available_day && params.available_day !== 'all') query.set('available_day', params.available_day);

    const qs = query.toString();
    return api.fetch(`/api/mentors${qs ? `?${qs}` : ''}`);
  },

  async getMentor(id: number): Promise<MentorDirectoryItem> {
    return api.fetch(`/api/mentors/${id}`);
  },

  async getMyMentorProfile(): Promise<MentorProfile> {
    return api.fetch('/api/mentors/profile/me');
  },

  async updateMyMentorProfile(data: Partial<MentorProfile>): Promise<MentorProfile> {
    return api.fetch('/api/mentors/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Mentorship Requests
  async createRequest(data: { mentor_id: number; learning_goals: string; message: string; preferred_times: string }): Promise<MentorshipRequest> {
    return api.fetch('/api/mentorship-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRequests(roleView?: 'student' | 'mentor', statusFilter?: string): Promise<MentorshipRequest[]> {
    const query = new URLSearchParams();
    if (roleView) query.set('role_view', roleView);
    if (statusFilter && statusFilter !== 'all') query.set('status_filter', statusFilter);
    const qs = query.toString();
    return api.fetch(`/api/mentorship-requests${qs ? `?${qs}` : ''}`);
  },

  async updateRequest(id: number, data: { status: string; mentor_response?: string; alternative_times?: string }): Promise<MentorshipRequest> {
    return api.fetch(`/api/mentorship-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Conversations & Messages
  async getConversations(): Promise<Conversation[]> {
    return api.fetch('/api/conversations');
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    return api.fetch(`/api/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: number, content: string): Promise<Message> {
    return api.fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Sessions
  async getSessions(statusFilter?: string): Promise<SessionItem[]> {
    const qs = statusFilter && statusFilter !== 'all' ? `?status_filter=${statusFilter}` : '';
    return api.fetch(`/api/sessions${qs}`);
  },

  async createSession(data: {
    student_id: number;
    mentor_id: number;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_method: 'online' | 'in-person';
    meeting_link_or_location: string;
    notes?: string;
  }): Promise<SessionItem> {
    return api.fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSession(id: number, data: Partial<SessionItem>): Promise<SessionItem> {
    return api.fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return api.fetch('/api/notifications');
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    return api.fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return api.fetch('/api/notifications/read-all', { method: 'POST' });
  },

  // AI & Health
  async checkHealth(): Promise<{ status: string; gemini_configured: boolean }> {
    return api.fetch('/api/health');
  },

  async askAI(data: { message: string; career?: string; level?: string; goal?: string }): Promise<{ reply: string }> {
    return api.fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // AI Trends & Market Feeds
  async getTrends(params: { q?: string; category?: string } = {}): Promise<AITrendItem[]> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    const qs = query.toString();
    return api.fetch(`/api/trends${qs ? `?${qs}` : ''}`);
  },

  async getTools(params: { q?: string; category?: string; pricing_model?: string } = {}): Promise<AIToolItem[]> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.pricing_model && params.pricing_model !== 'all') query.set('pricing_model', params.pricing_model);
    const qs = query.toString();
    return api.fetch(`/api/trends/tools${qs ? `?${qs}` : ''}`);
  },

  async getTrendsStatus(): Promise<AITrendsStatus> {
    return api.fetch('/api/trends/status');
  },

  async refreshTrends(force = false): Promise<{ refreshed: boolean; new_items_added: number; total_trends: number }> {
    return api.fetch(`/api/trends/refresh${force ? '?force=true' : ''}`, {
      method: 'POST',
    });
  },
};
