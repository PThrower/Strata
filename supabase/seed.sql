-- =============================================================
-- ECOSYSTEMS
-- claude + openai: available_on_free = true
-- gemini + langchain + ollama: available_on_free = false
-- =============================================================

INSERT INTO public.ecosystems (id, slug, name, vendor, version, status, available_on_free) VALUES
  (gen_random_uuid(), 'claude',     'Claude',     'anthropic', '3.7',   'live', true),
  (gen_random_uuid(), 'openai',     'OpenAI',     'openai',    'gpt-4o','live', true),
  (gen_random_uuid(), 'gemini',     'Gemini',     'google',    '2.0',   'live', false),
  (gen_random_uuid(), 'langchain',  'LangChain',  'langchain', 'v0.3',  'live', false),
  (gen_random_uuid(), 'ollama',     'Ollama',     'ollama',    'local', 'live', false);

-- =============================================================
-- CONTENT ITEMS
--
-- Distribution per ecosystem:
--   3 best_practices  (all is_pro_only = false)
--   5 news            (3 is_pro_only = false, 2 is_pro_only = true)
--   3 integrations    (all is_pro_only = false)
--
-- This seeds all four tier-enforcement quadrants:
--   A: free ecosystem  + is_pro_only=false -> ALLOW for free users
--   B: free ecosystem  + is_pro_only=true  -> BLOCK at content level
--   C: pro ecosystem   + is_pro_only=false -> BLOCK at ecosystem level
--   D: pro ecosystem   + is_pro_only=true  -> BLOCK at both levels
-- =============================================================

-- -------------------------------------------------------------
-- CLAUDE — best_practices
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'claude', 'best_practices',
 'Always define tool schemas with strict types',
 'When building tool-use workflows with Claude, define input_schema with strict JSON Schema types. Avoid open-ended string fields where enums or structured types are possible. This reduces hallucinated tool calls significantly.',
 null, '2025-08-12 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'best_practices',
 'Use prefill to steer response format without extra tokens',
 'Place partial assistant content in the messages array with role assistant before sending the API request. Claude will continue from exactly that point, letting you enforce response structure — for example, opening with { to guarantee JSON — without spending tokens on formatting instructions.',
 null, '2025-09-03 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'best_practices',
 'Structure system prompts with XML tags for complex multi-part instructions',
 'Claude is trained to pay close attention to XML tag structure. Wrapping distinct sections of your system prompt in tags like <role>, <context>, <constraints>, and <examples> significantly improves instruction following compared to plain prose, especially for long or multi-part prompts.',
 null, '2025-10-18 00:00:00+00', false);

-- -------------------------------------------------------------
-- CLAUDE — news
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'claude', 'news',
 'Claude 3.7 Sonnet launches with extended thinking mode',
 'Anthropic released Claude 3.7 Sonnet with an optional extended thinking mode that allocates a configurable token budget for chain-of-thought reasoning before producing a response. In internal evaluations, extended thinking improved accuracy on multi-step math, code debugging, and long-horizon planning tasks by up to 40% compared to standard mode. The feature is available via the thinking parameter in the Messages API.',
 null, '2026-02-15 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'news',
 'Anthropic expands tool_choice with explicit none fallback option',
 'Anthropic updated the Messages API to improve behavior when tool_choice: any is specified. The model now more reliably selects from the available tool set rather than responding in text when no exact match is found. The update also adds an explicit none fallback option, giving developers finer control over tool selection behavior in multi-tool workflows.',
 null, '2026-01-22 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'news',
 'Claude API adds native PDF document support',
 'Developers can now pass PDF files directly in the messages array using the document content type, with Anthropic handling extraction, layout analysis, and chunking server-side. PDFs up to 32 MB and 100 pages are supported. This eliminates the need for preprocessing pipelines using tools like PyMuPDF or pdfplumber for the majority of document ingestion use cases.',
 null, '2025-11-10 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'news',
 'Prompt caching now supports up to 1M tokens across sessions',
 'Anthropic has raised the prompt caching limit from 100K to 1M tokens, enabling teams to cache entire large codebases, documentation corpora, or product catalogs and reuse them across thousands of API requests at a 90% cost reduction. The extended cache is available exclusively on Claude Pro API plans and must be explicitly enabled via the cache_control beta header. Cache hits are guaranteed for up to 5 minutes and are tracked separately in the usage object.',
 null, '2026-03-05 00:00:00+00', true),

