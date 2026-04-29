# ASA Guard

**Autonomous Solana Agent with Decentralized Guardrails**

> AI trading agents should never hold private keys. ASA Guard enforces your trading policy on-chain via Solana and signs every transaction through Ika zero-trust MPC. Your keys never exist in plaintext.

Program ID: `Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd` (Solana Devnet)

---

## The Problem

Every AI trading bot running today stores a raw private key in a `.env` file. If the server is compromised, all funds are gone instantly. Worse, there is no cryptographic enforcement of trading rules. Policy limits like maximum buy size, daily spending cap, and stop loss thresholds live only in application code, which can be bypassed, misconfigured, or overridden entirely.

This is not a theoretical risk. It is the default architecture for every agent-based trading system built on Solana today.

---

## The Solution

ASA Guard removes the private key from the agent entirely and enforces trading policy at the cryptographic level.

- The agent never holds a private key
- Trading rules (max buy per transaction, daily limit, stop loss) are enforced on-chain by an Anchor program
- Every transaction must be approved by the Solana program before Ika will sign it
- Signing is handled by Ika 2PC-MPC, requiring both the user share and the Ika network to cooperate

If the server is hacked, there is nothing to steal. The agent cannot move funds without on-chain approval.

---

## How It Works

```
ASA Bot (Python)
    |
    | "intent to buy SOL, $450"
    v
Express Bridge (Node.js)
    |
    | 1. Call approve_trade on Solana program
    v
Anchor Program (Solana Devnet)
    |  checks: max_buy_per_tx, daily_limit, stop_loss_bps
    |  result: APPROVED or REJECTED
    v
Express Bridge
    |
    | 2. If approved, request signature from Ika
    v
Ika dWallet (2PC-MPC)
    |  user share + Ika network share = valid signature
    v
Signed Transaction
    |
    | 3. Broadcast to Solana
    v
Solana Network
```

---

## How ASA Guard Uses Ika

ASA Guard integrates Ika as the sole signing mechanism for all agent transactions.

**dWallet creation:** A dWallet is generated via the Ika Solana pre-alpha gRPC client. The agent never receives or stores the full private key. The user share is encrypted and held separately from the Ika network share.

**Signing flow:** Every trade that passes on-chain policy approval is submitted to Ika for signing via the gRPC interface. Ika runs DKG, generates a presignature, and produces the final signature only after the Solana program has confirmed the trade is within policy.

**Zero-trust enforcement:** Because Ika requires both shares to sign, a compromised server cannot move funds unilaterally. The Solana program acts as the policy enforcer, and Ika acts as the cryptographic gatekeeper.

This matches the exact use case described in Ika's documentation: multi-chain agentic wallets with scalable decentralized guardrails for AI agents.

---

## Architecture

| Layer | Technology | Role |
|---|---|---|
| AI Agent | Python | Trading decision loop, Groq-powered |
| Bridge Server | Node.js + Express | Connects agent to Solana program and Ika |
| On-chain Policy | Anchor (Rust) | Enforces trading rules cryptographically |
| Signing | Ika 2PC-MPC gRPC | Zero-trust signature generation |
| Dashboard | HTML + JS | Real-time monitoring and policy control |
| Notifications | Telegram Bot | Alerts, login approval, pause/resume |

---

## On-Chain Policy

The Anchor program stores and enforces three core rules:

```rust
pub struct AgentPolicy {
    pub max_buy_per_tx: u64,   // maximum lamports per single trade
    pub daily_limit: u64,       // maximum lamports spent per day
    pub stop_loss_bps: u16,     // stop loss threshold in basis points
    pub daily_spent: u64,       // running total for the current day
    pub is_paused: bool,        // emergency stop flag
}
```

Instructions:
- `init_policy` - initialize policy rules on-chain
- `approve_trade` - agent requests approval, program checks all rules and either approves or rejects
- `update_policy` - owner updates rules, change is effective immediately on-chain

---

## Project Structure

```
asa-guard/
├── onchain/                  # Anchor program (Rust)
│   ├── programs/asa-guard/
│   │   └── src/
│   │       ├── lib.rs        # Program entry point, instruction routing
│   │       ├── state.rs      # AgentPolicy account struct
│   │       ├── instructions.rs # approve_trade, init_policy, update_policy
│   │       └── error.rs      # Custom program errors
│   └── Anchor.toml
├── client/                   # Bridge server + dashboard
│   ├── server.js             # Express API bridge
│   ├── telegram-bot.js       # Telegram bot for monitoring
│   ├── ika-bridge.js         # Ika gRPC integration
│   ├── bridge.js             # Solana program client
│   └── index.html            # Web dashboard
├── asa_bot.py                # AI trading agent
├── start.sh                  # Start all services
└── stop.sh                   # Stop all services
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server and program status |
| GET | `/api/policy` | Fetch current on-chain policy |
| GET | `/api/metrics` | Agent wallet, daily spent, trade count |
| GET | `/api/history` | Trade history from SQLite |
| GET | `/api/feed` | Live feed of approved/rejected trades |
| POST | `/api/approve-trade` | Request on-chain trade approval |
| POST | `/api/build-update-policy` | Build and submit policy update transaction |
| POST | `/api/auth/telegram` | Telegram-based login |

---

## Setup and Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- Solana CLI
- A funded Solana devnet wallet

### 1. Clone the repository

```bash
git clone https://github.com/jxiexyz/ASA-Guard.git
cd ASA-Guard
```

### 2. Install dependencies

```bash
cd client
npm install
cd ..
pip install requests
```

### 3. Configure environment

Create `client/.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd
AGENT_KEYPAIR=<your_base58_keypair>
TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
TELEGRAM_CHAT_ID=<your_telegram_chat_id>
INTERNAL_SECRET=asa-guard-internal
```

### 4. Start all services

```bash
chmod +x start.sh stop.sh
./start.sh
```

This starts the Express bridge server, Telegram bot, and AI trading agent in the background.

### 5. Open the dashboard

Navigate to `http://localhost:3000` in your browser and authenticate via Telegram.

---

## Stopping All Services

```bash
./stop.sh
```

---

## Deployed Program

| Network | Program ID |
|---|---|
| Solana Devnet | `Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd` |

---

## Security Model

**Before ASA Guard (standard agent):**
```
Private key in .env file
    -> Server compromised
    -> All funds stolen
    -> No recourse
```

**After ASA Guard:**
```
No private key anywhere on the server
    -> Agent requests approval from Solana program
    -> Solana program enforces policy on-chain
    -> Ika network co-signs only if approved
    -> Server compromised = attacker gets nothing
```

---

## Telegram Bot Commands

| Command | Description |
|---|---|
| `/start` | Start the bot |
| `/policy` | View current on-chain policy |
| `/history` | View recent trade history |
| `/pause` | Emergency stop the agent |
| `/resume` | Resume agent trading |
| `/health` | Check server and program status |

---

## Built With

- [Solana](https://solana.com) - Layer 1 blockchain
- [Anchor](https://anchor-lang.com) - Solana program framework
- [Ika](https://solana-pre-alpha.ika.xyz) - 2PC-MPC zero-trust signing network
- [Groq](https://groq.com) - AI inference for trading decisions
- Node.js, Express, Python, SQLite

---

## License

MIT
