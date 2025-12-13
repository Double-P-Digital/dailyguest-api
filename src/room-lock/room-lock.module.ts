import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomLock, RoomLockSchema } from './room-lock.schema';
import { RoomLockService } from './room-lock.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RoomLock.name, schema: RoomLockSchema }]),
  ],
  providers: [RoomLockService],
  exports: [RoomLockService],
})
export class RoomLockModule {}



