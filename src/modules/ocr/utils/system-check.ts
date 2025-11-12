import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SystemDependencyChecker {
  private readonly logger = new Logger(SystemDependencyChecker.name);

  async checkDependencies(): Promise<void> {
    this.logger.log('Checking system dependencies...');
    const dependencies = [
      { command: 'pdftoppm -v', name: 'Poppler (pdftoppm)', install: 'sudo apt-get install poppler-utils' },
      { command: 'tesseract -v', name: 'Tesseract OCR', install: 'sudo apt-get install tesseract-ocr' },
      { command: 'convert -v', name: 'ImageMagick (convert)', install: 'sudo apt-get install imagemagick' },
      { command: 'identify -v', name: 'ImageMagick (identify)', install: 'sudo apt-get install imagemagick' },
    ];

    for (const dep of dependencies) {
      try {
        await execAsync(dep.command);
        this.logger.log(`Dependency '${dep.name}' found.`);
      } catch (error) {
        const errorMessage = `Dependency '${dep.name}' not found or not working. Please install it. Command: '${dep.command}'. Installation hint: '${dep.install}'. Error: ${error.message}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
    this.logger.log('All required system dependencies are present.');
  }
}
