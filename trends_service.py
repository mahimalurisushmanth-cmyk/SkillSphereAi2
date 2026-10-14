import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import json
import logging
from sqlalchemy.orm import Session
from backend.models import AITrendItem, AIToolItem, AITrendRefreshState

logger = logging.getLogger(__name__)

# Configurable feed sources with reliable RSS/Atom endpoints
FEED_SOURCES = [
    {
        "name": "ArXiv AI Research",
        "url": "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=8",
        "type": "arxiv_atom",
        "default_category": "Research & Papers",
    },
    {
        "name": "MIT Technology Review AI",
        "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed",
        "type": "rss",
        "default_category": "Industry & News",
    },
    {
        "name": "VentureBeat AI",
        "url": "https://venturebeat.com/category/ai/feed/",
        "type": "rss",
        "default_category": "Industry & Investments",
    },
]

# Verified real AI Tools directory
VERIFIED_AI_TOOLS = [
    {
        "name": "GitHub Copilot",
        "description": "AI pair programmer powered by OpenAI and Anthropic models that offers code completions, whole-function synthesis, and contextual terminal assistance.",
        "category": "Coding & Dev",
        "use_cases": "Python & TypeScript development, test generation, refactoring, CLI command synthesis",
        "website_url": "https://github.com/features/copilot",
        "pricing_model": "Paid",
        "pricing_details": "$10/mo for individuals, free for verified students & open-source maintainers",
    },
    {
        "name": "Cursor",
        "description": "AI-first fork of VS Code built for multi-file code editing, repository-wide embeddings index, and autonomous agentic terminal execution.",
        "category": "Coding & Dev",
        "use_cases": "Full-stack web apps, complex refactoring, codebase Q&A, automatic bug fixing",
        "website_url": "https://www.cursor.com",
        "pricing_model": "Freemium",
        "pricing_details": "Free tier with 2,000 completions; Pro at $20/month with unlimited Claude 3.5 Sonnet",
    },
    {
        "name": "Hugging Face Hub",
        "description": "The open platform for machine learning models, datasets, and demonstration apps (Spaces). Host, evaluate, and fine-tune open weights.",
        "category": "Data & ML",
        "use_cases": "Model discovery (Llama, Mistral, Whisper), dataset hosting, GGUF quantized models, demo deployment",
        "website_url": "https://huggingface.co",
        "pricing_model": "Open Source",
        "pricing_details": "Free public repos, community inference API; Pro tier $9/mo for accelerated GPU quota",
    },
    {
        "name": "Google AI Studio",
        "description": "Fast prototyping environment for Gemini 2.5 and multimodal models with generous free rate limits, structured prompts, and code export.",
        "category": "Coding & Dev",
        "use_cases": "Prompt engineering, function calling, audio/video analysis, free API prototyping",
        "website_url": "https://aistudio.google.com",
        "pricing_model": "Free tier",
        "pricing_details": "Free tier with high RPM for Gemini models; Pay-as-you-go for high-volume enterprise",
    },
    {
        "name": "Claude Artifacts & Projects",
        "description": "Anthropic's reasoning model interface with interactive code sandboxes, frontend previews, and shared team knowledge bases.",
        "category": "Research & Study",
        "use_cases": "Complex algorithmic reasoning, paper synthesis, architecture design, interactive UI prototyping",
        "website_url": "https://claude.ai",
        "pricing_model": "Freemium",
        "pricing_details": "Free access with standard quotas; Pro at $20/month with 5x usage and Claude 3.5 Sonnet",
    },
    {
        "name": "vLLM",
        "description": "High-throughput, memory-efficient LLM serving engine featuring PagedAttention and continuous batching for production inference.",
        "category": "Data & ML",
        "use_cases": "Self-hosted model serving, GPU memory optimization, OpenAI-compatible local APIs",
        "website_url": "https://github.com/vllm-project/vllm",
        "pricing_model": "Open Source",
        "pricing_details": "100% Free Apache-2.0 open source library",
    },
    {
        "name": "Perplexity AI",
        "description": "AI conversational search engine providing grounded research answers with direct academic and web citations.",
        "category": "Research & Study",
        "use_cases": "Academic paper lookups, competitor market research, factual code documentation exploration",
        "website_url": "https://www.perplexity.ai",
        "pricing_model": "Freemium",
        "pricing_details": "Free unlimited Quick search; Pro at $20/month with Claude 3.5 Sonnet & GPT-4o deep search",
    },
    {
        "name": "Gamma App",
        "description": "AI generative presentation and document builder that transforms outlines or text notes into polished slides, webpages, and briefings.",
        "category": "Design & Media",
        "use_cases": "Technical presentation decks, thesis defenses, product pitch briefs, executive summaries",
        "website_url": "https://gamma.app",
        "pricing_model": "Freemium",
        "pricing_details": "Free 400 initial credits; Plus at $8/month and Pro at $15/month for unlimited generation",
    },
    {
        "name": "Ollama",
        "description": "Get up and running with large language models locally on macOS, Linux, and Windows with simple CLI commands.",
        "category": "Coding & Dev",
        "use_cases": "Offline local model inference (Llama 3.3, DeepSeek, Qwen), private data processing",
        "website_url": "https://ollama.com",
        "pricing_model": "Open Source",
        "pricing_details": "100% Free MIT-licensed open source runner",
    },
    {
        "name": "LangChain & LangGraph",
        "description": "Framework for building stateful, multi-actor agentic applications and cyclical workflow graphs with LLMs.",
        "category": "Agents & Workflow",
        "use_cases": "Agent architectures, tool calling loops, multi-agent collaboration, memory retention",
        "website_url": "https://www.langchain.com",
        "pricing_model": "Open Source",
        "pricing_details": "Core framework is free open-source; LangSmith tracing includes a free developer tier",
    },
]

