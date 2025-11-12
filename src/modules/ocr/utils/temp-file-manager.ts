import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

export class TempFileManager {
  private readonly tempBaseDir: string;
  private readonly logger = new Logger(TempFileManager.name);

  constructor(baseDir?: string) {
    this.tempBaseDir = baseDir || path.join(process.cwd(), 'tmp', 'ocr-temp');
    fs.ensureDirSync(this.tempBaseDir);
    this.logger.debug(`Temporary base directory: ${this.tempBaseDir}`);

    // Register cleanup on process exit
    process.on('exit', () => this.cleanupSync());
    process.on('SIGINT', () => {
      this.cleanupSync();
      process.exit();
    });
    process.on('SIGTERM', () => {
      this.cleanupSync();
      process.exit();
    });
    process.on('uncaughtException', (err) => {
      this.logger.error('Uncaught exception, cleaning up temp files:', err);
      this.cleanupSync();
      process.exit(1);
    });
  }

  /**
   * Creates a unique temporary directory for a specific OCR job.
   * @returns The path to the created temporary directory.
   */
  createJobTempDir(): string {
    const jobTempDir = path.join(this.tempBaseDir, uuidv4());
    fs.ensureDirSync(jobTempDir);
    this.logger.debug(`Created job temporary directory: ${jobTempDir}`);
    return jobTempDir;
  }

  /**
   * Creates a unique temporary file path within a given job directory.
   * @param jobTempDir The base temporary directory for the job.
   * @param prefix Optional prefix for the filename.
   * @param extension Optional file extension (e.g., '.png').
   * @returns The full path to the temporary file.
   */
  createTempFilePath(jobTempDir: string, prefix: string = 'temp', extension: string = ''): string {
    const filename = `${prefix}-${uuidv4()}${extension}`;
    const filePath = path.join(jobTempDir, filename);
    this.logger.debug(`Created temp file path: ${filePath}`);
    return filePath;
  }

  /**
   * Cleans up a specific job's temporary directory.
   * @param jobTempDir The path to the job's temporary directory.
   */
  async cleanupJobTempDir(jobTempDir: string): Promise<void> {
    try {
      if (fs.existsSync(jobTempDir)) {
        await fs.remove(jobTempDir);
        this.logger.debug(`Cleaned up job temporary directory: ${jobTempDir}`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up job temporary directory ${jobTempDir}: ${error.message}`);
    }
  }

  /**
   * Synchronously cleans up the base temporary directory.
   * Used for process exit handlers.
   */
  private cleanupSync(): void {
    try {
      if (fs.existsSync(this.tempBaseDir)) {
        fs.removeSync(this.tempBaseDir);
        this.logger.debug(`Synchronously cleaned up base temporary directory: ${this.tempBaseDir}`);
      }
    } catch (error) {
      this.logger.error(`Error synchronously cleaning up base temporary directory ${this.tempBaseDir}: ${error.message}`);
    }
  }
}