(gen_random_uuid(), 'claude', 'news',
 'Claude Batch API reaches GA with 50% cost reduction on async workloads',
 'The Claude Batch API exited beta and is now generally available for Pro tier API customers. Batch requests are processed asynchronously within 24 hours and are priced at 50% of standard synchronous API rates, making large-scale offline jobs — document classification, content moderation, data extraction — significantly more economical. Batch jobs support up to 100,000 requests per job and return results as newline-delimited JSON.',
 null, '2026-03-28 00:00:00+00', true);

-- -------------------------------------------------------------
-- CLAUDE — integrations
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'claude', 'integrations',
 'Integrating Claude with Supabase Edge Functions for serverless AI',
 'Deploy Claude-powered API endpoints using Supabase Edge Functions and the Anthropic TypeScript SDK. Edge Functions run in Deno on Cloudflare network, giving global low-latency inference with no cold starts. Pass the Anthropic API key via Supabase Vault secrets, stream responses using Server-Sent Events to the client, and use Supabase Row Level Security to gate access by user tier — all without managing infrastructure.',
 null, '2025-09-22 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'integrations',
 'Building Claude-powered chatbots with the Vercel AI SDK',
 'The Vercel AI SDK @ai-sdk/anthropic provider wraps the Claude Messages API with built-in streaming, tool calling, and React hooks (useChat, useCompletion). Use streamText in a Next.js Route Handler to stream Claude responses to the client, and generateObject with a Zod schema for structured extraction. The SDK handles backpressure, cancellation, and reconnection automatically.',
 null, '2025-10-08 00:00:00+00', false),

(gen_random_uuid(), 'claude', 'integrations',
 'Using Claude tool use with LangChain for complex agent workflows',
 'LangChain ChatAnthropic integrates natively with Claude tool use via LCEL. Define tools as Pydantic models, bind them to the model with .bind_tools(), and route tool call responses back into the chain. For multi-step agents, use LangGraph with ChatAnthropic as the reasoning node to build workflows with conditional branching, memory, and human-in-the-loop interrupts.',
 null, '2025-11-14 00:00:00+00', false);

-- -------------------------------------------------------------
-- OPENAI — best_practices
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'openai', 'best_practices',
 'Enable strict mode in function calling to eliminate schema violations',
 'Set strict: true in your function definition when calling the Chat Completions API. Strict mode constrains the model to output only valid JSON that matches your schema exactly, eliminating the need for defensive parsing and retry logic on malformed tool call arguments.',
 null, '2025-08-20 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'best_practices',
 'Use structured outputs for reliable JSON extraction',
 'Pass response_format with type json_schema and strict: true to guarantee the model returns JSON matching your exact schema. Unlike json_object mode, structured outputs validates output at generation time, making malformed responses impossible without relying on retry logic.',
 null, '2025-09-11 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'best_practices',
 'Prefer the Assistants API for stateful multi-turn workflows',
 'The Assistants API manages conversation threads, file attachments, and tool execution state server-side, eliminating the need to manually maintain and truncate message history. For workflows with many turns or long context, this reduces token usage and simplifies client code significantly compared to the Chat Completions API.',
 null, '2025-10-25 00:00:00+00', false);

