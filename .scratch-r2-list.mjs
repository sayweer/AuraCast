import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

async function list(bucketEnvName) {
  const bucket = process.env[bucketEnvName]
  console.log(`\n=== ${bucketEnvName} = ${bucket} ===`)
  const res = await client.send(new ListObjectsV2Command({ Bucket: bucket }))
  if (!res.Contents || res.Contents.length === 0) {
    console.log('(empty)')
    return
  }
  for (const obj of res.Contents.sort((a, b) => (a.LastModified) - (b.LastModified))) {
    console.log(`${obj.LastModified.toISOString()}  ${(obj.Size / 1024).toFixed(1)}KB  ${obj.Key}`)
  }
  console.log(`Total: ${res.Contents.length} objects`)
}

await list('R2_PRIVATE_BUCKET')
await list('R2_PUBLIC_BUCKET')