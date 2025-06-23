use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("AhXBUQmbhv9dNoZCiMYmXF4Gyi1cjQthWHFhTL2CJaSo");

#[program]
pub mod my_token_contract {
    use super::*;

    // ... existing instructions omitted for brevity ...

    // MINE instruction: user calls this to "mine" (claim) TEOS
    pub fn mine(ctx: Context<Mine>) -> Result<()> {
        let clock = Clock::get()?;
        let miner = &mut ctx.accounts.miner_state;
        // One mine per hour (3600 seconds) — adjust as needed
        require!(
            clock.unix_timestamp - miner.last_mined >= 3600,
            ErrorCode::MiningTooFrequent
        );

        let amount: u64 = 1_000_000; // 1 TEOS (assuming 6 decimals). Adjust as needed.
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        miner.last_mined = clock.unix_timestamp;
        Ok(())
    }
}

// Each miner/user has a PDA storing their mining state
#[account]
pub struct MinerState {
    pub last_mined: i64,
}

// Mining context: user, their token account, their MinerState PDA
#[derive(Accounts)]
pub struct Mine<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"miner", authority.key().as_ref()], bump)]
    pub miner_state: Account<'info, MinerState>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Mining too frequent, wait before mining again")]
    MiningTooFrequent,
}