-- -------------------------------------------------------------
-- OPENAI — news
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'openai', 'news',
 'GPT-4o released with dramatically improved vision and reasoning',
 'OpenAI launched GPT-4o as a unified model handling text, vision, and audio natively without routing through separate modality-specific models. GPT-4o matches GPT-4 Turbo on text benchmarks while running at twice the speed and half the cost. Vision capabilities are substantially improved, with accurate reading of handwritten text, dense charts, and low-resolution images where previous models failed.',
 null, '2025-10-15 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'news',
 'Realtime API adds WebRTC transport for sub-300ms voice latency',
 'OpenAI updated the Realtime API to support WebRTC as an alternative to WebSocket transport. WebRTC reduces voice round-trip latency from 400 to 700ms with WebSocket transport to under 300ms by enabling peer-to-peer media streams that bypass server-side audio buffering. The browser SDK handles ICE negotiation automatically — developers switch transports by passing transport: webrtc in the client constructor.',
 null, '2026-01-30 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'news',
 'GPT-4o mini tops small model benchmarks at fraction of GPT-4o cost',
 'OpenAI released GPT-4o mini as a lightweight replacement for GPT-3.5 Turbo, outperforming it on MMLU, HumanEval, and MATH benchmarks while costing 60% less per token. The model is optimized for high-volume, latency-sensitive tasks like classification, extraction, and tool routing where full GPT-4o capability is unnecessary. OpenAI recommends GPT-4o mini as the default for applications requiring more than 1M tokens per day.',
 null, '2025-09-20 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'news',
 'Batch API now processes up to 100K requests asynchronously',
 'OpenAI raised the Batch API limit from 50K to 100K requests per batch job. Jobs complete within 24 hours and are priced at 50% of synchronous API rates. The expanded limit and improved throughput make the Batch API practical for large-scale offline workloads including dataset annotation, bulk embedding generation, and product catalog enrichment. Results are available via polling or webhook callback and expire after 30 days.',
 null, '2026-02-10 00:00:00+00', true),

(gen_random_uuid(), 'openai', 'news',
 'Fine-tuning GPT-4o now available with custom data and validation',
 'OpenAI opened fine-tuning access for GPT-4o to qualified enterprise customers on usage-based plans. Fine-tuned models are served through the standard Chat Completions API with a custom model ID. The fine-tuning dashboard includes built-in validation set metrics tracked per epoch, and OpenAI recommends at minimum 50 high-quality examples with clear input-output pairs to see measurable quality improvements over prompting alone.',
 null, '2026-03-18 00:00:00+00', true);

-- -------------------------------------------------------------
-- OPENAI — integrations
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'openai', 'integrations',
 'Integrating GPT-4o with Next.js using the Vercel AI SDK',
 'The Vercel AI SDK @ai-sdk/openai provider connects GPT-4o to Next.js App Router in minutes. Create a POST /api/chat Route Handler using streamText, pass it to the client via the useChat hook, and render the streaming response in real time. The SDK generateObject function with a Zod schema makes structured extraction reliable, and tool definitions are written as plain TypeScript functions.',
 null, '2025-09-28 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'integrations',
 'Building semantic search with OpenAI embeddings and Supabase pgvector',
 'Store text chunks alongside their text-embedding-3-small embeddings in a Supabase Postgres table with a vector(1536) column indexed by the pgvector HNSW algorithm. At query time, embed the search query with the same model and call a match_documents SQL function that uses cosine distance to return the top K nearest neighbors. This pattern supports hybrid search combining pgvector similarity lookup with Postgres full-text ranking via ts_rank.',
 null, '2025-10-14 00:00:00+00', false),

(gen_random_uuid(), 'openai', 'integrations',
 'Adding GPT-4o vision to React Native apps with expo-camera',
 'Capture frames from expo-camera as base64 JPEG strings and pass them to the OpenAI Chat Completions API in image_url content parts. Set max_tokens to a reasonable ceiling to avoid runaway costs and use detail: low for tasks like UI element detection where high-resolution analysis is unnecessary. Cache vision responses for identical frames using a content hash key to avoid redundant API calls in real-time capture scenarios.',
 null, '2025-11-02 00:00:00+00', false);

