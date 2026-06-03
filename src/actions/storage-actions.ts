'use server'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'https://esetre.sinuhub.com',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true, // MinIO requiere forcePathStyle
})

export async function getPresignedUploadUrlAction(fileName: string, contentType: string) {
  try {
    const bucket = process.env.MINIO_BUCKET
    
    if (!bucket || !process.env.MINIO_ACCESS_KEY) {
       return { success: false, error: 'Credenciales de MinIO no configuradas en el servidor.' }
    }

    const extension = fileName.split('.').pop() || 'bin'
    const uniqueFileName = `${uuidv4()}.${extension}`
    const key = `chat-media/${uniqueFileName}`

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    
    // Construir la URL pública final
    const endpoint = process.env.MINIO_ENDPOINT || 'https://esetre.sinuhub.com'
    const publicUrl = `${endpoint}/${bucket}/${key}`

    return { success: true, presignedUrl, publicUrl, key }
  } catch (error: any) {
    console.error('Error generando URL de MinIO:', error)
    return { success: false, error: error.message }
  }
}
