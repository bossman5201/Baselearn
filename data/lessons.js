export const TRACKS = [
  {
    id: "fundamentals",
    title: "Base Fundamentals",
    description: "Start from zero: what Base is, how the app works, and core wallet concepts.",
    order: 1,
    lessonIds: ["L1", "L2", "L3", "L4", "L5"]
  },
  {
    id: "safety",
    title: "Safety First",
    description: "Build safe habits before trying financial features.",
    order: 2,
    lessonIds: ["L6", "L7", "L8", "L9", "L10"]
  },
  {
    id: "concepts",
    title: "DeFi and NFT Concepts",
    description: "Understand swaps, bridges, lending, LPs, and NFTs without executing transactions.",
    order: 3,
    lessonIds: ["L11", "L12", "L13", "L14", "L15"]
  },
  {
    id: "technical",
    title: "Technical Track",
    description: "High-level technical knowledge for users moving toward builder skills.",
    order: 4,
    lessonIds: ["L16", "L17", "L18", "L19", "L20"]
  }
];

const mkQuiz = (q1, q2, q3) => [q1, q2, q3];

export const LESSONS = [
  {
    id: "L1",
    trackId: "fundamentals",
    title: "What Base Is and Why L2 Exists",
    duration: "4 min",
    level: "Beginner",
    summary: "Why Ethereum Layer 2 networks exist and where Base fits.",
    objective: "Understand Base as an Ethereum Layer 2 focused on better cost and speed.",
    keyPoints: [
      "Ethereum mainnet can get expensive during high demand.",
      "Layer 2 networks improve throughput while settling on Ethereum.",
      "Base is a Layer 2 designed for easier user and builder onboarding."
    ],
    riskNotes: [
      "Lower fee does not remove scam risk.",
      "Users are still responsible for what they sign."
    ],
    glossary: [
      { term: "Layer 2", definition: "A network built on top of Ethereum for better efficiency." },
      { term: "Settlement", definition: "Final recording of network state on a base chain." },
      { term: "Mainnet", definition: "The live production blockchain." }
    ],
    quiz: mkQuiz(
      {
        id: "L1Q1",
        question: "Why do Layer 2 networks exist?",
        options: ["To replace wallets", "To improve cost and speed", "To remove private keys", "To avoid confirmations"],
        explanation: "Layer 2 aims to improve efficiency while using Ethereum security context."
      },
      {
        id: "L1Q2",
        question: "Base is best described as:",
        options: ["A centralized exchange", "A Layer 2 chain", "A validator pool", "A social account"],
        explanation: "Base is an Ethereum Layer 2 chain."
      },
      {
        id: "L1Q3",
        question: "Lower fees mean zero user risk.",
        options: ["True", "False", "Only for experts", "Only for stablecoins"],
        explanation: "Lower cost does not remove phishing or user error risk."
      }
    )
  },
  {
    id: "L2",
    trackId: "fundamentals",
    title: "Base Chain vs Base App vs Legacy Mode",
    duration: "4 min",
    level: "Beginner",
    summary: "Know the difference between network, app, and naming history.",
    objective: "Avoid confusion between chain instructions and app instructions.",
    keyPoints: [
      "Base chain is the blockchain network.",
      "Base app is the app experience with mini apps.",
      "Legacy mode refers to former Coinbase Wallet naming."
    ],
    riskNotes: [
      "Confusing product names can lead to bad steps.",
      "Always verify the exact feature name before action."
    ],
    glossary: [
      { term: "Base chain", definition: "The Layer 2 network itself." },
      { term: "Base app", definition: "Consumer app experience where mini apps run." },
      { term: "Legacy mode", definition: "Earlier Coinbase Wallet mode naming." }
    ],
    quiz: mkQuiz(
      {
        id: "L2Q1",
        question: "What is Base chain?",
        options: ["A token", "A Layer 2 network", "A browser extension", "A support channel"],
        explanation: "Base chain is the network layer."
      },
      {
        id: "L2Q2",
        question: "What does legacy mode refer to?",
        options: ["Bridge delay", "Former Coinbase Wallet naming", "A testnet", "A gas mode"],
        explanation: "Legacy mode is the former naming context."
      },
      {
        id: "L2Q3",
        question: "Why does naming clarity matter?",
        options: ["It changes APY", "It avoids product confusion", "It removes risk", "It lowers gas forever"],
        explanation: "Clear terms help users follow the right workflow."
      }
    )
  },
  {
    id: "L3",
    trackId: "fundamentals",
    title: "Wallet Basics: EOAs, Smart Wallets, Passkeys",
    duration: "5 min",
    level: "Beginner",
    summary: "Understand account models and passkey UX.",
    objective: "Learn how wallet type affects recovery and security habits.",
    keyPoints: [
      "EOAs are controlled by private keys.",
      "Smart wallets can support programmable behavior.",
      "Passkeys can simplify authentication UX."
    ],
    riskNotes: [
      "No wallet type removes the need for secure recovery setup.",
      "Scammers target all account models."
    ],
    glossary: [
      { term: "EOA", definition: "Externally owned account controlled by a private key." },
      { term: "Smart wallet", definition: "Contract account with programmable controls." },
      { term: "Passkey", definition: "Device-backed sign-in method." }
    ],
    quiz: mkQuiz(
      {
        id: "L3Q1",
        question: "An EOA is controlled by:",
        options: ["Private key", "Bridge contract", "Explorer UI", "Validator vote"],
        explanation: "EOAs are directly controlled by a private key."
      },
      {
        id: "L3Q2",
        question: "Smart wallets are useful because they can:",
        options: ["Eliminate all fees", "Add programmable rules", "Hide all tx data", "Replace Ethereum"],
        explanation: "Smart wallets can implement programmable account behavior."
      },
      {
        id: "L3Q3",
        question: "Passkeys mainly improve:",
        options: ["Login UX", "Token issuance", "Price impact", "Mining speed"],
        explanation: "Passkeys mostly improve authentication UX."
      }
    )
  },
  {
    id: "L4",
    trackId: "fundamentals",
    title: "Addresses, Transactions, and Confirmations",
    duration: "4 min",
    level: "Beginner",
    summary: "Learn address, transaction, and confirmation basics.",
    objective: "Read blockchain status language with confidence.",
    keyPoints: [
      "An address identifies an account.",
      "A transaction is a signed request to change state.",
      "Confirmations signal finalized inclusion."
    ],
    riskNotes: [
      "Sending to the wrong address can be irreversible.",
      "Verify destination and network before sending."
    ],
    glossary: [
      { term: "Address", definition: "Unique onchain account identifier." },
      { term: "Transaction", definition: "Signed instruction sent to the network." },
      { term: "Confirmation", definition: "Evidence transaction was finalized." }
    ],
    quiz: mkQuiz(
      {
        id: "L4Q1",
        question: "An address represents:",
        options: ["A token type", "An account identifier", "A private key", "A gas rule"],
        explanation: "Addresses identify accounts onchain."
      },
      {
        id: "L4Q2",
        question: "A transaction is:",
        options: ["A chat message", "A signed state request", "An address book", "A fee table"],
        explanation: "Transactions are signed requests for state changes."
      },
      {
        id: "L4Q3",
        question: "Confirmations indicate:",
        options: ["Wallet reset", "Finality confidence", "Price change", "Token burn"],
        explanation: "Confirmations indicate the transaction is finalized."
      }
    )
  },
  {
    id: "L5",
    trackId: "fundamentals",
    title: "Gas Fees and Sponsored Transactions",
    duration: "5 min",
    level: "Beginner",
    summary: "Understand gas and sponsorship in plain language.",
    objective: "Know what users should expect when fees are sponsored.",
    keyPoints: [
      "Gas is network cost for execution.",
      "Some apps can sponsor selected fees.",
      "Sponsored flow still requires user review."
    ],
    riskNotes: [
      "Sponsored does not mean every action is always free.",
      "Users should still verify prompts before signing."
    ],
    glossary: [
      { term: "Gas", definition: "Execution fee paid on network actions." },
      { term: "Sponsored transaction", definition: "An app covers part of transaction fee." },
      { term: "Paymaster", definition: "Service that can sponsor user operation fees." }
    ],
    quiz: mkQuiz(
      {
        id: "L5Q1",
        question: "Gas is:",
        options: ["A stablecoin", "A network fee", "A seed phrase", "A bridge ID"],
        explanation: "Gas is the execution fee for network actions."
      },
      {
        id: "L5Q2",
        question: "Sponsored transaction means:",
        options: ["No review needed", "App may cover fee costs", "All chains are free", "No confirmations needed"],
        explanation: "Sponsorship can reduce cost but not user responsibility."
      },
      {
        id: "L5Q3",
        question: "Safest mindset:",
        options: ["Sign fast", "Review every prompt", "Share wallet keys", "Ignore network info"],
        explanation: "Prompt review is a core safety habit."
      }
    )
  },
  {
    id: "L6",
    trackId: "safety",
    title: "Sending and Receiving Safely",
    duration: "4 min",
    level: "Beginner",
    summary: "Repeatable habits that reduce transfer mistakes.",
    objective: "Use a simple send checklist before every transfer.",
    keyPoints: [
      "Verify full address and network.",
      "Use a test transfer when possible.",
      "Be cautious with copied addresses."
    ],
    riskNotes: [
      "Most onchain send mistakes are irreversible.",
      "Urgency pressure is a common scam pattern."
    ],
    glossary: [
      { term: "Test transfer", definition: "Small transfer used to validate destination." },
      { term: "Address poisoning", definition: "Scam tactic using similar-looking addresses." },
      { term: "Network mismatch", definition: "Sending on wrong chain for recipient." }
    ],
    quiz: mkQuiz(
      {
        id: "L6Q1",
        question: "Best step before large transfer:",
        options: ["Skip checks", "Use a test transfer", "Trust unknown DMs", "Copy first 4 chars only"],
        explanation: "A small test send can prevent large mistakes."
      },
      {
        id: "L6Q2",
        question: "Why verify network and address together?",
        options: ["To increase APY", "To reduce irreversible errors", "To lower token supply", "To hide tx history"],
        explanation: "Correct address on wrong network can still fail."
      },
      {
        id: "L6Q3",
        question: "Unknown urgent payment request should be:",
        options: ["Paid instantly", "Verified through trusted channels", "Shared publicly", "Ignored forever without checks"],
        explanation: "Verification through official channels is safest."
      }
    )
  },
  {
    id: "L7",
    trackId: "safety",
    title: "Token Basics: Native, ERC-20, Stablecoins",
    duration: "4 min",
    level: "Beginner",
    summary: "Understand token categories and common confusion.",
    objective: "Differentiate native assets, ERC-20 tokens, and stablecoins.",
    keyPoints: [
      "Native assets usually pay network fees.",
      "ERC-20 is a common fungible token standard.",
      "Stablecoins target stable value but are not risk free."
    ],
    riskNotes: [
      "Token names can be spoofed.",
      "Verify source and context before trusting a token."
    ],
    glossary: [
      { term: "Native asset", definition: "Built-in chain asset used for fees." },
      { term: "ERC-20", definition: "Standard interface for fungible tokens." },
      { term: "Stablecoin", definition: "Token designed to track stable reference value." }
    ],
    quiz: mkQuiz(
      {
        id: "L7Q1",
        question: "ERC-20 is:",
        options: ["A bridge format", "A token standard", "A chat protocol", "A wallet backup"],
        explanation: "ERC-20 defines common token behavior."
      },
      {
        id: "L7Q2",
        question: "Stablecoins are:",
        options: ["Always risk free", "Designed for stable target value", "Only testnet tokens", "Not onchain"],
        explanation: "Stablecoins target value stability but still have risks."
      },
      {
        id: "L7Q3",
        question: "Safest approach with unknown token:",
        options: ["Trust logo", "Verify source and contract context", "Follow random post", "Ignore network"],
        explanation: "Verification helps avoid token spoof scams."
      }
    )
  },
  {
    id: "L8",
    trackId: "safety",
    title: "Approvals and Permissions (Conceptual)",
    duration: "5 min",
    level: "Beginner",
    summary: "Learn token approvals and why broad permissions can be risky.",
    objective: "Treat approvals as ongoing permissions, not one-time transfers.",
    keyPoints: [
      "Approval lets a contract spend your token under limits.",
      "Broad allowances can increase exposure.",
      "Review and revoke stale permissions regularly."
    ],
    riskNotes: [
      "Do not approve unknown contracts.",
      "Read every permission prompt carefully."
    ],
    glossary: [
      { term: "Approval", definition: "Permission for a contract to spend token." },
      { term: "Allowance", definition: "Maximum approved amount." },
      { term: "Revoke", definition: "Remove previously granted allowance." }
    ],
    quiz: mkQuiz(
      {
        id: "L8Q1",
        question: "An approval is:",
        options: ["The transfer itself", "A spend permission", "A gas refund", "A seed phrase backup"],
        explanation: "Approvals grant permissions; they are not the transfer itself."
      },
      {
        id: "L8Q2",
        question: "Why can unlimited approvals be risky?",
        options: ["They improve speed", "They increase exposure if contract fails", "They remove confirmations", "They hide balances"],
        explanation: "Large allowances increase downside if compromised."
      },
      {
        id: "L8Q3",
        question: "Good security habit:",
        options: ["Ignore approvals", "Review and revoke stale approvals", "Share keys with support", "Sign all prompts"],
        explanation: "Periodic review reduces long-term risk."
      }
    )
  },
  {
    id: "L9",
    trackId: "safety",
    title: "Scam Patterns and Red Flags",
    duration: "5 min",
    level: "Beginner",
    summary: "Spot common scam patterns before they cause losses.",
    objective: "Build a checklist for links, contracts, and social messages.",
    keyPoints: [
      "Scams use urgency, fake support, and impersonation.",
      "Airdrop bait links are common phishing vectors.",
      "Guaranteed profit language is a major red flag."
    ],
    riskNotes: [
      "Never share seed phrases or private keys.",
      "Use official channels for support and links."
    ],
    glossary: [
      { term: "Phishing", definition: "Fake interface or message to steal credentials/signatures." },
      { term: "Impersonation", definition: "Pretending to be official support or team." },
      { term: "Social engineering", definition: "Manipulating behavior to bypass caution." }
    ],
    quiz: mkQuiz(
      {
        id: "L9Q1",
        question: "Guaranteed high return offer is usually:",
        options: ["Safe", "A red flag", "Required", "Tax related"],
        explanation: "Guarantees in volatile environments are suspicious."
      },
      {
        id: "L9Q2",
        question: "Legitimate support asks for seed phrase.",
        options: ["True", "False", "Only for VIP", "Only on testnet"],
        explanation: "Legitimate support will never ask for seed phrase."
      },
      {
        id: "L9Q3",
        question: "Unknown urgent link should be:",
        options: ["Clicked now", "Verified through official channels", "Forwarded everywhere", "Signed immediately"],
        explanation: "Always verify before interacting."
      }
    )
  },
  {
    id: "L10",
    trackId: "safety",
    title: "What Support Can and Cannot Recover",
    duration: "4 min",
    level: "Beginner",
    summary: "Understand support boundaries for blockchain incidents.",
    objective: "Set realistic expectations and focus on prevention.",
    keyPoints: [
      "Finalized transfers are generally irreversible.",
      "Support can help diagnose but not always reverse.",
      "Document transaction hashes for support context."
    ],
    riskNotes: [
      "Recovery promises from unknown accounts are often scams.",
      "Use only official support pages."
    ],
    glossary: [
      { term: "Transaction hash", definition: "Unique ID for transaction lookup." },
      { term: "Irreversible", definition: "Cannot be undone after finalization." },
      { term: "Custodial", definition: "Provider controls key material." }
    ],
    quiz: mkQuiz(
      {
        id: "L10Q1",
        question: "Most finalized transfers are:",
        options: ["Easy to reverse", "Irreversible", "Auto-insured", "Hidden by default"],
        explanation: "Finalized blockchain transfers are typically irreversible."
      },
      {
        id: "L10Q2",
        question: "Support is best at:",
        options: ["Always reversing sends", "Diagnosing and guiding", "Sharing private keys", "Cancelling confirmations"],
        explanation: "Support can guide and diagnose, not guarantee reversal."
      },
      {
        id: "L10Q3",
        question: "Helpful info for support includes:",
        options: ["Token color", "Transaction hash and timeline", "Wallpaper screenshot", "No data"],
        explanation: "Transaction hash is the core trace artifact."
      }
    )
  },
  {
    id: "L11",
    trackId: "concepts",
    title: "Swaps: AMMs, Slippage, Price Impact",
    duration: "5 min",
    level: "Intermediate",
    summary: "Conceptual view of AMM swaps and output differences.",
    objective: "Explain why quote and execution can differ.",
    keyPoints: [
      "AMMs use pool math instead of order books.",
      "Slippage tolerance sets acceptable output range.",
      "Large trades in shallow pools have high price impact."
    ],
    riskNotes: [
      "High slippage can lead to poor outcomes.",
      "Always check minimum received values."
    ],
    glossary: [
      { term: "AMM", definition: "Automated market maker using liquidity pool formulas." },
      { term: "Slippage", definition: "Difference between quoted and executed price." },
      { term: "Price impact", definition: "How much a trade moves pool pricing." }
    ],
    quiz: mkQuiz(
      {
        id: "L11Q1",
        question: "AMM pricing depends on:",
        options: ["Random posts", "Pool balances and formula", "Wallet color", "Phone type"],
        explanation: "AMM pricing follows pool state and formula rules."
      },
      {
        id: "L11Q2",
        question: "Slippage means:",
        options: ["Bridge delay", "Price difference from quote", "Gas sponsorship", "Explorer lag"],
        explanation: "Slippage is expected vs actual execution gap."
      },
      {
        id: "L11Q3",
        question: "Large trade in shallow pool causes:",
        options: ["Low impact", "Higher price impact", "No confirmations", "No fees"],
        explanation: "Lower liquidity depth increases impact."
      }
    )
  },
  {
    id: "L12",
    trackId: "concepts",
    title: "Bridges: Why They Exist and Main Risks",
    duration: "5 min",
    level: "Intermediate",
    summary: "Bridge purpose, waiting states, and trust assumptions.",
    objective: "Understand why bridging adds extra operational risk.",
    keyPoints: [
      "Bridges move assets or messages across chains.",
      "Bridge flows can involve pending states.",
      "Bridge safety depends on implementation model."
    ],
    riskNotes: [
      "Wrong chain selection can break expected flow.",
      "Use trusted official bridge interfaces only."
    ],
    glossary: [
      { term: "Bridge", definition: "Tool that connects assets or messages between chains." },
      { term: "Finality delay", definition: "Waiting period before completion." },
      { term: "Trust assumptions", definition: "Security conditions required by the design." }
    ],
    quiz: mkQuiz(
      {
        id: "L12Q1",
        question: "Bridges are used to:",
        options: ["Rename wallets", "Move assets/messages across chains", "Disable fees", "Hide history"],
        explanation: "Bridges connect different networks."
      },
      {
        id: "L12Q2",
        question: "Bridge UX may include:",
        options: ["No waiting", "Pending status checks", "No network selection", "No confirmations"],
        explanation: "Many bridges are asynchronous and require waiting."
      },
      {
        id: "L12Q3",
        question: "Safer behavior is:",
        options: ["Use random links", "Use official vetted interface", "Share seed phrase", "Skip destination checks"],
        explanation: "Trusted interfaces reduce phishing risk."
      }
    )
  },
  {
    id: "L13",
    trackId: "concepts",
    title: "Lending, Borrowing, and Liquidations",
    duration: "5 min",
    level: "Intermediate",
    summary: "How collateralized borrowing works at a high level.",
    objective: "Understand collateral ratios and liquidation triggers.",
    keyPoints: [
      "Borrowing often requires over-collateralization.",
      "Collateral ratio drops can trigger liquidation.",
      "Rates shift based on supply and demand."
    ],
    riskNotes: [
      "Volatility can quickly change position safety.",
      "Liquidation can happen even if market moves briefly."
    ],
    glossary: [
      { term: "Collateral", definition: "Assets securing borrowed value." },
      { term: "Liquidation", definition: "Forced close of unsafe position." },
      { term: "Utilization", definition: "Share of supplied assets currently borrowed." }
    ],
    quiz: mkQuiz(
      {
        id: "L13Q1",
        question: "Borrowers usually must:",
        options: ["Post collateral", "Provide phone number", "Avoid rates", "Disable wallet"],
        explanation: "Collateral secures borrowing positions."
      },
      {
        id: "L13Q2",
        question: "Liquidation occurs when:",
        options: ["Position is healthy", "Safety threshold is broken", "Gas is low", "User logs out"],
        explanation: "Unsafe collateral ratios trigger liquidation logic."
      },
      {
        id: "L13Q3",
        question: "Rates often depend on:",
        options: ["Avatar image", "Utilization dynamics", "Chain color", "Wallet age"],
        explanation: "Supply-demand utilization shapes rate changes."
      }
    )
  },
  {
    id: "L14",
    trackId: "concepts",
    title: "LP and Yield Concepts",
    duration: "5 min",
    level: "Intermediate",
    summary: "Liquidity provision and impermanent loss explained simply.",
    objective: "Know what affects LP outcomes and why yield can change.",
    keyPoints: [
      "LPs earn swap fees for providing pool depth.",
      "Impermanent loss depends on asset price divergence.",
      "Yield metrics are variable and not guaranteed."
    ],
    riskNotes: [
      "High volatility can reduce LP performance.",
      "APY snapshots are not promises."
    ],
    glossary: [
      { term: "Liquidity provider", definition: "User depositing assets into pool." },
      { term: "Impermanent loss", definition: "Relative underperformance vs holding assets." },
      { term: "APY", definition: "Annualized yield estimate under assumptions." }
    ],
    quiz: mkQuiz(
      {
        id: "L14Q1",
        question: "LPs usually earn:",
        options: ["Swap fees", "No rewards", "Block rewards only", "Tax rebates"],
        explanation: "Pool fees are a common LP revenue source."
      },
      {
        id: "L14Q2",
        question: "Impermanent loss comes from:",
        options: ["Password resets", "Asset price divergence", "Gas sponsorship", "App loading speed"],
        explanation: "Price divergence changes pool position value mix."
      },
      {
        id: "L14Q3",
        question: "APY in interfaces is:",
        options: ["Guaranteed forever", "A variable estimate", "A legal contract", "Always fixed"],
        explanation: "APY changes with market and protocol conditions."
      }
    )
  },
  {
    id: "L15",
    trackId: "concepts",
    title: "NFT Basics: Ownership, Metadata, Royalties",
    duration: "4 min",
    level: "Intermediate",
    summary: "What NFT ownership means and common misconceptions.",
    objective: "Understand ownership records, metadata, and royalty caveats.",
    keyPoints: [
      "NFT ownership is tracked by contract state.",
      "Metadata may be onchain or offchain.",
      "Royalties vary by marketplace and implementation."
    ],
    riskNotes: [
      "Ownership does not always grant commercial rights.",
      "Verify collection contract and source."
    ],
    glossary: [
      { term: "NFT", definition: "Non-fungible token with unique ID." },
      { term: "Metadata", definition: "Descriptive data linked to token." },
      { term: "Royalty", definition: "Creator fee behavior by marketplace/contract." }
    ],
    quiz: mkQuiz(
      {
        id: "L15Q1",
        question: "NFT ownership is stored in:",
        options: ["Spreadsheet", "Token contract state", "Email inbox", "Chat history"],
        explanation: "Ownership is determined by onchain contract records."
      },
      {
        id: "L15Q2",
        question: "Metadata is:",
        options: ["Only wallet password", "Token descriptive information", "Gas setting", "Bridge route"],
        explanation: "Metadata describes token media and attributes."
      },
      {
        id: "L15Q3",
        question: "Royalties are:",
        options: ["Always guaranteed", "Dependent on implementation", "Not related to NFTs", "A chain ID"],
        explanation: "Royalty behavior can differ by marketplace and standards support."
      }
    ),
    sponsor: {
      name: "Example NFT Studio",
      disclosure: "Sponsored educational module"
    }
  },
  {
    id: "L16",
    trackId: "technical",
    title: "How Base Works at a High Level",
    duration: "5 min",
    level: "Technical",
    summary: "Architecture overview for non-engineers.",
    objective: "Understand sequencing, execution, and settlement terms.",
    keyPoints: [
      "Transactions are ordered and executed on L2.",
      "Data batches are anchored to Ethereum.",
      "This design aims for better UX while preserving security context."
    ],
    riskNotes: [
      "Architecture details evolve over time.",
      "Always validate technical assumptions using current docs."
    ],
    glossary: [
      { term: "Sequencer", definition: "Orders transactions for execution." },
      { term: "Batch", definition: "Grouped transaction data posting." },
      { term: "State root", definition: "Cryptographic summary of resulting state." }
    ],
    quiz: mkQuiz(
      {
        id: "L16Q1",
        question: "Sequencer mainly does:",
        options: ["Store seed phrases", "Order transactions", "Create tokens", "Write support tickets"],
        explanation: "Sequencers primarily order transactions."
      },
      {
        id: "L16Q2",
        question: "A batch is:",
        options: ["Random post", "Grouped transaction data", "Wallet backup", "UI component"],
        explanation: "Batches package data for settlement anchoring."
      },
      {
        id: "L16Q3",
        question: "Anchoring to Ethereum supports:",
        options: ["Better settlement base", "No confirmations", "No wallets", "No explorers"],
        explanation: "Anchoring ties results to Ethereum settlement context."
      }
    )
  },
  {
    id: "L17",
    trackId: "technical",
    title: "Contracts, ABIs, Events, Explorers",
    duration: "5 min",
    level: "Technical",
    summary: "How to read technical contract interfaces without coding.",
    objective: "Understand ABIs, events, and explorer data at a high level.",
    keyPoints: [
      "Contracts expose callable functions.",
      "ABIs define function inputs and outputs.",
      "Events are logs consumed by apps and analytics."
    ],
    riskNotes: [
      "Open code visibility does not guarantee audits.",
      "Use trusted references before interacting."
    ],
    glossary: [
      { term: "ABI", definition: "Interface format for contract interaction." },
      { term: "Event", definition: "Log record emitted by contract." },
      { term: "Explorer", definition: "Tool for viewing onchain data." }
    ],
    quiz: mkQuiz(
      {
        id: "L17Q1",
        question: "ABI helps with:",
        options: ["Encoding/decoding contract calls", "Changing token supply", "Recovering keys", "Bridge routing"],
        explanation: "ABI defines contract call structure."
      },
      {
        id: "L17Q2",
        question: "Events are used for:",
        options: ["Private key storage", "Structured execution logs", "Gas refunds", "DNS setup"],
        explanation: "Events are structured logs from execution."
      },
      {
        id: "L17Q3",
        question: "Explorer provides:",
        options: ["Onchain visibility", "Guaranteed safety", "Wallet creation", "Tax filing"],
        explanation: "Explorers help inspect addresses, txs, and contracts."
      }
    )
  },
  {
    id: "L18",
    trackId: "technical",
    title: "Account Abstraction and Paymasters",
    duration: "5 min",
    level: "Technical",
    summary: "How account abstraction improves onboarding UX.",
    objective: "Understand user operations and paymaster role.",
    keyPoints: [
      "Account abstraction enables programmable account logic.",
      "User operations can be sponsored through paymasters.",
      "This can reduce onboarding friction in apps."
    ],
    riskNotes: [
      "Sponsored flows still require careful prompt review.",
      "Sponsorship rules vary across apps."
    ],
    glossary: [
      { term: "Account abstraction", definition: "Programmable account model." },
      { term: "User operation", definition: "Structured account action request." },
      { term: "Paymaster", definition: "Entity sponsoring fee costs under policy." }
    ],
    quiz: mkQuiz(
      {
        id: "L18Q1",
        question: "Account abstraction enables:",
        options: ["Programmable account behavior", "No signatures ever", "No wallets", "No gas model"],
        explanation: "It allows smarter account logic."
      },
      {
        id: "L18Q2",
        question: "Paymaster can:",
        options: ["Sponsor fee costs", "Delete transactions", "Recover seed phrase", "Mint chain IDs"],
        explanation: "Paymasters can sponsor fees under rules."
      },
      {
        id: "L18Q3",
        question: "Sponsored flow means users can skip checks.",
        options: ["True", "False", "Only on testnet", "Only for passkeys"],
        explanation: "Users should always review prompts."
      }
    )
  },
  {
    id: "L19",
    trackId: "technical",
    title: "Mini App Manifest, Search, Discovery",
    duration: "5 min",
    level: "Technical",
    summary: "Metadata and indexing basics for distribution.",
    objective: "Know what improves discoverability and indexing quality.",
    keyPoints: [
      "Manifest defines mini app metadata.",
      "Name, category, and visual assets affect search quality.",
      "Re-sharing URL can help trigger reindex checks."
    ],
    riskNotes: [
      "Broken metadata can block indexing.",
      "Misleading metadata harms trust."
    ],
    glossary: [
      { term: "Manifest", definition: "Metadata descriptor for mini app." },
      { term: "Primary category", definition: "Main discovery classification." },
      { term: "Indexer", definition: "Service that reads and catalogs app metadata." }
    ],
    quiz: mkQuiz(
      {
        id: "L19Q1",
        question: "Manifest is important because it:",
        options: ["Stores keys", "Defines app metadata", "Sets token price", "Runs contracts"],
        explanation: "Discovery pipelines depend on manifest metadata."
      },
      {
        id: "L19Q2",
        question: "Primary category helps with:",
        options: ["Search placement", "Gas pricing", "Private key recovery", "Bridge speed"],
        explanation: "Category classification impacts discovery."
      },
      {
        id: "L19Q3",
        question: "After manifest updates, one useful action is:",
        options: ["Do nothing forever", "Re-share app URL", "Delete lessons", "Rotate seed phrase"],
        explanation: "Re-sharing can trigger reindex behavior."
      }
    )
  },
  {
    id: "L20",
    trackId: "technical",
    title: "Shipping Checklist: Security, UX, Compliance",
    duration: "5 min",
    level: "Technical",
    summary: "Practical launch checklist for safe mini app delivery.",
    objective: "Establish a repeatable pre-launch process.",
    keyPoints: [
      "Keep onboarding short and clear.",
      "Label sponsorship and risks transparently.",
      "Prepare support and incident playbooks before launch."
    ],
    riskNotes: [
      "Unclear disclosures can create legal and trust issues.",
      "Broken UX can reduce retention and indexing outcomes."
    ],
    glossary: [
      { term: "Onboarding", definition: "First-run user experience." },
      { term: "Disclosure", definition: "Clear statement of risk or sponsorship." },
      { term: "Playbook", definition: "Prepared response workflow." }
    ],
    quiz: mkQuiz(
      {
        id: "L20Q1",
        question: "Good onboarding is:",
        options: ["Complex", "Short and clear", "Hidden", "Forced with long forms"],
        explanation: "Simple onboarding improves completion and trust."
      },
      {
        id: "L20Q2",
        question: "Sponsored lessons should be:",
        options: ["Unlabeled", "Clearly labeled", "Paid in secret", "Removed from app"],
        explanation: "Transparency is essential for trust."
      },
      {
        id: "L20Q3",
        question: "Before launch you should have:",
        options: ["No support plan", "Support and incident playbook", "No analytics", "No manifest"],
        explanation: "Prepared operations reduce launch risk."
      }
    ),
    sponsor: {
      name: "Example Dev Tool",
      disclosure: "Sponsored educational module"
    }
  }
];