-- -------------------------------------------------------------
-- GEMINI — best_practices
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'gemini', 'best_practices',
 'Exploit the 1M-token context window for full-document analysis',
 'Gemini 1.5 and 2.0 models support up to 1M tokens in a single request. Rather than chunking documents and running multiple retrieval passes, pass entire codebases, legal contracts, or research papers in one shot. This eliminates retrieval errors and preserves cross-document context that chunked approaches miss.',
 null, '2025-08-25 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'best_practices',
 'Enable grounding with Google Search to anchor responses in real-time facts',
 'Set tools: [{ google_search_retrieval: {} }] in your Gemini API request to activate automatic grounding. When enabled, the model issues real-time search queries and cites its sources. This is particularly valuable for news summarization, product pricing, and any domain where training data staleness matters.',
 null, '2025-09-17 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'best_practices',
 'Use multimodal inputs to combine text, images, and audio in one request',
 'Gemini natively accepts base64-encoded images, audio files, and video frames alongside text in a single request. Pass diverse media types within the contents[].parts array without any preprocessing. This enables tasks like describing what changed between two screenshots or transcribing and summarizing a meeting recording in a single API call.',
 null, '2025-10-30 00:00:00+00', false);

-- -------------------------------------------------------------
-- GEMINI — news
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'gemini', 'news',
 'Gemini 2.0 Flash sets new inference speed record in independent benchmarks',
 'Google Gemini 2.0 Flash achieved the highest tokens-per-second throughput of any frontier model in a widely cited independent benchmark, surpassing GPT-4o mini and Claude 3 Haiku by 1.5 to 2x on latency-critical tasks. Flash is positioned for real-time applications — live customer chat, autocomplete, and real-time translation — where sub-200ms time-to-first-token is a hard requirement.',
 null, '2026-01-08 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'news',
 'Google adds native code execution sandbox to Gemini API',
 'Gemini now supports a code_execution tool that runs Python in a sandboxed environment server-side, returning stdout, stderr, and file artifacts as part of the response. This eliminates the need to build or maintain a custom code interpreter for tasks like data analysis, CSV processing, and mathematical computation. The sandbox is stateless per request but can accept binary file inputs alongside the code.',
 null, '2025-12-05 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'news',
 'Gemini 2.0 adds real-time audio and video streaming support',
 'Google released the Multimodal Live API for Gemini 2.0, enabling bidirectional real-time audio and video streaming over WebSocket. Developers can build applications that continuously analyze a live camera feed or microphone stream and receive model responses with minimal latency. The API supports 15 languages for audio input and outputs audio as PCM16 at 24kHz, making it suitable for real-time AI assistants and accessibility tools.',
 null, '2026-02-28 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'news',
 'Gemini API launches context caching with up to 1M cached tokens',
 'Google added context caching to the Gemini API, allowing developers to pre-compute and store the KV cache for up to 1M tokens of static context — system instructions, documents, tools. Cached context reduces input token costs by up to 75% and latency by 40% for repeated requests over the same background material. Caches have a configurable TTL of up to 1 hour and are billed at a lower storage rate. This feature is available on paid API tiers only.',
 null, '2026-03-10 00:00:00+00', true),

(gen_random_uuid(), 'gemini', 'news',
 'Google releases Gemini for Workspace with enterprise data residency',
 'Google announced Gemini for Workspace Enterprise, which offers data residency guarantees ensuring prompts and responses are processed and stored within a specified geographic region (US, EU, or APAC). The enterprise tier also adds audit logging via Cloud Audit Logs, VPC-SC support for network isolation, and customer-managed encryption keys (CMEK). These controls are required for regulated industries including healthcare, finance, and government.',
 null, '2026-04-02 00:00:00+00', true);

-- -------------------------------------------------------------
-- GEMINI — integrations
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'gemini', 'integrations',
 'Integrating Gemini with Firebase for real-time mobile AI apps',
 'Google Firebase AI Logic SDK provides a client-side TypeScript and Swift SDK that connects directly to Gemini without exposing API keys in app bundles. Authentication is handled via Firebase App Check, and the SDK supports streaming text responses, function calling, and multimodal inputs from mobile camera or gallery. Use Firestore to store conversation history and Cloud Functions to augment requests with server-side context.',
 null, '2025-09-30 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'integrations',
 'Building Gemini-powered document Q&A with Google Drive and Apps Script',
 'Use Google Apps Script to extract text from Google Drive documents using the Drive API, then pass the full document content to Gemini via the UrlFetchApp service. Script triggers can automatically process new files added to a shared Drive folder, generating summaries or Q&A pairs that are written back to a Google Sheet. This requires no infrastructure and runs entirely within Google ecosystem with familiar OAuth-based authorization.',
 null, '2025-10-22 00:00:00+00', false),

