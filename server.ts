import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere-super-secret-jwt-key-2026';
const DB_FILE = path.resolve(process.cwd(), 'skillsphere-db.json');

app.use(cors());
app.use(express.json());

// Persistent Database Structure
interface DBState {
  users: any[];
  mentorProfiles: any[];
  requests: any[];
  conversations: any[];
  messages: any[];
  sessions: any[];
  notifications: any[];
  aiTrends: any[];
  aiTools: any[];
  aiTrendsState: {
    last_successful_refresh: string | null;
    next_scheduled_refresh: string | null;
    items_retrieved_count: number;
    status_message: string;
    source_health: Record<string, string>;
  };
}

const INITIAL_VERIFIED_AI_TOOLS = [
  {
    id: 1,
    name: 'GitHub Copilot',
    description: 'AI pair programmer powered by OpenAI and Anthropic models that offers code completions, whole-function synthesis, and contextual terminal assistance.',
    category: 'Coding & Dev',
    use_cases: 'Python & TypeScript development, test generation, refactoring, CLI command synthesis',
    website_url: 'https://github.com/features/copilot',
    pricing_model: 'Paid',
    pricing_details: '$10/mo for individuals, free for verified students & open-source maintainers',
    verified_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Cursor',
    description: 'AI-first fork of VS Code built for multi-file code editing, repository-wide embeddings index, and autonomous agentic terminal execution.',
    category: 'Coding & Dev',
    use_cases: 'Full-stack web apps, complex refactoring, codebase Q&A, automatic bug fixing',
    website_url: 'https://www.cursor.com',
    pricing_model: 'Freemium',
    pricing_details: 'Free tier with 2,000 completions; Pro at $20/month with unlimited Claude 3.5 Sonnet',
    verified_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Hugging Face Hub',
    description: 'The open platform for machine learning models, datasets, and demonstration apps (Spaces). Host, evaluate, and fine-tune open weights.',
    category: 'Data & ML',
    use_cases: 'Model discovery (Llama, Mistral, Whisper), dataset hosting, GGUF quantized models, demo deployment',
    website_url: 'https://huggingface.co',
    pricing_model: 'Open Source',
    pricing_details: 'Free public repos, community inference API; Pro tier $9/mo for accelerated GPU quota',
    verified_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Google AI Studio',
    description: 'Fast prototyping environment for Gemini 2.5 and multimodal models with generous free rate limits, structured prompts, and code export.',
    category: 'Coding & Dev',
    use_cases: 'Prompt engineering, function calling, audio/video analysis, free API prototyping',
    website_url: 'https://aistudio.google.com',
    pricing_model: 'Free tier',
    pricing_details: 'Free tier with high RPM for Gemini models; Pay-as-you-go for high-volume enterprise',
    verified_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Claude Artifacts & Projects',
    description: "Anthropic's reasoning model interface with interactive code sandboxes, frontend previews, and shared team knowledge bases.",
    category: 'Research & Study',
    use_cases: 'Complex algorithmic reasoning, paper synthesis, architecture design, interactive UI prototyping',
    website_url: 'https://claude.ai',
    pricing_model: 'Freemium',
    pricing_details: 'Free access with standard quotas; Pro at $20/month with 5x usage and Claude 3.5 Sonnet',
    verified_at: new Date().toISOString(),
  },
  {
    id: 6,
    name: 'vLLM',
    description: 'High-throughput, memory-efficient LLM serving engine featuring PagedAttention and continuous batching for production inference.',
    category: 'Data & ML',
    use_cases: 'Self-hosted model serving, GPU memory optimization, OpenAI-compatible local APIs',
    website_url: 'https://github.com/vllm-project/vllm',
    pricing_model: 'Open Source',
    pricing_details: '100% Free Apache-2.0 open source library',
    verified_at: new Date().toISOString(),
  },
  {
    id: 7,
    name: 'Perplexity AI',
    description: 'AI conversational search engine providing grounded research answers with direct academic and web citations.',
    category: 'Research & Study',
    use_cases: 'Academic paper lookups, competitor market research, factual code documentation exploration',
    website_url: 'https://www.perplexity.ai',
    pricing_model: 'Freemium',
    pricing_details: 'Free unlimited Quick search; Pro at $20/month with Claude 3.5 Sonnet & GPT-4o deep search',
    verified_at: new Date().toISOString(),
  },
  {
    id: 8,
    name: 'Gamma App',
    description: 'AI generative presentation and document builder that transforms outlines or text notes into polished slides, webpages, and briefings.',
    category: 'Design & Media',
    use_cases: 'Technical presentation decks, thesis defenses, product pitch briefs, executive summaries',
    website_url: 'https://gamma.app',
    pricing_model: 'Freemium',
    pricing_details: 'Free 400 initial credits; Plus at $8/month and Pro at $15/month for unlimited generation',
    verified_at: new Date().toISOString(),
  },
  {
    id: 9,
    name: 'Ollama',
    description: 'Get up and running with large language models locally on macOS, Linux, and Windows with simple CLI commands.',
    category: 'Coding & Dev',
    use_cases: 'Offline local model inference (Llama 3.3, DeepSeek, Qwen), private data processing',
    website_url: 'https://ollama.com',
    pricing_model: 'Open Source',
    pricing_details: '100% Free MIT-licensed open source runner',
    verified_at: new Date().toISOString(),
  },
  {
    id: 10,
    name: 'LangChain & LangGraph',
    description: 'Framework for building stateful, multi-actor agentic applications and cyclical workflow graphs with LLMs.',
    category: 'Agents & Workflow',
    use_cases: 'Agent architectures, tool calling loops, multi-agent collaboration, memory retention',
    website_url: 'https://www.langchain.com',
    pricing_model: 'Open Source',
    pricing_details: 'Core framework is free open-source; LangSmith tracing includes a free developer tier',
    verified_at: new Date().toISOString(),
  },
];

