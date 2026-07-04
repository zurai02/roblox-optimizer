/**
 * GITHUB TRANSLATOR — Node.js (Lightweight)
 * Google Apps Script → this service → GitHub + Roblox
 *
 * Setup: npm install express axios dotenv
 * Run:   node translator_nodejs.js
 * .env:  GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, GITHUB_BRANCH, PORT
 */

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const CFG = {
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
  token: process.env.GITHUB_TOKEN,
  branch: process.env.GITHUB_BRANCH || 'main',
  port: process.env.PORT || 3000
};

const SNIPPETS = {
  'GetService cache': `local Players = game:GetService("Players")`,
  'loop optimization': `-- hoist GetService/FindFirstChild calls out of loops`,
  'hash table': `local function hashLookup(arr,k) local t={} for _,v in ipairs(arr) do t[v[k] or v]=v end return t end`,
  'memoiz': `local function memoize(f) local c={} return function(...) local k=table.concat({...},"|") if c[k]==nil then c[k]=f(...) end return c[k] end end`,
  'object pooling': `local Pool={} function Pool.acquire(l) return #l>0 and table.remove(l) or Instance.new("Part") end`,
  'cyclic buffer': `local function ring(n) return {buf={},i=1,n=n} end`,
  'batch RemoteEvent': `local q={} local function batch(ev,d,size) table.insert(q,d) if #q>=(size or 10) then ev:FireServer(q) q={} end end`,
  'compress': `local function compress(n) return math.floor(n*100)/100 end`,
  'coalesce': `local q,last={},tick() local function add(x) table.insert(q,x) end`,
  'LOD': `local function lod(part,cam,dist) if (part.Position-cam.CFrame.Position).Magnitude>(dist or 50) then part.CanCollide=false end end`,
  'frustum': `local function visible(part,cam) return (cam.CFrame:VectorToObjectSpace(part.Position)).Z<=0 end`,
  'particle': `local function cullFx(e,d,max) e.Enabled = d<=max end`
};

function translate(tags) {
  const out = [];
  for (const tag of tags || []) {
    for (const key in SNIPPETS) {
      if (tag.includes(key)) { out.push({ type: tag, luau: SNIPPETS[key] }); break; }
    }
  }
  return out;
}

function buildScript(original, translations) {
  const header = `-- Optimized ${new Date().toISOString()} (${translations.length} opts)\n\n`;
  const body = translations.map(t => `-- ${t.type}\n${t.luau}\n`).join('\n');
  return header + body + '\n-- ORIGINAL --\n' + original;
}

async function saveToGitHub(filePath, content, message) {
  const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${filePath}`;
  let sha;
  try {
    const existing = await axios.get(url, { headers: { Authorization: `token ${CFG.token}` } });
    sha = existing.data.sha;
  } catch (_) {}

  return axios.put(url, {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: CFG.branch,
    ...(sha ? { sha } : {})
  }, { headers: { Authorization: `token ${CFG.token}` } });
}

app.post('/webhook', async (req, res) => {
  try {
    const { scriptName = 'Unnamed', originalSource = '', improvements = [] } = req.body || {};
    const translations = translate(improvements);
    const optimized = buildScript(originalSource, translations);

    saveToGitHub(`optimized-output/${scriptName}.lua`, optimized, `Optimize ${scriptName}`)
      .catch(err => console.error('GitHub save failed (non-fatal):', err.message));

    res.json({ ok: true, scriptName, translationsCount: translations.length, optimizedScript: optimized });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(CFG.port, () => console.log(`Translator running on :${CFG.port}`));