(gen_random_uuid(), 'gemini', 'integrations',
 'Using Gemini embeddings with Vertex AI Vector Search at scale',
 'Generate embeddings with text-embedding-004 via the Gemini API and index them in Vertex AI Vector Search, which supports billions of vectors with millisecond approximate nearest-neighbor lookup using ScaNN. Deploy a Cloud Run service that embeds incoming queries and calls the Vector Search endpoint, returning matched document IDs for downstream retrieval. This architecture scales horizontally without managing Postgres or pgvector infrastructure.',
 null, '2025-11-20 00:00:00+00', false);

-- -------------------------------------------------------------
-- LANGCHAIN — best_practices
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'langchain', 'best_practices',
 'Use LCEL pipe syntax for composable, streamable, type-safe chains',
 'LangChain Expression Language (LCEL) uses the | operator to compose runnables: prompt | llm | output_parser. Every LCEL chain automatically supports .stream(), .batch(), and .astream() without extra code. Prefer LCEL over legacy LLMChain and SequentialChain for all new development — the legacy abstractions are deprecated in v0.3.',
 null, '2025-08-18 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'best_practices',
 'Implement structured output parsers for typed data extraction from LLMs',
 'Use llm.with_structured_output(MyPydanticModel) or JsonOutputParser to ensure LLM responses parse cleanly into typed objects. Structured output parsers include automatic retry logic via OutputFixingParser for models that occasionally produce malformed JSON, reducing error rates significantly in production pipelines.',
 null, '2025-09-06 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'best_practices',
 'Trace every agent run with LangSmith to debug multi-step failures',
 'Set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY to automatically send every chain and agent trace to LangSmith. Each run shows the full input/output at every step, token counts, latency, and errors in a structured waterfall view. In complex multi-tool agents, LangSmith is often the only practical way to diagnose why a specific tool call returned unexpected results.',
 null, '2025-10-12 00:00:00+00', false);

-- -------------------------------------------------------------
-- LANGCHAIN — news
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'langchain', 'news',
 'LangChain v0.3 ships stable LCEL with improved streaming and async support',
 'LangChain v0.3 finalizes LCEL as the stable interface for building chains, deprecating legacy classes like LLMChain, SequentialChain, and TransformChain. The release improves streaming performance by reducing buffering overhead in async contexts and adds native support for Python async generator protocol in custom runnables. The v0.1 and v0.2 compatibility shims will be removed in v0.4, so migration is recommended before upgrading.',
 null, '2025-10-28 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'news',
 'LangGraph v1.0 launches with persistent state and human-in-the-loop',
 'LangGraph reached v1.0 with a stable graph API, persistent state management via configurable checkpointers (in-memory, SQLite, Redis, Postgres), and first-class support for human-in-the-loop interrupts. Graph nodes can now be paused mid-execution to wait for user approval before proceeding, making LangGraph practical for regulated workflows like financial transaction processing and medical triage where human review is mandatory.',
 null, '2026-01-15 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'news',
 'LangChain adds first-class integration for Claude extended thinking',
 'LangChain v0.3.4 shipped a ChatAnthropic update that exposes Claude extended thinking mode via the thinking parameter. Setting thinking={type: enabled, budget_tokens: 8000} in the ChatAnthropic constructor automatically routes thinking tokens through the chain without requiring custom message parsing. LangSmith traces show thinking blocks as a separate step, making it straightforward to monitor token budget utilization across runs.',
 null, '2026-02-20 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'news',
 'LangSmith launches automated regression testing suite for LLM apps',
 'LangSmith introduced an automated testing framework that compares LLM application behavior across model versions, prompt changes, and code refactors. Developers define datasets of golden input-output pairs in the LangSmith UI, and the test runner compares new runs against baselines using configurable evaluators including exact match, semantic similarity, and LLM-as-judge. Regression reports are available as CI artifacts via the LangSmith API, enabling automated quality gates before deployment.',
 null, '2026-03-22 00:00:00+00', true),

