import path from 'node:path';
import { commonSettings, env, positiveInt } from '../../../core/config.js';
import { EconomyRepository } from '../../../core/economy.js';

export default function createEconomyFeature() {
  const settings = commonSettings();
  const dataDir = path.resolve(
    env('ENTERTAINMENT_DATA_DIR', path.join(settings.dataDir, 'entertainment')),
  );
  const startBalance = positiveInt('ENTERTAINMENT_START_BALANCE', 100, { minimum: 0 });
  const dailyReward = positiveInt('ENTERTAINMENT_DAILY_REWARD', 100, { minimum: 0 });
  const lotteryCost = positiveInt('ENTERTAINMENT_LOTTERY_COST', 50);
  const repository = new EconomyRepository(path.join(dataDir, 'currency.sqlite3'));
  return {
    context: {
      repository,
      startBalance,
      dailyReward,
      lotteryCost,
    },
    onShutdown: () => repository.close(),
  };
}
