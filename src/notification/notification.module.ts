import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DeviceToken } from './entity/device-token.entity';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { Users } from 'src/users/user.entity';
import { Notification } from './entity/notification.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DeviceToken,Users,Notification]),UsersModule,JwtModule],
    providers: [NotificationService],
    controllers: [NotificationController],
    exports: [NotificationService],
})
export class NotificationModule {}
