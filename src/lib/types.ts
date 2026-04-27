export type PlanName = "trial" | "starter" | "pro";

export type ChannelId = "smartstore" | "coupang" | "instagram";

export type OutputType =
  | "white-background"
  | "square-thumbnail"
  | "lifestyle"
  | "detail-hero";

export type AssetKind = "source" | "generated";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type StorageDriverName = "local" | "r2";

export type CreditLedgerReason =
  | "trial_grant"
  | "generation_debit"
  | "generation_refund"
  | "purchase_grant";

export type UserAccount = {
  id: string;
  email: string;
  plan: PlanName;
  credits: number;
  createdAt: string;
};

export type Project = {
  id: string;
  userId: string;
  productName: string;
  category: string;
  tone: string;
  heroCopy: string;
  channel: ChannelId;
  sourceAssetIds: string[];
  createdAt: string;
};

export type Asset = {
  id: string;
  userId: string;
  projectId: string;
  kind: AssetKind;
  outputType: OutputType | null;
  url: string;
  bucketKey?: string | null;
  publicUrl?: string | null;
  signedUrl?: string | null;
  storageDriver?: StorageDriverName | null;
  format?: "jpg" | "png" | "webp" | null;
  width: number;
  height: number;
  mimeType: string;
  prompt: string | null;
  createdAt: string;
};

export type GenerationJob = {
  id: string;
  userId: string;
  projectId: string;
  status: JobStatus;
  outputTypes: OutputType[];
  prompt: string;
  cost: number;
  resultAssetIds: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreData = {
  users: UserAccount[];
  projects: Project[];
  assets: Asset[];
  jobs: GenerationJob[];
  waitlist: WaitlistSignup[];
  billingEvents: BillingEvent[];
  creditLedger: CreditLedgerEntry[];
};

export type WaitlistSignup = {
  id: string;
  email: string;
  storeUrl: string | null;
  createdAt: string;
};

export type BillingEvent = {
  id: string;
  provider: "toss";
  userId?: string | null;
  eventType: string;
  paymentKey: string | null;
  orderId: string | null;
  productId?: string | null;
  creditsGranted: number;
  raw: unknown;
  createdAt: string;
};

export type CreditLedgerEntry = {
  id: string;
  userId: string;
  amount: number;
  reason: CreditLedgerReason;
  jobId: string | null;
  billingEventId: string | null;
  idempotencyKey: string;
  createdAt: string;
};
