import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomLock, RoomLockDocument } from './room-lock.schema';

export interface CreateLockParams {
  roomType: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  paymentIntentId: string;
  apartmentId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  ttlMinutes?: number;
}

@Injectable()
export class RoomLockService {
  constructor(
    @InjectModel(RoomLock.name) private roomLockModel: Model<RoomLockDocument>,
  ) {}

  /**
   * Check if there's an active lock for the given room and dates
   */
  async findActiveLock(
    roomType: string,
    checkInDate: string | Date,
    checkOutDate: string | Date,
  ): Promise<RoomLock | null> {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const now = new Date();

    const lock = await this.roomLockModel.findOne({
      roomType,
      expiresAt: { $gt: now },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    }).exec();

    return lock;
  }

  /**
   * Check if a lock exists (returns boolean)
   */
  async hasActiveLock(
    roomType: string,
    checkInDate: string | Date,
    checkOutDate: string | Date,
  ): Promise<boolean> {
    const lock = await this.findActiveLock(roomType, checkInDate, checkOutDate);
    return lock !== null;
  }

  /**
   * Create a new lock for the room
   */
  async createLock(params: CreateLockParams): Promise<RoomLockDocument> {
    const {
      roomType,
      checkInDate,
      checkOutDate,
      paymentIntentId,
      apartmentId,
      guestName,
      guestEmail,
      guestPhone,
      ttlMinutes = 15,
    } = params;

    const existingLock = await this.findActiveLock(roomType, checkInDate, checkOutDate);
    
    if (existingLock) {
      throw new ConflictException(
        'Camera este în curs de rezervare de alt utilizator. Vă rugăm să încercați în câteva minute.',
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    try {
      const lock = await this.roomLockModel.create({
        roomType,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        paymentIntentId,
        expiresAt,
        apartmentId,
        guestName,
        guestEmail,
        guestPhone,
      });
      
      return lock;
    } catch (error: any) {
      if (error.code === 11000) {
        const existingLock = await this.roomLockModel.findOne({ paymentIntentId }).exec();
        if (existingLock) {
          return existingLock;
        }
      }
      throw error;
    }
  }

  /**
   * Delete a lock by paymentIntentId
   */
  async deleteLock(paymentIntentId: string): Promise<boolean> {
    const result = await this.roomLockModel.deleteOne({ paymentIntentId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete a lock by room and dates
   */
  async deleteLockByRoom(
    roomType: string,
    checkInDate: string | Date,
    checkOutDate: string | Date,
  ): Promise<boolean> {
    const result = await this.roomLockModel.deleteOne({
      roomType,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
    }).exec();
    
    return result.deletedCount > 0;
  }

  /**
   * Get all active locks (for debugging/admin)
   */
  async getAllActiveLocks(): Promise<RoomLock[]> {
    const now = new Date();
    return this.roomLockModel.find({
      expiresAt: { $gt: now },
    }).exec();
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    const now = new Date();
    const result = await this.roomLockModel.deleteMany({
      expiresAt: { $lt: now },
    }).exec();
    
    return result.deletedCount;
  }
}
