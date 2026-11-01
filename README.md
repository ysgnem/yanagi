# p1228 — Node.js / JavaScript Discord Bot Suite

🎉 **p1228** は、複数のDiscord Botを個別に起動・運用できるNode.js製アプリケーションです。Node.js 22以降とJavaScript ES Modulesで構成し、TypeScriptは使用していません。

## 🤖 Botと主な機能

| Bot | 主なコマンド・機能 |
|---|---|
| **Community** | `/ping`、`/server-info`、`/autorole-check`、参加時の自動ロール付与、ブラックリスト通知 |
| **TTS** | `/join`、`/tts`、`/stop`、`/leave`、VOICEVOXによる読み上げ |
| **Minase** | `/omikuji`、`/balance`、`/daily`、`/ranking`、`/history` |
| **AI** | `/ask`、ローカルOllamaモデルへの質問 |
| **Music** | `/play`、`/skip`、`/stop`、`/queue`、公開HTTPS音声ファイルの再生 |
| **Entertainment** | `/balance`、`/daily`、`/lottery`、`/transfer` |
| **Debug** | `/debug-echo`、`/debug-info`、`/debug-permission`（テストGuild専用） |

✨ 共通機能として `/help`、管理者向け `/feature`、Pingと稼働時間の15秒ごとの表示切替、Bot別ログ出力とログローテーションを備えています。

## ⚡ クイックスタート

### Linux / macOS

```bash
cp .env.example .env
npm ci
npm run start:community
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
npm ci
npm run start:community
```

1. `.env` に起動するBotのDiscord Tokenを設定します。
2. 必要に応じてテストGuild、権限、外部サービスの設定を追加します。
3. 使うBotの起動コマンドを実行します。

🔐 `.env` やDiscord TokenをGitへ登録しないでください。全Botの設定方法は [`docs/SETUP.md`](./docs/SETUP.md) を参照してください。

## 🚀 起動方法

```bash
npm start                    # 7 Botをまとめて起動
npm run start:community      # Community Bot
npm run start:tts            # TTS Bot
npm run start:minase         # Minase Bot
npm run start:ai             # AI Bot
npm run start:music          # Music Bot
npm run start:entertainment  # Entertainment Bot
npm run start:debug          # Debug Bot（テストGuild必須）
```

各Botは独立して起動できます。運用環境では、障害の切り分けと再起動をしやすくするため、Botごとのプロセスまたはコンテナでの運用を推奨します。

### 🐳 Docker Compose

`.env` を用意したあと、以下でBotをビルドして起動します。

```bash
docker compose --profile bots up --build -d
docker compose --profile bots logs -f
docker compose --profile bots down
```

ログと経済データは名前付きVolumeに保存されます。外部サービスをホスト上で動かす場合、Composeは `host.docker.internal` を使って接続します。詳しくは [`docs/SETUP.md`](./docs/SETUP.md) を確認してください。

## 🧰 技術構成

- Node.js 22以降 / JavaScript ES Modules
- discord.js v14 / @discordjs/voice
- better-sqlite3 / dotenv
- `node:test` / Docker Compose
- 音声処理: FFmpeg、Discord Voice用Opus依存関係
- TTS: VOICEVOX Engine（外部サービス）
- AI: Ollama（外部サービス）

### 📁 ディレクトリ構成

```text
src/
  index.js                    # 全Botの起動
  p1228/
    bots/
      community/
        commands/              # Communityのスラッシュコマンド（自動読み込み）
        features/              # Communityの機能・イベント（自動読み込み）
      ai/
        commands/              # AIのスラッシュコマンド（自動読み込み）
        features/              # AIの機能・設定（自動読み込み）
      tts/
        commands/              # TTSのスラッシュコマンド（自動読み込み）
        features/              # 音声セッションと設定
      minase/
        commands/              # Minaseのスラッシュコマンド（自動読み込み）
        features/              # ポイント管理と設定
      music/
        commands/              # Musicのスラッシュコマンド（自動読み込み）
        features/              # 再生セッションと設定
      entertainment/
        commands/              # Entertainmentのスラッシュコマンド（自動読み込み）
        features/              # 通貨管理と設定
      debug/
        commands/              # Debugのスラッシュコマンド（自動読み込み）
        features/              # テストGuild向け設定
      module-loader.js         # Bot共通のモジュールローダー
    core/                     # 設定、ログ、ランタイム、経済・セキュリティ共通処理
docs/
  SETUP.md                    # 導入・設定手順
  OPERATIONS.md               # 運用・バックアップ・障害対応
tests/
  unit/                       # node:testによるユニットテスト
data/                         # SQLiteデータ（ローカル運用時）
```

各Botの`commands/` 内のJavaScriptファイルをデフォルトエクスポートしたコマンドとして、`features/` 内のJavaScriptファイルをデフォルトエクスポートした機能ファクトリーとして起動時に読み込みます。各ファイルは名前順で読み込まれ、サブディレクトリは対象外です。

## ✅ テストとチェック

```bash
npm test
npm run check
npm run format:check
```

`npm test` はユニットテスト、`npm run check` は主要なJavaScriptファイルの構文チェック、`npm run format:check` はPrettierの確認を実行します。

## 📚 ドキュメント

- 🛠️ [セットアップガイド](./docs/SETUP.md) — 必要環境、Discord設定、環境変数、外部サービス、Docker
- 📈 [運用ガイド](./docs/OPERATIONS.md) — ログ、バックアップ、更新、障害対応
- ✏️ [識別子の省略パターン](./docs/ABBREVIATIONS.md) — コードで使う略称と命名ルール

## ⚠️ 制約と注意事項

- Discordの実Tokenを使った接続、VOICEVOX、Ollama、FFmpegを使う音声再生は、利用環境で動作確認してください。
- Music Botは公開HTTPSの音声ファイルURLを対象とし、YouTube検索・動画サイト抽出・プレイリストには対応しません。
- 経済データのSQLiteファイルはBotごとに分離されています。バックアップ前には対象Botを停止し、バックアップを取得してください。
- MusicのURL検証だけでネットワーク境界を完全に保護できるわけではありません。運用環境では外向き通信も制限してください。
