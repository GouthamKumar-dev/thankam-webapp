import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Post('test-email')
  testEmail(@Body() body: { email: string }) {
    return this.settingsService.testEmail(body.email);
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Put()
  upsert(@Body() dto: UpsertSettingDto) {
    return this.settingsService.upsert(dto.key, dto.value);
  }
}
