import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreateDocumentDTO, UpdateDocumentDTO } from "./dto/document.dto";
import { PinoLogger } from "nestjs-pino";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Document } from "./document.entity";

@Injectable()
export class DocumentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>
  ) {}

  async createDocument(document: CreateDocumentDTO) {
    this.logger.info("Service=>createDocument=>Input: %o", document);
    try {
      const documentCreated = await this.documentRepository.save(document);
      this.logger.info("Service=>createDocument=>Output: %o", documentCreated);
      return documentCreated;
    } catch (err) {
      this.logger.error("Service=>createDocument=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async updateDocument(document: UpdateDocumentDTO, documentId: string) {
    this.logger.info("Service=>updateDocument=>Input: %o", document);
    try {
      const documentUpdated = await this.documentRepository.update(
        documentId,
        document
      );
      if (documentUpdated.affected === 0) {
        throw new Error("Document not found");
      }
      const updatedDocument = await this.documentRepository.findOne({
        where: { id: documentId },
      });
      this.logger.info("Service=>updateDocument=>Output: %o", updatedDocument);
      return updatedDocument;
    } catch (err) {
      this.logger.error("Service=>updateDocument=>Error: %o", err);
      throw new Error(err);
    }
  }

  async deleteDocument(documentId: string) {
    this.logger.info("Service=>deleteDocument=>Input: %o", documentId);
    try {
      const documentDeleted = await this.documentRepository.delete(documentId);
      this.logger.info("Service=>deleteDocument=>Output: %o", documentDeleted);
      return documentId;
    } catch (err) {
      this.logger.error("Service=>deleteDocument=>Error: %o", err);
      throw new Error(err);
    }
  }

  async listDocuments(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    try {
      const [documents, total] = await this.documentRepository.findAndCount({
        skip,
        take: limit,
      });
      return { documents, total };
    } catch (err) {
      this.logger.error("Service=>listDocuments=>Error: %o", err);
      throw new Error(err.message);
    }
  }

  async findDocumentById(id: string) {
    this.logger.info("Service=>findDocumentById=>Input: %o", id);
    try {
      const document = await this.documentRepository.findOne({ where: { id } });

      this.logger.info("Service=>findDocumentById=>Output: %o", document);
      if (document) {
        return document;
      } else {
        this.logger.error(
          "Service=>findDocumentById=>Error: %o",
          "Document does not exist"
        );
        throw new Error("Document does not exist");
      }
    } catch (err) {
      this.logger.error("Service=>findDocumentById=>Error: %o", err);
      throw new Error(err.message);
    }
  }
}
