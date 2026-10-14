import React, { useState, useEffect, useRef } from 'react';
import {
  api,
  User,
  MentorDirectoryItem,
  MentorProfile,
  MentorshipRequest,
  Conversation,
  Message,
  SessionItem,
  NotificationItem,
  AITrendItem,
  AIToolItem,
  AITrendsStatus,
} from './api';

// Initial local study data preserved from existing app
interface StudyTask {
  id: number;
  title: string;
  meta: string;
  done: boolean;
}

interface ResourceItem {
  id: number;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: number;
  format: string;
  url: string;
  description: string;
  updated: string;
  icon: string;
}

interface Milestone {
  id: number;
  title: string;
  desc: string;
  done: boolean;
  skills: string[];
}

interface ProjectItem {
  id: number;
  title: string;
  desc: string;
  icon: string;
  level: string;
  status: string;
  skills: string;
}

const initialTasks: StudyTask[] = [
  { id: 1, title: 'Study Python fundamentals', meta: 'Learning · 30 min', done: false },
  { id: 2, title: 'Practice NumPy array operations', meta: 'Practice · 25 min', done: false },
  { id: 3, title: 'Write notes on supervised learning', meta: 'Review · 15 min', done: false },
  { id: 4, title: 'Spend 20 minutes on a portfolio project', meta: 'Project · 20 min', done: false },
];

const initialResources: ResourceItem[] = [
  { id: 1, title: 'Python Tutorial', provider: 'Python Software Foundation', category: 'Python', level: 'Beginner', duration: 120, format: 'Documentation', url: 'https://docs.python.org/3/tutorial/', description: 'Official language tutorial and reference.', updated: 'Verified', icon: '🐍' },
  { id: 2, title: 'NumPy Quickstart', provider: 'NumPy', category: 'Math & Data', level: 'Beginner', duration: 45, format: 'Documentation', url: 'https://numpy.org/doc/stable/user/quickstart.html', description: 'Arrays, indexing, operations and core concepts.', updated: 'Verified', icon: '🔢' },
  { id: 3, title: 'Machine Learning Crash Course', provider: 'Google', category: 'Machine Learning', level: 'Beginner', duration: 600, format: 'Course', url: 'https://developers.google.com/machine-learning/crash-course', description: 'Practical lessons, interactive visualizations and exercises.', updated: 'Verified', icon: '🧠' },
  { id: 4, title: 'Scikit-learn User Guide', provider: 'scikit-learn', category: 'Machine Learning', level: 'Intermediate', duration: 180, format: 'Documentation', url: 'https://scikit-learn.org/stable/user_guide.html', description: 'Model selection, preprocessing, pipelines and evaluation.', updated: 'Verified', icon: '📈' },
  { id: 5, title: 'Hugging Face Learn', provider: 'Hugging Face', category: 'Generative AI', level: 'Intermediate', duration: 300, format: 'Course', url: 'https://huggingface.co/learn', description: 'Explore NLP, transformers, agents and open models.', updated: 'Verified', icon: '🤗' },
  { id: 6, title: 'Google AI for Developers', provider: 'Google', category: 'Generative AI', level: 'Beginner', duration: 90, format: 'Documentation', url: 'https://ai.google.dev/gemini-api/docs', description: 'Gemini API guides and examples.', updated: 'Verified', icon: '✨' },
];

const initialMilestones: Milestone[] = [
  { id: 1, title: 'Programming foundations', desc: 'Python syntax, functions, data structures and Git.', done: true, skills: ['Python', 'Git'] },
  { id: 2, title: 'Data handling & math', desc: 'NumPy, pandas, visualization, statistics and linear algebra.', done: false, skills: ['NumPy', 'pandas', 'Statistics'] },
  { id: 3, title: 'Core machine learning', desc: 'Train baseline models, evaluate them and avoid data leakage.', done: false, skills: ['scikit-learn', 'Evaluation'] },
  { id: 4, title: 'Portfolio projects', desc: 'Build, document and publish two end-to-end projects.', done: false, skills: ['Projects', 'GitHub'] },
  { id: 5, title: 'Deep learning & deployment', desc: 'Explore neural networks, APIs, testing and deployment.', done: false, skills: ['PyTorch', 'APIs'] },
  { id: 6, title: 'Career readiness', desc: 'Polish portfolio, practice interviews and apply strategically.', done: false, skills: ['Interviewing', 'Resume'] },
];

const initialProjects: ProjectItem[] = [
  { id: 1, title: 'Student Score Predictor', desc: 'Train and evaluate a simple regression model using a clean dataset.', icon: '📊', level: 'Beginner', status: 'Planned', skills: 'Python · pandas · scikit-learn' },
  { id: 2, title: 'AI Learning Resource Finder', desc: 'Build a searchable resource directory with category and level filters.', icon: '🧭', level: 'Beginner', status: 'In progress', skills: 'HTML · CSS · JavaScript' },
  { id: 3, title: 'Sentiment Analysis Explorer', desc: 'Compare a baseline text classifier and document its limitations.', icon: '💬', level: 'Intermediate', status: 'Planned', skills: 'NLP · Evaluation · Python' },
];

