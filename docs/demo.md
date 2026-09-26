# デモ台本とリセット手順

## 事前準備（デモ直前）

```sh
npm run seed          # デモ用ユーザーとデータを入れ直す（本番へは .dev.vars を本番設定にして実行）
```

- ブラウザのタブは 1 つ。トップ（ロール選択）を開いておく
- `DEMO_MODE=true`、`DECIDE_PROVIDER` は `jev`（Jev が使えない環境では `claude`）
- ANTHROPIC_API_KEY が無い／落ちていても fallback で最後まで通る（気づきの文は固定文になる）

## 台本（5分30秒）

| 時間       | 画面                 | 操作                                                                                                                                 | 言うこと                                                                             |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 0:00〜0:30 | ロール選択 `/`       | 3ボタンを見せる                                                                                                                      | 修行者・社長・運営の3つの立場がある。マッチングではなく「見極めと伴走」を見せる      |
| 0:30〜1:30 | S1 → S2              | 「修行者として入る」→ 中村工務店のカード → 開く                                                                                      | 数字より先に社長の言葉と現場3行。段階ごとに任されることと報酬が見える                |
| 1:30〜2:45 | S3 `/buyer/training` | 日報欄に今日の出来事を入力 → 「日報を送る」→ 気づきと提案の下書きが返る → 「この提案を社長に出す」                                   | 日報を書くだけで、AIが気づきと提案の下書きを返す。修行者は他の候補者を一切見られない |
| 2:45〜4:00 | O1 → O2              | ログアウト → 「社長として入る」→ 山本 拓真のカード → 見極めレポートの根拠日付を押す → 提案を「採用」→ ゲート判定「次の段階へ」→ 記録 | 社長は点数ではなく、日報の言葉と根拠の日付で判断する。段階1→2 は合意書チェックが必須 |
| 4:00〜4:45 | O3 `/seller/company` | 「修行者の提案を反映して更新する」                                                                                                   | 修行者の日報と採用された提案が、承継リスクと3年ロードマップに効いていく              |
| 4:45〜5:15 | A1 `/admin`          | ログアウト → 「運営として入る」                                                                                                      | 運営も同じ注意ラベルで全社を見ている（段階1が60日超、単純作業だけ）。悪用防止        |
| 5:15〜5:30 | —                    | —                                                                                                                                    | 「データが溜まるほど、見極めも承継後の伴走も精度が上がる」で締める                   |

持ち時間が5分なら A1 を削るか、S1→S2 を短くする。

こだわりとして説明するのは、日報がカルテ（O3）と見極めレポート（O2）の両方に効いていく流れ。長く関わるほど価値が増えるので、既存サービスが短く終わらせる理由（人件費）を AI で崩している、とつなげる。

## 入力する日報の例（S3）

> 岡田さんが復帰した。型枠の手順を松本さんがスマホで撮った。岡田さんは「恥ずかしい」と言いながらも最後まで付き合ってくれた。社長には「動画はあとで見る」と言われた。

## リセット手順

デモで日報・提案・ゲート判定を進めたあと、元に戻す:

```sh
npm run seed:data     # データだけ入れ直す（ユーザーはそのまま）
```

- 追加した日報・提案・ゲート判定・auditLogs・aiLogs は消え、placement-2 は段階2に戻る
- エミュレータを止めたときは `firebase/emulator-data` に保存され、次回 `npm run emulators` で復元される

## 本番（Cloudflare + Firebase）

人の準備（下の「用意するもの」）が終わってから、この順に進める。

1. `cp .dev.vars.production.example .dev.vars.production` にして値を入れる（コミットしない）
2. `npm run ai:check:prod` … Claude と AI Gateway の実呼び出し。5機能が `claude` と表示されれば OK（`fallback` なら aiLogs ではなく画面に出たエラーを見る）
3. wrangler.jsonc の `vars` に PUBLIC_FIREBASE_API_KEY / PUBLIC_FIREBASE_AUTH_DOMAIN / PUBLIC_FIREBASE_PROJECT_ID / PUBLIC_FIREBASE_APP_ID を足す（公開値。画面側は `$env/dynamic/public` で実行時に読む）
4. `npm run rules:deploy -- <FirebaseプロジェクトID>` … Security Rules とインデックス
5. `npm run seed:prod` … デモ用ユーザー（custom claims 付き）とデータ
6. `npm run secrets:prod` … `.dev.vars.production` を wrangler secret に一括登録
7. `npm run deploy` → 表示された `https://tsugumi.<サブドメイン>.workers.dev` で台本を通す
8. 本番でデモを進めたあとのリセットは `ENV_FILE=.dev.vars.production npm run seed:data`

### 用意するもの（人）

| 何                    | どこで                                                                                                                                                                                               | 渡すもの                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Cloudflare にログイン | 手元で `npx wrangler login`（ブラウザ承認）。クラウドのセッションなら API トークン（テンプレート「Edit Cloudflare Workers」）を環境変数 `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` に         | アカウント ID                                                       |
| AI Gateway            | Cloudflare ダッシュボード → AI → AI Gateway → Create Gateway（名前 `tsugumi`）。認証付きにするなら、その Gateway の Settings → Create authentication token（Run 権限）→ Authenticated Gateway をオン | Gateway ID（CF_AIG_TOKEN は認証付きのときだけ）                     |
| Anthropic API キー    | console.anthropic.com → API Keys                                                                                                                                                                     | ANTHROPIC_API_KEY                                                   |
| Firebase プロジェクト | console.firebase.google.com → プロジェクト作成（Analytics なしでよい）                                                                                                                               | プロジェクト ID                                                     |
| Firestore             | Build → Firestore Database → データベースを作成 → ネイティブモード・`asia-northeast1`・本番モード。ID は `(default)` のまま                                                                          | —                                                                   |
| Authentication        | Build → Authentication → 始める（プロバイダの有効化は不要。カスタムトークンだけ使う）                                                                                                                | —                                                                   |
| Web アプリ            | プロジェクトの設定 → 全般 → マイアプリ → ウェブ（</>）を追加                                                                                                                                         | apiKey / authDomain / projectId / appId                             |
| サービスアカウント鍵  | プロジェクトの設定 → サービス アカウント → Firebase Admin SDK → 新しい秘密鍵を生成（JSON）                                                                                                           | JSON の client_email と private_key。ファイルはリポジトリの外に置く |
| Firebase CLI          | 手元で `npx firebase-tools login`（クラウドなら `login --no-localhost`）                                                                                                                             | —                                                                   |
| Jev                   | Cloudflare ダッシュボード → Workers AI のモデル一覧に `typesafe/jev` があるか                                                                                                                        | 無ければ wrangler.jsonc の `DECIDE_PROVIDER` を `claude` に         |
