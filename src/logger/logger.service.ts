import { Injectable, Scope, Logger } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends PinoLogger {}
