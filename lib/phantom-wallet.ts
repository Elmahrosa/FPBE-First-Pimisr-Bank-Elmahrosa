const RPC_URL = "https://api.mainnet-beta.solana.com"

// Token mint addresses from Dexlab
export const SOLANA_MINTS = {
  ERT: "DHJkzU4yVpBMtDGs78hmw5KSYvfpQ2Jfqd8j7y8fSZ9m",
  TEOS: "AhXBUQmbhv9dNoZCiMYmXF4Gyi1cjQthWHFhTL2CJaSo",
  TUT: "Gvce3ukeWYDprBeVtYrqUVdgMcRGADWSkX5vCKMQG3b5"
}

export const TREASURY_WALLET = "F1YLmukcxAyZj6zVpi2XaVctmYnuZQB5uHpd3uUpXxr6"

type TokenBalance = {
  mint: string
  amount: number
  decimals: number
  uiAmount: number
  symbol?: string
}

declare global {
  interface Window {
    solana?: any
  }
}

export async function connectPhantom(): Promise<string | null> {
  if (!window.solana) {
    alert("Phantom wallet not installed! Please install from phantom.app")
    return null
  }
  
  try {
    const resp = await window.solana.connect()
    return resp?.publicKey?.toString() || null
  } catch (error) {
    console.error("[v0] Phantom connection error:", error)
    return null
  }
}

export async function getAllSplBalances(walletAddress: string): Promise<TokenBalance[]> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" }
        ]
      })
    })
    const json = await res.json()

    const list: TokenBalance[] =
      (json?.result?.value || []).map((acc: any) => {
        const info = acc?.account?.data?.parsed?.info
        const mint = info?.mint
        const amount = Number(info?.tokenAmount?.amount || 0)
        const decimals = Number(info?.tokenAmount?.decimals || 0)
        const uiAmount = Number(info?.tokenAmount?.uiAmount || 0)
        return { mint, amount, decimals, uiAmount }
      }) || []

    return list.map(tb => ({
      ...tb,
      symbol:
        tb.mint === SOLANA_MINTS.ERT ? "ERT" :
        tb.mint === SOLANA_MINTS.TEOS ? "TEOS" :
        tb.mint === SOLANA_MINTS.TUT ? "TUT" : undefined
    }))
  } catch (error) {
    console.error("[v0] Error fetching SPL balances:", error)
    return []
  }
}

export async function getMintBalance(walletAddress: string, mintAddress: string): Promise<TokenBalance | null> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: mintAddress },
          { encoding: "jsonParsed" }
        ]
      })
    })
    const json = await res.json()
    const acc = json?.result?.value?.[0]
    const info = acc?.account?.data?.parsed?.info
    if (!info) return null

    const amount = Number(info?.tokenAmount?.amount || 0)
    const decimals = Number(info?.tokenAmount?.decimals || 0)
    const uiAmount = Number(info?.tokenAmount?.uiAmount || 0)
    const symbol =
      mintAddress === SOLANA_MINTS.ERT ? "ERT" :
      mintAddress === SOLANA_MINTS.TEOS ? "TEOS" :
      mintAddress === SOLANA_MINTS.TUT ? "TUT" : undefined

    return { mint: mintAddress, amount, decimals, uiAmount, symbol }
  } catch (error) {
    console.error("[v0] Error fetching mint balance:", error)
    return null
  }
}

export async function getPhantomBalances(address: string): Promise<{ ERT: number; TEOS: number; TUT: number }> {
  try {
    const ert = await getMintBalance(address, SOLANA_MINTS.ERT)
    const teos = await getMintBalance(address, SOLANA_MINTS.TEOS)
    const tut = await getMintBalance(address, SOLANA_MINTS.TUT)
    
    return {
      ERT: ert?.uiAmount || 0,
      TEOS: teos?.uiAmount || 0,
      TUT: tut?.uiAmount || 0
    }
  } catch (error) {
    console.error("[v0] Error fetching Phantom balances:", error)
    return { ERT: 0, TEOS: 0, TUT: 0 }
  }
}
