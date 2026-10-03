import {
  Controller,
  Res,
  Get,
  HttpStatus,
  Body,
  ValidationPipe,
  Post,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { DocumentService } from "./document.service";
import { CreateDocumentDTO, UpdateDocumentDTO } from "./dto/document.dto";
import { PinoLogger } from "nestjs-pino";
import { AuthGuard } from "src/auth/auth-guard/auth-guard.guard";
import { Roles } from "src/Roles.decorator";

@Controller("document")
export class DocumentController {
  constructor(
    private readonly logger: PinoLogger,
    private documentService: DocumentService
  ) {}

  @Post("/create")
  async createDocument(
    @Body(ValidationPipe) document: CreateDocumentDTO,
    @Res() res
  ) {
    this.logger.info("Controller=>createDocument=>Input: %o", document);
    try {
      let result = await this.documentService.createDocument(document);
      this.logger.info("Controller=>createDocument=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>createDocument=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Get("/list")
  // @UseGuards(AuthGuard)
  // @Roles("customer")
  async listDocuments(
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Res() res
  ) {
    try {
      this.logger.info("Controller=>listDocuments=>Input: %o", limit, page);
      const result = await this.documentService.listDocuments({ page, limit });
      this.logger.info("Controller=>listDocuments=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>listDocuments=>error: %o", err.message);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Get(":id")
  // @Roles("customer")
  async findDocumentById(@Param("id") id: string, @Res() res) {
    this.logger.info("Controller=>findDocumentById=>Input: %o", id);
    try {
      const document = await this.documentService.findDocumentById(id);
      this.logger.info("Controller=>findDocumentById=>Output: %o", id);
      res.status(HttpStatus.OK).json(document);
    } catch (err) {
      this.logger.error("Controller=>findDocumentById=>Error: %o", id);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Patch("update/:id")
  // @Roles("customer")
  async updateDocument(
    @Body(ValidationPipe) document: UpdateDocumentDTO,
    @Param("id") documentId: string,
    @Res() res
  ) {
    this.logger.info("Controller=>updateDocument=>Input: %o", document);
    try {
      let result = await this.documentService.updateDocument(
        document,
        documentId
      );
      this.logger.info("Controller=>updateDocument=>Output: %o", result);
      res.status(200).json(result);
    } catch (err) {
      this.logger.error("Controller=>updateDocument=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }

  @Delete("/delete/:id")
  // @Roles("customer")
  async deleteDocument(@Param("id") documentId: string, @Res() res) {
    this.logger.info("Controller=>deleteDocument=>Input: %o", documentId);
    try {
      const result = await this.documentService.deleteDocument(documentId);
      this.logger.info("Controller=>deleteDocument=>Output: %o", result);
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error("Controller=>deleteDocument=>Error: %o", err);
      res.status(HttpStatus.BAD_REQUEST).json(err.message);
    }
  }
}
