# ⚡ Virtual Power Plant (VPP) on Blockchain

Welcome to the decentralized future of energy management! This project creates a Virtual Power Plant system on the Stacks blockchain using Clarity smart contracts. It aggregates small-scale renewable energy sources (like rooftop solar panels or home wind turbines) into a unified "virtual" power plant, enabling them to participate in utility-scale energy trading. This solves real-world problems such as fragmented renewable energy markets, lack of access for small producers to wholesale trading, inefficient grid balancing, and opaque energy transactions.

By leveraging blockchain, we ensure transparent tracking of energy production, automated settlements, tokenized incentives, and decentralized governance—empowering individuals to contribute to a sustainable energy grid while earning rewards.

## ✨ Features

🔋 Aggregate small renewable sources into a single VPP entity for market participation  
📈 Real-time tracking and verification of energy production via oracles  
💰 Tokenized energy credits for trading and settlements  
🤝 Decentralized governance for VPP decisions (e.g., trading strategies)  
⚖️ Automated smart contract-based payments and incentives  
📊 Analytics and reporting for participants  
🚫 Dispute resolution mechanisms for fair play  
🌍 Integration with real-world energy data feeds  

## 🛠 How It Works

This system uses 8 Clarity smart contracts to handle different aspects of the VPP. Producers (e.g., homeowners with solar panels) register their devices, report production data, and earn tokens. The VPP aggregates this data to trade on energy markets as a large entity. Consumers or utilities can buy energy credits, with settlements handled automatically.

**For Energy Producers**  
- Register your renewable source with the RegistrationContract.  
- Use the ProductionOracleContract to submit verified energy production data (e.g., via off-chain meters).  
- The AggregationContract pools your output with others to form the VPP.  
- Earn ENERGY tokens via the TokenContract for your contributions.  

**For Traders/Utilities**  
- Browse available VPP capacity using the MarketplaceContract.  
- Place bids or buy energy credits, triggering automated trades.  
- Settlements are handled by the PaymentSettlementContract, transferring tokens or STX.  

**For Governance**  
- Participate in votes via the GovernanceContract to decide on VPP parameters (e.g., reserve thresholds).  
- Use the DisputeResolutionContract to challenge invalid data submissions.  

**Smart Contracts Overview**  
1. **RegistrationContract**: Handles user onboarding for producers and consumers, storing device metadata (e.g., capacity, location).  
2. **ProductionOracleContract**: Interfaces with off-chain oracles to record and verify energy production data immutably.  
3. **AggregationContract**: Computes total VPP output, forecasts, and balances supply across participants.  
4. **TokenContract**: Manages the ERC-20-like ENERGY token for representing energy credits and rewards.  
5. **MarketplaceContract**: Facilitates bidding, auctions, and direct trades of aggregated energy.  
6. **GovernanceContract**: Enables DAO-style voting for VPP rules, using staked tokens for proposals.  
7. **PaymentSettlementContract**: Automates payouts, fees, and transfers based on trade outcomes.  
8. **DisputeResolutionContract**: Allows challenges to production data, with slashing mechanisms for bad actors.  

To deploy: Clone the repo, use Clarinet for local testing, and deploy to Stacks testnet/mainnet. Example call: `(contract-call? .registration-contract register-device u123 "Solar Panel" u500)` to add a 500W device.

Boom! You're now part of a scalable, decentralized energy revolution.