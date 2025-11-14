import cron from 'node-cron'; 
import { getDailyQuestion } from '../services/openaiservice';


cron.schedule('0 0 * * *', async () => {
  console.log('Running daily cron job at midnight');
  const question = await getDailyQuestion();
    console.log('Daily Question:', question);

  // Add your daily tasks here, e.g., cleaning up old data, sending summary emails, etc.
});

export default cron;