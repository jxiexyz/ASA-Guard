use anchor_lang::prelude::*;
use crate::state::AgentPolicy;
use crate::error::AgentError;

// ── INIT POLICY ──
#[derive(Accounts)]
pub struct InitPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = AgentPolicy::LEN,
        seeds = [b"policy", owner.key().as_ref()],
        bump
    )]
    pub policy: Account<'info, AgentPolicy>,

    pub system_program: Program<'info, System>,
}

pub fn init_policy(
    ctx: Context<InitPolicy>,
    agent: Pubkey,
    max_buy_sol: u64,
    stop_loss_bps: u16,
    take_profit_bps: u16,
    daily_limit_sol: u64,
) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    policy.owner = ctx.accounts.owner.key();
    policy.agent = agent;
    policy.max_buy_sol = max_buy_sol;
    policy.stop_loss_bps = stop_loss_bps;
    policy.take_profit_bps = take_profit_bps;
    policy.daily_limit_sol = daily_limit_sol;
    policy.daily_spent = 0;
    policy.last_reset = Clock::get()?.unix_timestamp;
    policy.trade_count = 0;
    policy.is_active = true;
    policy.bump = ctx.bumps.policy;
    msg!("ASA Guard policy initialized");
    Ok(())
}

// ── APPROVE TRADE ──
#[derive(Accounts)]
pub struct ApproveTrade<'info> {
    pub agent: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref()],
        bump = policy.bump,
        constraint = policy.agent == agent.key() @ AgentError::Unauthorized,
        constraint = policy.is_active @ AgentError::PolicyInactive,
    )]
    pub policy: Account<'info, AgentPolicy>,
}

pub fn approve_trade(ctx: Context<ApproveTrade>, amount_lamports: u64) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    let now = Clock::get()?.unix_timestamp;

    // reset daily limit kalau udah 24 jam
    if now - policy.last_reset > 86400 {
        policy.daily_spent = 0;
        policy.last_reset = now;
    }

    // cek max per trade
    require!(
        amount_lamports <= policy.max_buy_sol,
        AgentError::ExceedsMaxBuy
    );

    // cek daily limit
    require!(
        policy.daily_spent + amount_lamports <= policy.daily_limit_sol,
        AgentError::ExceedsDailyLimit
    );

    policy.daily_spent += amount_lamports;
    policy.trade_count += 1;

    msg!("Trade approved: {} lamports, trade #{}", amount_lamports, policy.trade_count);
    Ok(())
}

// ── UPDATE POLICY ──
#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy", owner.key().as_ref()],
        bump = policy.bump,
        constraint = policy.owner == owner.key() @ AgentError::Unauthorized,
    )]
    pub policy: Account<'info, AgentPolicy>,
}

pub fn update_policy(
    ctx: Context<UpdatePolicy>,
    max_buy_sol: u64,
    daily_limit_sol: u64,
    is_active: bool,
) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    policy.max_buy_sol = max_buy_sol;
    policy.daily_limit_sol = daily_limit_sol;
    policy.is_active = is_active;
    msg!("Policy updated");
    Ok(())
}
