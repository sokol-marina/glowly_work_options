'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {calculate} = require('./payroll.js');
const row = (result,id) => result.rows.find(r => r.id === id);

test('reference biweekly paycheck: $2,000, single, Staten Island, first payment',() => {
  const r = calculate({});
  // IRS Worksheet 1A: (52,000 - 8,600 - 19,900) * 12% + 1,240.
  assert.equal(row(r,'federal').employee,156.15);
  // NY Method II: (2,000 - 284.60 - 535) * 5.4% + 22.54.
  assert.equal(row(r,'ny').employee,86.28);
  // NYC Method II: (2,000 - 192.30 - 962) * 4.15% + 30.12.
  assert.equal(row(r,'local').employee,65.22);
  assert.equal(r.taxes,460.65);
  assert.equal(r.deductions,470.49);
  assert.equal(r.net,1529.51);
  assert.equal(r.employer,247);
  assert.equal(r.cost,2247);
});
test('dependent credits reduce only federal withholding, never below zero',() => {
  const r = calculate({children:1,dependents:1});
  assert.equal(row(r,'federal').employee,52.31);
  assert.equal(row(r,'ny').employee,86.28);
  assert.equal(row(calculate({children:10}),'federal').employee,0);
  assert.equal(row(calculate({children:2,creditOverride:0}),'federal').employee,156.15);
});
test('all filing statuses and the W-4 Step 2 checkbox',() => {
  assert.equal(row(calculate({status:'married'}),'federal').employee,76.15);
  assert.equal(row(calculate({status:'separate'}),'federal').employee,156.15);
  assert.equal(row(calculate({status:'head'}),'federal').employee,114.92);
  assert.equal(row(calculate({status:'married',multipleJobs:true}),'federal').employee,156.15);
  assert.equal(row(calculate({multipleJobs:true}),'federal').employee,270.19);
});
test('locality is based on residence',() => {
  for (const city of ['richmond','brooklyn','manhattan','queens','bronx']) assert.equal(row(calculate({city}),'local').employee,65.22);
  assert.equal(row(calculate({city:'other'}),'local').employee,0);
  assert.equal(row(calculate({city:'yonkers'}),'local').employee,14.45);
});
test('Social Security stops exactly at the annual wage base; Medicare continues',() => {
  const crossing = calculate({ytd:184000});
  assert.equal(row(crossing,'ss').employee,31);
  assert.equal(row(crossing,'ss').employer,31);
  const capped = calculate({ytd:184500});
  assert.equal(row(capped,'ss').employee,0);
  assert.equal(row(capped,'medicare').employee,29);
});
test('Additional Medicare starts at $200,000 regardless of filing status',() => {
  for (const status of ['single','married','head']) {
    const r = calculate({status,ytd:199000});
    assert.equal(row(r,'additional').employee,9);
    assert.equal(row(r,'additional').employer,0);
  }
});
test('PFL and unemployment wage caps handle partial and exhausted balances',() => {
  assert.equal(row(calculate({pflYtd:410}),'pfl').employee,1.91);
  assert.equal(row(calculate({pflYtd:411.91}),'pfl').employee,0);
  assert.equal(row(calculate({ytd:6500}),'futa').employer,3);
  assert.equal(row(calculate({ytd:12500}),'sui').employer,20.50);
  assert.equal(row(calculate({ytd:13000}),'sui').employer,0);
  assert.equal(row(calculate({sdi:false,pfl:false}),'sdi').employee,0);
  assert.equal(row(calculate({gross:100}),'sdi').employee,.50);
});
test('401(k) reduces income tax but not FICA; employer costs never reduce net pay',() => {
  const r = calculate({retirement:100,otherDeductions:20});
  assert.equal(row(r,'ss').employee,124);
  assert.equal(row(r,'federal').employee,144.15);
  assert.equal(calculate({suiRate:9.5,futaRate:6}).net,calculate({}).net);
  assert.equal(Math.round((r.net + r.deductions)*100),200000);
});
test('zero pay stays zero, even with extra withholding configured',() => {
  const r = calculate({gross:0,extraFederal:100,extraNY:100,ytd:300000});
  assert.equal(r.net,0); assert.equal(r.deductions,0); assert.equal(r.employer,0);
});
test('high-income NY Method III and explicit W-4 credit handling',() => {
  const r = calculate({gross:50000,children:1});
  assert.equal(row(r,'ny').employee,5195.26);
  assert.equal(r.credit,0); assert.equal(r.creditNeedsReview,true);
  assert.equal(calculate({gross:50000,creditOverride:500}).credit,500);
});
test('invalid inputs reject instead of producing plausible totals',() => {
  for (const input of [{gross:-1},{gross:NaN},{gross:Infinity},{children:.5},{children:100},{retirement:2001},{otherDeductions:3000},{pflYtd:500},{futaRate:7},{city:'unknown'},{status:'unknown'}]) assert.throws(() => calculate(input));
});
test('cent-rounded totals reconcile across varied salaries and locations',() => {
  for (const gross of [0,1,100,1000,2000,5000,20000,100000]) for (const city of ['richmond','other','yonkers']) {
    const r = calculate({gross,city});
    assert.equal(Math.round(r.deductions*100),r.rows.reduce((s,r) => s+Math.round(r.employee*100),0));
    assert.equal(Math.round((r.net+r.deductions)*100),gross*100);
    assert.ok(r.rows.every(r => Number.isFinite(r.employee) && r.employee >= 0));
  }
});
