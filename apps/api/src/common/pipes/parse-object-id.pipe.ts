import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import mongoose from 'mongoose';
import { ERROR_CODES } from '../errors/error-codes.js';
import { ApiException } from '../exceptions/api.exception.js';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!mongoose.isValidObjectId(value)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.INVALID_OBJECT_ID,
        'Invalid object identifier',
      );
    }
    return value;
  }
}