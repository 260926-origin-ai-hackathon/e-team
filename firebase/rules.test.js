/**
 * Security Rules のテスト。Firestore エミュレータが必要（npm run emulators）。
 * 実行: npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let env;

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

beforeAll(async () => {
	env = await initializeTestEnvironment({
		projectId: 'demo-tsugumi-rules',
		firestore: {
			rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8'),
			host,
			port: Number(port)
		}
	});
});

afterAll(async () => {
	await env.cleanup();
});

beforeEach(async () => {
	await env.clearFirestore();
	await env.withSecurityRulesDisabled(async (ctx) => {
		const db = ctx.firestore();
		await setDoc(doc(db, 'companies/company-1'), {
			name: '中村工務店',
			ownerUid: 'demo-seller',
			slots: 3,
			fieldSummary3: ['a', 'b', 'c']
		});
		await setDoc(doc(db, 'companies/company-2'), {
			name: '別の会社',
			ownerUid: 'other-seller',
			slots: 3
		});
		await setDoc(doc(db, 'trainees/trainee-1'), { uid: 'buyer-1', name: '候補者1' });
		await setDoc(doc(db, 'trainees/trainee-2'), { uid: 'demo-buyer', name: '候補者2' });
		await setDoc(doc(db, 'placements/p1'), {
			companyId: 'company-1',
			traineeId: 'trainee-1',
			stage: 1
		});
		await setDoc(doc(db, 'placements/p2'), {
			companyId: 'company-1',
			traineeId: 'trainee-2',
			stage: 2
		});
		await setDoc(doc(db, 'placements/p9'), {
			companyId: 'company-2',
			traineeId: 'trainee-9',
			stage: 1
		});
		await setDoc(doc(db, 'placements/p2/reports/r1'), { date: '2026-09-01', body: 'x' });
		await setDoc(doc(db, 'placements/p1/reports/r1'), { date: '2026-09-01', body: 'y' });
		await setDoc(doc(db, 'placements/p2/proposals/q1'), {
			date: '2026-09-02',
			content: 'c',
			ownerReaction: null
		});
		await setDoc(doc(db, 'placements/p2/assessment/current'), { items: [] });
		await setDoc(doc(db, 'users/demo-buyer'), { role: 'buyer' });
		await setDoc(doc(db, 'users/demo-seller'), { role: 'seller' });
		await setDoc(doc(db, 'aiLogs/l1'), { feature: 'x' });
	});
});

const buyer = () =>
	env.authenticatedContext('demo-buyer', { role: 'buyer', traineeId: 'trainee-2' }).firestore();
const otherBuyer = () =>
	env.authenticatedContext('buyer-1', { role: 'buyer', traineeId: 'trainee-1' }).firestore();
const seller = () =>
	env.authenticatedContext('demo-seller', { role: 'seller', companyId: 'company-1' }).firestore();
const otherSeller = () =>
	env.authenticatedContext('other-seller', { role: 'seller', companyId: 'company-2' }).firestore();
const operator = () => env.authenticatedContext('op', { role: 'operator' }).firestore();
const admin = () => env.authenticatedContext('adm', { role: 'admin' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('buyer（修行者）', () => {
	it('自分の placement と配下は読める', async () => {
		await assertSucceeds(getDoc(doc(buyer(), 'placements/p2')));
		await assertSucceeds(getDoc(doc(buyer(), 'placements/p2/reports/r1')));
		await assertSucceeds(getDoc(doc(buyer(), 'placements/p2/assessment/current')));
	});
	it('他の候補者の placements と配下は読めない', async () => {
		await assertFails(getDoc(doc(buyer(), 'placements/p1')));
		await assertFails(getDoc(doc(buyer(), 'placements/p1/reports/r1')));
		await assertFails(getDocs(collection(buyer(), 'placements')));
	});
	it('企業は全社読めるが書けない。自分の trainee は読める', async () => {
		await assertSucceeds(getDoc(doc(buyer(), 'companies/company-2')));
		await assertFails(updateDoc(doc(buyer(), 'companies/company-1'), { name: 'x' }));
		await assertSucceeds(getDoc(doc(buyer(), 'trainees/trainee-2')));
		await assertFails(getDoc(doc(buyer(), 'trainees/trainee-1')));
	});
	it('日報は date/body/createdAt だけで作れる。AI項目は入れられない', async () => {
		await assertSucceeds(
			addDoc(collection(buyer(), 'placements/p2/reports'), {
				date: '2026-09-25',
				body: '今日は',
				createdAt: 'now'
			})
		);
		await assertFails(
			addDoc(collection(buyer(), 'placements/p2/reports'), {
				date: '2026-09-25',
				body: '今日は',
				aiFeedback: {}
			})
		);
		await assertFails(
			addDoc(collection(otherBuyer(), 'placements/p2/reports'), { date: 'd', body: 'b' })
		);
	});
	it('提案は反応 null で作れるが、反応は変えられない', async () => {
		await assertSucceeds(
			addDoc(collection(buyer(), 'placements/p2/proposals'), {
				date: 'd',
				content: 'c',
				ownerReaction: null
			})
		);
		await assertFails(
			updateDoc(doc(buyer(), 'placements/p2/proposals/q1'), { ownerReaction: 'adopted' })
		);
	});
});

describe('seller（社長）', () => {
	it('自社の companies は読めて編集できるが、AI項目と ownerUid は変えられない', async () => {
		await assertSucceeds(getDoc(doc(seller(), 'companies/company-1')));
		await assertSucceeds(updateDoc(doc(seller(), 'companies/company-1'), { ownerWords: '言葉' }));
		await assertFails(updateDoc(doc(seller(), 'companies/company-1'), { fieldSummary3: ['x'] }));
		await assertFails(updateDoc(doc(seller(), 'companies/company-1'), { ownerUid: 'me' }));
		await assertFails(getDoc(doc(seller(), 'companies/company-2')));
	});
	it('自社の placements と配下は読めるが、他社は読めない', async () => {
		await assertSucceeds(getDoc(doc(seller(), 'placements/p1')));
		await assertSucceeds(getDoc(doc(seller(), 'placements/p2/reports/r1')));
		await assertFails(getDoc(doc(seller(), 'placements/p9')));
		await assertFails(getDoc(doc(otherSeller(), 'placements/p2/reports/r1')));
	});
	it('提案の反応、gates、missions は書ける。stage は画面からは変えられない', async () => {
		await assertSucceeds(
			updateDoc(doc(seller(), 'placements/p2/proposals/q1'), { ownerReaction: 'adopted' })
		);
		await assertFails(
			updateDoc(doc(seller(), 'placements/p2/proposals/q1'), { content: '改ざん' })
		);
		await assertSucceeds(
			addDoc(collection(seller(), 'placements/p2/gates'), {
				stage: 2,
				decision: 'next',
				ownerComment: '',
				at: 'now'
			})
		);
		await assertSucceeds(
			setDoc(doc(seller(), 'placements/p2/missions/m1'), {
				month: '2026-09',
				text: 'x',
				done: false
			})
		);
		await assertSucceeds(updateDoc(doc(seller(), 'placements/p2'), { agreementSigned: true }));
		await assertFails(updateDoc(doc(seller(), 'placements/p2'), { stage: 3 }));
		await assertFails(setDoc(doc(seller(), 'placements/p2/assessment/current'), { items: [] }));
	});
});

describe('admin / operator（運営）', () => {
	it('すべて読める', async () => {
		await assertSucceeds(getDoc(doc(operator(), 'placements/p9')));
		await assertSucceeds(getDoc(doc(operator(), 'placements/p2/reports/r1')));
		await assertSucceeds(getDoc(doc(operator(), 'aiLogs/l1')));
		await assertSucceeds(getDocs(collection(admin(), 'placements')));
	});
	it('companies・trainees は編集できる', async () => {
		await assertSucceeds(updateDoc(doc(operator(), 'companies/company-2'), { name: 'y' }));
		await assertSucceeds(setDoc(doc(operator(), 'trainees/trainee-3'), { uid: 'u3', name: 'n' }));
	});
	it('users の変更は admin だけ', async () => {
		await assertSucceeds(updateDoc(doc(admin(), 'users/demo-buyer'), { role: 'buyer' }));
		await assertFails(updateDoc(doc(operator(), 'users/demo-buyer'), { role: 'admin' }));
	});
});

describe('サーバーだけが書く', () => {
	it('auditLogs・aiLogs は誰も画面からは書けない', async () => {
		await assertFails(setDoc(doc(admin(), 'auditLogs/x'), { action: 'x' }));
		await assertFails(setDoc(doc(admin(), 'aiLogs/x'), { feature: 'x' }));
	});
	it('未ログインは何も読めない', async () => {
		await assertFails(getDoc(doc(anon(), 'companies/company-1')));
		await assertFails(getDoc(doc(anon(), 'placements/p2')));
	});
});