const INITIAL_VERIFIED_AI_TRENDS = [
  {
    id: 1,
    title: 'DeepSeek-V3 and R1 Open Weights Challenge Frontier AI Paradigms',
    summary: 'DeepSeek released open-weights architecture with Multi-head Latent Attention (MLA) and DeepSeekMoE, demonstrating competitive reasoning benchmarks at drastically reduced training cost.',
    url: 'https://arxiv.org/abs/2412.19437',
    source_name: 'ArXiv AI Research',
    category: 'Models & LLMs',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'Open Weights, DeepSeek, Architecture, MoE',
  },
  {
    id: 2,
    title: 'Google DeepMind Unveils Gemini 2.0 and Flash Thinking Mode',
    summary: 'Google introduced Gemini 2.0 with native multimodal audio/video streaming, Flash Thinking experimental reasoning models, and expanded agentic execution via Google AI Studio.',
    url: 'https://blog.google/technology/ai/google-gemini-ai-update-december-2024/',
    source_name: 'Google AI Blog',
    category: 'Models & LLMs',
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'Gemini 2.0, DeepMind, Multimodal, Thinking',
  },
  {
    id: 3,
    title: 'Anthropic Expands Model Context Protocol (MCP) Open Standard',
    summary: 'Anthropic introduced the Model Context Protocol (MCP), an open standard enabling developers to securely connect AI assistants to local file systems, database tables, and external APIs.',
    url: 'https://www.anthropic.com/news/model-context-protocol',
    source_name: 'Anthropic Research',
    category: 'Coding & Dev',
    published_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'MCP, Open Standard, Agents, Tool Use',
  },
  {
    id: 4,
    title: 'OpenAI Introduces Operator and Computer-Using Agent Capabilities',
    summary: 'OpenAI deployed Operator research preview and canvas workspace features, allowing AI agents to interact with web interfaces, fill out forms, and automate complex workflows.',
    url: 'https://openai.com/index/introducing-operator/',
    source_name: 'OpenAI Announcements',
    category: 'Agents & Robotics',
    published_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'Operator, Agents, Computer Use, Automation',
  },
  {
    id: 5,
    title: 'Meta Llama 3.3 70B Brings Flagship Performance to Scalable Open Inference',
    summary: 'Meta released Llama 3.3 70B under an open permissive license, matching earlier 405B capabilities while fitting on single dual-GPU workstations for enterprise fine-tuning.',
    url: 'https://ai.meta.com/blog/meta-llama-3-3/',
    source_name: 'Meta AI',
    category: 'Models & LLMs',
    published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'Llama 3.3, Meta, Open Source, Quantization',
  },
  {
    id: 6,
    title: 'Hugging Face smolagents Library Provides Lightweight Code Agents',
    summary: 'Hugging Face introduced smolagents, a minimalistic Python framework allowing LLMs to write Python code directly to execute tool steps rather than verbose JSON tool schemas.',
    url: 'https://huggingface.co/blog/smolagents',
    source_name: 'Hugging Face',
    category: 'Coding & Dev',
    published_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    retrieved_at: new Date().toISOString(),
    tags: 'smolagents, Python, Code Agents, Tool Calling',
  },
];

function loadDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Migrate fields if needed
      parsed.aiTrends = parsed.aiTrends || INITIAL_VERIFIED_AI_TRENDS;
      parsed.aiTools = parsed.aiTools || INITIAL_VERIFIED_AI_TOOLS;
      parsed.aiTrendsState = parsed.aiTrendsState || {
        last_successful_refresh: new Date().toISOString(),
        next_scheduled_refresh: new Date(Date.now() + 86400000).toISOString(),
        items_retrieved_count: parsed.aiTrends.length,
        status_message: 'Operational',
        source_health: {
          'ArXiv AI Research': 'healthy',
          'MIT Technology Review AI': 'healthy',
          'VentureBeat AI': 'healthy',
        },
      };
      return parsed;
    }
  } catch (err) {
    console.error('Error loading DB, reinitializing:', err);
  }
  return initDB();
}

function saveDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

