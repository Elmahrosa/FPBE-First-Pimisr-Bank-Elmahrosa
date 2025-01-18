import mongoose, { Schema, Document } from 'mongoose'; // mongoose@^6.0.0
import { createHash, randomBytes } from 'crypto'; // built-in
import { MiningSession } from './mining.model';

// Enums for wallet management
export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  MAINTENANCE = 'MAINTENANCE'
}

export enum SecurityLevel {
  BASIC = 'BASIC',
  ENHANCED = 'ENHANCED',
  MAXIMUM = 'MAXIMUM'
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  NON_COMPLIANT = 'NON_COMPLIANT'
}

export enum TransactionType {
  MINING = 'MINING',
  TRANSFER = 'TRANSFER',
  EXCHANGE = 'EXCHANGE',
  SYSTEM = 'SYSTEM'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

// Interfaces
export interface IPiWallet extends Document {
  userId: string;
  walletAddress: string;
  balance: number;
  lastMined: Date;
  status: WalletStatus;
  securityLevel: SecurityLevel;
  complianceStatus: ComplianceStatus;
  lastAuditDate: Date;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;
  riskScore: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPiTransaction extends Document {
  walletId: string;
  type: TransactionType;
  amount: number;
  fromAddress: string;
  toAddress: string;
  status: TransactionStatus;
  riskAssessment: Record<string, number>;
  complianceChecks: string[];
  regulatoryFlags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Schema Definitions
const PiWalletSchema = new Schema<IPiWallet>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: validateWalletAddress,
      message: 'Invalid wallet address format'
    }
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastMined: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(WalletStatus),
    required: true,
    default: WalletStatus.PENDING_VERIFICATION
  },
  securityLevel: {
    type: String,
    enum: Object.values(SecurityLevel),
    required: true,
    default: SecurityLevel.BASIC
  },
  complianceStatus: {
    type: String,
    enum: Object.values(ComplianceStatus),
    required: true,
    default: ComplianceStatus.REVIEW_REQUIRED
  },
  lastAuditDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dailyTransactionLimit: {
    type: Number,
    required: true,
    default: 1000,
    min: 0
  },
  monthlyTransactionLimit: {
    type: Number,
    required: true,
    default: 10000,
    min: 0
  },
  riskScore: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'pi_wallets'
});

const PiTransactionSchema = new Schema<IPiTransaction>({
  walletId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'PiWallet',
    index: true
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromAddress: {
    type: String,
    required: true,
    validate: {
      validator: validateWalletAddress,
      message: 'Invalid source wallet address'
    }
  },
  toAddress: {
    type: String,
    required: true,
    validate: {
      validator: validateWalletAddress,
      message: 'Invalid destination wallet address'
    }
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    required: true,
    default: TransactionStatus.PENDING
  },
  riskAssessment: {
    type: Map,
    of: Number,
    default: {}
  },
  complianceChecks: [{
    type: String,
    required: true
  }],
  regulatoryFlags: [{
    type: String
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'pi_transactions'
});

// Indexes for performance optimization
PiWalletSchema.index({ userId: 1, status: 1 });
PiWalletSchema.index({ walletAddress: 1 }, { unique: true });
PiWalletSchema.index({ complianceStatus: 1, lastAuditDate: 1 });
PiWalletSchema.index({ createdAt: 1 });

PiTransactionSchema.index({ walletId: 1, type: 1 });
PiTransactionSchema.index({ fromAddress: 1, toAddress: 1 });
PiTransactionSchema.index({ status: 1, createdAt: 1 });

// Validation Functions
export async function validateWalletAddress(address: string): Promise<boolean> {
  if (!address || address.length !== 56) {
    return false;
  }

  // Verify address format (Pi Network specific)
  const addressRegex = /^pi[a-zA-Z0-9]{53}$/;
  if (!addressRegex.test(address)) {
    return false;
  }

  // Generate and verify checksum
  const addressBytes = Buffer.from(address.slice(2, -8));
  const checksum = createHash('sha256')
    .update(addressBytes)
    .digest('hex')
    .slice(0, 8);

  return checksum === address.slice(-8);
}

// Balance Update Function with Atomic Operations
export async function updateWalletBalance(
  walletId: string,
  amount: number,
  type: TransactionType
): Promise<IPiWallet> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await PiWallet.findById(walletId).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.status !== WalletStatus.ACTIVE) {
      throw new Error('Wallet is not active');
    }

    // Verify transaction limits
    const dailyTransactions = await PiTransaction.aggregate([
      {
        $match: {
          walletId: new mongoose.Types.ObjectId(walletId),
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).session(session);

    const dailyTotal = dailyTransactions[0]?.total || 0;
    if (dailyTotal + amount > wallet.dailyTransactionLimit) {
      throw new Error('Daily transaction limit exceeded');
    }

    // Update balance atomically
    const updatedWallet = await PiWallet.findByIdAndUpdate(
      walletId,
      {
        $inc: { balance: amount },
        $set: { lastMined: type === TransactionType.MINING ? new Date() : wallet.lastMined }
      },
      { new: true, session }
    );

    await session.commitTransaction();
    return updatedWallet!;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Model Creation
export const PiWallet = mongoose.model<IPiWallet>('PiWallet', PiWalletSchema);
export const PiTransaction = mongoose.model<IPiTransaction>('PiTransaction', PiTransactionSchema);

// Service Class Export
export class WalletService {
  static validateWalletAddress = validateWalletAddress;
  static updateWalletBalance = updateWalletBalance;
}