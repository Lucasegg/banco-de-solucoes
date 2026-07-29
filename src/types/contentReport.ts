export const contentReportReasons = ['spam','misleading','offensive','personal_information','illegal','duplicate','other'] as const;
export const contentReportStatuses = ['open','reviewing','resolved','dismissed'] as const;
export type ContentReportReason = typeof contentReportReasons[number];
export type ContentReportStatus = typeof contentReportStatuses[number];
export type ContentReportTarget = 'problem' | 'solution';
export interface ContentReport { id:string; targetType:ContentReportTarget; targetId:string; targetTitle?:string|null; reason:ContentReportReason; description:string|null; status:ContentReportStatus; moderatorNote?:string|null; createdAt:string; updatedAt:string; reviewedAt?:string|null; totalCount?:number }