function initDB(): DBState {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Password123!', salt);

  const initialMentors = [
    {
      id: 1,
      email: 'aarav.mehta@skillsphere.ai',
      hashed_password: defaultPasswordHash,
      full_name: 'Aarav Mehta',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      learning_goal: 'Help students ship production ML code',
      target_role: 'Machine Learning',
      skill_level: 'Advanced',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      email: 'mira.shah@skillsphere.ai',
      hashed_password: defaultPasswordHash,
      full_name: 'Dr. Mira Shah',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
      learning_goal: 'Research in LLM alignment and agent systems',
      target_role: 'Generative AI',
      skill_level: 'Advanced',
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      email: 'dev.patel@skillsphere.ai',
      hashed_password: defaultPasswordHash,
      full_name: 'Dev Patel',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      learning_goal: 'Statistical rigor and tech interview mentoring',
      target_role: 'Machine Learning',
      skill_level: 'Advanced',
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      email: 'test.student.beta@skillsphere.ai',
      hashed_password: bcrypt.hashSync('StudentPassword123!', salt),
      full_name: 'Alex Rivera',
      role: 'student',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
      learning_goal: 'Master PyTorch and build two portfolio projects',
      target_role: 'AI / ML Engineer',
      skill_level: 'Beginner',
      created_at: new Date().toISOString(),
    },
  ];

  const initialProfiles = [
    {
      id: 1,
      user_id: 1,
      title: 'Senior Machine Learning Engineer @ Anthropic',
      bio: 'Former robotics researcher with 7+ years building production computer vision and reinforcement learning systems. Mentored 40+ career changers into full-time ML roles.',
      skills: 'Python, PyTorch, Computer Vision, MLOps, System Design',
      expertise_domain: 'Machine Learning',
      education: 'M.S. in Computer Science, Georgia Tech',
      years_of_experience: 7,
      linkedin_url: 'https://linkedin.com/in/example-aarav',
      portfolio_url: 'https://github.com/example-aarav',
      languages: 'English, Hindi',
      meeting_preference: 'online',
      available_days: 'Mon, Wed, Fri',
      available_times: '18:00 - 21:00 UTC',
      is_published: true,
      rating: 4.92,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      user_id: 2,
      title: 'Principal AI Researcher & NLP Lead',
      bio: 'PhD in Computational Linguistics. Focus on large language models, retrieval augmented generation (RAG), and efficient fine-tuning techniques.',
      skills: 'Transformers, LLMs, RAG, Python, Evaluation',
      expertise_domain: 'Generative AI',
      education: 'Ph.D. in Computational Linguistics, Stanford',
      years_of_experience: 9,
      linkedin_url: 'https://linkedin.com/in/example-mira',
      portfolio_url: 'https://huggingface.co/example-mira',
      languages: 'English, French',
      meeting_preference: 'both',
      available_days: 'Tue, Thu, Sat',
      available_times: '16:00 - 19:00 UTC',
      is_published: true,
      rating: 4.95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      user_id: 3,
      title: 'Staff Data Scientist & Interview Coach',
      bio: '10+ years across tech and fintech. Specializing in technical interview prep, portfolio reviews, data science problem formulations, and career transitions.',
      skills: 'SQL, Python, Scikit-learn, Statistics, Interview Prep',
      expertise_domain: 'Machine Learning',
      education: 'B.S. in Statistics & Data Science, UC Berkeley',
      years_of_experience: 10,
      linkedin_url: 'https://linkedin.com/in/example-dev',
      portfolio_url: '',
      languages: 'English, Gujarati',
      meeting_preference: 'online',
      available_days: 'Mon, Thu, Sun',
      available_times: '19:00 - 22:00 UTC',
      is_published: true,
      rating: 4.89,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const state: DBState = {
    users: initialMentors,
    mentorProfiles: initialProfiles,
    requests: [],
    conversations: [],
    messages: [],
    sessions: [],
    notifications: [],
    aiTrends: INITIAL_VERIFIED_AI_TRENDS,
    aiTools: INITIAL_VERIFIED_AI_TOOLS,
    aiTrendsState: {
      last_successful_refresh: new Date().toISOString(),
      next_scheduled_refresh: new Date(Date.now() + 86400000).toISOString(),
      items_retrieved_count: INITIAL_VERIFIED_AI_TRENDS.length,
      status_message: 'Operational',
      source_health: {
        'ArXiv AI Research': 'healthy',
        'MIT Technology Review AI': 'healthy',
        'VentureBeat AI': 'healthy',
      },
    },
  };

  saveDB(state);
  return state;
}

let db = loadDB();

// Auth Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((u) => u.id === Number(decoded.sub));
    if (!user) {
      return res.status(401).json({ detail: 'User not found or session expired' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

// 1. Health
app.get('/api/health', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  res.json({
    status: 'ok',
    app: 'SkillSphere AI',
    gemini_configured: Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'),
  });
});

// 2. Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, full_name, role, learning_goal, target_role, skill_level } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ detail: 'Email, password, and full name are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.users.find((u) => u.email === normalizedEmail);
  if (existing) {
    return res.status(409).json({ detail: 'An account with this email address already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);
  const newUser = {
    id: Date.now(),
    email: normalizedEmail,
    hashed_password: hashedPassword,
    full_name: full_name.trim(),
    role: role === 'mentor' ? 'mentor' : 'student',
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(full_name)}`,
    learning_goal: learning_goal || '',
    target_role: target_role || 'AI / ML Engineer',
    skill_level: skill_level || 'Beginner',
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);

  if (newUser.role === 'mentor') {
    const newProfile = {
      id: Date.now(),
      user_id: newUser.id,
      title: 'AI/ML Practitioner & Mentor',
      bio: 'Passionate engineer helping newcomers navigate practical machine learning, portfolio development, and interview prep.',
      skills: 'Python, Machine Learning, Scikit-Learn',
      expertise_domain: 'Machine Learning',
      education: 'B.S. in Computer Science',
      years_of_experience: 3,
      linkedin_url: '',
      portfolio_url: '',
      languages: 'English',
      meeting_preference: 'online',
      available_days: 'Tue, Thu, Sat',
      available_times: '18:00 - 21:00 UTC',
      is_published: true,
      rating: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.mentorProfiles.push(newProfile);
  }

  saveDB(db);

  const token = jwt.sign({ sub: String(newUser.id), role: newUser.role, email: newUser.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  const { hashed_password, ...safeUser } = newUser;
  return res.status(201).json({
    access_token: token,
    token_type: 'bearer',
    user: safeUser,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users.find((u) => u.email === normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.hashed_password)) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }

  const token = jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  const { hashed_password, ...safeUser } = user;
  return res.json({
    access_token: token,
    token_type: 'bearer',
    user: safeUser,
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { hashed_password, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// 3. Mentors Directory & Profiles
app.get('/api/mentors', (req, res) => {
  const { q, domain, language, meeting_preference, min_experience, available_day } = req.query;

  let published = db.mentorProfiles.filter((p) => p.is_published);

  if (q && typeof q === 'string') {
    const term = q.toLowerCase().trim();
    published = published.filter((p) => {
      const u = db.users.find((user) => user.id === p.user_id);
      return (
        (u && u.full_name.toLowerCase().includes(term)) ||
        p.title.toLowerCase().includes(term) ||
        p.bio.toLowerCase().includes(term) ||
        p.skills.toLowerCase().includes(term) ||
        p.expertise_domain.toLowerCase().includes(term)
      );
    });
  }

  if (domain && typeof domain === 'string' && domain !== 'all') {
    published = published.filter((p) => p.expertise_domain.toLowerCase().includes(domain.toLowerCase()));
  }

  if (language && typeof language === 'string' && language !== 'all') {
    published = published.filter((p) => p.languages.toLowerCase().includes(language.toLowerCase()));
  }

  if (meeting_preference && typeof meeting_preference === 'string' && meeting_preference !== 'all') {
    published = published.filter(
      (p) => p.meeting_preference === meeting_preference || p.meeting_preference === 'both'
    );
  }

  if (min_experience) {
    const minExp = Number(min_experience);
    published = published.filter((p) => p.years_of_experience >= minExp);
  }

  const items = published.map((p) => {
    const u = db.users.find((user) => user.id === p.user_id) || {};
    return {
      id: p.id,
      user_id: p.user_id,
      full_name: u.full_name || 'Mentor',
      avatar_url: u.avatar_url,
      title: p.title,
      bio: p.bio,
      skills: p.skills,
      expertise_domain: p.expertise_domain,
      education: p.education,
      years_of_experience: p.years_of_experience,
      linkedin_url: p.linkedin_url,
      portfolio_url: p.portfolio_url,
      languages: p.languages,
      meeting_preference: p.meeting_preference,
      available_days: p.available_days,
      available_times: p.available_times,
      rating: p.rating,
    };
  });

  res.json(items);
});

app.get('/api/mentors/profile/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'mentor' && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Mentor role required' });
  }

  let prof = db.mentorProfiles.find((p) => p.user_id === user.id);
  if (!prof) {
    prof = {
      id: Date.now(),
      user_id: user.id,
      title: 'AI/ML Practitioner & Mentor',
      bio: 'Dedicated mentor helping students grow practical technical skills.',
      skills: 'Machine Learning, Python',
      expertise_domain: 'Machine Learning',
      years_of_experience: 3,
      languages: 'English',
      meeting_preference: 'online',
      available_days: 'Mon, Wed, Fri',
      available_times: '18:00 - 21:00 UTC',
      is_published: false,
      rating: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.mentorProfiles.push(prof);
    saveDB(db);
  }

  const { hashed_password, ...safeUser } = user;
  res.json({ ...prof, user: safeUser });
});

app.put('/api/mentors/profile/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'mentor' && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Mentor role required' });
  }

  let prof = db.mentorProfiles.find((p) => p.user_id === user.id);
  if (!prof) {
    prof = {
      id: Date.now(),
      user_id: user.id,
      rating: 5.0,
      created_at: new Date().toISOString(),
    };
    db.mentorProfiles.push(prof);
  }

  const { title, bio, skills, is_published, ...other } = req.body;

  // Publication check
  if (is_published) {
    const t = title !== undefined ? title : prof.title;
    const b = bio !== undefined ? bio : prof.bio;
    const s = skills !== undefined ? skills : prof.skills;
    if (!t || t.trim().length < 3) {
      return res.status(400).json({ detail: 'Professional title must be at least 3 characters to publish' });
    }
    if (!b || b.trim().length < 15) {
      return res.status(400).json({ detail: 'Biography must be at least 15 characters to publish' });
    }
    if (!s || s.trim().length < 2) {
      return res.status(400).json({ detail: 'Skills must be specified to publish' });
    }
  }

  Object.assign(prof, req.body, { updated_at: new Date().toISOString() });
  saveDB(db);

  const { hashed_password, ...safeUser } = user;
  res.json({ ...prof, user: safeUser });
});

app.get('/api/mentors/:id', (req, res) => {
  const mentorId = Number(req.params.id);
  const p = db.mentorProfiles.find((item) => item.user_id === mentorId || item.id === mentorId);
  if (!p) {
    return res.status(404).json({ detail: 'Mentor not found' });
  }
  const u = db.users.find((user) => user.id === p.user_id) || {};
  res.json({
    id: p.id,
    user_id: p.user_id,
    full_name: u.full_name || 'Mentor',
    avatar_url: u.avatar_url,
    title: p.title,
    bio: p.bio,
    skills: p.skills,
    expertise_domain: p.expertise_domain,
    education: p.education,
    years_of_experience: p.years_of_experience,
    linkedin_url: p.linkedin_url,
    portfolio_url: p.portfolio_url,
    languages: p.languages,
    meeting_preference: p.meeting_preference,
    available_days: p.available_days,
    available_times: p.available_times,
    rating: p.rating,
  });
});

// 4. Mentorship Requests
function formatReq(r: any) {
  const student = db.users.find((u) => u.id === r.student_id);
  const mentor = db.users.find((u) => u.id === r.mentor_id);
  const conv = db.conversations.find((c) => c.mentorship_request_id === r.id);

  const safeStudent = student ? (({ hashed_password, ...s }) => s)(student) : null;
  const safeMentor = mentor ? (({ hashed_password, ...m }) => m)(mentor) : null;

  return {
    ...r,
    student: safeStudent,
    mentor: safeMentor,
    conversation_id: conv ? conv.id : null,
  };
}

app.post('/api/mentorship-requests', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { mentor_id, learning_goals, message, preferred_times } = req.body;

  if (user.id === Number(mentor_id)) {
    return res.status(400).json({ detail: 'You cannot submit a mentorship request to yourself' });
  }

  const mentor = db.users.find((u) => u.id === Number(mentor_id) && u.role === 'mentor');
  if (!mentor) {
    return res.status(404).json({ detail: 'Mentor not found' });
  }

  const existing = db.requests.find(
    (r) =>
      r.student_id === user.id &&
      r.mentor_id === mentor.id &&
      (r.status === 'pending' || r.status === 'accepted')
  );
  if (existing) {
    return res.status(409).json({ detail: `You already have an active request (${existing.status}) with this mentor` });
  }

  const newReq = {
    id: Date.now(),
    student_id: user.id,
    mentor_id: mentor.id,
    learning_goals: (learning_goals || '').trim(),
    message: (message || '').trim(),
    preferred_times: (preferred_times || '').trim(),
    status: 'pending',
    mentor_response: null,
    alternative_times: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.requests.push(newReq);

  // Notify mentor
  db.notifications.push({
    id: Date.now() + 1,
    user_id: mentor.id,
    title: 'New Mentorship Request',
    content: `${user.full_name} sent you a mentorship request: '${newReq.learning_goals.slice(0, 60)}...'`,
    type: 'request_received',
    related_id: newReq.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  saveDB(db);
  res.status(201).json(formatReq(newReq));
});

app.get('/api/mentorship-requests', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { role_view, status_filter } = req.query;

  let results = db.requests.filter((r) => {
    if (role_view === 'mentor' || (role_view === undefined && user.role === 'mentor')) {
      return r.mentor_id === user.id;
    }
    return r.student_id === user.id;
  });

  if (status_filter && status_filter !== 'all') {
    results = results.filter((r) => r.status === status_filter);
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(results.map(formatReq));
});

app.get('/api/mentorship-requests/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const reqId = Number(req.params.id);
  const r = db.requests.find((item) => item.id === reqId);
  if (!r) return res.status(404).json({ detail: 'Request not found' });

  if (r.student_id !== user.id && r.mentor_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Unauthorized' });
  }

  res.json(formatReq(r));
});

app.patch('/api/mentorship-requests/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const reqId = Number(req.params.id);
  const r = db.requests.find((item) => item.id === reqId);
  if (!r) return res.status(404).json({ detail: 'Request not found' });

  const { status: targetStatus, mentor_response, alternative_times } = req.body;

  if (targetStatus === 'accepted' || targetStatus === 'rejected') {
    if (user.id !== r.mentor_id && user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only the mentor can accept or reject this request' });
    }
    if (r.status !== 'pending') {
      return res.status(400).json({ detail: `Cannot transition from '${r.status}' to '${targetStatus}'` });
    }
  } else if (targetStatus === 'cancelled') {
    if (user.id !== r.student_id && user.role !== 'admin') {
      return res.status(403).json({ detail: 'Only the student can cancel this request' });
    }
    if (r.status !== 'pending') {
      return res.status(400).json({ detail: 'Only pending requests can be cancelled' });
    }
  }

  r.status = targetStatus;
  r.updated_at = new Date().toISOString();
  if (mentor_response !== undefined) r.mentor_response = mentor_response;
  if (alternative_times !== undefined) r.alternative_times = alternative_times;

  if (targetStatus === 'accepted') {
    let conv = db.conversations.find((c) => c.mentorship_request_id === r.id);
    if (!conv) {
      conv = {
        id: Date.now(),
        mentorship_request_id: r.id,
        student_id: r.student_id,
        mentor_id: r.mentor_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.conversations.push(conv);
    }
    db.notifications.push({
      id: Date.now() + 1,
      user_id: r.student_id,
      title: 'Mentorship Accepted! 🎉',
      content: `${user.full_name} accepted your request. You can now chat and schedule sessions.`,
      type: 'request_accepted',
      related_id: r.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } else if (targetStatus === 'rejected') {
    db.notifications.push({
      id: Date.now() + 1,
      user_id: r.student_id,
      title: 'Mentorship Request Update',
      content: `${user.full_name} declined your request. ${mentor_response ? `Note: ${mentor_response}` : ''}`,
      type: 'request_rejected',
      related_id: r.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } else if (targetStatus === 'cancelled') {
    db.notifications.push({
      id: Date.now() + 1,
      user_id: r.mentor_id,
      title: 'Request Cancelled',
      content: `${user.full_name} cancelled their mentorship request.`,
      type: 'request_cancelled',
      related_id: r.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  saveDB(db);
  res.json(formatReq(r));
});

// 5. Conversations & Messages
app.get('/api/conversations', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const userConvs = db.conversations.filter((c) => c.student_id === user.id || c.mentor_id === user.id);

  const formatted = userConvs.map((c) => {
    const student = db.users.find((u) => u.id === c.student_id);
    const mentor = db.users.find((u) => u.id === c.mentor_id);
    const msgs = db.messages.filter((m) => m.conversation_id === c.id);
    const lastMsg = msgs[msgs.length - 1] || null;
    const unreadCount = msgs.filter((m) => m.sender_id !== user.id && !m.is_read).length;

    const safeStudent = student ? (({ hashed_password, ...s }) => s)(student) : null;
    const safeMentor = mentor ? (({ hashed_password, ...m }) => m)(mentor) : null;

    return {
      id: c.id,
      mentorship_request_id: c.mentorship_request_id,
      student: safeStudent,
      mentor: safeMentor,
      last_message: lastMsg,
      unread_count: unreadCount,
      updated_at: c.updated_at,
    };
  });

  formatted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  res.json(formatted);
});

app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const convId = Number(req.params.id);
  const conv = db.conversations.find((c) => c.id === convId);
  if (!conv) return res.status(404).json({ detail: 'Conversation not found' });

  if (conv.student_id !== user.id && conv.mentor_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Unauthorized' });
  }

  // Mark read
  db.messages.forEach((m) => {
    if (m.conversation_id === convId && m.sender_id !== user.id) {
      m.is_read = true;
    }
  });
  saveDB(db);

  const msgs = db.messages.filter((m) => m.conversation_id === convId);
  msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  res.json(msgs);
});

app.post('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const convId = Number(req.params.id);
  const conv = db.conversations.find((c) => c.id === convId);
  if (!conv) return res.status(404).json({ detail: 'Conversation not found' });

  if (conv.student_id !== user.id && conv.mentor_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Unauthorized' });
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ detail: 'Message content is required' });
  }

  const newMsg = {
    id: Date.now(),
    conversation_id: conv.id,
    sender_id: user.id,
    sender_name: user.full_name,
    content: content.trim(),
    is_read: false,
    created_at: new Date().toISOString(),
  };

  db.messages.push(newMsg);
  conv.updated_at = new Date().toISOString();

  const recipientId = conv.student_id === user.id ? conv.mentor_id : conv.student_id;
  db.notifications.push({
    id: Date.now() + 1,
    user_id: recipientId,
    title: 'New Message',
    content: `${user.full_name}: ${newMsg.content.slice(0, 50)}`,
    type: 'new_message',
    related_id: conv.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  saveDB(db);
  res.status(201).json(newMsg);
});

// 6. Sessions
app.get('/api/sessions', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const userSessions = db.sessions.filter((s) => s.student_id === user.id || s.mentor_id === user.id);

  const formatted = userSessions.map((s) => {
    const student = db.users.find((u) => u.id === s.student_id);
    const mentor = db.users.find((u) => u.id === s.mentor_id);
    const safeStudent = student ? (({ hashed_password, ...u }) => u)(student) : null;
    const safeMentor = mentor ? (({ hashed_password, ...u }) => u)(mentor) : null;

    return {
      ...s,
      student: safeStudent,
      mentor: safeMentor,
    };
  });

  formatted.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  res.json(formatted);
});

app.post('/api/sessions', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { student_id, mentor_id, title, scheduled_at, duration_minutes, meeting_method, meeting_link_or_location, notes } = req.body;

  if (user.id !== Number(student_id) && user.id !== Number(mentor_id) && user.role !== 'admin') {
    return res.status(403).json({ detail: 'You must be a participant to schedule a session' });
  }

  // Conflict check for mentor
  const start = new Date(scheduled_at).getTime();
  const dur = Number(duration_minutes) || 45;
  const end = start + dur * 60000;

  const conflicts = db.sessions.filter((s) => {
    if (s.mentor_id !== Number(mentor_id) || s.status === 'cancelled') return false;
    const cStart = new Date(s.scheduled_at).getTime();
    const cEnd = cStart + (s.duration_minutes || 45) * 60000;
    return start < cEnd && end > cStart;
  });

  if (conflicts.length > 0) {
    return res.status(409).json({ detail: 'Scheduling conflict: Mentor already has a session at this time' });
  }

  const newSess = {
    id: Date.now(),
    student_id: Number(student_id),
    mentor_id: Number(mentor_id),
    title: (title || '1-on-1 Mentorship Session').trim(),
    scheduled_at,
    duration_minutes: dur,
    meeting_method: meeting_method || 'online',
    meeting_link_or_location: (meeting_link_or_location || 'https://meet.google.com/skillsphere').trim(),
    status: 'confirmed',
    notes: notes || '',
    created_by_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.sessions.push(newSess);

  const otherId = user.id === newSess.student_id ? newSess.mentor_id : newSess.student_id;
  db.notifications.push({
    id: Date.now() + 1,
    user_id: otherId,
    title: 'Session Scheduled 📅',
    content: `${user.full_name} scheduled session '${newSess.title}' on ${new Date(newSess.scheduled_at).toLocaleString()}`,
    type: 'session_scheduled',
    related_id: newSess.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  saveDB(db);

  const student = db.users.find((u) => u.id === newSess.student_id);
  const mentor = db.users.find((u) => u.id === newSess.mentor_id);
  res.status(201).json({
    ...newSess,
    student: student ? (({ hashed_password, ...u }) => u)(student) : null,
    mentor: mentor ? (({ hashed_password, ...u }) => u)(mentor) : null,
  });
});

app.patch('/api/sessions/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const sessId = Number(req.params.id);
  const sess = db.sessions.find((s) => s.id === sessId);
  if (!sess) return res.status(404).json({ detail: 'Session not found' });

  if (sess.student_id !== user.id && sess.mentor_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ detail: 'Unauthorized' });
  }

  Object.assign(sess, req.body, { updated_at: new Date().toISOString() });
  saveDB(db);

  const student = db.users.find((u) => u.id === sess.student_id);
  const mentor = db.users.find((u) => u.id === sess.mentor_id);
  res.json({
    ...sess,
    student: student ? (({ hashed_password, ...u }) => u)(student) : null,
    mentor: mentor ? (({ hashed_password, ...u }) => u)(mentor) : null,
  });
});

// 7. Notifications
app.get('/api/notifications', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const userNotifs = db.notifications.filter((n) => n.user_id === user.id);
  userNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(userNotifs.slice(0, 50));
});

app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const notifId = Number(req.params.id);
  const notif = db.notifications.find((n) => n.id === notifId && n.user_id === user.id);
  if (notif) {
    notif.is_read = true;
    saveDB(db);
  }
  res.json(notif || { success: true });
});

app.post('/api/notifications/read-all', authMiddleware, (req, res) => {
  const user = (req as any).user;
  db.notifications.forEach((n) => {
    if (n.user_id === user.id) n.is_read = true;
  });
  saveDB(db);
  res.json({ message: 'All marked as read' });
});

// 8. AI Study Buddy
app.post('/api/ai', async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const { message, career, level, goal } = req.body;

  if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      detail: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY in your environment.',
    });
  }

  try {
    const prompt = `You are the SkillSphere AI Study Buddy, an expert learning mentor in ${career || 'AI / ML'}.
The student is at ${level || 'Beginner'} level with the goal: '${goal || 'Build AI skills'}'.
Student question:
${message}

Provide a structured, encouraging, practical, and highly actionable response with concrete steps and examples.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ detail: `Gemini API returned error: ${errText}` });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    return res.json({ reply, gemini_configured: true });
  } catch (err: any) {
    return res.status(500).json({ detail: `AI connection error: ${err.message}` });
  }
});

// 9. AI Trends & Tools Endpoints
const FEED_SOURCES = [
  {
    name: 'ArXiv AI Research',
    url: 'http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=8',
    type: 'arxiv_atom',
    defaultCategory: 'Research & Papers',
  },
  {
    name: 'MIT Technology Review AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    type: 'rss',
    defaultCategory: 'Industry & News',
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    type: 'rss',
    defaultCategory: 'Industry & Investments',
  },
];

function categorizeTrendTitle(title: string, defaultCat: string): string {
  const t = title.toLowerCase();
  if (/code|developer|ide|cursor|copilot|github|sdk|api/.test(t)) return 'Coding & Dev';
  if (/agent|robot|autonomous|operator|browser|automation/.test(t)) return 'Agents & Robotics';
  if (/paper|arxiv|survey|benchmark|theory|proof/.test(t)) return 'Research & Papers';
  if (/investment|funding|startup|acquisition|valuation|market/.test(t)) return 'Industry & Investments';
  if (/llama|gemini|gpt|deepseek|claude|model|llm|weights/.test(t)) return 'Models & LLMs';
  return defaultCat;
}

async function fetchFeed(source: typeof FEED_SOURCES[0]): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SkillSphereAI/1.0 (+https://skillsphere.ai/trends)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const text = await res.text();
    const items: any[] = [];

    if (source.type === 'arxiv_atom') {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;
      while ((match = entryRegex.exec(text)) !== null && items.length < 8) {
        const entry = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entry);
        const summaryMatch = /<summary>([\s\S]*?)<\/summary>/.exec(entry);
        const idMatch = /<id>([\s\S]*?)<\/id>/.exec(entry);
        const publishedMatch = /<published>([\s\S]*?)<\/published>/.exec(entry);

        if (titleMatch && idMatch) {
          const title = titleMatch[1].replace(/\s+/g, ' ').trim();
          const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().slice(0, 400) + '...' : '';
          const url = idMatch[1].trim();
          const pubDate = publishedMatch ? new Date(publishedMatch[1].trim()).toISOString() : new Date().toISOString();
          items.push({
            title,
            summary,
            url,
            source_name: source.name,
            category: categorizeTrendTitle(title, source.defaultCategory),
            published_at: pubDate,
            retrieved_at: new Date().toISOString(),
            tags: 'ArXiv, Research, AI Breakthroughs',
          });
        }
      }
    } else {
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null && items.length < 8) {
        const itemBlock = match[1];
        const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemBlock);
        const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemBlock);
        const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/.exec(itemBlock);
        const pubMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemBlock);

        if (titleMatch && linkMatch) {
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const rawLink = linkMatch[1].trim();
          const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 350) + '...' : '';
          const pubDate = pubMatch ? new Date(pubMatch[1].trim()).toISOString() : new Date().toISOString();

          items.push({
            title: rawTitle,
            summary: rawDesc,
            url: rawLink,
            source_name: source.name,
            category: categorizeTrendTitle(rawTitle, source.defaultCategory),
            published_at: isNaN(new Date(pubDate).getTime()) ? new Date().toISOString() : pubDate,
            retrieved_at: new Date().toISOString(),
            tags: 'Market News, Real-world AI',
          });
        }
      }
    }
    return items;
  } catch (err: any) {
    console.warn(`[Trends Fetcher] Failed to fetch feed ${source.name}:`, err.message);
    return [];
  }
}

