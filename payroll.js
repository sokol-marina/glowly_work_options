/* 2026 payroll estimate. Sources and assumptions are linked in the page.
 * Federal: Publication 15-T, Worksheet 1A and annual tables, page 12.
 * NY/NYC: NYS-50-T-NYS/NYC (1/26), Method II biweekly tables.
 * Table rows are [lower bound, marginal rate, base withholding]. */
(function (root) {
  'use strict';
  const federal = {
    single: [[0,0,0],[7500,.10,0],[19900,.12,1240],[57900,.22,5800],[113200,.24,17966],[209275,.32,41024],[263725,.35,58448],[648100,.37,192979.25]],
    married: [[0,0,0],[19300,.10,0],[44100,.12,2480],[120100,.22,11600],[230700,.24,35932],[422850,.32,82048],[531750,.35,116896],[788000,.37,206583.50]],
    head: [[0,0,0],[15550,.10,0],[33250,.12,1770],[83000,.22,7740],[121250,.24,16155],[217300,.32,39207],[271750,.35,56631],[656150,.37,191171]]
  };
  const multiple = {
    single: [[0,0,0],[8050,.10,0],[14250,.12,620],[33250,.22,2900],[60900,.24,8983],[108938,.32,20512],[136163,.35,29224],[328350,.37,96489.63]],
    married: [[0,0,0],[16100,.10,0],[28500,.12,1240],[66500,.22,5800],[121800,.24,17966],[217875,.32,41024],[272325,.35,58448],[400450,.37,103291.75]],
    head: [[0,0,0],[12075,.10,0],[20925,.12,885],[45800,.22,3870],[64925,.24,8077.50],[112950,.32,19603.50],[140175,.35,28315.50],[332375,.37,95585.50]]
  };
  const nySingle = [[0,.039,0],[327,.044,12.77],[450,.0515,18.15],[535,.054,22.54],[3102,.059,161.15],[3723,.0703,197.81],[4140,.0753,227.15],[6063,.064,372.04],[8285,.1144,514.19],[10208,.0735,734.27]];
  const nyMarried = [[0,.039,0],[327,.044,12.77],[450,.0515,18.15],[535,.054,22.54],[3102,.059,161.15],[3723,.0657,197.81],[4140,.0707,225.19],[6063,.0801,361.08],[8137,.064,527.23],[12431,.1349,802.08],[14354,.0735,1061.54],[41444,.0765,3052.65]];
  const nyc = [[0,.0205,0],[308,.028,6.31],[334,.0325,7.08],[577,.0395,14.92],[962,.0415,30.12],[2308,.0425,86]];
  const defaults = { gross:2000, status:'single', city:'richmond', children:0, dependents:0,
    nyAllowances:0, cityAllowances:0, nyHigher:false, multipleJobs:false, retirement:0,
    otherDeductions:0, extraFederal:0, extraNY:0, ytd:0, pflYtd:0, pfl:true, sdi:true,
    suiRate:4.1, futaRate:.6, creditOverride:null };
  const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
  function tableTax(wages, table) {
    const amount = Math.max(0, wages);
    const row = table.findLast(r => amount >= r[0]);
    return row[2] + (amount - row[0]) * row[1];
  }
  function calculate(values) {
    const p = { ...defaults, ...values };
    for (const key of ['gross','children','dependents','nyAllowances','cityAllowances','retirement','otherDeductions','extraFederal','extraNY','ytd','pflYtd','suiRate','futaRate']) {
      if (!Number.isFinite(p[key]) || p[key] < 0) throw new Error('Поля должны содержать неотрицательные числа.');
    }
    for (const key of ['children','dependents','nyAllowances','cityAllowances']) {
      if (!Number.isInteger(p[key]) || p[key] > 99) throw new Error('Количество должно быть целым числом от 0 до 99.');
    }
    if (!['single','married','separate','head'].includes(p.status) || !['richmond','brooklyn','manhattan','queens','bronx','yonkers','other'].includes(p.city)) throw new Error('Выберите статус и место проживания.');
    if (p.retirement > p.gross || p.retirement + p.otherDeductions > p.gross) throw new Error('Личные удержания не могут превышать зарплату до вычетов.');
    if (p.gross > 1000000 || p.ytd > 100000000 || p.suiRate > 20 || p.futaRate > 6 || p.pflYtd > 411.91) throw new Error('Проверьте допустимый диапазон значений.');
    if (p.creditOverride !== null && (!Number.isFinite(p.creditOverride) || p.creditOverride < 0)) throw new Error('Кредит W-4 должен быть неотрицательным числом.');
    const status = p.status === 'separate' ? 'single' : p.status;
    const taxable = p.gross - p.retirement;
    const annual = taxable * 26;
    const creditThreshold = p.status === 'married' ? 400000 : 200000;
    // W-4 simplified Step 3 applies below its income threshold. Above it,
    // require an explicit Step 3 amount instead of guessing household credits.
    const credit = p.creditOverride ?? (annual <= creditThreshold ? p.children * 2200 + p.dependents * 500 : 0);
    const adjusted = annual - (p.multipleJobs ? 0 : status === 'married' ? 12900 : 8600);
    const fed = Math.max(0, tableTax(adjusted, (p.multipleJobs ? multiple : federal)[status]) / 26 - credit / 26);
    const marriedNY = p.status === 'married' && !p.nyHigher;
    const nyWages = Math.max(0, taxable - (marriedNY ? 305.80 : 284.60) - p.nyAllowances * 38.50);
    let state = tableTax(nyWages, marriedNY ? nyMarried : nySingle);
    if (nyWages >= (marriedNY ? 82898 : 41444)) {
      const a = nyWages * 26;
      state = nyWages * (a >= 25000000 ? .117 : a >= 5000000 ? .111 : .1045);
    }
    const isNYC = !['other','yonkers'].includes(p.city);
    const local = isNYC ? tableTax(taxable - (marriedNY ? 211.50 : 192.30) - p.cityAllowances * 38.50, nyc) : p.city === 'yonkers' ? state * .1675 : 0;
    const capped = cap => Math.min(p.gross, Math.max(0, cap - p.ytd));
    const ss = money(capped(184500) * .062);
    const medicare = money(p.gross * .0145);
    const additional = money((Math.max(0, p.ytd + p.gross - 200000) - Math.max(0, p.ytd - 200000)) * .009);
    const rows = [
      {id:'federal', label:'Federal income tax', note:'Федеральный подоходный налог, W-4', employee:money(fed + (p.gross > 0 ? p.extraFederal : 0)), employer:0, tax:true},
      {id:'ss', label:'Social Security', note:'6.2% с каждой стороны; годовая база $184,500', employee:ss, employer:ss, tax:true},
      {id:'medicare', label:'Medicare', note:'1.45% с каждой стороны', employee:medicare, employer:medicare, tax:true},
      {id:'additional', label:'Additional Medicare', note:'0.9% с зарплаты у этого работодателя сверх $200,000 в году', employee:additional, employer:0, tax:true},
      {id:'ny', label:'NY income tax', note:'Подоходный налог штата New York', employee:money(state + (p.gross > 0 ? p.extraNY : 0)), employer:0, tax:true},
      {id:'local', label:isNYC ? 'NYC resident income tax' : p.city === 'yonkers' ? 'Yonkers resident tax' : 'Local income tax', note:isNYC ? 'Включая Richmond County / Staten Island' : p.city === 'yonkers' ? '16.75% от базового удержания NYS' : 'Для выбранного места проживания — $0', employee:money(local), employer:0, tax:true},
      {id:'pfl', label:'NY PFL', note:'Paid Family Leave: 0.432%, до $411.91 в год', employee:p.pfl ? money(Math.min(p.gross * .00432, Math.max(0, 411.91 - p.pflYtd))) : 0, employer:p.pfl ? 0 : null, tax:false},
      {id:'sdi', label:'NY SDI / DBL', note:'Disability: 0.5%, до $1.20 за полные две недели', employee:p.sdi ? money(Math.min(p.gross * .005, 1.20)) : 0, employer:null, tax:false},
      {id:'futa', label:'FUTA', note:`${p.futaRate}% на первые $7,000; 0.6% предполагает полный кредит`, employee:0, employer:money(capped(7000) * p.futaRate / 100), tax:true},
      {id:'sui', label:'NY unemployment + RSF', note:`${p.suiRate}% на первые $13,000; ставка работодателя`, employee:0, employer:money(capped(13000) * p.suiRate / 100), tax:true},
      {id:'retirement', label:'Traditional 401(k)', note:'Уменьшает базу income tax, но не Social Security / Medicare', employee:money(p.retirement), employer:0, tax:false},
      {id:'other', label:'Прочие удержания после налогов', note:'Например, Roth 401(k) или другие личные удержания', employee:money(p.otherDeductions), employer:0, tax:false}
    ];
    const sum = list => money(list.reduce((s,r) => s + r.employee, 0));
    const taxes = sum(rows.filter(r => r.tax));
    const deductions = sum(rows);
    const employer = money(rows.reduce((s,r) => s + (r.employer || 0), 0));
    return {rows, taxes, deductions, employer, net:money(p.gross - deductions), cost:money(p.gross + employer), gross:money(p.gross), annualGross:money(p.gross * 26), credit, creditNeedsReview:p.creditOverride === null && annual > creditThreshold && (p.children + p.dependents > 0)};
  }
  const api = {calculate, defaults};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GlowlyPayroll = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
