import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/users/user.entity';
import { UsersModule } from 'src/users/users.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UtilsModule } from 'src/utils/utils.module';
import { Drivers } from 'src/driver/driver.entity';
import { Vehicle } from 'src/vehicles/vehicle.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Users, Drivers,Vehicle]),
     UsersModule,JwtModule,UtilsModule
    ],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
})
export class AuthModule {}
