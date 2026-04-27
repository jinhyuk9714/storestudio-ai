import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { publicPathFromUrl } from "@/lib/server/paths";
import type { Asset, StorageDriverName } from "@/lib/types";

type EnvShape = Partial<
  Pick<NodeJS.ProcessEnv, "NODE_ENV" | "STORAGE_DRIVER" | "R2_PUBLIC_BASE_URL">
>;

let r2Client: S3Client | null = null;

export type PutStorageObjectInput = {
  bucketKey: string;
  body: Buffer;
  contentType: string;
};

export function selectStorageDriverName(env: EnvShape = process.env): StorageDriverName {
  if (env.STORAGE_DRIVER === "local" || env.STORAGE_DRIVER === "r2") {
    return env.STORAGE_DRIVER;
  }
  return env.NODE_ENV === "production" ? "r2" : "local";
}

export function assetUrlForStorageObject(input: {
  driver: StorageDriverName;
  bucketKey: string;
  publicBaseUrl?: string | null;
}): string {
  if (input.driver === "r2") {
    const publicBaseUrl = input.publicBaseUrl ?? process.env.R2_PUBLIC_BASE_URL;
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, "")}/${input.bucketKey}`;
    }
    return `/api/assets/${input.bucketKey}`;
  }

  return input.bucketKey.startsWith("/") ? input.bucketKey : `/${input.bucketKey}`;
}

export async function putR2Object(input: PutStorageObjectInput): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: input.bucketKey,
      Body: input.body,
      ContentType: input.contentType
    })
  );
}

export async function readAssetBufferFromStorage(asset: Asset): Promise<Buffer> {
  if (asset.storageDriver === "r2" || asset.url.startsWith("/api/assets/")) {
    if (!asset.bucketKey) {
      throw new Error("ASSET_BUCKET_KEY_REQUIRED");
    }
    return readR2Object(asset.bucketKey);
  }

  return readFile(publicPathFromUrl(asset.url));
}

export async function readR2Object(bucketKey: string): Promise<Buffer> {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: requiredEnv("R2_BUCKET"),
      Key: bucketKey
    })
  );

  if (!response.Body) {
    throw new Error("R2_EMPTY_OBJECT");
  }

  if (response.Body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if ("transformToByteArray" in response.Body) {
    const body = response.Body as { transformToByteArray(): Promise<Uint8Array> };
    return Buffer.from(await body.transformToByteArray());
  }

  throw new Error("R2_UNSUPPORTED_BODY");
}

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = requiredEnv("R2_ACCOUNT_ID");
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY")
      }
    });
  }
  return r2Client;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name}_REQUIRED`);
  }
  return value;
}
