import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StorageError } from '@/lib/errors'

// Cloudflare R2 is S3-compatible. Two buckets:
//   public  → fan outputs (purchases/), public domain via R2_PUBLIC_URL
//   private → creator reference + verification audio, signed-URL access only
const PUBLIC_BUCKET = () => requireEnv('R2_PUBLIC_BUCKET')
const PRIVATE_BUCKET = () => requireEnv('R2_PRIVATE_BUCKET')

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new StorageError(`Missing required env: ${name}`)
    }
    return value
}

let client: S3Client | null = null

function r2(): S3Client {
    if (client) return client
    client = new S3Client({
        region: 'auto',
        endpoint: requireEnv('R2_ENDPOINT'),
        credentials: {
            accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
            secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        },
        // AWS SDK v3 varsayılan olarak CRC32 checksum ekler; R2 bununla uyumsuz
        // (presigned PUT'ta boş checksum reddedilir). Sadece gerektiğinde hesapla.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    })
    return client
}

/**
 * Presigned PUT URL for direct browser → private bucket upload.
 * The browser MUST send the exact same Content-Type when PUTting, or R2 returns 403.
 */
export async function getPresignedPutUrl(
    objectKey: string,
    contentType: string,
    expiresIn = 600
): Promise<string> {
    const cmd = new PutObjectCommand({
        Bucket: PRIVATE_BUCKET(),
        Key: objectKey,
        ContentType: contentType,
    })
    return getSignedUrl(r2(), cmd, { expiresIn })
}

/**
 * Short-lived signed GET URL for a private object — handed to Fal as reference audio.
 * Must be fetchable with no extra auth headers (query-param signature only).
 */
export async function getSignedGetUrl(objectKey: string, expiresIn = 300): Promise<string> {
    const cmd = new GetObjectCommand({
        Bucket: PRIVATE_BUCKET(),
        Key: objectKey,
    })
    return getSignedUrl(r2(), cmd, { expiresIn })
}

/** Confirms a private object actually exists (register-time validation). */
export async function privateObjectExists(objectKey: string): Promise<boolean> {
    try {
        await r2().send(new HeadObjectCommand({ Bucket: PRIVATE_BUCKET(), Key: objectKey }))
        return true
    } catch {
        return false
    }
}

/** Uploads a fan output to the PUBLIC bucket and returns its permanent public URL. */
export async function uploadPublicObject(
    objectKey: string,
    body: Uint8Array,
    contentType: string
): Promise<string> {
    await r2().send(
        new PutObjectCommand({
            Bucket: PUBLIC_BUCKET(),
            Key: objectKey,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        })
    )
    return `${requireEnv('R2_PUBLIC_URL').replace(/\/$/, '')}/${objectKey}`
}

/** Server-side upload to the PRIVATE bucket (e.g. consent verification audio). */
export async function uploadPrivateObject(
    objectKey: string,
    body: Uint8Array,
    contentType: string
): Promise<void> {
    await r2().send(
        new PutObjectCommand({
            Bucket: PRIVATE_BUCKET(),
            Key: objectKey,
            Body: body,
            ContentType: contentType,
        })
    )
}

export async function deletePublicObject(objectKey: string): Promise<void> {
    await r2().send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET(), Key: objectKey }))
}