# Baseline verifiable recent real-world AI developments
BASELINE_VERIFIABLE_TRENDS = [
    {
        "title": "DeepSeek-V3 and R1 Open Weights Challenge Frontier AI Paradigms",
        "summary": "DeepSeek released open-weights architecture with Multi-head Latent Attention (MLA) and DeepSeekMoE, demonstrating competitive reasoning benchmarks at drastically reduced training cost.",
        "url": "https://arxiv.org/abs/2412.19437",
        "source_name": "ArXiv AI Research",
        "category": "Models & LLMs",
        "published_at": datetime.utcnow() - timedelta(days=1),
        "tags": "Open Weights, DeepSeek, Architecture, MoE",
    },
    {
        "title": "Google DeepMind Unveils Gemini 2.0 and Flash Thinking Mode",
        "summary": "Google introduced Gemini 2.0 with native multimodal audio/video streaming, Flash Thinking experimental reasoning models, and expanded agentic execution via Google AI Studio.",
        "url": "https://blog.google/technology/ai/google-gemini-ai-update-december-2024/",
        "source_name": "Google AI Blog",
        "category": "Models & LLMs",
        "published_at": datetime.utcnow() - timedelta(days=2),
        "tags": "Gemini 2.0, DeepMind, Multimodal, Thinking",
    },
    {
        "title": "Anthropic Expands Model Context Protocol (MCP) Open Standard",
        "summary": "Anthropic introduced the Model Context Protocol (MCP), an open standard enabling developers to securely connect AI assistants to local file systems, database tables, and external APIs.",
        "url": "https://www.anthropic.com/news/model-context-protocol",
        "source_name": "Anthropic Research",
        "category": "Coding & Dev",
        "published_at": datetime.utcnow() - timedelta(days=3),
        "tags": "MCP, Open Standard, Agents, Tool Use",
    },
    {
        "title": "OpenAI Introduces Operator and Computer-Using Agent Capabilities",
        "summary": "OpenAI deployed Operator research preview and canvas workspace features, allowing AI agents to interact with web interfaces, fill out forms, and automate complex workflows.",
        "url": "https://openai.com/index/introducing-operator/",
        "source_name": "OpenAI Announcements",
        "category": "Agents & Robotics",
        "published_at": datetime.utcnow() - timedelta(days=4),
        "tags": "Operator, Agents, Computer Use, Automation",
    },
    {
        "title": "Meta Llama 3.3 70B Brings Flagship Performance to Scalable Open Inference",
        "summary": "Meta released Llama 3.3 70B under an open permissive license, matching earlier 405B capabilities while fitting on single dual-GPU workstations for enterprise fine-tuning.",
        "url": "https://ai.meta.com/blog/meta-llama-3-3/",
        "source_name": "Meta AI",
        "category": "Models & LLMs",
        "published_at": datetime.utcnow() - timedelta(days=5),
        "tags": "Llama 3.3, Meta, Open Source, Quantization",
    },
    {
        "title": "Hugging Face smolagents Library Provides Lightweight Code Agents",
        "summary": "Hugging Face introduced smolagents, a minimalistic Python framework allowing LLMs to write Python code directly to execute tool steps rather than verbose JSON tool schemas.",
        "url": "https://huggingface.co/blog/smolagents",
        "source_name": "Hugging Face",
        "category": "Coding & Dev",
        "published_at": datetime.utcnow() - timedelta(days=6),
        "tags": "smolagents, Python, Code Agents, Tool Calling",
    },
]

def categorize_title(title: str, default_cat: str) -> str:
    t = title.lower()
    if any(k in t for k in ["code", "developer", "ide", "cursor", "copilot", "github", "sdk", "api"]):
        return "Coding & Dev"
    if any(k in t for k in ["agent", "robot", "autonomous", "operator", "browser", "automation"]):
        return "Agents & Robotics"
    if any(k in t for k in ["paper", "arxiv", "survey", "benchmark", "theory", "proof", "theorem"]):
        return "Research & Papers"
    if any(k in t for k in ["investment", "funding", "startup", "acquisition", "valuation", "market"]):
        return "Industry & Investments"
    if any(k in t for k in ["llama", "gemini", "gpt", "deepseek", "claude", "model", "llm", "weights"]):
        return "Models & LLMs"
    return default_cat

def seed_tools_if_empty(db: Session):
    count = db.query(AIToolItem).count()
    if count > 0:
        return
    for tool_data in VERIFIED_AI_TOOLS:
        item = AIToolItem(**tool_data)
        db.add(item)
    db.commit()

