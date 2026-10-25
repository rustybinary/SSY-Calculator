// Run with: node tests/core.test.js
// Pulls the calculation core out of index.html (between the <core> markers) and checks it
// against figures that were cross-checked with an independent exact-fraction implementation.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.split('// <core>')[1].split('// </core>')[0];
const api = new Function(core + '\nreturn {computeSSY, parseISO, HIST, qIdx, xirr};')();
const {computeSSY, parseISO, HIST, qIdx, xirr} = api;

const rateOf = (y, m) => HIST[qIdx(y, m)] ?? 8.2;
function run(open, years, deposits, opts = {}) {
  return computeSSY({
    opening: parseISO(open), depositYears: years,
    deposits: deposits.map(([d, a], i) => ({date: parseISO(d), amount: a, src: 's' + i})),
    rateOf, enforceLimit: true, capFy: true, limit: 150000, ...opts
  });
}
let n = 0;
const check = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

check('notified rates match the published table', () => {
  const at = (y, m) => HIST[qIdx(y, m)];
  assert.strictEqual(at(2014, 12), 9.1);  assert.strictEqual(at(2015, 6), 9.2);
  assert.strictEqual(at(2016, 5), 8.6);   assert.strictEqual(at(2016, 11), 8.5);
  assert.strictEqual(at(2017, 5), 8.4);   assert.strictEqual(at(2017, 9), 8.3);
  assert.strictEqual(at(2018, 2), 8.1);   assert.strictEqual(at(2018, 9), 8.1);
  assert.strictEqual(at(2018, 10), 8.5);  assert.strictEqual(at(2019, 6), 8.5);
  assert.strictEqual(at(2019, 7), 8.4);   assert.strictEqual(at(2020, 3), 8.4);
  assert.strictEqual(at(2020, 4), 7.6);   assert.strictEqual(at(2023, 3), 7.6);
  assert.strictEqual(at(2023, 4), 8.0);   assert.strictEqual(at(2023, 12), 8.0);
  assert.strictEqual(at(2024, 1), 8.2);   assert.strictEqual(at(2026, 12), 8.2);
});

check('one deposit on the 1st earns twelve months in year one', () => {
  const r = run('2026-04-01', 15, [['2026-04-01', 100000]]);
  assert.deepStrictEqual([r.ledger[0].interest, r.ledger[0].close], [8200, 108200]);
  assert.deepStrictEqual([r.totDep, r.totInt, r.maturity], [100000, 423329, 523329]);
});

check('a deposit after the 5th loses that month', () => {
  const r = run('2026-04-01', 15, [['2026-04-06', 100000]]);
  assert.strictEqual(r.ledger[0].interest, 7517);               // 100000 x 8.2% x 11/12 = 7516.67
  assert.deepStrictEqual([r.totInt, r.maturity], [420024, 520024]);
});

check('a deposit on the 5th still counts for that month', () => {
  const r = run('2026-04-01', 15, [['2026-04-05', 100000]]);
  assert.strictEqual(r.ledger[0].interest, 8200);
});

check('15 yearly deposits of 1.5 lakh from 1 April 2022', () => {
  const d = []; for (let y = 2022; y < 2037; y++) d.push([y + '-04-01', 150000]);
  const r = run('2022-04-01', 15, d);
  assert.deepStrictEqual([r.totDep, r.totInt, r.maturity], [2250000, 4925677, 7175677]);
  assert.strictEqual(r.months.length, 252);
});

check('monthly deposits of 12,500 on the 5th', () => {
  const d = [];
  for (let y = 2022; y < 2037; y++) for (let m = 1; m <= 12; m++) d.push([`${m >= 4 ? y : y + 1}-${String(m).padStart(2, '0')}-05`, 12500]);
  const r = run('2022-04-01', 15, d);
  assert.deepStrictEqual([r.totDep, r.totInt, r.maturity], [2250000, 4678826, 6928826]);
});

check('mid-month opening with mixed deposits across old rate periods', () => {
  const r = run('2015-07-20', 15, [['2015-07-20', 1000], ['2016-01-03', 50000], ['2016-03-31', 20000], ['2017-04-05', 150000], ['2017-04-06', 50000]]);
  assert.deepStrictEqual([r.totDep, r.totInt, r.maturity], [221000, 805966, 1026966]);
  assert.strictEqual(r.rejected.length, 1);                      // the second April 2017 deposit breaks the yearly limit
});

check('yearly limit refuses a deposit that would exceed it', () => {
  const r = run('2020-04-01', 3, [['2020-04-01', 100000], ['2020-05-10', 60000], ['2020-06-01', 50000]]);
  assert.strictEqual(r.rejected.length, 1);
  assert.deepStrictEqual([r.totDep, r.totInt, r.maturity], [150000, 617912, 767912]);
});

check('deposits after the contribution period are refused', () => {
  const r = run('2022-04-01', 5, [['2022-04-01', 1000], ['2027-04-01', 1000]]);
  assert.strictEqual(r.rejected[0].reason, 'after the contribution period');
});

check('a flat rate across every quarter (7% and 7.5%)', () => {
  const d = []; for (let y = 2022; y < 2037; y++) d.push([y + '-04-01', 150000]);
  const a = run('2022-04-01', 15, d, {rateOf: () => 7});
  assert.deepStrictEqual([a.totDep, a.totInt, a.maturity], [2250000, 3802759, 6052759]);
  const b = run('2022-04-01', 15, d, {rateOf: () => 7.5});
  assert.deepStrictEqual([b.totDep, b.totInt, b.maturity], [2250000, 4249748, 6499748]);
});

check('XIRR matches an independent solver', () => {
  const r = run('2026-04-01', 15, [['2026-04-01', 100000]]);
  const x = xirr([{date: r.ok[0].date, amount: -100000}, {date: r.mat, amount: r.maturity}]);
  assert.ok(Math.abs(x - 0.08194469) < 1e-7, String(x));
});

console.log(`\n${n} checks passed`);
