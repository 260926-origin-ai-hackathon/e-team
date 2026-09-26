/**
 * 運営の登録・編集フォームの項目定義と FormData → データ変換
 */

/** @typedef {{ name: string, label: string, type?: 'text' | 'number' | 'checkbox' | 'textarea' | 'list', required?: boolean, hint?: string }} Field */

/** @type {Field[]} */
export const COMPANY_FIELDS = [
	{ name: 'name', label: '社名', required: true },
	{ name: 'region', label: '地域', required: true },
	{ name: 'industry', label: '業種', required: true },
	{ name: 'revenue', label: '年商（万円）', type: 'number', required: true },
	{ name: 'operatingProfit', label: '営業利益（万円）', type: 'number' },
	{ name: 'employees', label: '従業員数', type: 'number', required: true },
	{ name: 'majorClients', label: '主な取引先', type: 'list', hint: '読点（、）区切り' },
	{ name: 'hasDebt', label: '借入あり', type: 'checkbox' },
	{ name: 'ownerUid', label: '社長のユーザーID（uid）', required: true },
	{ name: 'slots', label: '候補者枠', type: 'number', hint: '既定は3' },
	{ name: 'ownerWords', label: '社長の一言', type: 'textarea' },
	{ name: 'rawNotes', label: '社長の話し言葉（カルテの元）', type: 'textarea' }
];

/** @type {Field[]} */
export const TRAINEE_FIELDS = [
	{ name: 'name', label: '氏名', required: true },
	{ name: 'uid', label: 'ユーザーID（uid）', required: true },
	{ name: 'university', label: '大学', required: true },
	{ name: 'grade', label: '学年' },
	{ name: 'hometown', label: '出身' },
	{ name: 'aptitudeResult', label: '適性診断の結果' },
	{ name: 'motivation', label: '志望動機', type: 'textarea' },
	{ name: 'managementGoal', label: '経営の目標', type: 'textarea' }
];

/**
 * @param {FormData} form
 * @param {Field[]} fields
 * @returns {{ data: Record<string, unknown>, errors: string[] }}
 */
export function parseForm(form, fields) {
	/** @type {Record<string, unknown>} */
	const data = {};
	/** @type {string[]} */
	const errors = [];
	for (const f of fields) {
		const raw = form.get(f.name);
		const text = typeof raw === 'string' ? raw.trim() : '';
		if (f.type === 'checkbox') {
			data[f.name] = raw === 'on';
			continue;
		}
		if (f.required && !text) {
			errors.push(`${f.label}は必須です`);
			continue;
		}
		if (f.type === 'number') {
			if (text === '') continue;
			const n = Number(text);
			if (!Number.isFinite(n)) errors.push(`${f.label}は数字で入力してください`);
			else data[f.name] = n;
			continue;
		}
		if (f.type === 'list') {
			data[f.name] = text
				? text
						.split(/[、,]/)
						.map((s) => s.trim())
						.filter(Boolean)
				: [];
			continue;
		}
		data[f.name] = text;
	}
	return { data, errors };
}
