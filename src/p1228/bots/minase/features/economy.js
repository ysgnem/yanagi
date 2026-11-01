import path from 'node:path';
import { commonSettings, env, positiveInt } from '../../../core/config.js';
import { EconomyRepository } from '../../../core/economy.js';

export default function createEconomyFeature() {
  const cfg = commonSettings();
  const dayReward = positiveInt('MINASE_DAILY_REWARD', 100, { minimum: 0 });
  const repo = new EconomyRepository(
    path.join(
      path.resolve(env('MINASE_DATA_DIR', path.join(cfg.dataDir, 'minase'))),
      'minase.sqlite3',
    ),
  );
  return {
    context: {
      repository: repo,
      dailyReward: dayReward,
    },
    onShutdown: () => repo.close(),
  };
}
