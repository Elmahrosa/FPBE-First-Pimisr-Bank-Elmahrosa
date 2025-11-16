export const CONFIG = {
  piNetwork: {
    appId: "firstpimisrbanke1502",
    pinetSubdomain: "fpbe5523", // Added PiNet subdomain from Pi Developer Portal
    domain: process.env.NEXT_PUBLIC_DOMAIN || "https://bank.teosegypt.com",
    vercelUrl: "https://fpbe-elmahrosa1.vercel.app",
    pinetUrl: "https://fpbe5523.pinet.com",
    validationKey: "d2c87a3ff9eb731e0767355e2856fa539570345a117300de7356b1a19e54922d42a83e6fe7b6cd8af5cdf30b2f6ea09ed1d99852ef5610469534123922317484",
    sandboxMode: false,
    fullscreenSupported: true, // Enabled fullscreen support
    metadataSupport: "frontend" // Set metadata support type to frontend
  },
  tokens: {
    active: ["PI", "ERT", "TUT", "USD", "USDT"],
    legacy: ["TEOS"]
  },
  conversion: {
    pi_to_ert: 5,
    ert_to_pi: 0.2,
    usdt_mirrors_usd: true
  },
  swapRates: {
    ERT: 5,
    TEOS: 20,
    TUT: 10
  },
  swapFee: 0.02, // 2% swap fee
  price: {
    refresh_interval_ms: 300000, // 5 minutes
    land_price_per_m2_usd: 500
  },
  land: {
    location: "Alexandria, Egypt",
    total_acres: 110,
    total_m2: 445154,
    min_share_m2: 1,
    max_share_m2: 50
  },
  icons: {
    PI: "/assets/icons/pi.svg",
    ERT: "/assets/icons/ert.svg",
    TUT: "/assets/icons/tut.svg",
    USD: "/assets/icons/usd.svg",
    USDT: "/assets/icons/usdt.svg",
    TEOS: "/assets/icons/teos.svg",
    FOUNDER: "/assets/icons/founder.svg",
    WHATSAPP: "/assets/icons/whatsapp.svg",
    PHANTOM: "/assets/icons/phantom.svg",
    CHAT: "/assets/icons/chat.svg",
    CHECK: "/assets/icons/check.svg",
    WARNING: "/assets/icons/warning.svg",
    SWAP: "/assets/icons/swap.svg",
    CARD: "/assets/icons/card.svg"
  },
  founder: {
    address: "0xaams1969",
    label: "Founder Ayman Seif",
    whatsapp: "+201006167293",
    verified_badge: "🟢"
  },
  solana: {
    rpc: "https://api.mainnet-beta.solana.com",
    ERT_MINT: "DHJkzU4yVpBMtDGs78hmw5KSYvfpQ2Jfqd8j7y8fSZ9m",
    TEOS_MINT: "AhXBUQmbhv9dNoZCiMYmXF4Gyi1cjQthWHFhTL2CJaSo",
    TUT_MINT: "Gvce3ukeWYDprBeVtYrqUVdgMcRGADWSkX5vCKMQG3b5"
  },
  admin: {
    treasuryWallet: "F1YLmukcxAyZj6zVpi2XaVctmYnuZQB5uHpd3uUpXxr6",
    petitionUrl: "https://www.change.org/p/join-the-movement-sign-the-petition-to-regulate-digital-currencies-in-egypt"
  }
}

export const tokenIcons = CONFIG.icons
