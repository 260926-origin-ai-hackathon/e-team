/**
 * ロールと画面の対応。hooks.server.js とナビゲーションの両方から使う。
 */

/** @typedef {'admin' | 'operator' | 'seller' | 'buyer'} Role */
/** @typedef {'buyer' | 'seller' | 'admin'} Area */

/**
 * @typedef {object} SessionUser
 * @property {string} uid
 * @property {Role} role
 * @property {string} [companyId]
 * @property {string} [traineeId]
 */

/** @type {Record<Role, string>} */
export const ROLE_LABEL = {
	buyer: '修行者',
	seller: '社長',
	operator: '運営',
	admin: '運営（管理者）'
};

/**
 * 各機能（URLの先頭）に入れるロール
 * @type {Record<Area, Role[]>}
 */
export const AREA_ROLES = {
	buyer: ['buyer'],
	seller: ['seller'],
	admin: ['admin', 'operator']
};

/**
 * 画面上部のタブ
 * @type {Record<Area, { id: string, href: string, label: string }[]>}
 */
export const AREA_TABS = {
	buyer: [
		{ id: 'S1', href: '/buyer', label: '企業を探す' },
		{ id: 'S3', href: '/buyer/training', label: '修行ダッシュボード' }
	],
	seller: [
		{ id: 'O1', href: '/seller', label: '候補者ボード' },
		{ id: 'O3', href: '/seller/company', label: '自社カルテ' }
	],
	admin: [
		{ id: 'A1', href: '/admin', label: '全社の修行' },
		{ id: 'A2', href: '/admin/companies', label: '企業' },
		{ id: 'A2', href: '/admin/trainees', label: '修行者' },
		{ id: 'A3', href: '/admin/users', label: 'ユーザー' }
	]
};

/**
 * パスから機能（buyer / seller / admin）を返す。該当なしは null
 * @param {string} pathname
 * @returns {Area | null}
 */
export function areaOf(pathname) {
	const m = pathname.match(/^\/(buyer|seller|admin)(\/|$)/);
	return m ? /** @type {Area} */ (m[1]) : null;
}

/**
 * そのロールが機能に入れるか
 * @param {Role | null | undefined} role
 * @param {Area} area
 */
export function canAccess(role, area) {
	if (!role) return false;
	return AREA_ROLES[area].includes(role);
}
