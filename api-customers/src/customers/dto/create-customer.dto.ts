// create-client.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(10)
  @MinLength(5)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsEnum(['individual', 'professional'])
  type?: string;
}
