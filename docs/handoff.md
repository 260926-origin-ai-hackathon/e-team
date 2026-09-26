# 引き継ぎ（2026-09-25 クラウドのセッション → 次のクラウドのセッション）

最初に CLAUDE.md を読むこと。仕様の正は Notion「Claude Code 引き継ぎ（つぐみ開発）」
https://app.notion.com/p/3e6729af3b7d81b59238c74c9ef9e567

## 状態

フェーズ0〜6は実装済み。ローカル（Firebase エミュレータ＋AIの固定レスポンス）で、docs/demo.md の台本を最後までブラウザで通した。

| フェーズ                      | 状態                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 0 土台                        | 完了                                                                                     |
| 1 デモログインとロール        | 完了。3ボタン→カスタムトークン→Cookie、ロール違いは403                                   |
| 2 Firestore層・ルール・シード | 完了。ルールのテスト13件                                                                 |
| 3 AIサービス                  | 実装済み。スキーマは確認済み、実キーでの呼び出しは未検証                                 |
| 4〜6 画面                     | 完了。S1〜S3、O1〜O3、A1〜A3                                                             |
| 7 デモ準備（本番デプロイ）    | 手順とスクリプト、Firebase は用意済み。ANTHROPIC_API_KEY と Gateway の名前が残り（下記） |

テスト: `npm test`（単体51件）、`npm run test:rules`（13件、エミュレータ必要）。lint と `npm run check` も通る状態。

## クラウドでの立ち上げ

```sh
npm ci
cp .env.example .env
cp .dev.vars.example .dev.vars   # 秘密値はここ。コミットしない
npm run emulators                # Java 11+ が必要。別プロセスで起動したままにする
npm run seed                     # デモ用ユーザーとデータ
npm run dev                      # http://localhost:5173
```

- `.env` と `.dev.vars` は gitignore 済みなのでリポジトリには無い。例のファイルはエミュレータ向けの値になっている。
- Java が無い環境では `npm run emulators` と `npm run test:rules` が動かない。単体テストと lint、check はエミュレータ無しで動く。
- ローカルは Node 26 だった。firebase-tools が Node 26 を対象外にしているため、`npm run emulators` は `npx --engine-strict=false` で起動している。Node 20/22/24 なら普通に動く。
- `npm run dev` は Workers AI（Jev）のリモート接続を既定で無効にしている。wrangler にログインしていないと起動時にエラーになるため。実物を試すときは `CF_REMOTE_BINDINGS=true npm run dev`。

## 未検証・リスク（優先して確かめること）

1. **Claude の実呼び出し**。スキーマは確認済み（2026-09-25 クラウドのセッション）: SDK の `zodOutputFormat` が `.length()` / `.max()` / `.int().min().max()` を description に移して送るので、400 の心配はない（`ai.test.js` で送るスキーマを検査）。そのかわり個数は API で強制されないので、長すぎる配列は切り詰めてから検証するようにした（`client.js` の `trimArrays`）。**実キーでの呼び出しはまだ**（クラウドのセッションに API キーが無い）。`.dev.vars.production` を作ったら `npm run ai:check:prod` で確かめる。
2. **Jev（typesafe/jev）が Cloudflare アカウントで使えるか**。TypeSafe の招待が要るかは Notion の未決事項。使えなければ `DECIDE_PROVIDER=claude` にする。Jev の入出力の形は docs/ai.md。
3. **日報フィードバックの速さ**。目標は3秒以内。`claude-opus-5` の effort low で足りなければ、モデルか effort を見直す。
4. Claude の拒否時のサーバー側フォールバックは有効にしていない。JSON 出力の経路を優先したため。

## フェーズ7（2026-09-25 時点）

手順は docs/demo.md の「本番」。人はブラウザ承認のログインができない（移動中）ので、**秘密はクラウド環境の環境変数で渡してもらう**方式に変えた。`wrangler login` は `CLOUDFLARE_API_TOKEN`、`firebase login` はサービスアカウント鍵で代わりにする。

### 環境変数（クラウド環境に設定済み。値はチャットに出さない）

| 変数                                      | 状態                                                                                     | 備考                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`                     | OK                                                                                       | `tsugumii`                                                                                         |
| `FIREBASE_CLIENT_EMAIL`                   | OK                                                                                       | プロジェクト ID と一致                                                                             |
| `FIREBASE_PRIVATE_KEY`                    | **鍵の JSON がまるごと入っている**                                                       | `JSON.parse` して `private_key` を取り出して使う。取り出した鍵でアクセストークンの取得まで確認済み |
| `CLOUDFLARE_API_TOKEN`                    | OK（verify: active）                                                                     | AI Gateway の一覧と Workers AI のモデル検索は権限が無く Authentication error                       |
| `CLOUDFLARE_ACCOUNT_ID` / `CF_ACCOUNT_ID` | OK                                                                                       | 同じ値                                                                                             |
| `AI_GATEWAY_ID`                           | **Gateway の名前ではなくトークンが入っている**（53文字、Cloudflare の verify で active） | おそらく Gateway の認証トークン → `CF_AIG_TOKEN` として使う。Gateway の名前（ID）を人に聞く        |
| `CF_AIG_TOKEN`                            | 無し                                                                                     | 上のとおり                                                                                         |
| `ANTHROPIC_API_KEY`                       | **無し**                                                                                 | 人に足してもらう                                                                                   |

注意:

- コンテナには Claude Code 用の `ANTHROPIC_BASE_URL` が入っている。Anthropic SDK はこれを既定の baseURL に使うので、AI Gateway を通さずに直接呼ぶと別の宛先に行く。Node から試すときは `ANTHROPIC_BASE_URL` を外すか、Gateway 経由（baseURL を明示）にする。
- `.dev.vars` が無い状態で `npm run seed` を実行すると、エミュレータの HOST が無いので**本番に書き込む**。
- `npm run secrets:prod` などは `.dev.vars.production` を読む。環境変数からこのファイルを作る（private_key は JSON から取り出し、`"..."` で囲んで `\n` のまま1行）か、スクリプトを環境変数でも動くように直す。

### 本番 Firebase の状態（サービスアカウントの REST で確認）

Firestore（`asia-northeast1`、ネイティブ）、Authentication、ウェブアプリはすべて作成済み。ウェブアプリの設定（公開値）は wrangler.jsonc の `vars` に入れた。Security Rules は未デプロイ。

### 残りの手順（人の作業が終わったら）

1. `ANTHROPIC_API_KEY` と Gateway の名前が揃ったら `node seed/ai-check.js` で実呼び出し（5機能が `claude` になるか、feedback の速さも見る）
2. （済）wrangler.jsonc の `vars` に PUBLIC_FIREBASE_* を足した
3. ルールのデプロイ（firebase-tools に鍵ファイルを `GOOGLE_APPLICATION_CREDENTIALS` で渡すか、Rules REST API で）
4. 本番シード → wrangler secret 登録 → `npm run deploy` → 本番 URL で台本（Playwright でも可）

## 次のセッションに最初に貼るプロンプト

```
docs/handoff.md と CLAUDE.md を読んで状況を把握してください。
フェーズ7（本番デプロイ）の続きです。handoff.md の「フェーズ7」の表で、環境変数と Firebase の状態をもう一度確かめてから進めてください（値はチャットに出さない）。
人の作業が残っているところは、何をすればよいかを短く教えてください。
```