(gen_random_uuid(), 'langchain', 'news',
 'LangChain Enterprise adds SOC2 Type II compliance and full audit logging',
 'LangChain announced SOC2 Type II certification for LangSmith Enterprise, covering availability, security, and confidentiality controls. Enterprise deployments now include immutable audit logs of all API calls, dataset accesses, and trace reads, with export to customer-owned S3 or GCS buckets. The certification and audit logging features are required by many enterprise procurement processes and are available exclusively on the LangSmith Enterprise plan.',
 null, '2026-04-10 00:00:00+00', true);

-- -------------------------------------------------------------
-- LANGCHAIN — integrations
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'langchain', 'integrations',
 'Building RAG pipelines with LangChain and Supabase pgvector',
 'Use LangChain SupabaseVectorStore to store documents alongside their embeddings in Supabase Postgres. The vector store integrates with LangChain RecursiveCharacterTextSplitter for chunking, the OpenAI or Cohere embeddings classes for vectorization, and LCEL retrieval chains for end-to-end RAG. Enable hybrid search by combining pgvector similarity lookup with Supabase full-text search via a custom SQL function called through LangChain SQLDatabase wrapper.',
 null, '2025-09-15 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'integrations',
 'Deploying LangChain applications with LangServe on AWS Lambda',
 'LangServe wraps any LCEL chain as a FastAPI server with /invoke, /stream, and /batch endpoints plus a built-in Swagger UI for interactive testing. Deploy to AWS Lambda using the Mangum ASGI adapter and an AWS Lambda function URL for a serverless, pay-per-request LangChain backend. LangSmith tracing works out of the box by setting the LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY environment variables in the Lambda function configuration.',
 null, '2025-10-05 00:00:00+00', false),

(gen_random_uuid(), 'langchain', 'integrations',
 'Using LangChain agents with Slack for automated workflow automation',
 'Use LangChain SlackToolkit to give an agent the ability to read channels, send messages, and retrieve thread history. Combine with additional tools — calendar lookup, CRM search, web browsing — to build a Slack bot that handles complex multi-step requests. Deploy the agent as a Slack app receiving events via the Events API, with LangGraph managing conversation state per Slack channel or thread.',
 null, '2025-11-08 00:00:00+00', false);

-- -------------------------------------------------------------
-- OLLAMA — best_practices
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'ollama', 'best_practices',
 'Match model size to hardware: 7B on 8 GB VRAM, 70B on 40 GB+',
 'Running a model with more parameters than your GPU can hold forces layers onto system RAM, dropping throughput by 10 to 50x. As a rule of thumb: 7B models require around 5 GB VRAM at 4-bit quantization, 13B require around 9 GB, 34B require around 20 GB, and 70B require around 40 GB. Use ollama run --verbose to verify all layers loaded to GPU before deploying to production.',
 null, '2025-08-10 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'best_practices',
 'Use Modelfiles to pin system prompts and reproducible inference parameters',
 'Create a Modelfile with FROM <base-model>, SYSTEM, and PARAMETER temperature 0.2 to produce a named, versioned model via ollama create my-app-model. This ensures every instance of your app runs with identical configuration rather than relying on application code to pass the right system prompt on every request.',
 null, '2025-09-24 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'best_practices',
 'Enable GPU layers with num_gpu to avoid slow CPU fallback',
 'Ollama does not always auto-detect the correct number of GPU layers on all systems. If inference is unexpectedly slow, explicitly set num_gpu in your Modelfile or API request body. Use nvidia-smi (NVIDIA) or rocm-smi (AMD) to verify VRAM utilization is above 90% — if it is near zero, the model is running on CPU.',
 null, '2025-10-20 00:00:00+00', false);

