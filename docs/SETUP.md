# 🛠️ セットアップガイド

このガイドでは、p1228のBotをローカルまたはDocker Composeで起動する手順を説明します。利用するBotだけを設定・起動できます。

## 📋 必要なもの

- Node.js 22以降とnpm
- Discord Developer Portalで作成したBotアプリとToken
- ネイティブ依存関係をビルドするツール（必要な環境の場合）
  - Windows: Visual Studio Build Toolsの「C++によるデスクトップ開発」
  - Linux: Python 3、make、g++
- TTSを使う場合: VOICEVOX Engine
- AIを使う場合: Ollamaと利用するモデル
- TTSまたはMusicの音声機能を使う場合: FFmpegとDiscord Voice用Opus依存関係
- Docker運用の場合: Docker EngineとDocker Compose Plugin

## 📦 インストール

### Linux / macOS

```bash
cp .env.example .env
npm ci
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
npm ci
```

`npm ci` は `package-lock.json` に記録された依存関係をインストールします。ネイティブ依存関係に対応する事前ビルド済みバイナリがない場合、C++ビルドツールが必要です。

## 🔐 環境変数

`.env.example` を `.env` にコピーし、利用する機能の値を設定してください。未設定の任意項目はアプリケーションの既定値で動作します。

### Discordと共通設定

| 変数 | 用途・既定値 |
|---|---|
| `*_BOT_TOKEN` | 各Botの単一Token。例: `COMMUNITY_BOT_TOKEN` |
| `*_BOT_TOKENS` | 同じBot機能で使う複数Token。カンマまたは改行区切り。設定した場合はこちらが優先されます |
| `DISCORD_TEST_GUILD_ID` | スラッシュコマンドをテストGuildへ登録するID。未設定ならGlobal登録。Debug Botでは必須 |
| `LOG_LEVEL` | ログレベル。既定値は `INFO` |
| `APP_TIMEZONE` | 日次報酬・日次抽選の基準タイムゾーン。既定値は `Asia/Tokyo` |
| `BOT_LOG_DIR` | ログ保存先。既定値は `./logs` |
| `BOT_DATA_DIR` | 共通データディレクトリ。既定値は `./data` |

複数Tokenを設定した場合、Tokenごとに独立したDiscord Clientとして起動します。Tokenは秘密情報として保管し、`.env` を共有・コミットしないでください。

### Community Bot

| 変数 | 用途 |
|---|---|
| `COMMUNITY_MEMBER_ROLE_ID` | 参加した人間に付与するロール |
| `COMMUNITY_BOT_ROLE_ID` | 参加したBotに付与するロール |
| `COMMUNITY_AUTO_ROLE_BLACKLIST_USER_IDS` | 自動ロールを付与しないユーザーID。カンマまたは改行区切り |
| `COMMUNITY_ROLE_ALERT_CHANNEL_ID` | ブラックリスト対象の参加通知先。ブラックリスト設定時に必須 |

自動ロールを有効にする場合は人間用・Bot用のロールIDを両方設定してください。ブラックリスト利用時は通知先も設定します。

### TTS / VOICEVOX

| 変数 | 用途・既定値 |
|---|---|
| `VOICEVOX_URL` | VOICEVOX EngineのURL。既定値は `http://127.0.0.1:50021` |
| `VOICEVOX_SPEAKER` | 既定の話者ID。`.env.example` の値は `1` |
| `TTS_MAX_TEXT_LENGTH` | 読み上げる文章の最大文字数。既定値は `200` |
| `TTS_QUEUE_MAX_ITEMS` | Guildごとの読み上げキュー上限。既定値は `10` |

### AI / Ollama

