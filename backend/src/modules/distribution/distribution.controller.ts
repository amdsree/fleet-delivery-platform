import { Controller, Get, Res, StreamableFile, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@Controller('distribution')
export class DistributionController {

  @Get('latest-version')
  getLatestVersion() {
    return {
      versionCode: 1,
      versionName: '1.0.0',
      minSupportedVersion: 1,
      releaseDate: '2026-10-08',
      downloadUrl: '/api/v1/distribution/download-apk',
      apkSizeMb: 12.4,
      releaseNotes: 'Enterprise Production Release: Real-time GPS foreground tracking, dispatch offers, stop progression, and proof of delivery canvas.',
    };
  }

  @Get('download-apk')
  downloadApk(@Res({ passthrough: true }) res: Response) {
    // Check paths for release apk
    const pathsToSearch = [
      join(process.cwd(), '../android/app/build/outputs/apk/release/app-release.apk'),
      join(process.cwd(), 'public/downloads/fleet-driver.apk'),
      join(__dirname, '../../../../android/app/build/outputs/apk/release/app-release.apk'),
    ];

    let apkPath = pathsToSearch.find((p) => existsSync(p));

    if (!apkPath) {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: 404,
        message: 'Enterprise release APK is currently building or unavailable.',
      });
      return;
    }

    res.set({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="fleet-driver-v1.0.0.apk"',
    });

    const fileStream = createReadStream(apkPath);
    return new StreamableFile(fileStream);
  }
}
