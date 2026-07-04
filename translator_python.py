#!/usr/bin/env python3
import os
import base64
from datetime import datetime
from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

CFG = {
    'owner': os.getenv('GITHUB_OWNER'),
    'repo': os.getenv('GITHUB_REPO'),
    'token': os.getenv('GITHUB_TOKEN'),
    'branch': os.getenv('GITHUB_BRANCH', 'main'),
    'port': int(os.getenv('PORT', 5000)),
}

SNIPPETS = {
    'GetService cache': 'local Players = game:GetService("Players")',
    'loop optimization': '-- hoist GetService/FindFirstChild calls out of loops',
    'hash table': 'local function hashLookup(arr,k) local t={} for _,v in ipairs(arr) do t[v[k] or v]=v end return t end',
    'memoiz': 'local function memoize(f) local c={} return function(...) local k=table.concat({...},"|") if c[k]==nil then c[k]=f(...) end return c[k] end end',
    'object pooling': 'local Pool={} function Pool.acquire(l) return #l>0 and table.remove(l) or Instance.new("Part") end',
    'cyclic buffer': 'local function ring(n) return {buf={},i=1,n=n} end',
    'batch RemoteEvent': 'local q={} local function batch(ev,d,size) table.insert(q,d) if #q>=(size or 10) then ev:FireServer(q) q={} end end',
    'compress': 'local function compress(n) return math.floor(n*100)/100 end',
    'coalesce': 'local q,last={},tick() local function add(x) table.insert(q,x) end',
    'LOD': 'local function lod(part,cam,dist) if (part.Position-cam.CFrame.Position).Magnitude>(dist or 50) then part.CanCollide=false end end',
    'frustum': 'local function visible(part,cam) return (cam.CFrame:VectorToObjectSpace(part.Position)).Z<=0 end',
    'particle': 'local function cullFx(e,d,max) e.Enabled = d<=max end',
}


def translate(tags):
    out = []
    for tag in tags or []:
        for key, snippet in SNIPPETS.items():
            if key in tag:
                out.append({'type': tag, 'luau': snippet})
                break
    return out


def build_script(original, translations):
    header = f"-- Optimized {datetime.now().isoformat()} ({len(translations)} opts)\n\n"
    body = '\n'.join(f"-- {t['type']}\n{t['luau']}\n" for t in translations)
    return header + body + '\n-- ORIGINAL --\n' + original


def save_to_github(file_path, content, message):
    url = f"https://api.github.com/repos/{CFG['owner']}/{CFG['repo']}/contents/{file_path}"
    headers = {'Authorization': f"token {CFG['token']}"}

    sha = None
    existing = requests.get(url, headers=headers)
    if existing.status_code == 200:
        sha = existing.json().get('sha')

    payload = {
        'message': message,
        'content': base64.b64encode(content.encode()).decode(),
        'branch': CFG['branch'],
    }
    if sha:
        payload['sha'] = sha

    resp = requests.put(url, json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json()


@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        data = request.get_json(force=True) or {}
        script_name = data.get('scriptName', 'Unnamed')
        original_source = data.get('originalSource', '')
        improvements = data.get('improvements', [])

        translations = translate(improvements)
        optimized = build_script(original_source, translations)

        try:
            save_to_github(f"optimized-output/{script_name}.lua", optimized, f"Optimize {script_name}")
        except Exception as gh_err:
            print(f"GitHub save failed (non-fatal): {gh_err}")

        return jsonify({
            'ok': True,
            'scriptName': script_name,
            'translationsCount': len(translations),
            'optimizedScript': optimized,
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=CFG['port'])
