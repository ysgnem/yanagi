import { env, positiveInt } from '../../../core/config.js';

export default function createOllamaFeature() {
  return {
    context: {
      ollamaUrl: env('OLLAMA_URL', 'http://127.0.0.1:11434').replace(/\/$/u, ''),
      model: env('OLLAMA_MODEL', 'llama3.2'),
      maxPrompt: positiveInt('AI_MAX_PROMPT_LENGTH', 1000),
    },
  };
}