export default function App() {
  // Navigation & UI state
  const [activePage, setActivePage] = useState<'dashboard' | 'learning' | 'planner' | 'roadmap' | 'trends' | 'projects' | 'mentors' | 'assistant'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authRole, setAuthRole] = useState<'student' | 'mentor'>('student');
  const [authError, setAuthError] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Local Study State
  const [tasks, setTasks] = useState<StudyTask[]>(() => {
    try {
      const saved = localStorage.getItem('skillsphere_tasks');
      return saved ? JSON.parse(saved) : initialTasks;
    } catch {
      return initialTasks;
    }
  });
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [xp, setXp] = useState(140);
  const [streak, setStreak] = useState(3);
  const [routineHours, setRoutineHours] = useState(6);
  const [routineTime, setRoutineTime] = useState('Evening');

  // Mentorship Tab & Data State
  const [mentorSubTab, setMentorSubTab] = useState<'browse' | 'requests' | 'conversations' | 'sessions' | 'profile'>('browse');
  const [mentorsList, setMentorsList] = useState<MentorDirectoryItem[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [searchMentorQuery, setSearchMentorQuery] = useState('');
  const [mentorDomainFilter, setMentorDomainFilter] = useState('all');
  const [mentorLangFilter, setMentorLangFilter] = useState('all');
  const [mentorMeetingFilter, setMentorMeetingFilter] = useState('all');

  // Selected Mentor & Request Modal
  const [selectedMentor, setSelectedMentor] = useState<MentorDirectoryItem | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestGoals, setRequestGoals] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestPreferredTimes, setRequestPreferredTimes] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Requests List
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState<MentorshipRequest | null>(null);
  const [responseAction, setResponseAction] = useState<'accepted' | 'rejected'>('accepted');
  const [responseNotes, setResponseNotes] = useState('');

  // Conversations & Chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('1-on-1 Mentorship Kickoff');
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [sessionDuration, setSessionDuration] = useState(45);
  const [sessionMethod, setSessionMethod] = useState<'online' | 'in-person'>('online');
  const [sessionLinkOrLocation, setSessionLinkOrLocation] = useState('https://meet.google.com/skillsphere-mentorship');
  const [sessionPartnerId, setSessionPartnerId] = useState<number | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');

  // Mentor Profile Management (for logged in mentor)
  const [myMentorProfile, setMyMentorProfile] = useState<MentorProfile | null>(null);
  const [mentorTitle, setMentorTitle] = useState('');
  const [mentorBio, setMentorBio] = useState('');
  const [mentorSkills, setMentorSkills] = useState('');
  const [mentorDomain, setMentorDomain] = useState('Machine Learning');
  const [mentorExperience, setMentorExperience] = useState(3);
  const [mentorLanguages, setMentorLanguages] = useState('English');
  const [mentorPref, setMentorPref] = useState<'online' | 'in-person' | 'both'>('online');
  const [mentorDays, setMentorDays] = useState('Mon, Wed, Fri');
  const [mentorTimes, setMentorTimes] = useState('18:00 - 21:00 UTC');
  const [mentorPublished, setMentorPublished] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // AI Study Buddy State
  const [chatHistory, setChatHistory] = useState<{ who: 'ai' | 'user'; text: string }[]>([
    {
      who: 'ai',
      text: 'Hi! Tell me your target AI role, current level, or what you’re stuck on. I can help explain concepts and plan your next steps when Gemini is connected.',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState<boolean | null>(null);

  // AI Trends & Tools State
  const [trendsList, setTrendsList] = useState<AITrendItem[]>([]);
  const [toolsList, setToolsList] = useState<AIToolItem[]>([]);
  const [trendsStatus, setTrendsStatus] = useState<AITrendsStatus | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsRefreshing, setTrendsRefreshing] = useState(false);
  const [trendsViewTab, setTrendsViewTab] = useState<'market' | 'tools'>('market');
  const [trendsCategoryFilter, setTrendsCategoryFilter] = useState('all');
  const [trendsSearchQuery, setTrendsSearchQuery] = useState('');
  const [toolsCategoryFilter, setToolsCategoryFilter] = useState('all');
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [toolsPricingFilter, setToolsPricingFilter] = useState('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check auth on mount
  useEffect(() => {
    async function loadUser() {
      try {
        if (api.getToken()) {
          const user = await api.getMe();
          setCurrentUser(user);
        }
      } catch {
        api.clearToken();
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    loadUser();
  }, []);

  // Save tasks
  useEffect(() => {
    localStorage.setItem('skillsphere_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Fetch notifications periodically
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifs = async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch {
        // silent
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Load Mentors Directory
  const loadMentors = async () => {
    setMentorsLoading(true);
    try {
      const data = await api.getMentors({
        q: searchMentorQuery,
        domain: mentorDomainFilter,
        language: mentorLangFilter,
        meeting_preference: mentorMeetingFilter,
      });
      setMentorsList(data);
    } catch (err: any) {
      showToast('Error loading mentors: ' + err.message);
    } finally {
      setMentorsLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === 'mentors' || activePage === 'dashboard') {
      loadMentors();
    }
  }, [activePage, searchMentorQuery, mentorDomainFilter, mentorLangFilter, mentorMeetingFilter]);

  // Load Requests
  const loadRequests = async () => {
    if (!currentUser) return;
    setRequestsLoading(true);
    try {
      const reqs = await api.getRequests();
      setMentorshipRequests(reqs);
    } catch (err: any) {
      showToast('Failed to load requests: ' + err.message);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (activePage === 'mentors' || activePage === 'dashboard')) {
      loadRequests();
    }
  }, [currentUser, activePage, mentorSubTab]);

  // Load Conversations
  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (currentUser && activePage === 'mentors' && mentorSubTab === 'conversations') {
      loadConversations();
    }
  }, [currentUser, activePage, mentorSubTab]);

  // Load Messages for active conversation with polling
  useEffect(() => {
    if (!currentUser || !activeConversationId) return;
    const fetchMsgs = async () => {
      try {
        const msgs = await api.getMessages(activeConversationId);
        setMessages(msgs);
      } catch {
        // silent
      }
    };
    fetchMsgs();
    const timer = setInterval(fetchMsgs, 3000);
    return () => clearInterval(timer);
  }, [currentUser, activeConversationId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load Sessions
  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const sess = await api.getSessions();
      setSessions(sess);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (currentUser && (activePage === 'mentors' || activePage === 'dashboard')) {
      loadSessions();
    }
  }, [currentUser, activePage, mentorSubTab]);

  // Load Mentor Profile if user is mentor
  const loadMentorProfile = async () => {
    if (currentUser?.role === 'mentor') {
      try {
        const p = await api.getMyMentorProfile();
        setMyMentorProfile(p);
        setMentorTitle(p.title);
        setMentorBio(p.bio);
        setMentorSkills(p.skills);
        setMentorDomain(p.expertise_domain);
        setMentorExperience(p.years_of_experience);
        setMentorLanguages(p.languages);
        setMentorPref(p.meeting_preference);
        setMentorDays(p.available_days);
        setMentorTimes(p.available_times);
        setMentorPublished(p.is_published);
      } catch {
        // silent
      }
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'mentor') {
      loadMentorProfile();
    }
  }, [currentUser]);

  // Load AI Trends & Market Feeds
  const loadTrends = async () => {
    setTrendsLoading(true);
    try {
      const [items, status] = await Promise.all([
        api.getTrends({ q: trendsSearchQuery, category: trendsCategoryFilter }),
        api.getTrendsStatus(),
      ]);
      setTrendsList(items);
      setTrendsStatus(status);
    } catch (err: any) {
      showToast('Error loading AI trends: ' + err.message);
    } finally {
      setTrendsLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const items = await api.getTools({
        q: toolsSearchQuery,
        category: toolsCategoryFilter,
        pricing_model: toolsPricingFilter,
      });
      setToolsList(items);
    } catch (err: any) {
      showToast('Error loading AI tools: ' + err.message);
    }
  };

  const handleManualTrendsRefresh = async () => {
    setTrendsRefreshing(true);
    try {
      const res = await api.refreshTrends(true);
      showToast(`Refreshed! ${res.new_items_added} new developments retrieved.`);
      await loadTrends();
    } catch (err: any) {
      showToast('Refresh error: ' + err.message);
    } finally {
      setTrendsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activePage === 'trends') {
      loadTrends();
      loadTools();
    }
  }, [activePage, trendsSearchQuery, trendsCategoryFilter, toolsSearchQuery, toolsCategoryFilter, toolsPricingFilter]);

  // Check Gemini status
  const checkAI = async () => {
    try {
      const res = await api.checkHealth();
      setGeminiConnected(res.gemini_configured);
    } catch {
      setGeminiConnected(false);
    }
  };

  useEffect(() => {
    if (activePage === 'assistant') {
      checkAI();
    }
  }, [activePage]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await api.login(authEmail, authPassword);
        setCurrentUser(res.user);
        showToast(`Welcome back, ${res.user.full_name}!`);
      } else {
        const res = await api.register({
          email: authEmail,
          password: authPassword,
          full_name: authFullName,
          role: authRole,
          target_role: 'AI / ML Engineer',
          skill_level: 'Beginner',
        });
        setCurrentUser(res.user);
        showToast(`Account created as ${authRole}! Welcome to SkillSphere.`);
      }
      setAuthModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
      loadRequests();
      loadSessions();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  // Quick Demo Login Helper for Testing
  const quickLogin = async (email: string, pass: string) => {
    setAuthError('');
    try {
      const res = await api.login(email, pass);
      setCurrentUser(res.user);
      showToast(`Logged in as ${res.user.full_name} (${res.user.role})`);
      setAuthModalOpen(false);
      loadRequests();
      loadSessions();
    } catch (err: any) {
      setAuthError('Demo login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setConversations([]);
    setMentorshipRequests([]);
    setSessions([]);
    showToast('Logged out successfully');
  };

  // Mentorship Request Submit
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    if (!selectedMentor) return;
    setRequestSubmitting(true);
    try {
      await api.createRequest({
        mentor_id: selectedMentor.user_id,
        learning_goals: requestGoals,
        message: requestMessage,
        preferred_times: requestPreferredTimes,
      });
      showToast('Mentorship request sent successfully!');
      setRequestModalOpen(false);
      setRequestGoals('');
      setRequestMessage('');
      setRequestPreferredTimes('');
      loadRequests();
      setMentorSubTab('requests');
    } catch (err: any) {
      showToast('Failed to submit request: ' + err.message);
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Update Request Status (Accept / Reject / Cancel)
  const handleUpdateStatus = async (requestId: number, newStatus: string, responseNote?: string) => {
    try {
      await api.updateRequest(requestId, {
        status: newStatus,
        mentor_response: responseNote,
      });
      showToast(`Request ${newStatus}!`);
      setResponseModalOpen(false);
      setRespondingRequest(null);
      loadRequests();
      loadConversations();
    } catch (err: any) {
      showToast('Action failed: ' + err.message);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !newMessageText.trim()) return;
    setSendingMessage(true);
    try {
      const sent = await api.sendMessage(activeConversationId, newMessageText.trim());
      setMessages((prev) => [...prev, sent]);
      setNewMessageText('');
      loadConversations();
    } catch (err: any) {
      showToast('Failed to send message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // Schedule Session Submit
  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !sessionPartnerId) return;

    const studentId = currentUser.role === 'student' ? currentUser.id : sessionPartnerId;
    const mentorId = currentUser.role === 'mentor' ? currentUser.id : sessionPartnerId;

    try {
      await api.createSession({
        student_id: studentId,
        mentor_id: mentorId,
        title: sessionTitle,
        scheduled_at: sessionDateTime,
        duration_minutes: Number(sessionDuration),
        meeting_method: sessionMethod,
        meeting_link_or_location: sessionLinkOrLocation,
        notes: sessionNotes,
      });
      showToast('Session scheduled successfully!');
      setSessionModalOpen(false);
      loadSessions();
    } catch (err: any) {
      showToast('Failed to schedule session: ' + err.message);
    }
  };

  // Save Mentor Profile
  const handleSaveMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateMyMentorProfile({
        title: mentorTitle,
        bio: mentorBio,
        skills: mentorSkills,
        expertise_domain: mentorDomain,
        years_of_experience: Number(mentorExperience),
        languages: mentorLanguages,
        meeting_preference: mentorPref,
        available_days: mentorDays,
        available_times: mentorTimes,
        is_published: mentorPublished,
      });
      setMyMentorProfile(updated);
      showToast('Mentor profile saved and updated!');
      loadMentors();
    } catch (err: any) {
      showToast('Save failed: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // AI Study Buddy Send
  const handleAISend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const userPrompt = aiInput.trim();
    setAiInput('');
    setChatHistory((prev) => [...prev, { who: 'user', text: userPrompt }]);
    setAiThinking(true);
    try {
      const res = await api.askAI({
        message: userPrompt,
        career: currentUser?.target_role || 'AI / ML Engineer',
        level: currentUser?.skill_level || 'Beginner',
        goal: currentUser?.learning_goal || 'Build AI projects',
      });
      setChatHistory((prev) => [...prev, { who: 'ai', text: res.reply }]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          who: 'ai',
          text:
            'Gemini is not available right now: ' +
            err.message +
            '\n\nVerify that GEMINI_API_KEY is configured in your server environment.',
        },
      ]);
    } finally {
      setAiThinking(false);
      checkAI();
    }
  };

  // Calculation for Overview Stats
  const completedTasksCount = tasks.filter((t) => t.done).length;
  const progressPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const completedMilestones = milestones.filter((m) => m.done).length;
  const roadmapPct = Math.round((completedMilestones / Math.max(milestones.length, 1)) * 100);
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#17233b] flex">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-[#e5eaf3] p-5 fixed md:sticky top-0 h-screen flex flex-col gap-6 z-20 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-2 font-black text-xl tracking-tight">
          <div className="grid place-items-center w-10 h-10 rounded-2xl text-white bg-gradient-to-br from-[#5d5fe8] to-[#8b72f7] shadow-lg shadow-[#5b5ce233]">
            ✦
          </div>
          <div>
            SkillSphere AI
            <small className="block text-[10px] text-[#71809b] font-bold tracking-widest uppercase">
              LEARN WITH DIRECTION
            </small>
          </div>
        </div>

        <div>
          <div className="px-3 text-[#9aa5b8] text-[10px] font-extrabold tracking-widest uppercase mb-2">
            Workspace
          </div>
          <nav className="grid gap-1">
            <button
              onClick={() => {
                setActivePage('dashboard');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'dashboard' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">▦</span>Overview
            </button>
            <button
              onClick={() => {
                setActivePage('learning');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'learning' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">▤</span>Learning hub
            </button>
            <button
              onClick={() => {
                setActivePage('planner');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'planner' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">◷</span>Study planner
            </button>
            <button
              onClick={() => {
                setActivePage('roadmap');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'roadmap' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">⌁</span>Career roadmap
            </button>
            <button
              onClick={() => {
                setActivePage('trends');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'trends' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">↗</span>AI trends
            </button>
            <button
              onClick={() => {
                setActivePage('projects');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'projects' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">⌘</span>Project studio
            </button>
            <button
              onClick={() => {
                setActivePage('mentors');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center justify-between text-sm font-semibold transition ${
                activePage === 'mentors' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-base">♧</span>Mentorship
              </div>
              {mentorshipRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="bg-[#5b5ce2] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {mentorshipRequests.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActivePage('assistant');
                setSidebarOpen(false);
              }}
              className={`w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold transition ${
                activePage === 'assistant' ? 'bg-[#f0f0ff] text-[#5b5ce2]' : 'text-[#6b7890] hover:bg-[#f8f9fd]'
              }`}
            >
              <span className="w-5 text-center text-base">✧</span>AI study buddy
            </button>
          </nav>
        </div>

        <div>
          <div className="px-3 text-[#9aa5b8] text-[10px] font-extrabold tracking-widest uppercase mb-2">
            Account & Session
          </div>
          <nav className="grid gap-1">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setActivePage('mentors');
                    if (currentUser.role === 'mentor') setMentorSubTab('profile');
                    setSidebarOpen(false);
                  }}
                  className="w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold text-[#6b7890] hover:bg-[#f8f9fd]"
                >
                  <span className="w-5 text-center text-base">◉</span>
                  {currentUser.role === 'mentor' ? 'Mentor Profile' : 'My Student Profile'}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <span className="w-5 text-center text-base">↪</span>Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full text-left rounded-xl py-2.5 px-3 flex items-center gap-3 text-sm font-bold text-[#5b5ce2] bg-[#f0f0ff]"
              >
                <span className="w-5 text-center text-base">🔐</span>Sign in / Register
              </button>
            )}
          </nav>
        </div>

        <div className="mt-auto bg-[#f6f5ff] border border-[#e7e4ff] rounded-2xl p-4">
          <b className="text-xs font-bold text-[#17233b]">🚀 Keep your momentum</b>
          <p className="text-[#71809b] text-xs mt-1.5 mb-3">
            Real mentorship and daily steps build career-ready skills.
          </p>
          <button
            onClick={() => setActivePage('mentors')}
            className="w-full bg-[#5b5ce2] text-white text-xs font-bold py-2 rounded-xl shadow-md shadow-[#5b5ce233] hover:bg-[#4849ce]"
          >
            Find a mentor →
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-[76px] bg-white/80 backdrop-blur-md border-b border-[#e5eaf3] flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl border border-[#e5eaf3] text-gray-700 hover:bg-gray-50"
            >
              ☰
            </button>
            <div className="flex items-center gap-2.5 bg-[#f7f8fc] border border-[#e5eaf3] px-3 py-2 rounded-xl text-sm text-[#71809b] w-48 md:w-80">
              <span>⌕</span>
              <input
                placeholder="Search mentors, skills, courses..."
                value={searchMentorQuery}
                onChange={(e) => setSearchMentorQuery(e.target.value)}
                className="bg-transparent border-0 outline-none w-full text-[#17233b] placeholder-[#71809b]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl border border-[#e5eaf3] hover:bg-[#f7f8fc] text-lg text-gray-700"
              >
                🔔
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e5eaf3] rounded-2xl shadow-xl p-3 z-30">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <b className="text-xs font-bold">Notifications</b>
                    <button
                      onClick={() => {
                        api.markAllNotificationsRead();
                        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      }}
                      className="text-[11px] text-[#5b5ce2] font-semibold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs transition ${
                            n.is_read ? 'bg-gray-50 text-gray-600' : 'bg-indigo-50/70 border border-indigo-100 text-[#17233b] font-medium'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill or Login Button */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <strong className="block text-xs font-bold text-[#17233b]">{currentUser.full_name}</strong>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-[#5b5ce2]">
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#e9e8ff] text-[#5b5ce2] font-black grid place-items-center border border-indigo-200">
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-[#5b5ce22a] hover:bg-[#4849ce]"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="max-w-[1400px] mx-auto p-6 md:p-8">
          {/* ======================= 1. DASHBOARD PAGE ======================= */}
          {activePage === 'dashboard' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    Your Learning & Mentorship Space
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Build skills with real mentor guidance.
                  </h1>
                  <p className="text-[#71809b] text-sm">
                    {currentUser
                      ? `Logged in as ${currentUser.full_name} (${currentUser.role}). Connect with mentors and advance your career.`
                      : 'Explore curated learning resources, track tasks, and connect with verified mentors.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePage('mentors')}
                    className="bg-[#5b5ce2] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-[#5b5ce22a] hover:bg-[#4849ce] flex items-center gap-2"
                  >
                    ✦ Browse Mentors
                  </button>
                  {!currentUser && (
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="bg-white border border-[#e5eaf3] text-[#52617a] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-gray-50"
                    >
                      Sign In to Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-[#eceeff] via-[#f6f3ff] to-[#e6f8f5] border border-[#e2e5ff] rounded-2xl p-6 md:p-7 mb-6 flex items-center justify-between gap-6 relative overflow-hidden">
                <div className="max-w-xl z-10">
                  <span className="inline-block bg-[#eaf0ff] text-[#4e5bd3] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase mb-2">
                    ACTIVE MENTORSHIP ECOSYSTEM
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-[#17233b] mb-2">
                    Turn your curiosity into a recognized career.
                  </h2>
                  <p className="text-[#65728b] text-xs leading-relaxed mb-4">
                    Follow an actionable study plan, request 1-on-1 mentorship sessions with verified engineers, and receive real feedback on portfolio projects.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setActivePage('mentors');
                        setMentorSubTab('browse');
                      }}
                      className="bg-[#5b5ce2] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md hover:bg-[#4849ce]"
                    >
                      Explore Verified Mentors →
                    </button>
                    <button
                      onClick={() => setActivePage('planner')}
                      className="bg-white/80 border border-[#d2d6f0] text-[#42506e] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-white"
                    >
                      Open Study Planner
                    </button>
                  </div>
                </div>
                <div className="hidden lg:grid place-items-center w-32 h-32 rounded-3xl bg-gradient-to-br from-[#6968ed] to-[#a18bff] text-white text-5xl shadow-xl shadow-[#6564e933] rotate-6">
                  ✧
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm">
                  <div className="text-[#71809b] text-xs font-semibold">Weekly Study Progress</div>
                  <div className="text-2xl font-black tracking-tight text-[#17233b] mt-1">{progressPct}%</div>
                  <div className="text-[#17835d] text-[11px] mt-1">Across active tasks</div>
                </div>
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm">
                  <div className="text-[#71809b] text-xs font-semibold">Study Streak</div>
                  <div className="text-2xl font-black tracking-tight text-[#17233b] mt-1">{streak} days</div>
                  <div className="text-[#17835d] text-[11px] mt-1">Consistency over intensity</div>
                </div>
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm">
                  <div className="text-[#71809b] text-xs font-semibold">Active Mentorships</div>
                  <div className="text-2xl font-black tracking-tight text-[#17233b] mt-1">
                    {mentorshipRequests.filter((r) => r.status === 'accepted').length}
                  </div>
                  <div className="text-[#5b5ce2] text-[11px] mt-1">
                    {currentUser?.role === 'mentor' ? 'Active mentees' : 'Accepted mentors'}
                  </div>
                </div>
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm">
                  <div className="text-[#71809b] text-xs font-semibold">Scheduled Sessions</div>
                  <div className="text-2xl font-black tracking-tight text-[#17233b] mt-1">
                    {sessions.filter((s) => s.status === 'confirmed').length}
                  </div>
                  <div className="text-[#5b5ce2] text-[11px] mt-1">Upcoming meetings</div>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Mentorship Quick Snapshot */}
                <div className="lg:col-span-2 bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#17233b]">Mentorship Quick Hub</h2>
                    <button
                      onClick={() => setActivePage('mentors')}
                      className="text-xs font-bold text-[#5b5ce2] hover:underline"
                    >
                      Open Mentorship Center →
                    </button>
                  </div>

                  {currentUser ? (
                    <div className="space-y-3">
                      {mentorshipRequests.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-sm font-semibold text-gray-700">No active mentorship requests yet</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Browse verified mentors and submit your first learning goals request.
                          </p>
                          <button
                            onClick={() => {
                              setActivePage('mentors');
                              setMentorSubTab('browse');
                            }}
                            className="mt-3 bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl"
                          >
                            Find Mentors
                          </button>
                        </div>
                      ) : (
                        mentorshipRequests.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-xl border border-gray-100 bg-[#fbfbfe] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#5b5ce2] font-black grid place-items-center">
                                {currentUser.role === 'mentor'
                                  ? r.student.full_name.charAt(0)
                                  : r.mentor.full_name.charAt(0)}
                              </div>
                              <div>
                                <b className="text-xs text-[#17233b]">
                                  {currentUser.role === 'mentor' ? r.student.full_name : r.mentor.full_name}
                                </b>
                                <p className="text-[11px] text-gray-500 line-clamp-1">{r.learning_goals}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  r.status === 'accepted'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {r.status.toUpperCase()}
                              </span>
                              {r.status === 'accepted' && (
                                <button
                                  onClick={() => {
                                    setActivePage('mentors');
                                    setMentorSubTab('conversations');
                                  }}
                                  className="text-xs font-bold text-[#5b5ce2] bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100"
                                >
                                  Chat
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-[#f9fafc] rounded-xl border border-[#e5eaf3]">
                      <p className="text-sm font-semibold text-[#17233b]">Sign in to access real mentorship</p>
                      <p className="text-xs text-[#71809b] mt-1 mb-3">
                        Connect with industry experts, schedule 1-on-1 calls, and exchange private messages.
                      </p>
                      <button
                        onClick={() => setAuthModalOpen(true)}
                        className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl"
                      >
                        Sign in / Create Account
                      </button>
                    </div>
                  )}
                </div>

                {/* Career Path Snapshot */}
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#17233b]">Career Snapshot</h2>
                    <button onClick={() => setActivePage('roadmap')} className="text-xs font-bold text-[#5b5ce2]">
                      Full Roadmap →
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#5b5ce2] text-xl grid place-items-center font-bold">
                      ⌘
                    </div>
                    <div>
                      <b className="text-sm text-[#17233b]">{currentUser?.target_role || 'AI / ML Engineer'}</b>
                      <div className="text-xs text-[#71809b]">
                        {currentUser?.skill_level || 'Beginner'} · Personalized starter path
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-[#5b5ce2] to-[#9a83ff]" style={{ width: `${roadmapPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-4">
                    <span>Milestones completed</span>
                    <b>{roadmapPct}%</b>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs">
                    💡 Tip: Mentors can review your projects and mark advanced roadmap milestones complete.
                  </div>
                </div>
              </div>

              {/* Today's Focus Checklist */}
              <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#17233b]">Today's Focus</h2>
                  <button onClick={() => setActivePage('planner')} className="text-xs font-bold text-[#5b5ce2]">
                    Open Study Planner →
                  </button>
                </div>
                <div className="space-y-2">
                  {tasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => {
                            setTasks((prev) =>
                              prev.map((item) => (item.id === t.id ? { ...item, done: !item.done } : item))
                            );
                            setXp((prev) => (t.done ? Math.max(0, prev - 20) : prev + 20));
                            showToast(t.done ? 'Task marked incomplete' : 'Task completed · +20 XP');
                          }}
                          className="w-4 h-4 accent-[#5b5ce2] cursor-pointer"
                        />
                        <div className={t.done ? 'line-through text-gray-400' : 'text-sm font-semibold'}>
                          {t.title}
                          <span className="block text-[11px] text-gray-400 font-normal">{t.meta}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.done ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {t.done ? 'Done' : 'To do'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================= 2. MENTORSHIP PAGE ======================= */}
          {activePage === 'mentors' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    Real Mentorship Network
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Mentorship Platform
                  </h1>
                  <p className="text-[#71809b] text-sm">
                    Search verified mentor profiles, submit requests, exchange real messages, and schedule 1-on-1 sessions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!currentUser ? (
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-[#4849ce]"
                    >
                      Sign In / Register
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold">
                        Logged in as: {currentUser.full_name} ({currentUser.role})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub navigation tabs */}
              <div className="flex border-b border-[#e5eaf3] mb-6 overflow-x-auto gap-2">
                <button
                  onClick={() => setMentorSubTab('browse')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                    mentorSubTab === 'browse'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🔍 Browse Mentors ({mentorsList.length})
                </button>
                <button
                  onClick={() => {
                    if (!currentUser) setAuthModalOpen(true);
                    else setMentorSubTab('requests');
                  }}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                    mentorSubTab === 'requests'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📩 {currentUser?.role === 'mentor' ? 'Incoming Requests' : 'My Requests'}
                  {mentorshipRequests.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                      {mentorshipRequests.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!currentUser) setAuthModalOpen(true);
                    else setMentorSubTab('conversations');
                  }}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                    mentorSubTab === 'conversations'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  💬 Messages & Chat
                  {conversations.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                      {conversations.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!currentUser) setAuthModalOpen(true);
                    else setMentorSubTab('sessions');
                  }}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                    mentorSubTab === 'sessions'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📅 Scheduled Sessions
                  {sessions.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                      {sessions.length}
                    </span>
                  )}
                </button>
                {currentUser?.role === 'mentor' && (
                  <button
                    onClick={() => setMentorSubTab('profile')}
                    className={`pb-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                      mentorSubTab === 'profile'
                        ? 'border-[#5b5ce2] text-[#5b5ce2]'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    ⚙️ Mentor Profile Studio
                  </button>
                )}
              </div>

              {/* TAB 1: BROWSE MENTORS */}
              {mentorSubTab === 'browse' && (
                <div>
                  {/* Search and Filters */}
                  <div className="bg-white border border-[#e5eaf3] rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 items-center">
                    <input
                      placeholder="Search mentor by name, title, or skills..."
                      value={searchMentorQuery}
                      onChange={(e) => setSearchMentorQuery(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3.5 py-2 text-xs flex-1 min-w-[200px] outline-none focus:border-[#5b5ce2]"
                    />
                    <select
                      value={mentorDomainFilter}
                      onChange={(e) => setMentorDomainFilter(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
                    >
                      <option value="all">All Domains</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Generative AI">Generative AI</option>
                      <option value="Deep Learning">Deep Learning</option>
                    </select>
                    <select
                      value={mentorMeetingFilter}
                      onChange={(e) => setMentorMeetingFilter(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
                    >
                      <option value="all">All Formats</option>
                      <option value="online">Online only</option>
                      <option value="in-person">In-person</option>
                      <option value="both">Both</option>
                    </select>
                    <button
                      onClick={loadMentors}
                      className="bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-2 rounded-xl text-gray-700"
                    >
                      Refresh ↻
                    </button>
                  </div>

                  {mentorsLoading ? (
                    <div className="p-12 text-center text-gray-400">Loading mentors directory...</div>
                  ) : mentorsList.length === 0 ? (
                    <div className="bg-white border border-[#e5eaf3] rounded-2xl p-12 text-center">
                      <p className="text-base font-bold text-gray-700">No mentors match your criteria</p>
                      <p className="text-xs text-gray-400 mt-1">Try clearing filters or search terms.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mentorsList.map((mentor) => (
                        <div
                          key={mentor.id}
                          className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-[#b4b5ff] transition"
                        >
                          <div>
                            <div className="flex items-start gap-4 mb-3">
                              <img
                                src={mentor.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${mentor.full_name}`}
                                alt={mentor.full_name}
                                className="w-16 h-16 rounded-2xl object-cover border border-indigo-100"
                              />
                              <div>
                                <h3 className="text-base font-extrabold text-[#17233b]">{mentor.full_name}</h3>
                                <p className="text-xs text-indigo-600 font-semibold line-clamp-1">{mentor.title}</p>
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold mt-1">
                                  <span>★ {mentor.rating.toFixed(2)}</span>
                                  <span className="text-gray-400 font-normal">· {mentor.years_of_experience} yrs exp</span>
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-4">{mentor.bio}</p>

                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {mentor.skills
                                .split(',')
                                .slice(0, 4)
                                .map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md"
                                  >
                                    {s.trim()}
                                  </span>
                                ))}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-2.5 text-[11px] text-gray-600 space-y-1 mb-4">
                              <div>
                                <span className="font-semibold text-gray-700">Availability:</span> {mentor.available_days}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Time window:</span> {mentor.available_times}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Format:</span>{' '}
                                <span className="capitalize">{mentor.meeting_preference}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                              onClick={() => {
                                setSelectedMentor(mentor);
                                setProfileModalOpen(true);
                              }}
                              className="w-full bg-white border border-[#e5eaf3] text-[#52617a] text-xs font-bold py-2 rounded-xl hover:bg-gray-50"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => {
                                if (!currentUser) {
                                  setAuthModalOpen(true);
                                  return;
                                }
                                setSelectedMentor(mentor);
                                setRequestModalOpen(true);
                              }}
                              className="w-full bg-[#5b5ce2] text-white text-xs font-bold py-2 rounded-xl shadow-md hover:bg-[#4849ce]"
                            >
                              Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REQUESTS WORKFLOW */}
              {mentorSubTab === 'requests' && (
                <div>
                  <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-base font-bold text-[#17233b]">
                          {currentUser?.role === 'mentor' ? 'Incoming Mentorship Requests' : 'Your Sent Requests'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {currentUser?.role === 'mentor'
                            ? 'Review student goals, accept or propose alternative timings.'
                            : 'Track the status of your requests and start conversations when approved.'}
                        </p>
                      </div>
                      <button
                        onClick={loadRequests}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl font-bold text-gray-700"
                      >
                        Refresh ↻
                      </button>
                    </div>

                    {requestsLoading ? (
                      <div className="p-8 text-center text-gray-400">Loading requests...</div>
                    ) : mentorshipRequests.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm font-semibold text-gray-600">No mentorship requests found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {currentUser?.role === 'mentor'
                            ? 'You will receive requests here when students browse your profile.'
                            : 'Browse mentors and submit a request to get started.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mentorshipRequests.map((r) => {
                          const isStudent = currentUser?.id === r.student_id;
                          const isMentor = currentUser?.id === r.mentor_id;

                          return (
                            <div
                              key={r.id}
                              className="border border-[#e5eaf3] rounded-2xl p-5 bg-[#fafbfe] hover:border-indigo-200 transition"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black grid place-items-center text-lg">
                                    {(isStudent ? r.mentor.full_name : r.student.full_name).charAt(0)}
                                  </div>
                                  <div>
                                    <b className="text-sm text-[#17233b]">
                                      {isStudent ? `Mentor: ${r.mentor.full_name}` : `Student: ${r.student.full_name}`}
                                    </b>
                                    <div className="text-[11px] text-gray-500">
                                      Requested on {new Date(r.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center ${
                                    r.status === 'accepted'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : r.status === 'pending'
                                      ? 'bg-amber-100 text-amber-800'
                                      : r.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-gray-100 mb-3">
                                <div>
                                  <span className="font-bold text-gray-700 block mb-0.5">Learning Goals:</span>
                                  <p className="text-gray-600">{r.learning_goals}</p>
                                </div>
                                <div>
                                  <span className="font-bold text-gray-700 block mb-0.5">Preferred Times:</span>
                                  <p className="text-gray-600">{r.preferred_times}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="font-bold text-gray-700 block mb-0.5">Intro Message:</span>
                                  <p className="text-gray-600 italic">"{r.message}"</p>
                                </div>
                                {r.mentor_response && (
                                  <div className="md:col-span-2 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                                    <span className="font-bold text-indigo-900 block mb-0.5">Mentor Response:</span>
                                    <p className="text-indigo-800">{r.mentor_response}</p>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                                {isMentor && r.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setRespondingRequest(r);
                                        setResponseAction('rejected');
                                        setResponseNotes('');
                                        setResponseModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRespondingRequest(r);
                                        setResponseAction('accepted');
                                        setResponseNotes('Excited to work together!');
                                        setResponseModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-xl shadow-sm"
                                    >
                                      Accept Request
                                    </button>
                                  </>
                                )}

                                {isStudent && r.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                    className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl"
                                  >
                                    Cancel Request
                                  </button>
                                )}

                                {r.status === 'accepted' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setMentorSubTab('conversations');
                                        if (r.conversation_id) setActiveConversationId(r.conversation_id);
                                      }}
                                      className="text-xs font-bold text-[#5b5ce2] bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl"
                                    >
                                      Open Chat 💬
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSessionPartnerId(isStudent ? r.mentor_id : r.student_id);
                                        setSessionDateTime(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16));
                                        setSessionModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-white bg-[#5b5ce2] hover:bg-[#4849ce] px-3.5 py-1.5 rounded-xl shadow-sm"
                                    >
                                      Schedule Session 📅
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CONVERSATIONS & CHAT */}
              {mentorSubTab === 'conversations' && (
                <div className="bg-white border border-[#e5eaf3] rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">
                  {/* Conversations Sidebar */}
                  <div className="border-r border-[#e5eaf3] p-4 flex flex-col gap-2">
                    <b className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">
                      Active Conversations
                    </b>
                    {conversations.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No conversations yet. Accept a request to start messaging!
                      </div>
                    ) : (
                      conversations.map((c) => {
                        const otherPerson = currentUser?.id === c.student.id ? c.mentor : c.student;
                        const isSelected = activeConversationId === c.id;

                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveConversationId(c.id)}
                            className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${
                              isSelected ? 'bg-indigo-50 text-[#5b5ce2]' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#5b5ce2] font-black grid place-items-center">
                              {otherPerson.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <b className="text-xs truncate">{otherPerson.full_name}</b>
                                {c.unread_count > 0 && (
                                  <span className="bg-[#5b5ce2] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                                    {c.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                {c.last_message ? c.last_message.content : 'No messages yet'}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Messages Window */}
                  <div className="md:col-span-2 flex flex-col h-[550px]">
                    {activeConversationId ? (
                      <>
                        <div className="p-4 border-b border-[#e5eaf3] bg-gray-50 flex items-center justify-between">
                          <div>
                            <b className="text-sm text-[#17233b]">
                              {conversations.find((c) => c.id === activeConversationId)?.student.id === currentUser?.id
                                ? conversations.find((c) => c.id === activeConversationId)?.mentor.full_name
                                : conversations.find((c) => c.id === activeConversationId)?.student.full_name}
                            </b>
                            <span className="block text-[10px] text-gray-400">Real-time synchronized chat</span>
                          </div>
                          <button
                            onClick={() => {
                              const conv = conversations.find((c) => c.id === activeConversationId);
                              if (conv) {
                                setSessionPartnerId(currentUser?.id === conv.student.id ? conv.mentor.id : conv.student.id);
                                setSessionDateTime(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16));
                                setSessionModalOpen(true);
                              }
                            }}
                            className="text-xs bg-[#5b5ce2] text-white px-3 py-1.5 rounded-xl font-bold"
                          >
                            Schedule Session 📅
                          </button>
                        </div>

                        {/* Message list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {messages.length === 0 ? (
                            <div className="text-center text-xs text-gray-400 py-12">
                              No messages yet. Send a greeting to start your mentorship discussion!
                            </div>
                          ) : (
                            messages.map((m) => {
                              const isMe = m.sender_id === currentUser?.id;
                              return (
                                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                  <div
                                    className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                                      isMe
                                        ? 'bg-[#5b5ce2] text-white rounded-br-none shadow-sm'
                                        : 'bg-gray-100 text-[#17233b] rounded-bl-none'
                                    }`}
                                  >
                                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                                    {m.sender_name} ·{' '}
                                    {new Date(m.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {isMe && (m.is_read ? ' · Read' : ' · Sent')}
                                  </span>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatBottomRef} />
                        </div>

                        {/* Compose */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#e5eaf3] flex gap-2">
                          <input
                            placeholder="Type a message..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className="flex-1 border border-[#e5eaf3] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#5b5ce2]"
                          />
                          <button
                            type="submit"
                            disabled={sendingMessage || !newMessageText.trim()}
                            className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#4849ce] disabled:opacity-50"
                          >
                            {sendingMessage ? '...' : 'Send ↗'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 grid place-items-center text-xs text-gray-400 p-8">
                        Select a conversation from the left to start chatting
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: SESSIONS */}
              {mentorSubTab === 'sessions' && (
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#17233b]">Scheduled 1-on-1 Sessions</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Confirmed video meetings, project reviews, and mentorship check-ins.
                      </p>
                    </div>
                    <button
                      onClick={loadSessions}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl font-bold text-gray-700"
                    >
                      Refresh ↻
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm font-semibold text-gray-600">No sessions currently scheduled</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Go to your accepted requests or active chats to propose and schedule a meeting time.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sessions.map((sess) => {
                        const isStudent = currentUser?.id === sess.student_id;
                        const partner = isStudent ? sess.mentor : sess.student;

                        return (
                          <div
                            key={sess.id}
                            className="border border-[#e5eaf3] rounded-2xl p-4 bg-[#fbfbfe] flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <h3 className="text-sm font-extrabold text-[#17233b]">{sess.title}</h3>
                                  <p className="text-xs text-gray-500">
                                    With {partner.full_name} ({isStudent ? 'Mentor' : 'Student'})
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    sess.status === 'confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : sess.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {sess.status}
                                </span>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs space-y-1 mb-3">
                                <div>
                                  <b>Scheduled:</b> {new Date(sess.scheduled_at).toLocaleString()}
                                </div>
                                <div>
                                  <b>Duration:</b> {sess.duration_minutes} minutes
                                </div>
                                <div>
                                  <b>Method:</b> <span className="capitalize">{sess.meeting_method}</span>
                                </div>
                                {sess.notes && (
                                  <div>
                                    <b>Notes:</b> {sess.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <a
                                href={sess.meeting_link_or_location}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-[#5b5ce2] bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100"
                              >
                                Join Meeting ↗
                              </a>

                              {sess.status === 'confirmed' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.updateSession(sess.id, { status: 'cancelled' });
                                      showToast('Session cancelled');
                                      loadSessions();
                                    } catch (err: any) {
                                      showToast('Failed to cancel session: ' + err.message);
                                    }
                                  }}
                                  className="text-xs font-semibold text-rose-600 hover:underline"
                                >
                                  Cancel session
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

              {/* TAB 5: MENTOR PROFILE STUDIO */}
              {mentorSubTab === 'profile' && currentUser?.role === 'mentor' && (
                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm max-w-2xl">
                  <h2 className="text-base font-bold text-[#17233b] mb-1">Mentor Profile Studio</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Complete your profile and toggle publication to appear in the searchable public mentor directory.
                  </p>

                  <form onSubmit={handleSaveMentorProfile} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Professional Title</label>
                      <input
                        value={mentorTitle}
                        onChange={(e) => setMentorTitle(e.target.value)}
                        placeholder="e.g. Senior Machine Learning Engineer at Anthropic"
                        required
                        className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Biography & Mentorship Philosophy</label>
                      <textarea
                        rows={3}
                        value={mentorBio}
                        onChange={(e) => setMentorBio(e.target.value)}
                        placeholder="Describe your background and how you guide students (at least 15 characters)..."
                        required
                        className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Skills (comma separated)</label>
                        <input
                          value={mentorSkills}
                          onChange={(e) => setMentorSkills(e.target.value)}
                          placeholder="e.g. PyTorch, LLMs, Python, MLOps"
                          required
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Expertise Domain</label>
                        <select
                          value={mentorDomain}
                          onChange={(e) => setMentorDomain(e.target.value)}
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none bg-white"
                        >
                          <option>Machine Learning</option>
                          <option>Generative AI</option>
                          <option>Deep Learning</option>
                          <option>Data Engineering</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Years of Exp</label>
                        <input
                          type="number"
                          min={0}
                          value={mentorExperience}
                          onChange={(e) => setMentorExperience(Number(e.target.value))}
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Languages</label>
                        <input
                          value={mentorLanguages}
                          onChange={(e) => setMentorLanguages(e.target.value)}
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Meeting Format</label>
                        <select
                          value={mentorPref}
                          onChange={(e) => setMentorPref(e.target.value as any)}
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none bg-white"
                        >
                          <option value="online">Online</option>
                          <option value="in-person">In-person</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Available Days</label>
                        <input
                          value={mentorDays}
                          onChange={(e) => setMentorDays(e.target.value)}
                          placeholder="e.g. Mon, Wed, Fri"
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Available Times</label>
                        <input
                          value={mentorTimes}
                          onChange={(e) => setMentorTimes(e.target.value)}
                          placeholder="e.g. 18:00 - 21:00 UTC"
                          className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="pubCheck"
                        checked={mentorPublished}
                        onChange={(e) => setMentorPublished(e.target.checked)}
                        className="w-4 h-4 accent-[#5b5ce2]"
                      />
                      <label htmlFor="pubCheck" className="font-bold text-gray-700 cursor-pointer">
                        Publish profile in the public directory (Must have title, bio, and skills)
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-[#5b5ce2] text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:bg-[#4849ce]"
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ======================= 3. LEARNING HUB ======================= */}
          {activePage === 'learning' && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    One hub, fewer tabs
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Learning hub
                  </h1>
                  <p className="text-[#71809b] text-sm">Browse curated learning links and keep track of what you finish.</p>
                </div>
              </div>

              <div className="space-y-3">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-[#e5eaf3] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-2xl grid place-items-center">
                        {r.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#17233b]">{r.title}</h3>
                        <p className="text-xs text-gray-500">
                          {r.provider} · {r.category} · {r.level} · {r.duration} min
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{r.description}</p>
                      </div>
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-sm hover:bg-[#4849ce]"
                    >
                      Open ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= 4. STUDY PLANNER ======================= */}
          {activePage === 'planner' && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    Progress comes from practice
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Study planner
                  </h1>
                  <p className="text-[#71809b] text-sm">Make your plan realistic, then build a repeatable routine.</p>
                </div>
                <button
                  onClick={() => {
                    const title = prompt('Enter new study task title:');
                    if (title) {
                      setTasks((prev) => [
                        ...prev,
                        { id: Date.now(), title, meta: 'Personal study task · 30 min', done: false },
                      ]);
                      showToast('Study task added');
                    }
                  }}
                  className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-[#4849ce]"
                >
                  ＋ Add study task
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#17233b]">This week's checklist</h2>
                    <span className="text-xs bg-indigo-50 text-[#5b5ce2] px-2.5 py-1 rounded-full font-bold">
                      {completedTasksCount} / {tasks.length} tasks
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={() => {
                              setTasks((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, done: !item.done } : item))
                              );
                              setXp((prev) => (t.done ? Math.max(0, prev - 20) : prev + 20));
                              showToast(t.done ? 'Task marked incomplete' : 'Task completed · +20 XP');
                            }}
                            className="w-4 h-4 accent-[#5b5ce2] cursor-pointer"
                          />
                          <div className={t.done ? 'line-through text-gray-400' : 'text-sm font-semibold'}>
                            {t.title}
                            <span className="block text-[11px] text-gray-400 font-normal">{t.meta}</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.done ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {t.done ? 'Done' : 'To do'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm">
                  <h2 className="text-base font-bold text-[#17233b] mb-4">Build your routine</h2>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Hours to study per week</label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={routineHours}
                        onChange={(e) => setRoutineHours(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl p-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Preferred study window</label>
                      <select
                        value={routineTime}
                        onChange={(e) => setRoutineTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2 outline-none bg-white"
                      >
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Evening</option>
                        <option>Flexible</option>
                      </select>
                    </div>
                    <button
                      onClick={() => showToast(`Routine saved: ${routineHours} hrs/wk (${routineTime})`)}
                      className="w-full bg-[#5b5ce2] text-white font-bold py-2 rounded-xl"
                    >
                      Save my routine
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= 5. CAREER ROADMAP ======================= */}
          {activePage === 'roadmap' && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    A path, not a pile of courses
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Career roadmap
                  </h1>
                  <p className="text-[#71809b] text-sm">
                    Structured stages tailored for {currentUser?.target_role || 'AI / ML Engineer'}.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm space-y-6">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${
                          m.done ? 'bg-[#5b5ce2] text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {idx < milestones.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#17233b]">{m.title}</h3>
                        <button
                          onClick={() => {
                            setMilestones((prev) =>
                              prev.map((item) => (item.id === m.id ? { ...item, done: !item.done } : item))
                            );
                            showToast(m.done ? 'Milestone reopened' : 'Milestone completed · +50 XP');
                          }}
                          className={`text-xs px-3 py-1 rounded-xl font-bold ${
                            m.done ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-[#5b5ce2]'
                          }`}
                        >
                          {m.done ? 'Mark incomplete' : 'Mark completed'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{m.desc}</p>
                      <div className="flex gap-1.5 mt-2">
                        {m.skills.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= 6. AI TRENDS ======================= */}
          {activePage === 'trends' && (
            <div>
              {/* Header with Freshness Bar */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span>⚡ REAL-TIME MARKET INTELLIGENCE</span>
                    <span>·</span>
                    <span>AUTOMATIC DAILY UPDATES</span>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    AI Trends & Market Freshness
                  </h1>
                  <p className="text-[#71809b] text-sm max-w-2xl">
                    Automatically discovering and indexing current frontier AI releases, technical breakthroughs, model updates, and practical tooling every day.
                  </p>
                </div>

                {/* Status Indicator & Refresh Control */}
                <div className="bg-white border border-[#e5eaf3] p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                          trendsStatus?.freshness === 'fresh'
                            ? 'bg-emerald-100 text-emerald-800'
                            : trendsStatus?.freshness === 'cached'
                            ? 'bg-indigo-100 text-[#5b5ce2]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {trendsStatus?.freshness === 'fresh'
                          ? 'Live Market Feeds'
                          : trendsStatus?.freshness === 'cached'
                          ? 'Synchronized Cache'
                          : 'Stale (Update Due)'}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {trendsStatus?.last_successful_refresh
                          ? `Updated ${new Date(trendsStatus.last_successful_refresh).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : 'Checking...'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Next auto-sync in ~24h · {trendsStatus?.total_trends || trendsList.length} market developments tracked
                    </div>
                  </div>

                  <button
                    onClick={handleManualTrendsRefresh}
                    disabled={trendsRefreshing}
                    className="bg-[#5b5ce2] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md hover:bg-[#4849ce] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto justify-center"
                  >
                    <span className={trendsRefreshing ? 'animate-spin' : ''}>↻</span>
                    {trendsRefreshing ? 'Refreshing Feeds...' : 'Refresh Market Feeds'}
                  </button>
                </div>
              </div>

              {/* Source Health Pills */}
              {trendsStatus?.source_health && Object.keys(trendsStatus.source_health).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6 bg-[#f8f9fe] border border-indigo-50 p-2.5 rounded-xl text-[11px]">
                  <span className="font-bold text-gray-600">Feed Sources:</span>
                  {Object.entries(trendsStatus.source_health).map(([src, status], idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                        status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {src} ({status === 'healthy' ? 'Online' : 'Cached'})
                    </span>
                  ))}
                </div>
              )}

              {/* Sub-Navigation: Market Updates vs AI Tools Directory */}
              <div className="flex border-b border-[#e5eaf3] mb-6 gap-3">
                <button
                  onClick={() => setTrendsViewTab('market')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    trendsViewTab === 'market'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  ⚡ Market Updates & Breakthroughs ({trendsList.length})
                </button>
                <button
                  onClick={() => setTrendsViewTab('tools')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                    trendsViewTab === 'tools'
                      ? 'border-[#5b5ce2] text-[#5b5ce2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🛠 Real AI Tools Directory ({toolsList.length})
                </button>
              </div>

              {/* VIEW 1: MARKET UPDATES */}
              {trendsViewTab === 'market' && (
                <div>
                  {/* Filters Bar */}
                  <div className="bg-white border border-[#e5eaf3] rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 items-center">
                    <input
                      placeholder="Search developments, models, research, or companies..."
                      value={trendsSearchQuery}
                      onChange={(e) => setTrendsSearchQuery(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3.5 py-2 text-xs flex-1 min-w-[220px] outline-none focus:border-[#5b5ce2]"
                    />
                    <select
                      value={trendsCategoryFilter}
                      onChange={(e) => setTrendsCategoryFilter(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="Models & LLMs">Models & LLMs</option>
                      <option value="Coding & Dev">Coding & Development</option>
                      <option value="Research & Papers">Research & Papers</option>
                      <option value="Agents & Robotics">Agents & Automation</option>
                      <option value="Industry & Investments">Industry & Investments</option>
                    </select>
                    <button
                      onClick={loadTrends}
                      className="bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-2 rounded-xl text-gray-700"
                    >
                      Filter ⌕
                    </button>
                  </div>

                  {trendsLoading ? (
                    <div className="p-12 text-center text-gray-400">Loading daily AI developments...</div>
                  ) : trendsList.length === 0 ? (
                    <div className="bg-white border border-[#e5eaf3] rounded-2xl p-12 text-center">
                      <p className="text-base font-bold text-gray-700">No updates matching your filter</p>
                      <p className="text-xs text-gray-400 mt-1">Try clearing your search query or selecting All Categories.</p>
                      <button
                        onClick={() => {
                          setTrendsSearchQuery('');
                          setTrendsCategoryFilter('all');
                        }}
                        className="mt-3 bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {trendsList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm hover:border-[#b7b9ff] transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-50 text-[#5b5ce2] text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                                  {item.category}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-500">
                                  {item.source_name}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400">
                                Published {new Date(item.published_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            <h3 className="text-base font-extrabold text-[#17233b] leading-snug mb-2">
                              {item.title}
                            </h3>

                            <p className="text-xs text-gray-600 leading-relaxed mb-4">
                              {item.summary}
                            </p>

                            {item.tags && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {item.tags.split(',').map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-medium border border-gray-100"
                                  >
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400">
                              Verified Source Feed
                            </span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-[#5b5ce2] bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                            >
                              Read Source ↗
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: REAL AI TOOLS DIRECTORY */}
              {trendsViewTab === 'tools' && (
                <div>
                  {/* Tool Filters Bar */}
                  <div className="bg-white border border-[#e5eaf3] rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 items-center">
                    <input
                      placeholder="Search tools for Python, web dev, research, presentations, agents..."
                      value={toolsSearchQuery}
                      onChange={(e) => setToolsSearchQuery(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3.5 py-2 text-xs flex-1 min-w-[240px] outline-none focus:border-[#5b5ce2]"
                    />
                    <select
                      value={toolsCategoryFilter}
                      onChange={(e) => setToolsCategoryFilter(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
                    >
                      <option value="all">All Domains</option>
                      <option value="Coding & Dev">Coding & Development</option>
                      <option value="Research & Study">Research & Study</option>
                      <option value="Data & ML">Data & Machine Learning</option>
                      <option value="Agents & Workflow">Agents & Workflows</option>
                      <option value="Design & Media">Design & Presentations</option>
                    </select>
                    <select
                      value={toolsPricingFilter}
                      onChange={(e) => setToolsPricingFilter(e.target.value)}
                      className="border border-[#e5eaf3] rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
                    >
                      <option value="all">All Pricing</option>
                      <option value="Free">Free / Free tier</option>
                      <option value="Open Source">Open Source</option>
                      <option value="Freemium">Freemium</option>
                      <option value="Paid">Paid</option>
                    </select>
                    <button
                      onClick={loadTools}
                      className="bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-2 rounded-xl text-gray-700"
                    >
                      Filter ⌕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {toolsList.map((tool) => (
                      <div
                        key={tool.id}
                        className="bg-white border border-[#e5eaf3] rounded-2xl p-6 shadow-sm hover:border-[#b7b9ff] transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="text-base font-extrabold text-[#17233b]">{tool.name}</h3>
                              <span className="text-[11px] font-bold text-indigo-600 block mt-0.5">
                                {tool.category}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                tool.pricing_model === 'Open Source'
                                  ? 'bg-purple-100 text-purple-800'
                                  : tool.pricing_model === 'Freemium'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tool.pricing_model === 'Free tier'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {tool.pricing_model}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 leading-relaxed mb-3">
                            {tool.description}
                          </p>

                          <div className="bg-[#f9fafc] rounded-xl p-3 border border-gray-100 text-xs space-y-1.5 mb-4">
                            <div>
                              <b className="text-gray-700 block text-[11px]">Best for Use Cases:</b>
                              <span className="text-gray-600 text-[11px] leading-relaxed">{tool.use_cases}</span>
                            </div>
                            {tool.pricing_details && (
                              <div>
                                <b className="text-gray-700 block text-[11px]">Pricing Details:</b>
                                <span className="text-gray-500 text-[10px]">{tool.pricing_details}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            Verified {new Date(tool.verified_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                          </span>
                          <a
                            href={tool.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#5b5ce2] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl hover:bg-[#4849ce] transition"
                          >
                            Visit Tool ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= 7. PROJECT STUDIO ======================= */}
          {activePage === 'projects' && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    Turn learning into proof
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    Project studio
                  </h1>
                  <p className="text-[#71809b] text-sm">Practice ideas that grow into portfolio pieces.</p>
                </div>
                <button
                  onClick={() => {
                    const title = prompt('Project name:');
                    if (title) {
                      setProjects((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          title,
                          desc: 'Self-directed AI project.',
                          icon: '💡',
                          level: 'Beginner',
                          status: 'Planned',
                          skills: 'Python · Scikit-learn',
                        },
                      ]);
                      showToast('Project created');
                    }
                  }}
                  className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-[#4849ce]"
                >
                  ＋ New project
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{p.icon}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-[#5b5ce2]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#17233b]">{p.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 mb-2">{p.desc}</p>
                      <div className="text-[11px] text-gray-400 font-semibold">{p.skills}</div>
                    </div>
                    <button
                      onClick={() => {
                        setProjects((prev) =>
                          prev.map((item) =>
                            item.id === p.id
                              ? {
                                  ...item,
                                  status:
                                    item.status === 'Planned'
                                      ? 'In progress'
                                      : item.status === 'In progress'
                                      ? 'Completed'
                                      : 'Planned',
                                }
                              : item
                          )
                        );
                        showToast('Project status updated');
                      }}
                      className="mt-4 w-full bg-gray-50 border border-gray-200 text-xs font-bold py-2 rounded-xl hover:bg-gray-100"
                    >
                      Advance Status
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================= 8. AI STUDY BUDDY ======================= */}
          {activePage === 'assistant' && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[#5b5ce2] text-[11px] font-black uppercase tracking-widest">
                    Your learning companion
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-1.5 text-[#17233b]">
                    AI study buddy
                  </h1>
                  <p className="text-[#71809b] text-sm">Ask for explanations, study plans, or project feedback.</p>
                </div>
                <span
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold ${
                    geminiConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {geminiConnected ? '● Gemini Connected' : '○ Checking Connection'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
                  <div className="flex-1 overflow-y-auto space-y-3 p-2">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.who === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.who === 'user'
                              ? 'bg-[#5b5ce2] text-white rounded-br-none'
                              : 'bg-indigo-50/60 text-[#17233b] rounded-bl-none border border-indigo-100'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {aiThinking && (
                      <div className="text-xs text-indigo-500 italic p-2">SkillSphere AI is thinking...</div>
                    )}
                  </div>
                  <form onSubmit={handleAISend} className="pt-3 border-t border-gray-100 flex gap-2">
                    <input
                      placeholder="e.g. Build a 4-week Python plan or explain overfitting with an analogy..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      className="flex-1 border border-[#e5eaf3] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#5b5ce2]"
                    />
                    <button
                      type="submit"
                      disabled={aiThinking || !aiInput.trim()}
                      className="bg-[#5b5ce2] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#4849ce] disabled:opacity-50"
                    >
                      Send ↗
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-[#e5eaf3] rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Try asking</h3>
                  {[
                    'Create a 4-week beginner plan to learn Python for ML.',
                    'Explain overfitting in ML with a simple analogy.',
                    'Suggest three portfolio ideas for AI intern roles.',
                  ].map((promptText, i) => (
                    <button
                      key={i}
                      onClick={() => setAiInput(promptText)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 text-xs text-gray-700 hover:bg-indigo-50/50 hover:text-[#5b5ce2] transition"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================= MODALS ======================= */}

      {/* 1. View Mentor Profile Modal */}
      {profileModalOpen && selectedMentor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={selectedMentor.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedMentor.full_name}`}
                alt={selectedMentor.full_name}
                className="w-16 h-16 rounded-2xl object-cover border border-indigo-100"
              />
              <div>
                <h2 className="text-xl font-black text-[#17233b]">{selectedMentor.full_name}</h2>
                <p className="text-xs text-indigo-600 font-bold">{selectedMentor.title}</p>
                <div className="text-xs text-amber-600 font-bold mt-0.5">
                  ★ {selectedMentor.rating.toFixed(2)} · {selectedMentor.years_of_experience} years experience
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600 mb-6">
              <div>
                <b className="text-gray-800 block mb-1">Biography</b>
                <p className="leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedMentor.bio}</p>
              </div>

              <div>
                <b className="text-gray-800 block mb-1">Skills & Domain</b>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMentor.skills.split(',').map((s, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {selectedMentor.education && (
                <div>
                  <b className="text-gray-800 block mb-0.5">Education</b>
                  <p>{selectedMentor.education}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div>
                  <b className="text-gray-700 block">Available Days:</b>
                  <span>{selectedMentor.available_days}</span>
                </div>
                <div>
                  <b className="text-gray-700 block">Hours:</b>
                  <span>{selectedMentor.available_times}</span>
                </div>
                <div>
                  <b className="text-gray-700 block">Languages:</b>
                  <span>{selectedMentor.languages}</span>
                </div>
                <div>
                  <b className="text-gray-700 block">Format:</b>
                  <span className="capitalize">{selectedMentor.meeting_preference}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setProfileModalOpen(false);
                  if (!currentUser) setAuthModalOpen(true);
                  else setRequestModalOpen(true);
                }}
                className="px-5 py-2 bg-[#5b5ce2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#4849ce]"
              >
                Request Mentorship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Request Mentorship Modal */}
      {requestModalOpen && selectedMentor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black text-[#17233b] mb-1">
              Request Mentorship with {selectedMentor.full_name}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Share your learning goals and preferred meeting windows to establish a personalized connection.
            </p>

            <form onSubmit={handleRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Your Primary Learning Goal</label>
                <input
                  required
                  placeholder="e.g. Build an end-to-end ML portfolio project and prepare for interviews"
                  value={requestGoals}
                  onChange={(e) => setRequestGoals(e.target.value)}
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Message for {selectedMentor.full_name}</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Introduce yourself, your current technical background, and what specific guidance you are looking for..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Preferred Meeting Days / Times</label>
                <input
                  required
                  placeholder="e.g. Wednesday evenings or Saturday mornings (UTC)"
                  value={requestPreferredTimes}
                  onChange={(e) => setRequestPreferredTimes(e.target.value)}
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-5 py-2 bg-[#5b5ce2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#4849ce]"
                >
                  {requestSubmitting ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Mentor Response Modal (Accept / Reject) */}
      {responseModalOpen && respondingRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-black text-[#17233b] mb-1">
              {responseAction === 'accepted' ? 'Accept Mentorship Request' : 'Decline Mentorship Request'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Add a personal response note for {respondingRequest.student.full_name}.
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                placeholder="Optional response note or suggested kickoff schedule..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResponseModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(respondingRequest.id, responseAction, responseNotes)}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md ${
                    responseAction === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {responseAction === 'accepted' ? 'Acceptance' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Schedule Session Modal */}
      {sessionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-lg font-black text-[#17233b] mb-1">Schedule 1-on-1 Session</h2>
            <p className="text-xs text-gray-500 mb-4">
              Propose or confirm a structured mentorship meeting with calendar details.
            </p>

            <form onSubmit={handleScheduleSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Session Topic / Title</label>
                <input
                  required
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Portfolio Code Review & Sprint Planning"
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionDateTime}
                    onChange={(e) => setSessionDateTime(e.target.value)}
                    className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Duration (minutes)</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none bg-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Meeting Link or Location</label>
                <input
                  required
                  value={sessionLinkOrLocation}
                  onChange={(e) => setSessionLinkOrLocation(e.target.value)}
                  placeholder="e.g. https://meet.google.com/xyz or Office address"
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / Agenda (Optional)</label>
                <textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Add any links or questions to prepare ahead of time..."
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-xl text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5b5ce2] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#4849ce]"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Auth Modal (Login / Register) */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
            <h2 className="text-xl font-black text-[#17233b] mb-1">
              {authMode === 'login' ? 'Sign in to SkillSphere' : 'Create your account'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {authMode === 'login'
                ? 'Access real mentorship, conversations, and schedules.'
                : 'Join as a student learner or verified mentor.'}
            </p>

            {authError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      required
                      placeholder="e.g. Alex Rivera"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">I want to join as</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthRole('student')}
                        className={`py-2 rounded-xl border text-xs font-bold ${
                          authRole === 'student'
                            ? 'bg-indigo-50 border-[#5b5ce2] text-[#5b5ce2]'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        🎓 Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthRole('mentor')}
                        className={`py-2 rounded-xl border text-xs font-bold ${
                          authRole === 'mentor'
                            ? 'bg-indigo-50 border-[#5b5ce2] text-[#5b5ce2]'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        🧑‍🏫 Mentor
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full border border-[#e5eaf3] rounded-xl px-3 py-2 outline-none focus:border-[#5b5ce2]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#5b5ce2] text-white font-bold py-2.5 rounded-xl shadow-md hover:bg-[#4849ce] mt-2"
              >
                {authMode === 'login' ? 'Sign In' : 'Complete Registration'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs">
              {authMode === 'login' ? (
                <p className="text-gray-500">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                    }}
                    className="text-[#5b5ce2] font-bold hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p className="text-gray-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="text-[#5b5ce2] font-bold hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>

            {/* Quick Demo Login Presets */}
            <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Quick Test Credentials
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickLogin('aarav.mehta@skillsphere.ai', 'Password123!')}
                  className="text-left bg-white border border-gray-200 p-2 rounded-xl text-[11px] hover:border-indigo-300"
                >
                  <b className="block text-gray-800">Aarav Mehta</b>
                  <span className="text-gray-400 text-[10px]">Verified Mentor</span>
                </button>
                <button
                  onClick={() => quickLogin('test.student.beta@skillsphere.ai', 'StudentPassword123!')}
                  className="text-left bg-white border border-gray-200 p-2 rounded-xl text-[11px] hover:border-indigo-300"
                >
                  <b className="block text-gray-800">Alex Rivera</b>
                  <span className="text-gray-400 text-[10px]">Student Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#18223a] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl z-50 max-w-sm flex items-center gap-2">
          <span>✦</span> {toastMessage}
        </div>
      )}
    </div>
  );
}