async function refreshAITrends(force = false): Promise<{ refreshed: boolean; new_items_added: number; total_trends: number }> {
  const state = db.aiTrendsState;
  if (!force && state.last_successful_refresh) {
    const elapsedMs = Date.now() - new Date(state.last_successful_refresh).getTime();
    if (elapsedMs < 10 * 60 * 1000) {
      return { refreshed: false, new_items_added: 0, total_trends: db.aiTrends.length };
    }
  }

  const sourceHealth: Record<string, string> = {};
  let addedCount = 0;

  for (const source of FEED_SOURCES) {
    const fetched = await fetchFeed(source);
    if (fetched && fetched.length > 0) {
      sourceHealth[source.name] = 'healthy';
      for (const item of fetched) {
        const exists = db.aiTrends.some((t: any) => t.url === item.url || t.title.toLowerCase() === item.title.toLowerCase());
        if (!exists) {
          item.id = Date.now() + Math.floor(Math.random() * 1000);
          db.aiTrends.unshift(item);
          addedCount++;
        }
      }
    } else {
      sourceHealth[source.name] = 'offline_cached';
    }
  }

  const seenUrls = new Set();
  db.aiTrends = db.aiTrends.filter((t: any) => {
    if (seenUrls.has(t.url)) return false;
    seenUrls.add(t.url);
    return true;
  }).slice(0, 60);

  const now = new Date();
  state.last_successful_refresh = now.toISOString();
  state.next_scheduled_refresh = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  state.items_retrieved_count = db.aiTrends.length;
  state.status_message = addedCount > 0 ? `Updated with ${addedCount} new developments` : 'Synchronized with reliable cache';
  state.source_health = sourceHealth;

  saveDB(db);
  console.log(`[Trends] Refresh complete. ${addedCount} new stories added. Total: ${db.aiTrends.length}`);
  return { refreshed: true, new_items_added: addedCount, total_trends: db.aiTrends.length };
}