export const CERTIFICATES = [
  {
    id: "cert-fundamentals",
    typeId: 1,
    trackId: "fundamentals",
    name: "Base Fundamentals Certificate",
    priceUsd: 0.99,
    type: "module"
  },
  {
    id: "cert-safety",
    typeId: 2,
    trackId: "safety",
    name: "Base Safety Certificate",
    priceUsd: 0.99,
    type: "module"
  },
  {
    id: "cert-concepts",
    typeId: 3,
    trackId: "concepts",
    name: "Base Concepts Certificate",
    priceUsd: 0.99,
    type: "module"
  },
  {
    id: "cert-technical",
    typeId: 4,
    trackId: "technical",
    name: "Base Technical Certificate",
    priceUsd: 0.99,
    type: "module"
  },
  {
    id: "cert-master",
    typeId: 5,
    trackId: "all",
    name: "Learn Base Master Certificate",
    priceUsd: 2.99,
    type: "track"
  }
];

export const SPONSOR_POLICY = {
  title: "Sponsored Lesson Policy",
  rules: [
    "Every sponsored lesson must be labeled clearly as sponsored.",
    "Each sponsored lesson must include what it is, how it works, key risks, and alternatives.",
    "No guaranteed return claims or price prediction language.",
    "Editorial review remains with Learn Base before publishing."
  ]
};
