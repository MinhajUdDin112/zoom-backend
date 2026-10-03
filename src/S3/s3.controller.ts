import { Controller, Get, Query } from "@nestjs/common";
import { S3Service } from "./s3.service";

@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Get("presigned-url")
  async getPresignedUrl(@Query("key") key: string): Promise<{ url: string }> {
    const url = await this.s3Service.getPresignedUrl(key);
    return { url };
  }
}
