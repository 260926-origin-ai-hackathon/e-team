import { getAccessToken } from './googleToken.js';
import { decodeDocument, encodeFields, encodeValue } from './values.js';

/**
 * Firestore REST v1 の薄いクライアント（firebase-admin の代わり。Workers で動く）。
 * https://firebase.google.com/docs/firestore/use-rest-api
 * - 本番: サービスアカウントの OAuth2 トークン（scope: datastore）。Security Rules は通らない（サーバー権限）
 * - エミュレータ: http://<FIRESTORE_EMULATOR_HOST>/v1/...、Authorization: Bearer owner
 * パスは 'placements/p1/reports/r1' のように書く。
 */

const SCOPES = ['https://www.googleapis.com/auth/datastore'];

/**
 * @typedef {object} Filter
 * @property {string} field
 * @property {'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'ARRAY_CONTAINS' | 'IN' | 'ARRAY_CONTAINS_ANY' | 'NOT_IN'} op
 * @property {unknown} value
 */

/**
 * @typedef {object} QueryOptions
 * @property {Filter[]} [where]
 * @property {{ field: string, direction?: 'ASCENDING' | 'DESCENDING' }[]} [orderBy]
 * @property {number} [limit]
 * @property {boolean} [allDescendants]  コレクショングループ検索
 */

/**
 * @typedef {Record<string, unknown> & { id: string, path: string }} Doc
 */

export class Firestore {
	/**
	 * @param {import('./config.js').FirebaseServerConfig} config
	 * @param {typeof fetch} [fetchImpl]
	 */
	constructor(config, fetchImpl = fetch) {
		this.config = config;
		this.fetch = fetchImpl;
		this.root = `projects/${config.projectId}/databases/(default)/documents`;
		this.baseUrl = config.firestoreEmulatorHost
			? `http://${config.firestoreEmulatorHost}/v1/${this.root}`
			: `https://firestore.googleapis.com/v1/${this.root}`;
	}

	async token() {
		if (this.config.firestoreEmulatorHost) return 'owner';
		if (!this.config.serviceAccount) throw new Error('サービスアカウント鍵がありません');
		return getAccessToken(this.config.serviceAccount, SCOPES, this.fetch);
	}

	/** @param {string} path */
	name(path) {
		return `${this.root}/${path}`;
	}

	/**
	 * @param {string} method
	 * @param {string} urlSuffix  例 '/placements/p1' や ':runQuery'
	 * @param {unknown} [body]
	 * @returns {Promise<any>}
	 */
	async request(method, urlSuffix, body) {
		const res = await this.fetch(`${this.baseUrl}${urlSuffix}`, {
			method,
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${await this.token()}`
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (res.status === 404 && method === 'GET') return null;
		const text = await res.text();
		if (!res.ok) throw new Error(`Firestore ${method} ${urlSuffix} に失敗: ${res.status} ${text}`);
		return text ? JSON.parse(text) : null;
	}

	/**
	 * @param {string} path
	 * @returns {Promise<Doc | null>}
	 */
	async get(path) {
		const doc = await this.request('GET', `/${path}`);
		return doc ? decodeDocument(doc) : null;
	}

	/**
	 * 全項目を上書き（無ければ作る）
	 * @param {string} path
	 * @param {Record<string, unknown>} data
	 */
	async set(path, data) {
		return decodeDocument(await this.request('PATCH', `/${path}`, { fields: encodeFields(data) }));
	}

	/**
	 * 指定した項目だけ更新（updateMask）。無ければ作る
	 * @param {string} path
	 * @param {Record<string, unknown>} data
	 */
	async update(path, data) {
		const keys = Object.keys(data).filter((k) => data[k] !== undefined);
		const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
		return decodeDocument(
			await this.request('PATCH', `/${path}?${mask}`, { fields: encodeFields(data) })
		);
	}

	/** @param {string} path */
	async delete(path) {
		await this.request('DELETE', `/${path}`);
	}

	/**
	 * @param {string} parentPath  '' ならルート、'placements/p1' ならその下
	 * @param {string} collectionId
	 * @param {QueryOptions} [opts]
	 * @returns {Promise<Doc[]>}
	 */
	async query(parentPath, collectionId, opts = {}) {
		/** @type {Record<string, unknown>} */
		const structuredQuery = {
			from: [{ collectionId, allDescendants: opts.allDescendants ?? false }]
		};
		if (opts.where?.length) {
			const filters = opts.where.map((f) => ({
				fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: encodeValue(f.value) }
			}));
			structuredQuery.where =
				filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
		}
		if (opts.orderBy?.length) {
			structuredQuery.orderBy = opts.orderBy.map((o) => ({
				field: { fieldPath: o.field },
				direction: o.direction ?? 'ASCENDING'
			}));
		}
		if (opts.limit) structuredQuery.limit = opts.limit;
		const prefix = parentPath ? `/${parentPath}` : '';
		/** @type {{ document?: any }[]} */
		const rows = (await this.request('POST', `${prefix}:runQuery`, { structuredQuery })) ?? [];
		return rows.filter((r) => r.document).map((r) => decodeDocument(r.document));
	}

	/**
	 * 複数の書き込みを1回で（最大500件、原子的）
	 * @param {({ set: string, data: Record<string, unknown> } | { update: string, data: Record<string, unknown> } | { delete: string })[]} writes
	 */
	async commit(writes) {
		const encoded = writes.map((w) => {
			if ('delete' in w) return { delete: this.name(w.delete) };
			if ('update' in w) {
				const keys = Object.keys(w.data).filter((k) => w.data[k] !== undefined);
				return {
					update: { name: this.name(w.update), fields: encodeFields(w.data) },
					updateMask: { fieldPaths: keys }
				};
			}
			return { update: { name: this.name(w.set), fields: encodeFields(w.data) } };
		});
		for (let i = 0; i < encoded.length; i += 500) {
			await this.request('POST', ':commit', { writes: encoded.slice(i, i + 500) });
		}
	}

	/**
	 * ID を自動生成して追加
	 * @param {string} collectionPath
	 * @param {Record<string, unknown>} data
	 * @returns {Promise<Doc>}
	 */
	async add(collectionPath, data) {
		return this.set(`${collectionPath}/${newId()}`, data);
	}
}

/** Firestore と同じ 20 文字の英数字 ID */
export function newId() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	let id = '';
	for (const b of bytes) id += chars[b % chars.length];
	return id;
}

/** @type {WeakMap<object, Firestore>} */
const instances = new WeakMap();

/**
 * 同じ設定なら同じインスタンスを返す（トークンキャッシュのため）
 * @param {import('./config.js').FirebaseServerConfig} config
 */
export function firestoreFor(config) {
	let db = instances.get(config);
	if (!db) {
		db = new Firestore(config);
		instances.set(config, db);
	}
	return db;
}
