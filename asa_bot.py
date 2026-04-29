"""
ASA Guard — AI Trading Bot with Zero-Trust Policy
Continuous loop — fetches latest policy before every trade.
"""
import requests
import time
import random
import os

BRIDGE_URL = "http://localhost:3000"
INTERNAL_SECRET = "asa-guard-internal"
HEADERS = {"Authorization": f"Bearer {INTERNAL_SECRET}"}
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8485282558:AAFK5iuSr6PstxplD61ktTHyitb5LzlRuaM")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "645790395")
TRADE_INTERVAL = 15  # seconds between trades

TOKENS = [
    {"token": "SOL",  "amount_lamports": 100_000_000},
    {"token": "BONK", "amount_lamports": 200_000_000},
    {"token": "JUP",  "amount_lamports": 500_000_000},
    {"token": "WIF",  "amount_lamports": 2_000_000_000},
    {"token": "PYTH", "amount_lamports": 150_000_000},
    {"token": "JTO",  "amount_lamports": 300_000_000},
]

def notify(text: str):
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"},
            timeout=10
        )
    except Exception as e:
        print(f"   Warning: Telegram notify failed: {e}")

def get_policy():
    try:
        r = requests.get(f"{BRIDGE_URL}/api/policy", headers=HEADERS, timeout=10)
        data = r.json()
        return data.get("policy") if data.get("ok") else None
    except Exception as e:
        print(f"❌ Failed to fetch policy: {e}")
        return None

def request_approval(amount_lamports: int, token: str = "SOL") -> dict:
    try:
        r = requests.post(
            f"{BRIDGE_URL}/api/approve-trade",
            headers=HEADERS,
            json={"amountLamports": str(amount_lamports), "token": token, "action": "BUY"},
            timeout=30
        )
        data = r.json()
        if data.get("ok"):
            return {"approved": True, "tx": data["tx"]}
        return {"approved": False, "error": data.get("error", "Rejected by policy")}
    except Exception as e:
        return {"approved": False, "error": str(e)}

def execute_trade(token: str, amount_lamports: int):
    print(f"   📤 Executing trade: buy {token} worth {amount_lamports/1e9:.4f} SOL")
    time.sleep(0.5)
    print(f"   ✅ Trade executed successfully!")

def run():
    print("🤖 ASA Guard Bot starting (continuous mode)...")
    print("=" * 50)
    notify("🤖 *ASA Guard Bot started*\nContinuous trading mode active.")

    trade_count = 0
    while True:
        # Fetch latest policy before every trade
        policy = get_policy()
        if not policy:
            print("❌ Bridge unreachable, retrying in 10s...")
            time.sleep(10)
            continue

        if not policy["isActive"]:
            print("⏸ Policy inactive — waiting 10s...")
            time.sleep(10)
            continue

        # Pilih trade random
        trade = random.choice(TOKENS)
        trade_count += 1
        max_buy = int(policy["maxBuySol"])
        daily_limit = int(policy["dailyLimitSol"])
        daily_spent = int(policy["dailySpent"])
        remaining = daily_limit - daily_spent

        print(f"\n🔍 Trade #{trade_count}: {trade['token']} — {trade['amount_lamports']/1e9:.4f} SOL")
        print(f"   Policy: max={max_buy/1e9:.2f} SOL | remaining={remaining/1e9:.2f} SOL")
        print(f"   🔐 Requesting on-chain approval...")

        result = request_approval(trade["amount_lamports"], trade["token"])
        if result.get("approved"):
            print(f"   ✅ APPROVED | tx: {result['tx'][:20]}...")
            notify(
                f"✅ *Trade APPROVED*\n\n"
                f"Token: `{trade['token']}`\n"
                f"Amount: *{trade['amount_lamports']/1e9:.4f} SOL*\n"
                f"Remaining daily: *{(remaining - trade['amount_lamports'])/1e9:.4f} SOL*\n"
                f"Tx: `{result['tx'][:20]}...`"
            )
            execute_trade(trade["token"], trade["amount_lamports"])
        else:
            error = result.get("error", "Unknown")
            print(f"   ❌ REJECTED | {error[:80]}")
            notify(
                f"❌ *Trade REJECTED*\n\n"
                f"Token: `{trade['token']}`\n"
                f"Amount: *{trade['amount_lamports']/1e9:.4f} SOL*\n"
                f"Reason: {error[:80]}"
            )

        # Alert kalau daily limit hampir habis
        if remaining > 0 and (daily_spent / daily_limit) >= 0.8:
            notify(f"⚠️ *Daily limit 80% used!*\nSpent: *{daily_spent/1e9:.2f} / {daily_limit/1e9:.2f} SOL*")

        print(f"   ⏳ Next trade in {TRADE_INTERVAL}s...")
        time.sleep(TRADE_INTERVAL)

if __name__ == "__main__":
    run()
