import { IsArray, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsUrl()
  supplierUrl?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cost!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sellingPrice!: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
