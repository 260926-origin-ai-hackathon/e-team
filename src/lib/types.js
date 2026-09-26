/**
 * Firestore のデータ型（Notion「5. データ」）。日付は 'YYYY-MM-DD'、時刻は ISO 8601 の文字列で持つ。
 * AI が書く項目（fieldSummary3, risks, roadmap, aiFeedback, perspectives, assessment）はサーバーだけが書く。
 */

/** @typedef {1 | 2 | 3} Stage */
/** @typedef {Stage | 'ended'} PlacementStage */
/** @typedef {'over60' | 'simpleWorkOnly'} Flag */

/**
 * 見極めの5観点
 * @typedef {'fit' | 'persistence' | 'proposalFit' | 'reputation' | 'commitment'} PerspectiveId
 */

/**
 * @typedef {object} Company
 * @property {string} id
 * @property {string} name
 * @property {string} region
 * @property {string} industry
 * @property {number} revenue  年商（万円）
 * @property {number} operatingProfit  営業利益（万円）
 * @property {number} employees
 * @property {string[]} majorClients
 * @property {boolean} hasDebt
 * @property {string} ownerUid
 * @property {number} slots  候補者枠（3）
 * @property {string} ownerWords  社長の一言
 * @property {string} rawNotes  社長が話し言葉で書いた原文（O3）
 * @property {string[]} values  大事にしていること
 * @property {string[]} fieldIssues  現場の課題
 * @property {string} customers  お客さん
 * @property {string[]} ownerOnlyWork  社長しかできない仕事
 * @property {string[]} successorRequirements  後継者に求めること
 * @property {{ stage: Stage, text: string }[]} stageWork  修行で任されること（段階ごと1行）
 * @property {string[]} fieldSummary3  現場3行（AI）
 * @property {Risk[]} risks  承継リスク上位3つ（AI）
 * @property {RoadmapYear[]} roadmap  1〜3年目（AI）
 */

/**
 * @typedef {object} Risk
 * @property {string} title
 * @property {string} why  根拠（カルテや採用提案の言葉を引用）
 * @property {string} action
 */

/**
 * @typedef {object} RoadmapYear
 * @property {number} year  1..3
 * @property {string} theme
 * @property {string[]} items
 */

/**
 * @typedef {object} Trainee
 * @property {string} id
 * @property {string} uid
 * @property {string} name
 * @property {string} university
 * @property {string} grade
 * @property {string} hometown
 * @property {string} aptitudeResult
 * @property {string} motivation
 * @property {string} managementGoal
 */

/**
 * @typedef {object} Placement
 * @property {string} id
 * @property {string} companyId
 * @property {string} traineeId
 * @property {string} companyName
 * @property {string} traineeName
 * @property {string} traineeUniversity
 * @property {PlacementStage} stage
 * @property {string} startedAt  YYYY-MM-DD
 * @property {string} stageStartedAt  今の段階の開始日
 * @property {string} nextGateAt  YYYY-MM-DD
 * @property {boolean} agreementSigned  承継を前提とした合意書
 * @property {'declined' | 'rejected' | 'succeeded' | null} endReason
 * @property {Flag[]} flags  注意ラベル
 * @property {string} lastReportSummary  直近日報の要約1行（O1カード用）
 */

/**
 * @typedef {object} AiFeedback
 * @property {string} insight  気づき1つ
 * @property {string} proposalDraft  改善提案の下書き1つ
 * @property {KarteCandidate[]} karteCandidates
 */

/**
 * @typedef {object} KarteCandidate
 * @property {'values' | 'fieldIssues' | 'customers' | 'ownerOnlyWork' | 'successorRequirements'} field
 * @property {string} text
 */

/**
 * @typedef {object} Report
 * @property {string} id
 * @property {string} date  YYYY-MM-DD
 * @property {string} body
 * @property {AiFeedback | null} aiFeedback
 * @property {PerspectiveId[]} perspectives  Jev の振り分け
 * @property {boolean} [simpleWorkOnly]  Jev: 単純作業だけか
 * @property {string} createdAt  ISO
 */

/**
 * @typedef {object} Proposal
 * @property {string} id
 * @property {string} date
 * @property {string} content
 * @property {'adopted' | 'hold' | null} ownerReaction
 * @property {string} [reportId]
 */

/**
 * @typedef {object} Gate
 * @property {string} id
 * @property {Stage} stage
 * @property {'next' | 'extend' | 'stop'} decision
 * @property {string} ownerComment
 * @property {string} at  ISO
 */

/**
 * @typedef {object} Mission
 * @property {string} id
 * @property {string} month  YYYY-MM
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {object} AssessmentItem
 * @property {PerspectiveId} id
 * @property {string} finding  所見（2文まで）
 * @property {string[]} evidenceDates  根拠の日報日付
 */

/**
 * @typedef {object} Assessment
 * @property {AssessmentItem[]} items
 * @property {string} generatedAt  ISO
 * @property {'claude' | 'fallback' | 'seed'} source
 */

/**
 * @typedef {object} UserDoc
 * @property {string} displayName
 * @property {import('./shared/roles.js').Role} role
 * @property {string} [companyId]
 * @property {string} [traineeId]
 * @property {boolean} isDemo
 */

/**
 * @typedef {object} AuditLog
 * @property {string} uid
 * @property {string} action
 * @property {string} targetPath
 * @property {unknown} before
 * @property {unknown} after
 * @property {string} at
 */

/**
 * @typedef {object} AiLog
 * @property {string} feature
 * @property {'claude' | 'jev'} provider
 * @property {string} inputSummary
 * @property {unknown} output
 * @property {number} latencyMs
 * @property {boolean} fallback
 * @property {string} at
 */

/** @type {{ id: PerspectiveId, label: string }[]} */
export const PERSPECTIVES = [
	{ id: 'fit', label: '現場になじんでいるか' },
	{ id: 'persistence', label: '手を抜かず続けているか' },
	{ id: 'proposalFit', label: '提案が現場の実情に合っているか' },
	{ id: 'reputation', label: '職人・従業員からどう見られているか' },
	{ id: 'commitment', label: 'この会社を継ぐ覚悟が見えるか' }
];

/** @type {Record<Stage, string>} */
export const STAGE_LABEL = { 1: '従業員', 2: '社長の右腕', 3: '経営参画' };

/** 段階1・2は時給1,200円、段階3は時給＋担当部門の粗利の5% */
export const REWARD = {
	1: '時給1,200円',
	2: '時給1,200円',
	3: '時給1,200円 ＋ 担当部門の粗利の5%'
};

export {};
