# つぐみ（tsugumi）

黒字廃業しそうな地方の中小企業（社長＝売り手）と、経営をやりたい若手（修行者＝買い手）を、
6か月・3段階の「修行」（従業員 → 社長の右腕 → 経営参画）でつなぐ事業承継サービス。
各段階の終わりに見極めゲートがあり、決めるのは社長。1社につき候補者は最大3名。
MVPで見せるのは「修行期間のデータが溜まるほど、社長が『この人に任せられるか』を判断しやすくなる」こと。

仕様の正はNotion「Codex 引き継ぎ（つぐみ開発）」。フェーズ0〜7の順に進める。
現在の進み具合と未検証の点は docs/handoff.md にある。

## 技術構成

- SvelteKit（JavaScript。TypeScriptは使わず、型はJSDoc）+ @sveltejs/adapter-cloudflare、Cloudflare Workers
  - アダプタは `vite.config.js` の `sveltekit({ adapter })` で指定（SvelteKit 2.63+ の書き方。svelte.config.js は無い）
  - Svelte 5 runes モード。APIは `+server.js`、Honoは使わない
- Cloud Firestore + Firebase Authentication（ロールはcustom claims: admin / operator / seller / buyer）
- 文章AIはCodex、裏方の仕分けはJev。どちらもCloudflare AI Gateway経由

## ディレクトリ

- src/routes/+page.svelte ロール選択（修行者／社長／運営）
- src/routes/buyer/ 修行者（S1 企業を探す, S2 企業カルテ, S3 修行ダッシュボード）
- src/routes/seller/ 社長（O1 候補者ボード, O2 候補者の見極め, O3 自社カルテ）
- src/routes/admin/ 運営（A1 全社の修行と注意ラベル, A2 企業・修行者, A3 ユーザー）
- src/routes/api/{buyer,seller,admin,auth}/ API
- src/lib/{buyer,seller,admin,shared}/ 各機能の部品
- src/lib/server/firebase/ Firestore REST・トークン検証・カスタムトークン
- src/lib/server/ai/ Codexの4機能、Jevの仕分け、固定レスポンス
- firebase/ firestore.rules, firestore.indexes.json, エミュレータ設定
- seed/ シードJSONと投入スクリプト
- src/hooks.server.js で /buyer→buyer, /seller→seller, /admin→admin|operator のロールを確認

## 守ること

