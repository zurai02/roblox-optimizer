# Roblox Optimizer — Translator Service

Two identical implementations of the same webhook translator — pick one to run,
or deploy both for failover (see `AppsScript_Bridge.gs`).

```
roblox-optimizer/
├── nodejs/       Node.js/Express version
├── python/       Python/Flask version
└── README.md     (this file)
```

Both expose the same `POST /webhook` contract:

**Request:**
```json
{
  "scriptName": "PlayerMovement",
  "originalSource": "-- your Luau source here",
  "improvements": ["GetService cache", "hash table"]
}
```

**Response:**
```json
{
  "ok": true,
  "scriptName": "PlayerMovement",
  "translationsCount": 2,
  "optimizedScript": "-- optimized Luau code"
}
```

## Run the Node.js version

```bash
cd nodejs
npm install
cp .env.example .env   # then fill in your GitHub token
npm start
```

## Run the Python version

```bash
cd python
pip install -r requirements.txt
cp .env.example .env   # then fill in your GitHub token
python translator_python_light.py
```

## Which one to deploy

They do the same thing. Use whichever you're more comfortable maintaining.
If you want redundancy instead of picking one, deploy both (different hosts/ports)
and list both URLs in `TRANSLATOR_URLS` inside `AppsScript_Bridge.gs` — it'll
try the first and automatically fall back to the second if it fails.

## GitHub Token

Generate at github.com/settings/tokens with `repo` scope. Never commit your
real `.env` file — only `.env.example` should be tracked.
