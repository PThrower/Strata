import type { EcosystemConfig } from './types';

const BP_SUFFIX = ' Each best practice should have a clear title and an actionable body (150-250 words) for developers building production applications. Return as JSON array: [{"title": "...", "body": "..."}]';

export const ECOSYSTEMS: EcosystemConfig[] = [

  // ── Core (Free + Pro) ────────────────────────────────────────────────────
  {
    slug: 'claude',
    rssFeeds: [],
    subreddits: ['ClaudeAI'],
    githubRepos: [
      'anthropics/anthropic-sdk-python',
      'anthropics/anthropic-sdk-typescript',
    ],
    integrationsRepo: 'punkpeye/awesome-mcp-servers',
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Claude (Anthropic\'s AI model) ' +
      'via the API. Focus on: tool use patterns, system prompt design, streaming responses, ' +
      'production deployment, and cost optimization.' + BP_SUFFIX,
  },
  {
    slug: 'openai',
    rssFeeds: ['https://openai.com/blog/rss.xml'],
    subreddits: ['ChatGPT', 'OpenAI'],
    githubRepos: ['openai/openai-python', 'openai/openai-node'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using the OpenAI API ' +
      '(GPT-4o, o1, o3 models). Focus on: structured outputs, function calling, ' +
      'context window management, rate limiting strategies, and production error handling.' + BP_SUFFIX,
  },
  {
    slug: 'gemini',
    rssFeeds: ['https://blog.google/technology/ai/rss/'],
    subreddits: ['Bard', 'GoogleGeminiAI'],
    githubRepos: ['google-gemini/generative-ai-python'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Google Gemini ' +
      '(Gemini 2.0 Pro/Flash) via the API. Focus on: multimodal inputs, function ' +
      'calling, context caching, grounding with Google Search, and safety settings.' + BP_SUFFIX,
  },
  {
    slug: 'langchain',
    rssFeeds: ['https://blog.langchain.dev/rss/'],
    subreddits: ['LangChain'],
    githubRepos: ['langchain-ai/langchain', 'langchain-ai/langchainjs'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using LangChain (v0.3) ' +
      'to build AI applications. Focus on: LCEL (LangChain Expression Language), ' +
      'LangGraph for stateful agents, retrieval patterns, tracing with LangSmith, ' +
      'and production deployment pitfalls.' + BP_SUFFIX,
  },
  {
    slug: 'ollama',
    rssFeeds: ['https://ollama.com/blog/rss.xml'],
    subreddits: ['ollama', 'LocalLLaMA'],
    githubRepos: ['ollama/ollama'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Ollama to run local ' +
      'LLMs. Focus on: model selection for different hardware, OpenAI-compatible API ' +
      'usage, GPU memory management, productionizing with Docker, and integrating ' +
      'with existing OpenAI SDK clients.' + BP_SUFFIX,
  },

  // ── AI Coding Tools (Pro) ────────────────────────────────────────────────
  {
    slug: 'cursor',
    rssFeeds: [],
    subreddits: ['cursor', 'cursorAI'],
    githubRepos: ['getcursor/cursor'],
    integrationsRepo: 'PatrickJS/awesome-cursorrules',
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Cursor AI editor. ' +
      'Focus on: effective prompting in the editor, codebase context management, ' +
      'agent mode vs chat mode, and integrating Cursor into team workflows.' + BP_SUFFIX,
  },
  {
    slug: 'claudecode',
    rssFeeds: [],
    subreddits: ['ClaudeAI', 'claudecode'],
    githubRepos: ['anthropics/claude-code'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Claude Code. ' +
      'Focus on: CLAUDE.md setup, effective task prompting, MCP server integration, ' +
      'multi-agent workflows, and permission management.' + BP_SUFFIX,
  },
  {
    slug: 'codex',
    rssFeeds: ['https://openai.com/blog/rss.xml'],
    subreddits: ['OpenAI', 'ChatGPT'],
    githubRepos: ['openai/codex'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using the OpenAI Codex CLI agent. ' +
      'Focus on: sandboxed code execution, AGENTS.md context files, approval mode for ' +
      'production safety, composing multi-step tasks, and integrating Codex into CI/CD ' +
      'pipelines.' + BP_SUFFIX,
  },
  {
    slug: 'windsurf',
    rssFeeds: ['https://codeium.com/blog/rss.xml'],
    subreddits: ['windsurf', 'Codeium'],
    githubRepos: ['Exafunction/codeium'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Windsurf IDE. ' +
      'Focus on: Cascade agent workflows, Flow awareness, multi-file edits, ' +
      'and team collaboration features.' + BP_SUFFIX,
  },
  {
    slug: 'copilot',
    rssFeeds: ['https://github.blog/feed/'],
    subreddits: ['GithubCopilot', 'github'],
    githubRepos: ['github/copilot-docs'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using GitHub Copilot. ' +
      'Focus on: effective comment-driven prompting, workspace context, Copilot Chat ' +
      'vs completions, and enterprise security considerations.' + BP_SUFFIX,
  },
  {
    slug: 'cody',
    rssFeeds: ['https://sourcegraph.com/blog/rss.xml'],
    subreddits: ['sourcegraph'],
    githubRepos: ['sourcegraph/cody'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Sourcegraph Cody. ' +
      'Focus on: codebase-aware context, multi-repo understanding, custom commands, ' +
      'and IDE integration patterns.' + BP_SUFFIX,
  },

  // ── AI Search & Research (Pro) ───────────────────────────────────────────
  {
    slug: 'perplexity',
    rssFeeds: [],
    subreddits: ['perplexity_ai', 'PerplexityAI'],
    githubRepos: ['perplexity-ai/perplexity-mcp'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers integrating Perplexity into ' +
      'AI applications. Focus on: API usage for real-time search, combining Perplexity ' +
      'with LLMs, sonar models, and citation handling in agent pipelines.' + BP_SUFFIX,
  },
  {
    slug: 'youcom',
    rssFeeds: ['https://you.com/blog/rss.xml'],
    subreddits: ['YouDotCom'],
    githubRepos: [],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using the You.com API. ' +
      'Focus on: web search integration, RAG pipelines, research mode vs search mode, ' +
      'and structured output handling.' + BP_SUFFIX,
  },
  {
    slug: 'exa',
    rssFeeds: [],
    subreddits: ['exa_ai'],
    githubRepos: ['exa-labs/exa-mcp-server'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Exa search API. ' +
      'Focus on: neural search vs keyword search, contents retrieval, MCP server ' +
      'integration, and agent-friendly structured results.' + BP_SUFFIX,
  },

  // ── AI Infrastructure (Pro) ──────────────────────────────────────────────
  {
    slug: 'replicate',
    rssFeeds: ['https://replicate.com/changelog/rss'],
    subreddits: ['replicate'],
    githubRepos: [
      'replicate/replicate-python',
      'replicate/replicate-javascript',
    ],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Replicate for model ' +
      'inference. Focus on: streaming predictions, webhook handling, model versioning, ' +
      'cost optimization, and integrating Replicate into production pipelines.' + BP_SUFFIX,
  },
  {
    slug: 'togetherai',
    rssFeeds: ['https://www.together.ai/blog/rss.xml'],
    subreddits: ['togetherai'],
    githubRepos: ['togethercomputer/together-python'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Together.ai for inference. ' +
      'Focus on: model selection for cost vs quality, batch inference, fine-tuning ' +
      'workflows, and OpenAI-compatible API migration.' + BP_SUFFIX,
  },
  {
    slug: 'groq',
    rssFeeds: ['https://groq.com/feed/'],
    subreddits: ['groq', 'GroqInc'],
    githubRepos: ['groq/groq-python', 'groq/groq-typescript'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Groq for ultra-fast ' +
      'inference. Focus on: latency optimization, model selection, rate limit handling, ' +
      'streaming responses, and use cases where Groq\'s speed creates unique product ' +
      'opportunities.' + BP_SUFFIX,
  },
  {
    slug: 'fireworks',
    rssFeeds: [],
    subreddits: ['fireworksai'],
    githubRepos: ['fw-ai/fireworks-js'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Fireworks AI. ' +
      'Focus on: compound AI systems, FireFunction for tool calling, serverless vs ' +
      'dedicated deployments, and structured output generation.' + BP_SUFFIX,
  },

  // ── AI Agents & Media (Pro) ──────────────────────────────────────────────
  {
    slug: 'manus',
    rssFeeds: [],
    subreddits: ['manus_ai', 'ManusAI'],
    githubRepos: [],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers integrating Manus into AI ' +
      'workflows. Focus on: autonomous task design, prompt engineering for agents, ' +
      'handling multi-step workflows, and integrating Manus with existing developer ' +
      'pipelines.' + BP_SUFFIX,
  },
  {
    slug: 'higgsfield',
    rssFeeds: [],
    subreddits: ['higgsfield', 'AIVideo'],
    githubRepos: ['higgsfield-ai/higgsfield-client'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using the Higgsfield AI API. ' +
      'Focus on: video generation prompt engineering, credit optimization, webhook ' +
      'handling for async generation, and integrating Higgsfield into content ' +
      'production pipelines.' + BP_SUFFIX,
  },
  {
    slug: 'v0',
    rssFeeds: ['https://vercel.com/feed.xml'],
    subreddits: ['vercel', 'nextjs'],
    githubRepos: ['vercel/v0'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using v0 by Vercel. ' +
      'Focus on: effective prompt engineering for UI generation, iterating on ' +
      'components, integrating v0 output into Next.js projects, and using v0 in ' +
      'design-to-code workflows.' + BP_SUFFIX,
  },
  {
    slug: 'bolt',
    rssFeeds: ['https://blog.stackblitz.com/rss.xml'],
    subreddits: ['boltai', 'StackBlitz'],
    githubRepos: ['stackblitz/bolt.new'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Bolt by StackBlitz. ' +
      'Focus on: full-stack app generation, iterating on generated code, deployment ' +
      'workflows, and using Bolt for rapid prototyping alongside traditional ' +
      'development.' + BP_SUFFIX,
  },
];
