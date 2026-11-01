import path from 'node:path';
import { commonSettings, env, positiveInt } from '../../../core/config.js';
import { EconomyRepository } from '../../../core/economy.js';

export default function createEconomyFeature() {
  const cfg = commonSettings();
  const dataPath = path.resolve(
    env('ENTERTAINMENT_DATA_DIR', path.join(cfg.dataDir, 'entertainment')),
  );
  const startBalance = positiveInt('ENTERTAINMENT_START_BALANCE', 100, { minimum: 0 });
  const dailyReward = positiveInt('ENTERTAINMENT_DAILY_REWARD', 100, { minimum: 0 });
  const lotteryCost = positiveInt('ENTERTAINMENT_LOTTERY_COST', 50);
  const repo = new EconomyRepository(path.join(dataPath, 'currency.sqlite3'));
  return {
    context: {
      repository: repo,
      startBalance,
      dailyReward,
      lotteryCost,
    },
    onShutdown: () => repo.close(),
  };
}
