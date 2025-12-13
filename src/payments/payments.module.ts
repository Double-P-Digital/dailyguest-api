import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Stripe } from 'stripe';
import { ReservationModule } from '../reservation/reservation.module';
import { ApartmentModule } from '../apartments/apartment.module';
import { RoomLockModule } from '../room-lock/room-lock.module';

@Module({})
export class PaymentsModule {
  static forRootAsync(): DynamicModule {
    return {
      module: PaymentsModule,
      controllers: [PaymentsController],
      imports: [ConfigModule, ReservationModule, ApartmentModule, RoomLockModule],
      providers: [
        {
          provide: 'STRIPE_CLIENT',
          useFactory: (configService: ConfigService) => {
            return new Stripe(configService.get<string>('STRIPE_SECRET_KEY')!);
          },
          inject: [ConfigService],
        },
        PaymentsService,
      ],
      exports: [PaymentsService],
    };
  }
}