function calculateFreshness(lastRefresh: string | null): 'fresh' | 'cached' | 'stale' {
  if (!lastRefresh) return 'cached';
  const ageHours = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 3600);
  if (ageHours < 12) return 'fresh';
  if (ageHours < 24) return 'cached';
  return 'stale';
}

app.get('/api/trends', (req, res) => {
  const { q, category } = req.query;
  let items = [...db.aiTrends];

  if (q && typeof q === 'string') {
    const term = q.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.source_name.toLowerCase().includes(term) ||
        (item.tags && item.tags.toLowerCase().includes(term))
    );
  }

  if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
    items = items.filter((item) => item.category.toLowerCase().includes(category.toLowerCase()));
  }

  items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  res.json(items);
});

app.get('/api/trends/tools', (req, res) => {
  const { q, category, pricing_model } = req.query;
  let items = [...db.aiTools];

  if (q && typeof q === 'string') {
    const term = q.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.use_cases.toLowerCase().includes(term)
    );
  }

  if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
    items = items.filter((item) => item.category.toLowerCase().includes(category.toLowerCase()));
  }

  if (pricing_model && typeof pricing_model === 'string' && pricing_model.toLowerCase() !== 'all') {
    items = items.filter((item) => item.pricing_model.toLowerCase().includes(pricing_model.toLowerCase()));
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  res.json(items);
});

