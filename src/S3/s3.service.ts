import { Injectable } from "@nestjs/common";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly BUCKET_NAME = process.env.S3_BUCKET_NAME;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return url;
  }
}
