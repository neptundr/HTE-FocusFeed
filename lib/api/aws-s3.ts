export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  contentType: string;
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<PresignedUrlResult> {
  if (process.env.USE_MOCK_DATA === "true") {
    return {
      uploadUrl: `https://mock-bucket.s3.amazonaws.com/${filename}`,
      key: filename,
      contentType,
    };
  }

  const key = `uploads/${Date.now()}-${filename}`;

  // AWS SDK is optional - only loaded when credentials are configured
  try {
    const s3Module = await import("@aws-sdk/client-s3");
    const presignerModule = await import("@aws-sdk/s3-request-presigner");

    const client = new s3Module.S3Client({
      region: process.env.REGION_AWS || "us-east-1",
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID_AWS!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY_AWS!,
      },
    });

    const command = new s3Module.PutObjectCommand({
      Bucket: process.env.S3_BUCKET_AWS!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await presignerModule.getSignedUrl(client, command, { expiresIn: 3600 });
    return { uploadUrl, key, contentType };
  } catch {
    throw new Error("AWS SDK not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner");
  }
}

export async function getFileUrl(key: string): Promise<string> {
  if (process.env.USE_MOCK_DATA === "true") {
    return `https://mock-bucket.s3.amazonaws.com/${key}`;
  }
  return `https://${process.env.S3_BUCKET_AWS}.s3.${process.env.REGION_AWS}.amazonaws.com/${key}`;
}

export async function downloadFileFromS3(key: string): Promise<Buffer> {
  const s3Module = await import("@aws-sdk/client-s3");

  const client = new s3Module.S3Client({
    region: process.env.REGION_AWS || "us-east-1",
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID_AWS!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY_AWS!,
    },
  });

  const response = await client.send(
    new s3Module.GetObjectCommand({
      Bucket: process.env.S3_BUCKET_AWS!,
      Key: key,
    })
  );

  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
