import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3000';
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'asa-guard-internal';
const AX = axios.create({ family: 4 });

async function tg(method, body) {
  const r = await AX.post(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, body);
  return r.data;
}
async function send(chatId, text, extra) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...(extra||{}) });
}
async function bridgeGet(path) {
  const r = await AX.get(`${BRIDGE_URL}${path}`, { headers: { Authorization: `Bearer ${INTERNAL_SECRET}` } });
  return r.data;
}
async function bridgePost(path, body) {
  const r = await AX.post(`${BRIDGE_URL}${path}`, body, { headers: { Authorization: `Bearer ${INTERNAL_SECRET}` } });
  return r.data;
}
function isAllowed(chatId) {
  if (!ALLOWED_CHAT_ID) return true;
  return String(chatId) === String(ALLOWED_CHAT_ID);
}
async function handleStart(chatId) {
  await send(chatId, '🤖 *ASA Guard Bot*\n\nSelect an action:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 Policy', callback_data: '/policy' }, { text: '📊 History', callback_data: '/history' }],
        [{ text: '⏸ Pause Agent', callback_data: '/pause' }, { text: '▶️ Resume Agent', callback_data: '/resume' }],
        [{ text: '💚 Health', callback_data: '/health' }],
        [{ text: '⚙️ Set Limits', callback_data: '/setlimit' }]
      ]
    }
  });
}
async function handlePolicy(chatId) {
  const data = await bridgeGet('/api/policy');
  if (!data.ok) return send(chatId, '❌ ' + data.error);
  const p = data.policy;
  const maxBuy = (BigInt(p.maxBuySol) / BigInt(1e9)).toString();
  const dailyLimit = (BigInt(p.dailyLimitSol) / BigInt(1e9)).toString();
  const dailySpent = (BigInt(p.dailySpent) / BigInt(1e9)).toString();
  await send(chatId, '📋 *On-Chain Policy*\n\nStatus: ' + (p.isActive ? '✅ Active' : '⏸ Paused') + '\nMax Buy/Tx: *' + maxBuy + ' SOL*\nDaily Limit: *' + dailyLimit + ' SOL*\nDaily Spent: *' + dailySpent + ' SOL*\nStop Loss: *' + (p.stopLossBps/100) + '%*\nTake Profit: *' + (p.takeProfitBps/100) + '%*\nTrade Count: *' + p.tradeCount + '*');
}
async function handleHistory(chatId) {
  const data = await bridgeGet('/api/policy');
  if (!data.ok) return send(chatId, '❌ ' + data.error);
  const p = data.policy;
  const dailySpent = (BigInt(p.dailySpent) / BigInt(1e9)).toString();
  const dailyLimit = (BigInt(p.dailyLimitSol) / BigInt(1e9)).toString();
  await send(chatId, '📊 *Trade History*\n\nTotal Trades: *' + p.tradeCount + '*\nDaily Spent: *' + dailySpent + ' / ' + dailyLimit + ' SOL*');
}
async function handlePause(chatId) {
  const cur = await bridgeGet('/api/policy');
  if (!cur.ok) return send(chatId, '❌ ' + cur.error);
  const p = cur.policy;
  const data = await bridgePost('/api/update-policy-internal', { maxBuySol: p.maxBuySol, dailyLimitSol: p.dailyLimitSol, isActive: false });
  if (data.ok) await send(chatId, '⏸ *Agent paused!*\n\n[View tx](' + data.explorer + ')');
  else await send(chatId, '❌ ' + data.error);
}
async function handleResume(chatId) {
  const cur = await bridgeGet('/api/policy');
  if (!cur.ok) return send(chatId, '❌ ' + cur.error);
  const p = cur.policy;
  const data = await bridgePost('/api/update-policy-internal', { maxBuySol: p.maxBuySol, dailyLimitSol: p.dailyLimitSol, isActive: true });
  if (data.ok) await send(chatId, '✅ *Agent resumed!*\n\n[Lihat tx](' + data.explorer + ')');
  else await send(chatId, '❌ ' + data.error);
}
async function handleHealth(chatId) {
  const data = await bridgeGet('/api/health');
  if (!data.ok) return send(chatId, '❌ Server down');
  await send(chatId, '💚 *Server OK*\n\nAgent: `' + data.agent.slice(0,8) + '...' + data.agent.slice(-6) + '`\nRPC: ' + data.rpc);
}

