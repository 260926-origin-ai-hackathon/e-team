/**
 * Firestore REST の Value 形式（stringValue, integerValue, ...）と JS の値の相互変換。
 * https://firebase.google.com/docs/firestore/reference/rest/v1/Value
 * - 整数は integerValue（文字列）、小数は doubleValue
 * - Date は timestampValue（ISO 8601）
 * - undefined の項目は書かない
 */

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
export function encodeValue(v) {
	if (v === null) return { nullValue: null };
	if (typeof v === 'string') return { stringValue: v };
	if (typeof v === 'boolean') return { booleanValue: v };
	if (typeof v === 'number') {
		return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
	}
	if (v instanceof Date) return { timestampValue: v.toISOString() };
	if (Array.isArray(v)) {
		return { arrayValue: { values: v.filter((x) => x !== undefined).map(encodeValue) } };
	}
	if (typeof v === 'object') {
		return { mapValue: { fields: encodeFields(/** @type {Record<string, unknown>} */ (v)) } };
	}
	throw new Error(`Firestore に書けない値です: ${typeof v}`);
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, Record<string, unknown>>}
 */
export function encodeFields(obj) {
	/** @type {Record<string, Record<string, unknown>>} */
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v === undefined) continue;
		out[k] = encodeValue(v);
	}
	return out;
}

/**
 * @param {any} v
 * @returns {unknown}
 */
export function decodeValue(v) {
	if (v == null) return null;
	if ('nullValue' in v) return null;
	if ('stringValue' in v) return v.stringValue;
	if ('booleanValue' in v) return v.booleanValue;
	if ('integerValue' in v) return Number(v.integerValue);
	if ('doubleValue' in v) return v.doubleValue;
	if ('timestampValue' in v) return v.timestampValue; // ISO 文字列のまま（画面で扱いやすい）
	if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decodeValue);
	if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {});
	if ('referenceValue' in v) return v.referenceValue;
	if ('geoPointValue' in v) return v.geoPointValue;
	if ('bytesValue' in v) return v.bytesValue;
	return null;
}

/**
 * @param {Record<string, any>} fields
 * @returns {Record<string, unknown>}
 */
export function decodeFields(fields) {
	/** @type {Record<string, unknown>} */
	const out = {};
	for (const [k, v] of Object.entries(fields ?? {})) out[k] = decodeValue(v);
	return out;
}

/**
 * REST の Document → { id, path, ...fields }
 * @param {{ name: string, fields?: Record<string, any>, createTime?: string, updateTime?: string }} doc
 * @returns {Record<string, unknown> & { id: string, path: string }}
 */
export function decodeDocument(doc) {
	const path = doc.name.replace(/^projects\/[^/]+\/databases\/[^/]+\/documents\//, '');
	const id = path.slice(path.lastIndexOf('/') + 1);
	return { id, path, ...decodeFields(doc.fields ?? {}) };
}
