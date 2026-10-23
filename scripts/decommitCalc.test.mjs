// Run: node scripts/decommitCalc.test.mjs
import assert from "node:assert/strict";
import { computeDecommit, eligibleCommitments, rowKey, validateDecommitAmount } from "../src/utils/decommitCalc.ts";

const rows = [
    { transactionType: "FUND_RECEIVED", transactionId: 306, fundReceivedAmount: 4799412, status: "COMMITTED" },
    { transactionType: "COMMIT", transactionId: 1102, commitAmount: 190000, status: "COMMITTED", frapAppId: "A1" },
    { transactionType: "PAYMENT", transactionId: 1017, paymentAmount: 188911, refDetails: "1102", status: "PENDING" },
    { transactionType: "COMMIT", transactionId: 1103, commitAmount: 474000, status: "RE COMMITTED" },
    { transactionType: "COMMIT", transactionId: 1390, commitAmount: -2000, refDetails: "1103", status: "COMMITTED" },
    { transactionType: "PAYMENT", transactionId: 1500, paymentAmount: 100000.5, refDetails: "1103", status: "PAID" },
    { transactionType: "PAYMENT", transactionId: 1501, paymentAmount: 999, refDetails: "1103", status: "CANCELLED" },
    { transactionType: "COMMIT", transactionId: 1107, commitAmount: 665000, status: "CANCELLED" },
    { transactionType: "COMMIT", transactionId: 1415, commitAmount: -1089, status: "COMMITTED" },
];

// Eligible: live positive parents only (no payments, cancelled, negative or child rows)
assert.deepEqual(eligibleCommitments(rows).map((r) => r.transactionId), [1102, 1103]);

// Original − Paid
const a = computeDecommit(rows[1], rows);
assert.equal(a.original, 190000);
assert.equal(a.totalPaid, 188911);
assert.equal(a.maxDecommit, 1089);

// Prior decommit lowers the limit, cancelled payment ignored, paise floored
const b = computeDecommit(rows[3], rows);
assert.equal(b.totalPaid, 100000.5);
assert.equal(b.priorAdjustments, -2000);
assert.equal(b.maxDecommit, Math.floor(474000 - 2000 - 100000.5)); // 371999
assert.equal(b.payments.length, 1);

// Fully paid → nothing left, never negative
const full = computeDecommit({ transactionType: "COMMIT", transactionId: 9, commitAmount: 100 },
    [{ transactionType: "PAYMENT", transactionId: 10, paymentAmount: 150, refDetails: "9" }]);
assert.equal(full.maxDecommit, 0);

// Validation
assert.equal(validateDecommitAmount("1089", 1089), null);
assert.equal(validateDecommitAmount("1", 1089), null);
assert.match(validateDecommitAmount("1090", 1089), /cannot exceed/);
assert.match(validateDecommitAmount("-5", 1089), /greater than zero/);
assert.match(validateDecommitAmount("0", 1089), /greater than zero/);
assert.match(validateDecommitAmount("", 1089), /Enter/);
assert.match(validateDecommitAmount("10.5", 1089), /whole rupees/);
assert.match(validateDecommitAmount("5", 0), /Nothing is left/);
// Payments with no refDetails are tied by application id when it is unambiguous
const appRows = [
    { transactionType: "COMMIT", transactionId: 34, commitAmount: 779350, frapAppId: "APP1", status: "COMMITTED" },
    { transactionType: "PAYMENT", transactionId: 40, paymentAmount: 100000, frapAppId: "APP1", status: "PAID" },
    { transactionType: "PAYMENT", transactionId: 41, paymentAmount: 50000, frapAppId: "APP2", status: "PAID" },
];
const c = computeDecommit(appRows[0], appRows);
assert.equal(c.totalPaid, 100000);
assert.equal(c.paymentsLinkedByApp.length, 1);
assert.equal(c.maxDecommit, 679350);
// ...but not when two live commitments share the application id
const twoRows = [...appRows, { transactionType: "COMMIT", transactionId: 35, commitAmount: 1000, frapAppId: "APP1", status: "COMMITTED" }];
assert.equal(computeDecommit(twoRows[0], twoRows).totalPaid, 0);

// TIDs are numbered per kind: loan 4, commit 4 and payment 4 coexist
const mixed = [
    { transactionType: "LOAN", transactionId: 4, refDetails: "20260412LOAN00220", status: "SETTLED" },
    { transactionType: "COMMIT", transactionId: 4, commitAmount: 1170510, frapAppId: "A290", status: "COMMITTED" },
    { transactionType: "COMMIT", transactionId: 15, commitAmount: 1011200, frapAppId: "A297", status: "COMMITTED" },
    { transactionType: "PAYMENT", transactionId: 4, paymentAmount: 11239.36, refDetails: "4", frapAppId: "A290", status: "PENDING" },
];
assert.deepEqual(eligibleCommitments(mixed).map(rowKey), ["commit:4", "commit:15"]);
assert.equal(new Set(mixed.map(rowKey)).size, 4);
const m = computeDecommit(mixed[1], mixed);
assert.equal(m.totalPaid, 11239.36);
assert.equal(m.maxDecommit, Math.floor(1170510 - 11239.36));

console.log("decommitCalc: all assertions passed");
