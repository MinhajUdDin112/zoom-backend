import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = process.env.ROLES_KEY;
export const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);