| 変数 | 用途・既定値 |
|---|---|
| `OLLAMA_URL` | Ollama APIのURL。既定値は `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Ollamaのモデル名。既定値は `llama3.2` |
| `AI_MAX_PROMPT_LENGTH` | 受け付ける質問の最大文字数。既定値は `1000` |

指定したモデルをOllama側で事前に利用可能にしてください。

### Music

| 変数 | 用途・既定値 |
|---|---|
| `MUSIC_QUEUE_LIMIT` | 再生キュー上限。既定値は `20` |
| `MUSIC_MAX_BYTES` | 音声ファイルの最大サイズ（Byte）。既定値は `52428800`（50 MiB） |

Music Botが扱うのは公開HTTPSの音声ファイルURLです。動画サイト、YouTube検索、プレイリストには対応しません。

### Minase / Entertainment

| 変数 | 用途・既定値 |
|---|---|
| `MINASE_DATA_DIR` | MinaseのSQLite保存先。既定値は `./data/minase` |
| `MINASE_DAILY_REWARD` | Minaseの日次ポイント。既定値は `100` |
| `ENTERTAINMENT_DATA_DIR` | EntertainmentのSQLite保存先。既定値は `./data/entertainment` |
| `ENTERTAINMENT_START_BALANCE` | 初回アカウント作成時の初期残高。既定値は `100` |
| `ENTERTAINMENT_DAILY_REWARD` | 日次報酬。既定値は `100` |
| `ENTERTAINMENT_LOTTERY_COST` | 宝くじ参加費。既定値は `50` |

値を変更しても既存のアカウント残高は遡って変更されません。データベースのパスを変更する場合は、停止・バックアップ後にデータを移してください。

## 🤖 Discordアプリの設定

1. 利用するBotごとにDiscordアプリとBot Tokenを用意します。
2. Tokenを対応する環境変数へ設定します。
3. OAuth2のURL GeneratorなどでBotとApplication CommandsをGuildへ招待します。
4. 機能に必要な範囲で、コマンド利用、メッセージ送信、ロール管理、ボイスチャンネル接続・発言などの権限を付与します。
5. Communityの自動ロールを使う場合は `GuildMembers` IntentをDeveloper Portalでも有効にし、Botロールを付与対象ロールより上位に配置します。
6. 音声機能では `Guilds` と `GuildVoiceStates` Intentを利用できるようにします。

開発時に `DISCORD_TEST_GUILD_ID` を設定するとコマンドをテストGuildに登録します。未設定時はGlobal Commandとして登録され、反映に時間がかかる場合があります。Debug BotはテストGuild専用です。

## ▶️ 起動

```bash
npm start
npm run start:community
npm run start:tts
npm run start:minase
npm run start:ai
npm run start:music
npm run start:entertainment
npm run start:debug
```

`npm start` は全7 Botを起動します。個別に運用する場合は、使用するBotのコマンドだけ実行してください。

## 🌐 外部サービス接続

- **VOICEVOX**: TTS Botを使う前にEngineを起動し、`VOICEVOX_URL` と `VOICEVOX_SPEAKER` を確認します。`/tts` の利用者はBotと同じボイスチャンネルに参加してください。
- **Ollama**: AI Botを使う前にOllamaを起動し、`OLLAMA_URL` と `OLLAMA_MODEL` を確認します。
- **Music**: HTTPSで公開された音声ファイルURLを指定します。URL検証を回避する目的で内部ネットワークを公開しないでください。

## 🐳 Docker Compose

`.env` を用意したあと、リポジトリのルートで実行します。

```bash
docker compose --profile bots up --build -d
docker compose --profile bots ps
docker compose --profile bots logs -f
docker compose --profile bots down
```

Composeは各Botを別コンテナとして起動し、ログとMinase・EntertainmentのDBを名前付きVolumeへ保存します。ホスト上のVOICEVOXやOllamaへ接続する既定値は `host.docker.internal` を使います。別のホストで動かす場合は `VOICEVOX_URL` と `OLLAMA_URL` を接続可能なURLに変更してください。

## ✅ 動作確認

```bash
npm test
npm run check
npm run format:check
```

Botの起動後は、Discord上で対象コマンドを確認してください。実Tokenを使う前に、テストGuildと最小権限で動作確認することを推奨します。
