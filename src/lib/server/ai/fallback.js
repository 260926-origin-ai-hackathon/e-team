/**
 * AI 呼び出しが失敗したとき（APIキー無し、タイムアウト、スキーマ不一致）の固定レスポンス。
 * デモが止まらないことが目的。入力の言葉を少しだけ引用して、それらしく見せる。
 */

/** @param {string} text @param {number} n */
function firstSentence(text, n = 40) {
	const s = (text ?? '').replace(/\s+/g, ' ').trim();
	const cut = s.split(/[。．\n]/)[0] ?? s;
	return cut.length > n ? cut.slice(0, n) + '…' : cut;
}

/**
 * @param {{ rawNotes: string }} input
 * @returns {import('zod').infer<typeof import('./schemas.js').KarteSchema>}
 */
export function karteFallback(input) {
	const q = firstSentence(input.rawNotes);
	return {
		ownerWords: q || '（社長の言葉をここに）',
		values: ['お客さんとの信用を第一にしてきた'],
		fieldIssues: ['社長にしか分からない仕事が残っている'],
		customers: '地元の紹介が中心',
		ownerOnlyWork: ['見積もりと原価の判断', '取引先との付き合い'],
		successorRequirements: ['現場と数字の両方を見られる'],
		fieldSummary3: [
			q || '地元で続いてきた会社。',
			'社長の仕事を分けることが課題。',
			'後継者に渡す準備を進めている。'
		]
	};
}

/**
 * @param {{ body: string }} input
 * @returns {import('zod').infer<typeof import('./schemas.js').FeedbackSchema>}
 */
export function feedbackFallback(input) {
	const q = firstSentence(input.body);
	return {
		insight: q
			? `「${q}」と書かれています。この場面を、明日は誰が・なぜそうしたかまで書き足すと見極めの材料になります。`
			: '日報の中の具体的な場面を1つ、誰が・なぜまで書くと材料になります。',
		proposalDraft:
			'今日の出来事で困っていた人に、明日「何があれば楽になるか」を1つ聞いて記録する。',
		karteCandidates: []
	};
}

/**
 * @returns {import('zod').infer<typeof import('./schemas.js').AssessmentSchema>}
 * @param {{ dates: string[] }} input
 */
export function assessmentFallback(input) {
	const d = input.dates.length ? input.dates.slice(-2) : ['—'];
	return {
		items: [
			{
				id: 'fit',
				finding:
					'日報に現場の人の名前と言葉が出てきています。まだ読み込めていないため、所見は社長の目で補ってください。',
				evidenceDates: d
			},
			{
				id: 'persistence',
				finding: '日報が継続して提出されています。頻度と内容の変化を確認してください。',
				evidenceDates: d
			},
			{
				id: 'proposalFit',
				finding:
					'提案と社長の反応（採用・保留）が記録されています。採用された提案がその後どうなったかを確認してください。',
				evidenceDates: d
			},
			{
				id: 'reputation',
				finding:
					'職人・従業員の反応は日報の中の言葉で確認できます。直接の聞き取りも合わせてください。',
				evidenceDates: d
			},
			{
				id: 'commitment',
				finding: '継ぐ覚悟は、数字や取引先に踏み込んだ記述があるかで見えてきます。',
				evidenceDates: d
			}
		]
	};
}

/**
 * @returns {import('zod').infer<typeof import('./schemas.js').RiskSchema>}
 */
export function riskFallback() {
	return {
		risks: [
			{
				title: '属人化：社長にしかできない仕事',
				why: 'カルテの「社長しかできない仕事」に挙がっている項目は、社長が抜けると止まります。',
				action: '段階2で1つずつ後継者に移す。'
			},
			{
				title: '取引先の偏り',
				why: '特定の紹介元や取引先に受注が集中していると、担当者交代で受注が減ります。',
				action: '紹介元を増やす仕組みを段階3で試す。'
			},
			{
				title: '借入と個人保証',
				why: '借入の個人保証は承継時の壁になります。',
				action: '銀行と経営者保証の扱いを早めに相談する。'
			}
		],
		roadmap: [
			{
				year: 1,
				theme: '社長の仕事を分ける',
				items: ['見積もりの下書きを後継者が作る', '朝の段取りを共有する']
			},
			{
				year: 2,
				theme: '一部門を後継者が持つ',
				items: ['部門の数字を後継者が毎月出す', '銀行に承継計画を説明する']
			},
			{ year: 3, theme: '代表を交代する', items: ['取引先の窓口を移す', '株式と借入の引き継ぎ'] }
		]
	};
}

const SIMPLE_WORDS = ['掃除', '片付け', '運び', '運搬', '養生', '雑用'];
/** @type {Record<import('../../types.js').PerspectiveId, string[]>} */
const PERSPECTIVE_WORDS = {
	fit: ['さん', '言って', '教えて', '聞いた', '手元'],
	persistence: ['毎日', '続け', '遅刻', '終えた', 'ミッション'],
	proposalFit: ['提案', '採用', 'テンプレ', '始めて', '試した'],
	reputation: ['言ってくれた', '褒め', '伝えて', '信頼', 'ええ'],
	commitment: ['来年', '継ぐ', '粗利', '銀行', '取引先', '数字']
};

/**
 * キーワードで仕分ける固定ロジック（Jev も Claude も使えないとき）
 * @param {{ body: string }} input
 * @returns {import('zod').infer<typeof import('./schemas.js').SortSchema>}
 */
export function sortFallback(input) {
	const body = input.body ?? '';
	const simpleWorkOnly = body.length < 60 && SIMPLE_WORDS.some((w) => body.includes(w));
	const perspectives = /** @type {import('../../types.js').PerspectiveId[]} */ (
		Object.entries(PERSPECTIVE_WORDS)
			.filter(([, words]) => words.some((w) => body.includes(w)))
			.map(([id]) => id)
	);
	return { simpleWorkOnly, perspectives, karteFields: [] };
}