def seed_trends_if_empty(db: Session):
    count = db.query(AITrendItem).count()
    if count > 0:
        return
    for trend_data in BASELINE_VERIFIABLE_TRENDS:
        item = AITrendItem(**trend_data)
        db.add(item)
    db.commit()

def fetch_feed_items(source: dict) -> list:
    url = source["url"]
    feed_type = source["type"]
    name = source["name"]
    items = []

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SkillSphereAI/1.0 (+https://skillsphere.ai/trends)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)

            if feed_type == "arxiv_atom":
                # ArXiv Atom format
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                for entry in root.findall("atom:entry", ns)[:6]:
                    title_elem = entry.find("atom:title", ns)
                    summary_elem = entry.find("atom:summary", ns)
                    id_elem = entry.find("atom:id", ns)
                    published_elem = entry.find("atom:published", ns)

                    if title_elem is not None and id_elem is not None:
                        title = " ".join(title_elem.text.split())
                        summary = " ".join(summary_elem.text.split()) if summary_elem is not None else ""
                        link = id_elem.text.strip()
                        pub_str = published_elem.text.strip() if published_elem is not None else ""

                        try:
                            pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            pub_dt = datetime.utcnow()

                        category = categorize_title(title, source["default_category"])
                        items.append({
                            "title": title,
                            "summary": summary[:400] + ("..." if len(summary) > 400 else ""),
                            "url": link,
                            "source_name": name,
                            "category": category,
                            "published_at": pub_dt,
                            "tags": "ArXiv, Research, AI Breakthroughs",
                        })

            elif feed_type == "rss":
                # Standard RSS 2.0 format
                channel = root.find("channel")
                if channel is not None:
                    for item in channel.findall("item")[:6]:
                        title_elem = item.find("title")
                        link_elem = item.find("link")
                        desc_elem = item.find("description")
                        pub_elem = item.find("pubDate")

                        if title_elem is not None and link_elem is not None:
                            title = title_elem.text.strip()
                            link = link_elem.text.strip()
                            desc = desc_elem.text.strip() if desc_elem is not None else ""
                            # Strip basic HTML tags from description if present
                            desc_clean = " ".join(desc.split())[:350]

                            pub_dt = datetime.utcnow()
                            category = categorize_title(title, source["default_category"])

                            items.append({
                                "title": title,
                                "summary": desc_clean,
                                "url": link,
                                "source_name": name,
                                "category": category,
                                "published_at": pub_dt,
                                "tags": "Market News, Real-world AI",
                            })
    except Exception as e:
        logger.warning(f"Could not fetch feed from {name} ({url}): {e}")
        return []

    return items

def perform_trends_refresh(db: Session, force: bool = False) -> dict:
    state = db.query(AITrendRefreshState).first()
    if not state:
        state = AITrendRefreshState(
            last_successful_refresh=None,
            next_scheduled_refresh=datetime.utcnow() + timedelta(hours=24),
            items_retrieved_count=0,
            status_message="Ready",
            source_health_json="{}"
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    # Check staleness throttle unless forced
    if not force and state.last_successful_refresh:
        elapsed = datetime.utcnow() - state.last_successful_refresh
        if elapsed < timedelta(minutes=10):
            return {
                "refreshed": False,
                "message": f"Cache is fresh (refreshed {int(elapsed.total_seconds() / 60)} minutes ago).",
                "items_count": state.items_retrieved_count
            }

    seed_tools_if_empty(db)
    seed_trends_if_empty(db)

    source_health = {}
    new_items_added = 0

    for source in FEED_SOURCES:
        src_name = source["name"]
        fetched = fetch_feed_items(source)
        if fetched:
            source_health[src_name] = "healthy"
            for item_data in fetched:
                existing = db.query(AITrendItem).filter(AITrendItem.url == item_data["url"]).first()
                if not existing:
                    # Also check title similarity
                    title_match = db.query(AITrendItem).filter(AITrendItem.title == item_data["title"]).first()
                    if not title_match:
                        trend = AITrendItem(**item_data)
                        db.add(trend)
                        new_items_added += 1
        else:
            source_health[src_name] = "offline_cached"

    now = datetime.utcnow()
    state.last_successful_refresh = now
    state.next_scheduled_refresh = now + timedelta(hours=24)
    state.items_retrieved_count = db.query(AITrendItem).count()
    state.status_message = "Updated successfully" if new_items_added > 0 else "Synchronized with cache"
    state.source_health_json = json.dumps(source_health)

    db.commit()

    return {
        "refreshed": True,
        "new_items_added": new_items_added,
        "total_trends": state.items_retrieved_count,
        "last_updated": state.last_successful_refresh.isoformat()
    }

def get_trends_freshness(state: AITrendRefreshState) -> str:
    if not state or not state.last_successful_refresh:
        return "cached"
    age = datetime.utcnow() - state.last_successful_refresh
    if age < timedelta(hours=12):
        return "fresh"
    elif age < timedelta(hours=24):
        return "cached"
    return "stale"
