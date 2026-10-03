import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from './rating.entity';
import { UsersModule } from 'src/users/users.module';
import { DriverModule } from 'src/driver/driver.module';
import { RideModule } from 'src/rides/rides.module';
import { Rides } from 'src/rides/rides.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Rating, Rides]),UsersModule,JwtModule, DriverModule],
  controllers: [RatingController],
  providers: [RatingService]
})
export class RatingModule {}
