use anchor_lang::prelude::*;

#[error_code]
pub enum AgentError {
    #[msg("Unauthorized: signer bukan agent atau owner")]
    Unauthorized,
    #[msg("Policy tidak aktif")]
    PolicyInactive,
    #[msg("Amount melebihi max buy per trade")]
    ExceedsMaxBuy,
    #[msg("Amount melebihi daily limit")]
    ExceedsDailyLimit,
}
