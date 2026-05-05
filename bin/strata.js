#!/usr/bin/env node
'use strict'

// Strata MCP stdio proxy — forwards stdin/stdout ↔ https://www.usestrata.dev/mcp
//
// Glama Docker entry point: node ./bin/strata
// Auth: set STRATA_API_KEY env var (optional — falls through to anon tier)

const MCP_URL = 'https://www.usestrata.dev/mcp'
const API_KEY = process.env.STRATA_API_KEY
const UA = 'StrataProxy/1.0.0'

let sessionId = null
let buf = ''

process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  buf += chunk
  let idx
  while ((idx = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (line) dispatch(line)
  }
})

process.stdin.on('end', () => {
  const line = buf.trim()
  if (line) dispatch(line)
})

function dispatch(line) {
  forward(line).catch((err) => {
    try {
      const { id } = JSON.parse(line)
      if (id != null) {
        write({ jsonrpc: '2.0', id, error: { code: -32603, message: String(err?.message ?? err) } })
      }
    } catch {}
    process.stderr.write(`[strata-proxy] error: ${err?.message ?? err}\n`)
  })
}

async function forward(line) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'User-Agent': UA,
  }
  if (API_KEY) headers['X-API-Key'] = API_KEY
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const res = await fetch(MCP_URL, { method: 'POST', headers, body: line })

  const sid = res.headers.get('mcp-session-id')
  if (sid) sessionId = sid

  const ct = res.headers.get('content-type') ?? ''

  if (!res.ok && !ct.includes('application/json')) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`)
  }

  if (ct.includes('text/event-stream')) {
    await pipeSSE(res.body)
  } else {
    const text = (await res.text()).trim()
    if (text) write(JSON.parse(text))
  }
}

async function pipeSSE(body) {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let tail = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    tail += dec.decode(value, { stream: true })
    let sep
    while ((sep = tail.indexOf('\n\n')) !== -1) {
      const block = tail.slice(0, sep)
      tail = tail.slice(sep + 2)
      emitSSEBlock(block)
    }
  }
  if (tail.trim()) emitSSEBlock(tail)
}

function emitSSEBlock(block) {
  for (const line of block.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim()
      if (data && data !== '[DONE]') write(JSON.parse(data))
    }
  }
}

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}
