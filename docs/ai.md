# AI の呼び方（フェーズ3で確認したこと）

## Claude（文章AI、4機能）

- SDK: `@anthropic-ai/sdk`（Workers で動く）。モデルは `claude-opus-5`。JSON は `client.messages.parse` + `outputFormat`（`zodOutputFormat` を包んだもの、`output_config.format`）で受け、スキーマに合わなければ fallback。
  - 構造化出力の JSON Schema は `maxItems`・2以上の `minItems`・`minimum`/`maximum` を受け付けない。SDK がこれらを description に移して送るので 400 にはならないが、個数や範囲は API 側では強制されない。
  - そのため受け取った JSON は、長すぎる配列を `maxItems` まで切り詰めてから zod で検証する（`trimArrays`）。足りない・範囲外は fallback。送るスキーマの中身は `ai.test.js` で確かめている。
- Cloudflare AI Gateway 経由: `baseURL = https://gateway.ai.cloudflare.com/v1/{CF_ACCOUNT_ID}/{AI_GATEWAY_ID}/anthropic`。認証付きゲートウェイは `cf-aig-authorization: Bearer {CF_AIG_TOKEN}` ヘッダ。x-api-key（ANTHROPIC_API_KEY）はそのまま送る。（出典: developers.cloudflare.com/ai-gateway/usage/providers/anthropic/）
- CF_ACCOUNT_ID / AI_GATEWAY_ID が無ければ Anthropic API を直接呼ぶ。ANTHROPIC_API_KEY が無ければ呼ばずに fallback。
- 速さ: 日報フィードバック（ライブ）は `effort: low`・max_tokens 1024。事前生成の3機能は `effort: medium`。
- プロンプト方針: 入力の具体的な言葉を「」で引用、一般論禁止、所見は1観点2文、提案は1つ、合否・点数を書かない（`client.js` の STYLE）。
- 失敗時: 固定レスポンス（`fallback.js`）に切り替え、`aiLogs` に `fallback: true` と error を記録。

| 機能                     | ファイル      | 入力                                     | 出力                                                                                            |
| ------------------------ | ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| カルテ整理               | karte.js      | 社長の話し言葉＋数字                     | ownerWords, values, fieldIssues, customers, ownerOnlyWork, successorRequirements, fieldSummary3 |
| 日報フィードバック       | feedback.js   | 日報＋カルテ＋段階                       | insight, proposalDraft, karteCandidates[]                                                       |
| 見極めレポート           | assessment.js | 日報・提案・反応・ゲート＋Jev の根拠候補 | items[5]{id, finding, evidenceDates}                                                            |
| 承継リスクとロードマップ | risk.js       | カルテ＋数字＋採用提案                   | risks[3], roadmap[3]                                                                            |

## Jev（裏方の仕分け）

- TypeSafe AI の System One モデル。テキストではなく「型のついた判断」（Noul=はい/いいえの確率、Choice=選択、Score=段階）を返す。70〜500ms。
- Cloudflare では Workers AI のモデル `typesafe/jev`。`env.AI.run('typesafe/jev', { state, questions })`。wrangler.jsonc に `"ai": { "binding": "AI" }`。（出典: developers.cloudflare.com/ai/models/typesafe/jev/）
- REST: `POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/typesafe/jev`、`Authorization: Bearer {CF_API_TOKEN}`（Workers AI Read/Edit 権限）。レスポンスは `{ result: { answers }, success }`。
- questions の形: `{ 名前: { type: 'noul', instructions } }` / `{ type: 'choice', instructions, criteria: { key: 説明 } }`。answers は `{ 名前: { noul: 0.93 } }` / `{ choice: 'key', probabilities, confidence }`。
- TypeSafe 直接: `POST https://api.typesafe.ai/v1/systemone`（TYPESAFE_API_KEY）。今回は使わない。
- `sort.js` の使い方: 単純作業だけか（Noul 1問）、5観点の根拠になるか（Noul 5問）、カルテ更新候補の項目分け（Choice）。しきい値 0.5。確率・確信度は保存も表示もしない。
- `DECIDE_PROVIDER=claude` のとき、または Jev が使えないとき（AI binding も CF_API_TOKEN も無い、エラー）は Claude で同じ JSON を作る。それも無理ならキーワードの固定ロジック。

## 未確認（人の作業が必要）

- 実際の Cloudflare アカウントで `typesafe/jev` が有効か（TypeSafe の招待が要るか）。wrangler login 後に `npm run ai:check` で確認する。
- AI Gateway の作成（ダッシュボード）と Gateway ID。
