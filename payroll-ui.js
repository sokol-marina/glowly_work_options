(function () {
  'use strict';
  const container = document.getElementById('paycheck-calculator');
  const number = (name, title, value, help = '', attrs = '') => `<label class="field" for="pay-${name}">${title}<input id="pay-${name}" name="${name}" type="number" min="0" step="0.01" value="${value}" ${attrs} ${help ? `aria-describedby="help-${name}"` : ''}>${help ? `<small id="help-${name}">${help}</small>` : ''}</label>`;
  container.innerHTML = `
    <span class="eyebrow">GLOWLY · W-2 · 2026</span>
    <h2>Сколько останется на руках?</h2>
    <p class="note estimate-notice"><strong>ПРИМЕРНЫЙ РАСЧЁТ</strong>Суммы приведены для ориентира. Фактические налоги, удержания и выплата на руки могут отличаться в зависимости от ваших налоговых форм и условий payroll.</p>
    <p class="muted">Введите зарплату до удержаний и данные для оценки одного пейчека за две недели.</p>
    <form id="payroll-form">
      <div class="field-grid">
        ${number('gross','Зарплата за две недели, $ (gross)',2200,'26 выплат в год. Вся сумма выплачивается через payroll; чаевые, уже полученные наличными, не включайте.','required max="1000000"')}
        <label class="field" for="pay-status">Семейный / налоговый статус<select id="pay-status" name="status"><option value="single">Single — не в браке</option><option value="married">Married filing jointly — совместная декларация</option><option value="separate">Married filing separately — раздельная декларация</option><option value="head">Head of household — глава домохозяйства</option></select><small>Выберите статус из W-4; head of household требует соответствия условиям IRS.</small></label>
        <label class="field" for="pay-city">Место проживания<select id="pay-city" name="city"><option value="richmond">Staten Island / Richmond County, NYC</option><option value="brooklyn">Brooklyn / Kings County, NYC</option><option value="manhattan">Manhattan / New York County, NYC</option><option value="queens">Queens, NYC</option><option value="bronx">Bronx, NYC</option><option value="yonkers">Yonkers, NY</option><option value="other">Другой город штата NY (вне NYC / Yonkers)</option></select><small>Расчёт для жителей NY, работающих в NYC, в том числе Staten Island.</small></label>
        ${number('children','Дети до 17 лет, имеющие SSN',0,'$2,200 на ребёнка в Step 3, если выполнены условия IRS.','required max="99" data-integer')}
        ${number('dependents','Другие иждивенцы (dependents)',0,'$500 на иждивенца. Детей из предыдущего поля повторно не считайте.','required max="99" data-integer')}
      </div>
      <div class="actions"><button type="submit">Рассчитать пейчек</button><button type="reset" class="secondary">Сбросить</button><button type="button" class="secondary" id="print-payroll">Печать расчёта</button></div>
    </form>
    <p id="payroll-error" class="error" role="alert" hidden></p>
    <div id="payroll-results" hidden>
      <div class="summary-grid" aria-live="polite" aria-atomic="true">
        <div class="stat"><small>Начислено за две недели</small><strong id="result-gross"></strong><small>Gross pay</small></div>
        <div class="stat"><small>Примерные удержания сотрудника</small><strong id="result-deductions"></strong><small>Налоги + PFL / SDI</small></div>
        <div class="stat net"><small>Примерно на руки за две недели</small><strong id="result-net"></strong><small>Estimated take-home pay</small></div>
      </div>
      <p id="payroll-context" class="muted"></p>
      <p id="credit-warning" class="note" hidden>Доход превышает порог упрощённого W-4 Step 3. Автоматический кредит на иждивенцев не применён. Для индивидуального расчёта с учётом кредитов потребуется сумма Step 3 из вашей W-4.</p>
      <p id="net-warning" class="note" hidden>Удержания превышают начисленную зарплату. Отрицательное значение показывает недостающую сумму; проверьте дополнительные удержания.</p>
      <details class="payroll-breakdown">
      <summary>Примерная детализация пейчека</summary>
      <div class="table-scroll"><table>
        <caption>Все суммы — за один двухнедельный период, USD. Налоги работодателя оплачиваются сверх зарплаты.</caption>
        <thead><tr><th scope="col">Налог / удержание</th><th scope="col">Сотрудник</th><th scope="col">Работодатель</th></tr></thead>
        <tbody id="payroll-rows"></tbody>
        <tfoot><tr><th scope="row">Итого налоги</th><td id="total-taxes"></td><td id="total-employer"></td></tr>
        <tr><th scope="row">Все удержания из пейчека<small>Включая PFL и SDI</small></th><td id="total-deductions"></td><td>—</td></tr></tfoot>
      </table></div>
      </details>
    </div>
    <details class="sources">
      <summary>Как считается оценка · ставки и источники 2026</summary>
      <p>Это оценка удержаний из W-2 зарплаты, а не итогового налога по годовой декларации. Доход для income tax пересчитывается на 26 выплат. Зарплата с начала года до этого пейчека принимается равной $0: расчёт выполняется как для первой выплаты года. Результат не следует умножать на 26 для годовой суммы удержаний.</p>
      <p>Предполагаются полные две недели с равномерной оплатой, проживание в NY и работа только в NYC. Для Federal используется W-4 образца 2020 года или позднее: одна работа, Step 2(c) не отмечен, Step 4(a), 4(b) и 4(c) = 0. NYS / NYC allowances, дополнительные удержания и личные взносы принимаются равными 0. Для NYS / NYC используется biweekly Method II; head of household и married filing separately используют таблицу Single. Кредиты по W-4 предполагают соответствие требованиям IRS и доход семьи в пределах порога. Другие доходы семьи, pre-tax health benefits, наличные чаевые, overtime deductions, освобождения и специальные налоговые режимы не моделируются.</p>
      <p>Социальные взносы рассчитываются с gross pay; предшествующая зарплата для Social Security, Medicare, FUTA и NY UI равна $0. NY PFL и SDI удерживаются из зарплаты; ранее удержанные взносы NY PFL принимаются равными $0. NY SDI рассчитан для одинаковой оплаты в обе недели. PFL и SDI показаны как страховые удержания отдельно от суммы налогов.</p>
      <p>Для налогов работодателя используются ставки по умолчанию: NY unemployment + RSF — 4.1%, FUTA — 0.6% при полном федеральном кредите. Фактические ставки работодателя могут отличаться.</p>
      <p>Источники: <a href="https://www.irs.gov/publications/p15t">IRS Publication 15-T</a>, <a href="https://www.irs.gov/pub/irs-pdf/fw4.pdf">Form W-4</a>, <a href="https://www.irs.gov/publications/p15">IRS Publication 15 (FICA / FUTA)</a>, <a href="https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nys.pdf">NYS withholding</a>, <a href="https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nyc.pdf">NYC withholding</a>, <a href="https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_y.pdf">Yonkers withholding</a>, <a href="https://paidfamilyleave.ny.gov/2026">NY PFL 2026</a>, <a href="https://www.wcb.ny.gov/content/main/DisabilityBenefits/employee-disability-benefits.jsp">NY Disability</a>, <a href="https://dol.ny.gov/unemployment-insurance-rate-information">NY unemployment rates</a>, <a href="https://dol.ny.gov/glossary-unemployment-terms-employers">NY UI wage base</a>. Ставки проверены 22 сентября 2026 года.</p>
      <p>Данные рассчитываются только в этом браузере, не отправляются на сервер и не сохраняются после перезагрузки страницы.</p>
    </details>`;

  const form = document.getElementById('payroll-form');
  form.querySelectorAll('[data-integer]').forEach(input => input.step = '1');
  const results = document.getElementById('payroll-results');
  const error = document.getElementById('payroll-error');
  const dollars = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'});
  const set = (id,value) => { document.getElementById(id).textContent = dollars.format(value); };
  function update(report = false) {
    error.hidden = true;
    if (!form.checkValidity()) {
      results.hidden = true;
      error.textContent = 'Проверьте поля: обязательные значения, допустимый диапазон и целое количество иждивенцев.';
      error.hidden = false;
      if (report) { const invalid = form.querySelector(':invalid'); if (invalid) { const details = invalid.closest('details'); if (details) details.open = true; invalid.reportValidity(); } }
      return false;
    }
    const data = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      data[el.name] = el.type === 'number' ? Number(el.value) : el.value;
    }
    try {
      const r = GlowlyPayroll.calculate({ ...data, ytd: 0 });
      for (const [id,value] of Object.entries({'result-gross':r.gross,'result-deductions':r.deductions,'result-net':r.net,'total-taxes':r.taxes,'total-employer':r.employer,'total-deductions':r.deductions})) set(id,value);
      const additionalMedicare = r.rows.find(row => row.id === 'additional').employee;
      const displayRows = r.rows
        .filter(row => !['retirement', 'other', 'additional'].includes(row.id))
        .map(row => row.id === 'medicare' && additionalMedicare > 0 ? {
          ...row,
          employee: Math.round((row.employee + additionalMedicare) * 100) / 100,
          note: `${row.note}; включает доплату сотрудника 0.9% с зарплаты сверх $200,000 в году`
        } : row);
      document.getElementById('payroll-rows').replaceChildren(...displayRows.map(row => {
        const tr = document.createElement('tr');
        tr.dataset.tax = row.id;
        const th = document.createElement('th'); th.scope = 'row'; th.textContent = row.label;
        const small = document.createElement('small'); small.textContent = row.note; th.append(small); tr.append(th);
        for (const value of [row.employee,row.employer]) { const td = document.createElement('td'); td.textContent = value === null ? 'По полису' : dollars.format(value); tr.append(td); }
        return tr;
      }));
      document.getElementById('payroll-context').textContent = `2026 · ${form.elements.city.selectedOptions[0].text} · ${form.elements.status.selectedOptions[0].text}. Годовой gross при такой оплате: ${dollars.format(r.annualGross)}. Учтённый W-4 Step 3: ${dollars.format(r.credit)} в год.`;
      document.getElementById('credit-warning').hidden = !r.creditNeedsReview;
      document.getElementById('net-warning').hidden = r.net >= 0;
      results.hidden = false;
      return true;
    } catch (e) {
      results.hidden = true;
      error.textContent = e.message;
      error.hidden = false;
      return false;
    }
  }
  form.noValidate = true;
  form.addEventListener('submit',event => { event.preventDefault(); update(true); });
  form.addEventListener('input',() => update());
  form.addEventListener('change',() => update());
  form.addEventListener('reset',() => setTimeout(() => update(),0));
  document.getElementById('print-payroll').addEventListener('click',() => {
    if (!update(true)) return;
    document.body.classList.add('print-payroll');
    window.print();
  });
  window.addEventListener('afterprint',() => document.body.classList.remove('print-payroll'));
  update();
})();
