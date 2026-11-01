# 識別子の省略パターン

このプロジェクトでは、読みやすさを損なわない範囲で、よく使う識別子に一般的な略称を使います。新しいコードやリネームでは、同じ概念に同じ略称を使ってください。

## 共通の略称

| 略称 | 元の語 | 用例・用途 |
| --- | --- | --- |
| `i` | interaction | Discordのスラッシュコマンド引数 |
| `ctx` | context | コマンドやイベントに渡す実行コンテキスト |
| `cmd`, `cmds` | command, commands | コマンド1件、コマンド一覧 |
| `cfg` | config / configuration | 設定値のまとまり |
| `repo` | repository | リポジトリのローカル変数 |
| `opt` | option | コマンドビルダーのオプション引数 |
| `msg` | message | メッセージ本文 |
| `err` | error | エラーオブジェクト |
| `req`, `res` | request, response | HTTPリクエスト、レスポンス |
| `cb` | callback | コールバック関数 |
| `dir` | directory | ディレクトリのパス |
| `mod`, `modUrl` | module, module URL | 読み込んだモジュール、モジュールURL |
| `desc` | description | 説明文 |
| `sec` | seconds | 秒数 |
| `perms` | permissions | 権限セット |
| `conn` | connection | 接続のローカル変数 |
| `abortCtl` | abort controller | キャンセル制御用の`AbortController` |
| `reqSignal` | request signal | HTTPリクエストの中断シグナル |
| `shutdownInit` | shutdown initialized | 終了処理の初期化済みフラグ |

## 分野ごとの略称

| 略称 | 元の語 | 用例・用途 |
| --- | --- | --- |
| `feats`, `feat` | features, feature | 機能ファクトリーの生成結果、機能1件 |
| `addr`, `addrs` | address, addresses | DNS解決で得たIPアドレス、IPアドレス一覧 |
| `dest`, `destPath` | destination, destination path | ダウンロード先情報、保存先パス |
| `dbPath` | database path | SQLiteデータベースのパス |
| `initBalance` | initial balance | 初期残高 |
| `toBal` | recipient balance | 送金先の更新後残高 |
| `dayReward` | daily reward | 日次報酬のローカル変数 |
| `synthUrl` | synthesis URL | 音声合成APIのURL |
| `weightSum` | total weight | 抽選の重みの合計 |
| `joinFns` | join handlers/functions | メンバー参加時に実行する関数一覧 |
| `sessionPromises` | session creation promises | セッション生成中のPromise一覧 |
| `shutdownCbs` | shutdown callbacks | 終了時コールバック一覧 |
| `orig*` | original | テストで差し替え前の関数を保持する名前（`origGet`など） |

## 適用上の注意

- 略称はローカル変数、引数、内部ヘルパーに使います。短くすることで意味が伝わりにくくなる名前は省略しません。
- Discord.js、Node.js、HTTP、データベースなどの外部API名や、モジュール間で共有するオブジェクトのキーは、内部変数名に合わせて変更しません。たとえばローカル変数を`repo`としても、共有コンテキストのキー`repository`はそのままです。
- `err`、`req`、`res`のような略称は、そのスコープ内で意味が明確な場合に使います。複数の対象が同時にある場合は、`queryRes`、`audioRes`のように区別します。
