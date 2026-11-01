# 📈 運用ガイド

## 🧭 推奨構成

7つのBotは独立したプロセスまたはコンテナで運用し、Bot単位でログ確認・再起動できるようにします。Docker Composeでは `--profile bots` を指定すると各Botが別々のサービスとして起動します。

本番運用では、まずテストGuildでコマンドと権限を確認し、使用するBotに必要最小限のDiscord権限だけを付与してください。Debug BotはテストGuild専用のため、本番サーバーへ招待しないでください。

## 📝 ログと監視

- ログは `BOT_LOG_DIR`（既定 `./logs`）にBot別で保存され、標準出力にもJSON形式で出力されます。
- 日付変更時またはログファイルが約10 MiBに達したときにローテーションし、gzip圧縮します。
- 30日または圧縮ログ合計1 GiBを超える古いアーカイブは削除対象になります。
- コンテナでは `docker compose --profile bots logs -f <service>` で対象サービスの標準出力を確認します。

ログにはエラーや運用情報が含まれる場合があります。アクセス権を制限し、Tokenや個人情報を含むログを公開しないでください。

## 💾 SQLiteバックアップと復元

MinaseとEntertainmentは別々のSQLiteデータベースを使用します。DBパスの既定値は以下のとおりです。

| Bot | DBファイル |
|---|---|
| Minase | `MINASE_DATA_DIR/minase.sqlite3`（既定 `./data/minase/minase.sqlite3`） |
| Entertainment | `ENTERTAINMENT_DATA_DIR/currency.sqlite3`（既定 `./data/entertainment/currency.sqlite3`） |

### バックアップ手順

1. 対象Botを停止します。Composeの場合は該当サービスだけを停止します。
2. SQLiteのWALチェックポイントが完了し、書き込みが止まっていることを確認します。
3. 対象DBファイルをBotごとにコピーまたはアーカイブします。Dockerの場合は該当する名前付きVolumeを使ったバックアップ手順を選択してください。
4. バックアップの日時、対象Bot、DBファイルを記録し、復元可能な場所へ安全に保管します。
5. 定期的に別環境への復元を試し、バックアップの有効性を確認します。

Bot稼働中のバックアップにはSQLite Backup APIなど整合性を保てる方法を使用してください。`.sqlite3` ファイルだけを稼働中にコピーすると、WALに残った変更を含まない場合があります。

### 復元手順

1. 復元対象のBotを停止します。
2. 現在のDBを別名で退避し、復元先のパスと権限を確認します。
3. 対応するBotのバックアップだけを配置します。MinaseとEntertainmentのDBを取り違えないでください。
4. Botを起動し、残高・履歴・日次報酬の状態を確認します。

DBを直接編集する場合も、必ず事前にバックアップし、トランザクションと整合性を確認してください。

## 🔄 更新・再起動

更新前に変更内容と `package-lock.json` を確認し、必要に応じてDBと設定をバックアップします。Node.jsでは依存関係を復元してからテストと構文チェックを行います。

```bash
npm ci
npm test
npm run check
```

Composeでイメージを更新するときは再ビルドします。

```bash
docker compose --profile bots up --build -d
docker compose --profile bots ps
docker compose --profile bots logs --tail=100
```

起動に失敗した場合はログを確認し、前のアプリケーション版へ戻す前にDB変更の有無と互換性を確認してください。

## 🚨 障害対応チェックリスト

1. **Botが起動しない**: 対象BotのToken、環境変数の名前、Node.jsバージョン、起動ログを確認します。
2. **コマンドが表示されない**: `DISCORD_TEST_GUILD_ID`、Application Commandsの招待設定、登録先Guild、起動時ログを確認します。Global登録は反映に時間がかかる場合があります。
3. **コマンドで権限エラーになる**: DiscordアプリのIntent、Botロールの権限、対象チャンネル・ロールのアクセス設定を確認します。
4. **自動ロールが機能しない**: `GuildMembers` Intent、Developer PortalのPrivileged Intent、自動ロールID、Botロールの階層を確認します。
5. **TTSが動作しない**: VOICEVOX Engineの稼働、`VOICEVOX_URL`、話者ID、ボイスチャンネルへの接続・発言権限を確認します。
6. **AIが応答しない**: Ollamaの稼働、`OLLAMA_URL`、モデル名とモデルのロード状態を確認します。
7. **Musicが再生されない**: 公開HTTPS URL、接続先、音声ファイル形式・サイズ、FFmpeg、Opus、ボイスチャンネル権限を確認します。動画サイトやプレイリストは対象外です。
8. **経済データに問題がある**: Botを停止してDBをバックアップし、コピーを使って調査します。原本を直接編集しないでください。

## 🔒 セキュリティ運用

- Tokenは環境変数または適切なSecret管理機能で扱い、ログ・チケット・ソース管理へ出力しないでください。
- 不要なIntentとDiscord権限は有効化しないでください。Debug Botは隔離したテストGuildで運用します。
- Music Botは外部URLへ接続するため、アプリケーションのURL検証に加えてホストやコンテナ側で外向き通信を制御してください。
- Token漏えいが疑われる場合はDiscord Developer Portalで再発行し、旧Tokenを無効化してください。
