import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

// Inicializamos el cliente S3 para MinIO en el servidor
function getS3Client() {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'https://esetre.sinuhub.com',
    region: process.env.MINIO_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || '',
      secretAccessKey: process.env.MINIO_SECRET_KEY || '',
    },
    forcePathStyle: true,
  })
}

export async function POST(req: NextRequest) {
  try {
    const bucket = process.env.MINIO_BUCKET
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY

    if (!bucket || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: 'MinIO no configurado. Revisa las variables de entorno: MINIO_BUCKET, MINIO_ACCESS_KEY, MINIO_SECRET_KEY' },
        { status: 500 }
      )
    }

    // Leer el form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    // Validar tamaño (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el límite de 25MB' }, { status: 413 })
    }

    // Generar un nombre único para el archivo
    const extension = file.name.split('.').pop() || 'bin'
    const uniqueFileName = `${uuidv4()}.${extension}`
    const key = `chat-media/${uniqueFileName}`

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const s3 = getS3Client()

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read', // Para que la URL sea pública
    }))

    const endpoint = process.env.MINIO_ENDPOINT || 'https://esetre.sinuhub.com'
    const publicUrl = `${endpoint}/${bucket}/${key}`

    return NextResponse.json({ success: true, url: publicUrl, key })
  } catch (error: any) {
    console.error('Error uploading to MinIO:', error)
    return NextResponse.json(
      { error: `Error al subir el archivo: ${error.message}` },
      { status: 500 }
    )
  }
}
