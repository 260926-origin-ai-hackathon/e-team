/**
 * デモ用ユーザー。トップの3ボタンとシードの両方が使う。
 * ロールと権限は本番と同じ仕組み（Firebase custom claims）で付く。
 * @type {Record<import('../../shared/roles.js').Role, import('../firebase/identity.js').DemoUserSpec & { home: string }>}
 */
export const DEMO_USERS = {
	buyer: {
		uid: 'demo-buyer',
		email: 'demo-buyer@tsugumi.local',
		displayName: '山本 拓真（修行者）',
		claims: { role: 'buyer', traineeId: 'trainee-2' },
		home: '/buyer'
	},
	seller: {
		uid: 'demo-seller',
		email: 'demo-seller@tsugumi.local',
		displayName: '中村 正一（社長）',
		claims: { role: 'seller', companyId: 'company-1' },
		home: '/seller'
	},
	admin: {
		uid: 'demo-admin',
		email: 'demo-admin@tsugumi.local',
		displayName: '運営（管理者）',
		claims: { role: 'admin' },
		home: '/admin'
	},
	operator: {
		uid: 'demo-operator',
		email: 'demo-operator@tsugumi.local',
		displayName: '運営（一般）',
		claims: { role: 'operator' },
		home: '/admin'
	}
};

/** @param {unknown} role */
export function isDemoRole(role) {
	return typeof role === 'string' && role in DEMO_USERS;
}
