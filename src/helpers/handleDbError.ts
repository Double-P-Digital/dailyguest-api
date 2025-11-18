import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

export function handleDbError(error: any): never {
  if (error.code === 11000) {
    throw new ConflictException('Record already exists');
  }
  if (error.name === 'ValidationError') {
    throw new BadRequestException(error.message);
  }
  throw new InternalServerErrorException(
    'Database error, failed to create new record',
  );
}
