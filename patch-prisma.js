const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
const jsFile = path.join(clientDir, 'index.js');
const tsFile = path.join(clientDir, 'index.d.ts');

const enumsJS = `
// Patched enums for SQLite compatibility
exports.Role = {
  CLIENT: 'CLIENT',
  FREELANCER: 'FREELANCER'
};
exports.ContractStatus = {
  DRAFT: 'DRAFT',
  PENDING_SIGNATURE: 'PENDING_SIGNATURE',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
};
exports.MilestoneStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUBMITTED: 'SUBMITTED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  COMPLETED: 'COMPLETED'
};
exports.PaymentTerm = {
  ESCROW_MILESTONE: 'ESCROW_MILESTONE',
  ESCROW_FULL: 'ESCROW_FULL',
  NET_15: 'NET_15',
  NET_30: 'NET_30'
};
exports.MessageType = {
  TEXT: 'TEXT',
  FILE: 'FILE',
  SYSTEM: 'SYSTEM'
};
exports.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};
exports.NotificationType = {
  MILESTONE_SUBMITTED: 'MILESTONE_SUBMITTED',
  MILESTONE_APPROVED: 'MILESTONE_APPROVED',
  MILESTONE_REJECTED: 'MILESTONE_REJECTED',
  CONTRACT_SIGNED: 'CONTRACT_SIGNED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  PAYMENT_RELEASED: 'PAYMENT_RELEASED',
  NFT_MINTED: 'NFT_MINTED',
  NEW_APPLICATION: 'NEW_APPLICATION',
  FREELANCER_SELECTED: 'FREELANCER_SELECTED'
};
exports.JobStatus = {
  OPEN: 'OPEN',
  DRAFT: 'DRAFT',
  CLOSED: 'CLOSED'
};
exports.ApplicationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};
`;

const enumsTS = `
// Patched enums for SQLite compatibility
export const Role: {
  CLIENT: 'CLIENT',
  FREELANCER: 'FREELANCER'
};
export type Role = (typeof Role)[keyof typeof Role];

export const ContractStatus: {
  DRAFT: 'DRAFT',
  PENDING_SIGNATURE: 'PENDING_SIGNATURE',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
};
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const MilestoneStatus: {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUBMITTED: 'SUBMITTED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  COMPLETED: 'COMPLETED'
};
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const PaymentTerm: {
  ESCROW_MILESTONE: 'ESCROW_MILESTONE',
  ESCROW_FULL: 'ESCROW_FULL',
  NET_15: 'NET_15',
  NET_30: 'NET_30'
};
export type PaymentTerm = (typeof PaymentTerm)[keyof typeof PaymentTerm];

export const MessageType: {
  TEXT: 'TEXT',
  FILE: 'FILE',
  SYSTEM: 'SYSTEM'
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const PaymentStatus: {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const NotificationType: {
  MILESTONE_SUBMITTED: 'MILESTONE_SUBMITTED',
  MILESTONE_APPROVED: 'MILESTONE_APPROVED',
  MILESTONE_REJECTED: 'MILESTONE_REJECTED',
  CONTRACT_SIGNED: 'CONTRACT_SIGNED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  PAYMENT_RELEASED: 'PAYMENT_RELEASED',
  NFT_MINTED: 'NFT_MINTED',
  NEW_APPLICATION: 'NEW_APPLICATION',
  FREELANCER_SELECTED: 'FREELANCER_SELECTED'
};
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const JobStatus: {
  OPEN: 'OPEN',
  DRAFT: 'DRAFT',
  CLOSED: 'CLOSED'
};
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const ApplicationStatus: {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
`;

function patch() {
  if (!fs.existsSync(jsFile)) {
    console.error('JS generated file not found at: ' + jsFile);
    return;
  }
  let jsContent = fs.readFileSync(jsFile, 'utf8');
  if (!jsContent.includes('exports.Role =')) {
    jsContent += enumsJS;
    fs.writeFileSync(jsFile, jsContent, 'utf8');
    console.log('Successfully patched index.js with enums.');
  } else {
    console.log('index.js already patched.');
  }

  if (!fs.existsSync(tsFile)) {
    console.error('TS generated file not found at: ' + tsFile);
    return;
  }
  let tsContent = fs.readFileSync(tsFile, 'utf8');
  if (!tsContent.includes('export const Role:')) {
    tsContent += enumsTS;
    fs.writeFileSync(tsFile, tsContent, 'utf8');
    console.log('Successfully patched index.d.ts with enums.');
  } else {
    console.log('index.d.ts already patched.');
  }
}

patch();
