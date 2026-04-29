import type { EcosystemConfig } from './types';

export const ECOSYSTEMS: EcosystemConfig[] = [
  {
    slug: 'claude',
    rssFeeds: [
      'https://www.anthropic.com/rss.xml',
      'https://docs.anthropic.com/rss.xml',
    ],
    subreddits: ['ClaudeAI'],
    githubRepos: [
      'anthropics/anthropic-sdk-python',
      'anthropics/anthropic-sdk-typescript',
    ],
    integrationsRepo: 'punkpeye/awesome-mcp-servers',
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Claude (Anthropic\'s AI model) ' +
      'via the API. Focus on: tool use patterns, system prompt design, streaming responses, ' +
      'production deployment, and cost optimization. Each best practice should have a clear ' +
      'title and an actionable body (150-250 words) for developers building production ' +
      'applications. Return as JSON array: [{"title": "...", "body": "..."}]',
  },
  {
    slug: 'openai',
    rssFeeds: ['https://openai.com/blog/rss.xml'],
    subreddits: ['ChatGPT', 'OpenAI'],
    githubRepos: ['openai/openai-python', 'openai/openai-node'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using the OpenAI API ' +
      '(GPT-4o, o1, o3 models). Focus on: structured outputs, function calling, ' +
      'context window management, rate limiting strategies, and production error ' +
      'handling. Each best practice should have a clear title and an actionable ' +
      'body (150-250 words) for developers building production applications. ' +
      'Return as JSON array: [{"title": "...", "body": "..."}]',
  },
  {
    slug: 'gemini',
    rssFeeds: ['https://blog.google/technology/ai/rss/'],
    subreddits: ['Bard', 'GoogleGeminiAI'],
    githubRepos: ['google-gemini/generative-ai-python'],
    bestPracticesPrompt:
      'Generate 3 current best practices for developers using Google Gemini ' +
      '(Gemini 2.0 Pro/Flash) via the API. Focus on: multimodal inputs, function ' +
      'calling, context caching, grounding with Google Search, and safety settings. ' +
      'Each best practice should have a clear title and an actionable body ' +
      '(150-250 words) for developers building production applications. ' +
      'Return as JSON array: [{"title": "...", "body": "..."}]',
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
      'and production deployment pitfalls. Each best practice should have a clear ' +
      'title and an actionable body (150-250 words) for developers building ' +
      'production applications. ' +
      'Return as JSON array: [{"title": "...", "body": "..."}]',
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
      'with existing OpenAI SDK clients. Each best practice should have a clear ' +
      'title and an actionable body (150-250 words) for developers building ' +
      'production applications. ' +
      'Return as JSON array: [{"title": "...", "body": "..."}]',
  },
];
