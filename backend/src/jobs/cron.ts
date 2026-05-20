import cron from 'node-cron';
import { prisma } from '../lib/db';
import { TokenService } from '../services/tokenService';
import { logger } from '../lib/logger';

export const initCronJobs = () => {
  // Monthly token reset for all users - runs at 00:00 on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Starting monthly token reset for all users...');
    try {
      const wallets = await prisma.tokenWallet.findMany({
        include: { user: true }
      });

      for (const wallet of wallets) {
        try {
          await TokenService.monthlyReset(wallet.userId);
          logger.info(`Tokens reset for user ${wallet.userId}`);
        } catch (error) {
          logger.error(`Failed to reset tokens for user ${wallet.userId}:`, error);
        }
      }
      logger.info('Monthly token reset completed.');
    } catch (error) {
      logger.error('Critical error in monthly token reset cron:', error);
    }
  });

  // Daily cleanup of expired reservations or stuck jobs if needed
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily maintenance jobs...');
    // Add cleanup logic here if necessary
  });
};
