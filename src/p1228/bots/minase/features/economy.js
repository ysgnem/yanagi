import path from 'node:path';
import { commonSettings, env, positiveInt } from '../../../core/config.js';
import { EconomyRepository } from '../../../core/economy.js';

export default function createEconomyFeature() {
  const settings = commonSettings();
  const dailyReward = positiveInt('MINASE_DAILY_REWARD', 100, { minimum: 0 });
  const repository = new EconomyRepository(
    path.join(
      path.resolve(env('MINASE_DATA_DIR', path.join(settings.dataDir, 'minase'))),
      'minase.sqlite3',
    ),
  );
  return {
    context: {
      repository,
      dailyReward,
    },
    onShutdown: () => repository.close(),
  };
}