- firebase-admin は使わない（Workersで動かない）。サーバー側は Firestore REST と Identity Toolkit REST、署名と検証は jose。
- シークレットをコードやリポジトリに書かない。wrangler secret と .dev.vars（gitignore済み）を使う。
- AIは判定しない。合否・点数・確信度を社長や修行者の画面に出さない。見極めレポートは所見と根拠の日付だけ。
- 修行者には他の候補者の情報を一切見せない（画面でもSecurity Rulesでも）。
- AIの出力はJSONで受け、入力データの具体的な言葉を引用させる。一般論は禁止。所見は1観点2文、提案は1つ。
- AI呼び出しが失敗したら固定レスポンスに切り替え、aiLogs に fallback=true で記録する。
- /api/admin/* と社長のゲート判定は auditLogs に残す。
- モックログインは DEMO_MODE=true のときだけ動かす。
- UIは日本語。社長の画面は文字を大きく、操作を少なく。
- 外部API（Jev、AI Gateway、Firebase REST）の仕様は推測で書かず、公式ドキュメントで確認してから実装する。
- 変更は小さく区切ってコミット。各フェーズの最後にテスト（vitest、Firestoreエミュレータ）を通す。

## データ（Firestore）

| コレクション                   | 主な項目                                                                                                                                                  | 文脈として溜めるもの                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| companies/{id}                 | name, region, industry, revenue, operatingProfit, employees, majorClients, hasDebt, ownerUid, slots(3)                                                    | ownerWords, values, fieldIssues, customers, ownerOnlyWork, successorRequirements, fieldSummary3（AI）, risks（AI）, roadmap（AI） |
| trainees/{id}                  | uid, name, university, grade, hometown, aptitudeResult                                                                                                    | motivation, managementGoal                                                                                                        |
| placements/{id}                | companyId, traineeId, companyName, traineeName, stage(1/2/3/ended), startedAt, nextGateAt, agreementSigned, endReason(declined/rejected/succeeded), flags | —                                                                                                                                 |
| placements/{id}/reports/{id}   | date, body, aiFeedback{insight, proposalDraft, karteCandidates}, perspectives（Jevの振り分け）                                                            | その日の現場の出来事                                                                                                              |
| placements/{id}/proposals/{id} | date, content, ownerReaction(adopted/hold/null)                                                                                                           | 採用された提案＝会社の改善履歴                                                                                                    |
| placements/{id}/gates/{id}     | stage, decision(next/extend/stop), ownerComment, at                                                                                                       | なぜ進めたか・止めたか                                                                                                            |
| placements/{id}/missions/{id}  | month, text, done                                                                                                                                         | —                                                                                                                                 |
| placements/{id}/assessment     | 5観点ごとの所見と根拠の日付（AI、事前生成も可）                                                                                                           | —                                                                                                                                 |
| users/{uid}                    | displayName, role(admin/operator/seller/buyer), companyId, traineeId, isDemo                                                                              | —                                                                                                                                 |
| auditLogs/{id}                 | uid, action, targetPath, before, after, at                                                                                                                | —                                                                                                                                 |
| aiLogs/{id}                    | feature, provider(Codex/jev), input要約, output, latencyMs, fallback(bool), at                                                                           | —                                                                                                                                 |

権限（Security Rules）

- buyer：自分の trainees と、自分の placements とその配下だけ。他の候補者の placements は読めない
- seller：自社の companies（編集可）と、自社の placements とその配下（proposals の反応、gates、missions は書ける）
- admin/operator：すべて読める。companies・trainees の編集。users の変更は admin だけ
- auditLogs・aiLogs・AIの出力フィールドはサーバーだけが書く

見極めの5観点：現場になじんでいるか／手を抜かず続けているか／提案が現場の実情に合っているか／職人・従業員からどう見られているか／この会社を継ぐ覚悟が見えるか

修行の報酬（S2に表示）：段階1・2は時給1,200円、段階3は時給＋担当部門の粗利の5%。

## 管理画面（フェーズ6）

- A1 `/admin`（全社の修行一覧と注意ラベル、AI の直近の呼び出し）、A2 `/admin/companies` `/admin/trainees`（一覧・登録・編集・削除）、A3 `/admin/users`（admin だけ。operator は 403）
- 運営の書き込みは `src/lib/server/data/admin.js` の `adminUpsert` / `adminDelete` / `adminSetUserRole` を通し、必ず auditLogs に before/after を残す。`/api/admin/[collection]` の JSON API も同じ関数を使う
- ロール変更は users/{uid} と Firebase Auth の custom claims の両方を更新（Identity Toolkit REST）
- フォーム項目は `src/lib/admin/forms.js`、共通フォームは `EntityForm.svelte`

## 社長の画面（フェーズ5）

- O1 `/seller`（カンバン: 段階1／2／3／終了、列の上に次のゲート日、注意ラベルは黄色）、O2 `/seller/candidates/[placementId]`、O3 `/seller/company`
- 社長の操作は form actions（`react` 採用/保留、`gate` 判定、`assess` レポート更新、`mission` / `missionDone`、`organize` カルテ整理、`risks` リスクとロードマップ）。ゲート判定は `decideGate` が gates + auditLogs に書き、placement の stage / nextGateAt / stageStartedAt を更新（純粋関数 `applyGate` にテストあり）
- 段階1→2 は合意書チェック必須（UI とサーバーの両方で確認）
- seller のレイアウトは文字を 20px に拡大

## 修行者の画面（フェーズ4）

- S1 `/buyer`（企業カード、候補者枠 = slots − 進行中の placements）、S2 `/buyer/companies/[id]`（form action `apply` で段階1の placement を作る）、S3 `/buyer/training`
- 日報: POST `/api/buyer/reports` が日報を保存 → Codex のフィードバックと Jev の仕分けを並行 → 日報・placement（lastReportSummary, flags）を更新。提案: POST `/api/buyer/proposals`
- サーバー側の読み書きは `src/lib/server/data/*.js`。各 load/API は `serverContext(platform)` で db と ai を受け取る
- 注意ラベルは `src/lib/shared/flags.js` の `computeFlags`（over60 は日数計算、simpleWorkOnly は直近3件の Jev 判定）

## AI（フェーズ3）

- `src/lib/server/ai/`: schemas.js（zod）、client.js（Anthropic SDK、AI Gateway 経由）、run.js（Codex → fallback → aiLogs）、karte / feedback / assessment / risk / sort、fallback.js。詳細は docs/ai.md
- 呼ぶ側は `aiContext(env, db, platform)` を作って各関数に渡す。テストでは ctx.anthropic / ctx.ai を差し替える
- Jev は Workers AI の `typesafe/jev`（env.AI.run）。ローカルで binding が無いときは CF_ACCOUNT_ID + CF_API_TOKEN で REST、どちらも無ければ Codex、それも無ければキーワードの固定ロジック

## Firestore（フェーズ2）

- `src/lib/server/firebase/firestore.js` の `Firestore` クラス（get / set / update / delete / query / commit / add）。REST v1 を直接叩く。値の変換は `values.js`
- 型は `src/lib/types.js` の JSDoc。日付は 'YYYY-MM-DD'、時刻は ISO 文字列で持つ（timestampValue は使わない）
- placements には O1 カード用に traineeUniversity / lastReportSummary / stageStartedAt を持たせている
- シードは `seed/data/*.json`。placement-2（山本 拓真・段階2）がデモの主役、placement-1 は注意ラベル（over60 + simpleWorkOnly）、placement-3 は終了（rejected）
- ルールのテストは `firebase/rules.test.js`（@firebase/rules-unit-testing、vitest の `rules` プロジェクト）

## ログイン（フェーズ1）

- トップの3ボタン → POST /api/auth/demo（DEMO_MODE=true のときだけ）がデモ用ユーザーのカスタムトークンを返す → 画面側で signInWithCustomToken → ID トークンを POST /api/auth/session で Cookie（tsugumi_session, httpOnly, 1時間）へ
- hooks.server.js が Cookie の ID トークンを jose で検証し locals.user = { uid, role, companyId, traineeId } を作る。ロールは Firebase custom claims（seed/users.js が Identity Toolkit REST で付ける）
- エミュレータ（FIREBASE_AUTH_EMULATOR_HOST あり）ではカスタムトークンは alg=none、ID トークンは署名検証なし（iss/aud/exp のみ）。本番は RS256 + Google の JWKS
- ロール違いは画面なら 403、/api/* なら JSON 403。未ログインは `/?next=` へ 303

## 環境変数

| 変数                                                                                                        | 用途                                        | 置き場所                        |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| PUBLIC_FIREBASE_API_KEY / PUBLIC_FIREBASE_AUTH_DOMAIN / PUBLIC_FIREBASE_PROJECT_ID / PUBLIC_FIREBASE_APP_ID | 画面側のFirebase SDK                        | `.env`（雛形は `.env.example`） |
| FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY                                                                | Firestore REST、カスタムトークン発行        | `wrangler secret` / `.dev.vars` |
| CF_ACCOUNT_ID / AI_GATEWAY_ID / CF_AIG_TOKEN                                                                | AI Gateway                                  | `wrangler secret` / `.dev.vars` |
| ANTHROPIC_API_KEY                                                                                           | Codex                                      | `wrangler secret` / `.dev.vars` |
| DECIDE_PROVIDER                                                                                             | `jev` か `Codex`                           | `wrangler.jsonc` vars           |
| DEMO_MODE                                                                                                   | `true` のときだけモックログインを有効にする | `wrangler.jsonc` vars           |

## コマンド

| コマンド                          | 内容                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Vite開発サーバー（http://localhost:5173）。wrangler.jsonc の vars と .dev.vars を platform.env として読む                                                                                              |
| `npm run emulators`               | Firebase エミュレータ（Firestore 8080 / Auth 9099 / UI 4000）。Java 11+ が必要。firebase-tools は Node 26 を engines に含まないため npx で engine-strict を外して起動。`firebase/emulator-data` に保存 |
| `npm run seed`                    | シードJSONをFirestoreに投入（フェーズ2で実装）                                                                                                                                                         |
| `npm run test`                    | vitest を1回実行                                                                                                                                                                                       |
| `npm run lint` / `npm run format` | Prettier + ESLint                                                                                                                                                                                      |
| `npm run check`                   | svelte-check（JSDocの型チェック）                                                                                                                                                                      |
| `npm run build`                   | 本番ビルド（`.svelte-kit/cloudflare`）                                                                                                                                                                 |
| `npm run preview`                 | 本番ビルドを wrangler dev で起動（http://localhost:4173）                                                                                                                                              |
| `npm run deploy`                  | build して `wrangler deploy`                                                                                                                                                                           |
| `npm run deploy:dry`              | build して `wrangler deploy --dry-run`                                                                                                                                                                 |
| `npm run gen`                     | `worker-configuration.d.ts` を再生成（wrangler.jsonc を変えたら実行）                                                                                                                                  |