const awaitingInput = new Map();

async function handleSetLimit(chatId) {
  awaitingInput.set(chatId, { step: 'maxBuy' });
  await send(chatId, '⚙️ *Set Limits*\n\nEnter new *Max Buy per tx* in SOL (e.g. 1.5):');
}

async function handleSetLimitInput(chatId, text) {
  const state = awaitingInput.get(chatId);
  if (!state) return;

  if (state.step === 'maxBuy') {
    const val = parseFloat(text);
    if (isNaN(val) || val <= 0) return send(chatId, '❌ Invalid value. Enter a number like 1.5');
    awaitingInput.set(chatId, { step: 'dailyLimit', maxBuy: val });
    await send(chatId, '✅ Max buy set to *' + val + ' SOL*\n\nNow enter *Daily Limit* in SOL (e.g. 5):');
  } else if (state.step === 'dailyLimit') {
    const val = parseFloat(text);
    if (isNaN(val) || val <= 0) return send(chatId, '❌ Invalid value. Enter a number like 5');
    const { maxBuy } = state;
    awaitingInput.delete(chatId);
    const maxBuyLamports = Math.floor(maxBuy * 1e9).toString();
    const dailyLimitLamports = Math.floor(val * 1e9).toString();
    try {
      const data = await bridgePost('/api/update-policy-internal', {
        maxBuySol: maxBuyLamports,
        dailyLimitSol: dailyLimitLamports,
        isActive: true
      });
      if (data.ok) {
        await send(chatId, '✅ *Limits updated on-chain!*\n\nMax Buy: *' + maxBuy + ' SOL*\nDaily Limit: *' + val + ' SOL*\n\n[View tx](' + data.explorer + ')');
      } else {
        await send(chatId, '❌ Failed: ' + data.error);
      }
    } catch(e) {
      await send(chatId, '❌ Error: ' + e.message);
    }
  }
}
async function handleCallback(update) {
  const cb = update.callback_query;
  if (!cb) return;
  const chatId = cb.message.chat.id;
  if (!isAllowed(chatId)) return;
  const cmd = cb.data;
  await tg('answerCallbackQuery', { callback_query_id: cb.id });
  if (cmd === '/policy') return handlePolicy(chatId);
  if (cmd === '/history') return handleHistory(chatId);
  if (cmd === '/pause') return handlePause(chatId);
  if (cmd === '/resume') return handleResume(chatId);
  if (cmd === '/health') return handleHealth(chatId);
  if (cmd === '/setlimit') return handleSetLimit(chatId);
  if (cmd.startsWith('approve_login:')) {
    const token = cmd.split(':')[1];
    await fetch(`${process.env.BRIDGE_URL || 'http://localhost:3000'}/api/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET },
      body: JSON.stringify({ token, approved: true })
    });
    return send(chatId, '✅ Login approved!');
  }
  if (cmd.startsWith('reject_login:')) {
    const token = cmd.split(':')[1];
    await fetch(`${process.env.BRIDGE_URL || 'http://localhost:3000'}/api/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET },
      body: JSON.stringify({ token, approved: false })
    });
    return send(chatId, '❌ Login rejected.');
  }
}

async function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update);
  const msg = update.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) return send(chatId, '⛔ Unauthorized');
  if (awaitingInput.has(chatId)) return handleSetLimitInput(chatId, msg.text);
  const cmd = msg.text.split(' ')[0].toLowerCase();
  if (cmd === '/start' || cmd === '/help') return handleStart(chatId);
  if (cmd === '/policy') return handlePolicy(chatId);
  if (cmd === '/history') return handleHistory(chatId);
  if (cmd === '/pause') return handlePause(chatId);
  if (cmd === '/resume') return handleResume(chatId);
  if (cmd === '/health') return handleHealth(chatId);
  if (cmd === '/setlimit') return handleSetLimit(chatId);
  return send(chatId, '❓ Unknown command. Type /help');
}
let offset = 0;
async function poll() {
  try {
    const data = await tg('getUpdates', { offset, timeout: 10, allowed_updates: ['message', 'callback_query'] });
    if (data.result && data.result.length) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        handleUpdate(update).catch(console.error);
      }
    }
  } catch (e) {
    console.error('Poll error:', e.message);
  }
  setTimeout(poll, 1000);
}
console.log('🤖 ASA Guard Telegram Bot starting...');
poll();
