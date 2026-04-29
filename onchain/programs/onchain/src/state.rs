use anchor_lang::prelude::*;

#[account]
pub struct AgentPolicy {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub max_buy_sol: u64,
    pub stop_loss_bps: u16,
    pub take_profit_bps: u16,
    pub daily_limit_sol: u64,
    pub daily_spent: u64,
    pub last_reset: i64,
    pub trade_count: u32,
    pub is_active: bool,
    pub bump: u8,
}

impl AgentPolicy {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 2 + 2 + 8 + 8 + 8 + 4 + 1 + 1;
}