-- -------------------------------------------------------------
-- OLLAMA — news
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'ollama', 'news',
 'Ollama 0.5 ships OpenAI-compatible REST API for zero-friction migration',
 'Ollama 0.5 introduces an OpenAI-compatible endpoint at /v1/chat/completions, /v1/completions, and /v1/embeddings, allowing any application built against the OpenAI SDK to switch to local inference by changing the base URL to http://localhost:11434/v1 and setting a dummy API key. The compatibility layer supports streaming, function calling, and structured output parameters, covering the majority of production OpenAI use cases without code changes.',
 null, '2025-11-18 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'news',
 'Llama 3.3 70B added to Ollama library with 4-bit quantization',
 'Meta Llama 3.3 70B is now available in the Ollama library via ollama pull llama3.3. The default variant uses Q4_K_M quantization, requiring approximately 43 GB of VRAM and delivering performance competitive with much larger models on instruction following and coding benchmarks. Smaller Q2_K variants at 26 GB are also available for systems with limited VRAM, and early benchmarks show Llama 3.3 70B outperforms Llama 3.1 70B on coding and math tasks by a meaningful margin.',
 null, '2026-01-25 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'news',
 'Ollama model library reaches 200+ curated open-source models',
 'The Ollama model library surpassed 200 curated models, covering instruction-tuned LLMs (Llama, Mistral, Qwen, Phi), embedding models (nomic-embed-text, mxbai-embed-large), vision-language models (LLaVA, Moondream), and code-specific models (DeepSeek Coder, CodeLlama). Each model page documents memory requirements, context length, and recommended use cases to help developers select the right model without extensive benchmarking.',
 null, '2025-12-20 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'news',
 'Ollama adds concurrent multi-model serving for production workloads',
 'Ollama 0.5.3 ships concurrent model loading, allowing multiple models to coexist in GPU memory simultaneously and serve requests in parallel without swapping. The OLLAMA_MAX_LOADED_MODELS environment variable controls the maximum number of concurrently loaded models, defaulting to 3. This feature is critical for production deployments serving multiple applications, enabling model-level request isolation and preventing one heavy workload from evicting another model cache.',
 null, '2026-02-05 00:00:00+00', true),

(gen_random_uuid(), 'ollama', 'news',
 'Ollama Enterprise launches with centralized model registry and RBAC',
 'Ollama Enterprise introduces a centralized model registry that allows IT teams to curate and distribute approved models to a fleet of Ollama instances without developers pulling directly from ollama.com. Role-based access control restricts which teams can pull which models, and policy enforcement prevents unapproved models from loading. Enterprise also adds Prometheus metrics, centralized logging via OpenTelemetry, and signed model manifests to prevent supply chain tampering.',
 null, '2026-03-15 00:00:00+00', true);

-- -------------------------------------------------------------
-- OLLAMA — integrations
-- -------------------------------------------------------------
INSERT INTO public.content_items
  (id, ecosystem_slug, category, title, body, source_url, published_at, is_pro_only) VALUES

(gen_random_uuid(), 'ollama', 'integrations',
 'Integrating Ollama with VS Code via the Continue extension for local copilot',
 'Install the Continue extension for VS Code and point it at your local Ollama instance by setting the provider to ollama and the model to codellama:13b or deepseek-coder:6.7b in ~/.continue/config.json. Continue provides tab completion, chat sidebar, and inline edit commands using your local model with zero data leaving your machine. For best results on Apple Silicon, use qwen2.5-coder:7b which fits in 8 GB VRAM and responds in under 1 second.',
 null, '2025-09-19 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'integrations',
 'Building fully local RAG with Ollama and ChromaDB',
 'Run nomic-embed-text via Ollama to generate embeddings entirely on-device and store them in ChromaDB running as a local Docker container. Use LangChain OllamaEmbeddings and Chroma vector store classes to build a RAG pipeline that processes and queries documents without any external API calls. This architecture is ideal for air-gapped environments, sensitive documents, or applications where data sovereignty requirements prohibit sending content to third-party APIs.',
 null, '2025-10-28 00:00:00+00', false),

(gen_random_uuid(), 'ollama', 'integrations',
 'Using Ollama with Open WebUI for a self-hosted ChatGPT alternative',
 'Deploy Open WebUI using the official Docker Compose file that provisions both an Ollama backend and the Open WebUI frontend. Open WebUI provides a ChatGPT-like interface with multi-user authentication (local or LDAP), conversation history stored in SQLite, model selection from your Ollama library, and image generation via Stable Diffusion. Set WEBUI_SECRET_KEY and expose only HTTPS via a reverse proxy before sharing access beyond localhost.',
 null, '2025-11-30 00:00:00+00', false);