app.get('/api/trends/status', (req, res) => {
  const state = db.aiTrendsState;
  const freshness = calculateFreshness(state.last_successful_refresh);
  res.json({
    last_successful_refresh: state.last_successful_refresh,
    next_scheduled_refresh: state.next_scheduled_refresh,
    items_retrieved_count: state.items_retrieved_count || db.aiTrends.length,
    freshness,
    status_message: state.status_message,
    source_health: state.source_health || {},
    total_trends: db.aiTrends.length,
    total_tools: db.aiTools.length,
  });
});

app.post('/api/trends/refresh', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await refreshAITrends(force);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ detail: `Refresh failed: ${err.message}` });
  }
});

// Health check for Cloud Run and load balancers
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Bootstrap Vite & Server
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist'))
    ? path.resolve(process.cwd(), 'dist')
    : path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (isProduction || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ detail: 'Not Found' });
      }
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send('SkillSphere AI is starting...');
      }
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkillSphere] Application running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SkillSphere] Port ${PORT} already in use, assuming active listener.`);
    } else {
      console.error('[SkillSphere Server Error]:', err);
    }
  });

  // Daily AI Trends Refresh Scheduler
  const refreshIntervalHours = Number(process.env.TRENDS_REFRESH_INTERVAL_HOURS) || 24;
  const intervalMs = refreshIntervalHours * 3600 * 1000;
  setInterval(() => {
    console.log('[Scheduler] Running scheduled AI Trends feed refresh...');
    refreshAITrends(true).catch((err) => console.error('[Scheduler Error]:', err));
  }, intervalMs);

  // Background refresh on startup if needed
  setTimeout(() => {
    refreshAITrends(false).catch((err) => console.error('[Startup Trends Refresh Error]:', err));
  }, 3000);
}

startServer().catch((err) => {
  console.error('[Startup Error]:', err);
});
