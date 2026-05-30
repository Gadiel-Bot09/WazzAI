import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// Initialize S3 Client for MinIO
const getS3Client = () => {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || '',
    region: process.env.MINIO_REGION || 'us-east-1', // MinIO defaults to us-east-1 usually
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || '',
      secretAccessKey: process.env.MINIO_SECRET_KEY || '',
    },
    forcePathStyle: true, // Required for MinIO
  })
}

export async function generateUploadUrl(fileName: string, fileType: string) {
  if (!process.env.MINIO_ENDPOINT) {
    throw new Error('MinIO no está configurado en las variables de entorno.')
  }

  const client = getS3Client()
  const bucket = process.env.MINIO_BUCKET_NAME || 'wazzai'
  
  // Create a unique file name
  const extension = fileName.split('.').pop()
  const key = `uploads/${uuidv4()}.${extension}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
  })

  // URL expires in 5 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })
  
  // Construct the public URL assuming the bucket is public or we serve via proxy
  // Alternatively, we could generate a download presigned URL later.
  // Assuming the bucket has a public policy for /uploads:
  let publicUrl = ''
  
  // If endpoint ends with slash or not
  const endpoint = process.env.MINIO_ENDPOINT.endsWith('/') 
    ? process.env.MINIO_ENDPOINT.slice(0, -1) 
    : process.env.MINIO_ENDPOINT
    
  publicUrl = `${endpoint}/${bucket}/${key}`

  return { uploadUrl, key, publicUrl }
}
