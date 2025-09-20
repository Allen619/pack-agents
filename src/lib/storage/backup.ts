// 配置备份管理服务
import { promises as fs } from 'fs';
import path from 'path';

export class BackupManager {
  private configRoot: string;
  private backupRoot: string;

  constructor(
    configRoot: string = './config',
    backupRoot: string = './backups'
  ) {
    this.configRoot = configRoot;
    this.backupRoot = backupRoot;
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupRoot, `backup-${timestamp}`);

    await fs.mkdir(backupDir, { recursive: true });
    await this.copyDirectory(this.configRoot, backupDir);

    return backupDir;
  }

  async listBackups(): Promise<
    Array<{ name: string; path: string; createdAt: Date; size: number }>
  > {
    try {
      const backupDirs = await fs.readdir(this.backupRoot);
      const backups = [];

      for (const dir of backupDirs) {
        if (dir.startsWith('backup-')) {
          const backupPath = path.join(this.backupRoot, dir);
          const stats = await fs.stat(backupPath);
          const size = await this.getDirectorySize(backupPath);

          backups.push({
            name: dir,
            path: backupPath,
            createdAt: stats.birthtime,
            size,
          });
        }
      }

      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    // 创建当前配置的备份
    const currentBackup = await this.createBackup();
    console.log(`当前配置已备份到: ${currentBackup}`);

    try {
      // 清空当前配置目录
      await fs.rm(this.configRoot, { recursive: true, force: true });

      // 从备份恢复
      await this.copyDirectory(backupPath, this.configRoot);
      console.log(`成功从 ${backupPath} 恢复配置`);
    } catch (error) {
      // 如果恢复失败，尝试恢复当前备份
      console.error('恢复失败，尝试恢复当前配置...');
      await this.copyDirectory(currentBackup, this.configRoot);
      throw error;
    }
  }

  async deleteBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupRoot, backupName);
    await fs.rm(backupPath, { recursive: true, force: true });
  }

  async cleanupOldBackups(maxBackups: number = 10): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length > maxBackups) {
      const toDelete = backups.slice(maxBackups);

      for (const backup of toDelete) {
        await this.deleteBackup(backup.name);
        console.log(`删除旧备份: ${backup.name}`);
      }
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    try {
      const entries = await fs.readdir(src, { withFileTypes: true });

      await fs.mkdir(dest, { recursive: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`源目录不存在: ${src}`);
        return;
      }
      throw error;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // 忽略无法访问的文件
    }

    return totalSize;
  }

  async exportConfig(targetPath: string): Promise<void> {
    await this.copyDirectory(this.configRoot, targetPath);
  }

  async importConfig(sourcePath: string): Promise<void> {
    // 先备份当前配置
    await this.createBackup();

    // 导入新配置
    await fs.rm(this.configRoot, { recursive: true, force: true });
    await this.copyDirectory(sourcePath, this.configRoot);
  }

  formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
