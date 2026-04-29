use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BhdRJ6avmPLhEhbUmhNh7DMyrTHtDtce4VM9xjQFgK1k");

#[program]
pub mod onchain {
    use super::*;

    pub fn init_policy(
        ctx: Context<InitPolicy>,
        agent: Pubkey,
        max_buy_sol: u64,
        stop_loss_bps: u16,
        take_profit_bps: u16,
        daily_limit_sol: u64,
    ) -> Result<()> {
        instructions::init_policy(ctx, agent, max_buy_sol, stop_loss_bps, take_profit_bps, daily_limit_sol)
    }

    pub fn approve_trade(ctx: Context<ApproveTrade>, amount_lamports: u64) -> Result<()> {
        instructions::approve_trade(ctx, amount_lamports)
    }

    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_buy_sol: u64,
        daily_limit_sol: u64,
        is_active: bool,
    ) -> Result<()> {
        instructions::update_policy(ctx, max_buy_sol, daily_limit_sol, is_active)
    }
}
