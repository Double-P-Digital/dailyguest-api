import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ApartmentModule } from './apartments/apartment.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationModule } from './reservation/reservation.module';
import { AuthModule } from './auth/auth.module';
import { DiscountCodeModule } from './discountCodes/discountCode.module';
import { RoomLockModule } from './room-lock/room-lock.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    PaymentsModule.forRootAsync(),
    ApartmentModule,
    PaymentsModule,
    ReservationModule,
    AuthModule,
    DiscountCodeModule,
    RoomLockModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
