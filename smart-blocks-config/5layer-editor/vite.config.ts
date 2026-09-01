import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The LLM classify endpoint. Runs server-side in the Vite dev server so the API key
// never reaches the browser. If ANTHROPIC_API_KEY is unset it returns 503 and the
// client falls back to the deterministic mock classifier (chat still works).
// Enable the real LLM with:  ANTHROPIC_API_KEY=sk-ant-... npm run play
const SYSTEM = `You edit a candidate-screening Smart Table built from five independent config layers.
Classify the user's request into ONE layer (decision priority, highest first):
1. DATA — data source, provisioning (author-fixed vs runtime), and REDEFINING a column's meaning (a new criterion → its cell values must be re-scored). Redefining a column is DATA, not presentation.
2. BUSINESS LOGIC — rules on the resolved data: ranking/sorting, weights, thresholds, page size, approval decision mode / review policy / required comments.
3. ACCESS CONTROL — who sees/does what: hide columns, allowed reviewer roles, row selection.
4. ACTIONS — declarative interactions: search, row actions (view resume), confirm-before-deciding.
5. PRESENTATION — display only, NO change to meaning/values: RENAME a column header (same values), compact/striped density, titles. Never colours/CSS/styling.
Decisive test: rename the header only (values unchanged) = PRESENTATION (relabelColumn). Change the column's meaning so values must change = DATA (redefineColumn).
Return ONLY a JSON object: {"changes":[{"layer","summary","op","params"}], "note"?} — no prose. summary is a short human sentence.
Allowed ops + params:
 relabelColumn{key,newLabel} | redefineColumn{key,newLabel} | setDataSource{kind:"workflow-field"|"block-output"|"object-type"} | setProvisioning{provisioning:"author-fixed"|"runtime"} | setSort{column,direction:"asc"|"desc"} (omit column to clear) | setPageSize{n} | setDecisionMode{mode:"verdict"|"selection"|"per-item",min,max} | setReviewPolicy{mode:"single"|"quorum",quorum} | requireCommentOnReject{value} | hideColumn{key} | showColumn{key} | setSearchable{value} | setRowAction{value,label} | setCompact{value} | setStriped{value}
Use the exact column "key" from the provided columns. If nothing applies, return {"changes":[],"note":"why"}.`

function llmClassifyPlugin(): Plugin {
  return {
    name: 'llm-classify-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/llm-classify', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        res.setHeader('content-type', 'application/json')
        const key = process.env.ANTHROPIC_API_KEY
        if (!key) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set — using mock classifier' }))
          return
        }
        let body = ''
        req.on('data', (c) => (body += c))
        await new Promise<void>((r) => req.on('end', () => r()))
        try {
          const { request, columns } = JSON.parse(body || '{}')
          const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001',
              max_tokens: 900,
              system: `${SYSTEM}\n\nCurrent columns: ${JSON.stringify(columns)}`,
              messages: [{ role: 'user', content: String(request ?? '') }],
            }),
          })
          const data: any = await upstream.json()
          const text: string = data?.content?.[0]?.text ?? '{}'
          const json = JSON.parse(text.replace(/^```json\s*|^```\s*|```$/g, '').trim())
          res.end(JSON.stringify(json))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), llmClassifyPlugin()],
  server: { port: 5191, strictPort: false, open: false },
})
