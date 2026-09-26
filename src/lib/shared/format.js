/** 日付・数字の表示用ヘルパー（画面とサーバーの両方で使う） */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間の今日を 'YYYY-MM-DD' で
 * @param {Date} [now]
 */
export function todayJst(now = new Date()) {
	return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 'YYYY-MM-DD' から今日までの日数（同じ日は 0）
 * @param {string} ymd
 * @param {string} [today]
 */
export function daysSince(ymd, today = todayJst()) {
	const a = Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
	const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
	return Math.round((b - a) / 86_400_000);
}

/**
 * 'YYYY-MM-DD' → '9月25日' / '2026年9月25日'
 * @param {string} ymd
 * @param {{ year?: boolean }} [opts]
 */
export function formatDate(ymd, opts = {}) {
	if (!ymd) return '';
	const y = +ymd.slice(0, 4);
	const m = +ymd.slice(5, 7);
	const d = +ymd.slice(8, 10);
	return opts.year ? `${y}年${m}月${d}日` : `${m}月${d}日`;
}

/** 万円 → '8,000万円' / '1億2,000万円'
 * @param {number} man
 */
export function formatMan(man) {
	if (man == null) return '—';
	if (man >= 10000) {
		const oku = Math.floor(man / 10000);
		const rest = man % 10000;
		return rest ? `${oku}億${rest.toLocaleString('ja-JP')}万円` : `${oku}億円`;
	}
	return `${man.toLocaleString('ja-JP')}万円`;
}

/** ISO 時刻 → 'YYYY-MM-DD'（JST）
 * @param {string} iso
 */
export function ymdOf(iso) {
	return todayJst(new Date(iso));
}
