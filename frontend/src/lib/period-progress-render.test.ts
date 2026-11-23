import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PeriodProcessProgress } from '../components/shared/design-system/domain/period-process-progress';

test('complete draft is ongoing at 100 percent, with accessible counts', () => {
 const html=renderToStaticMarkup(createElement(PeriodProcessProgress,{label:'Evaluasi',unit:'poin',progress:{status:'ongoing',completed:20,total:20}}));
 assert.match(html,/Ongoing/); assert.doesNotMatch(html,/>Done</); assert.match(html,/aria-valuenow="100"/); assert.match(html,/20\/20 poin/);
});
test('pending unknown count never renders a fake percent', () => {
 const html=renderToStaticMarkup(createElement(PeriodProcessProgress,{label:'Pemantauan',progress:{status:'pending',completed:0,total:0}}));
 assert.match(html,/Pending/); assert.doesNotMatch(html,/NaN|Infinity|progressbar|0%/);
});

import { ProfileDocumentPeriodCell, RiskMonitoringPeriodCell } from '../components/upr/profile-period-cells';
import type { ProfilePeriodProgress } from './api/profile-periods';
const period: ProfilePeriodProgress = {
 id:'p1',label:'Semester I',ordinal:1,opensOn:'1900-01-01',closesOn:'9999-12-31',
 workingPaper:{status:'ongoing',completed:2,total:4,id:'kk1'},
 evaluation:{status:'ongoing',completed:16,total:20,id:'e1'},
 monitorings:[{groupId:'g1',status:'done',completed:2,total:2,id:'m1'}],
};
test('profile period separates documents and links to exact records without monitoring form bars',()=>{
 const html=renderToStaticMarkup(createElement(ProfileDocumentPeriodCell,{period,profileId:'v1'}));
 assert.match(html,/Kertas kerja/);assert.match(html,/Evaluasi/);assert.doesNotMatch(html,/>Pemantauan</);
 assert.match(html,/href="\/risk\/working-papers\/kk1"/);assert.match(html,/href="\/evaluations\/e1"/);
 assert.match(html,/Lanjutkan kertas kerja/);assert.match(html,/Lanjutkan evaluasi/);
 assert.doesNotMatch(html,/progressbar|penandatangan|16\/20|Hingga|Ditutup|Dibuka|min-w-48/);
});
test('risk period only displays its own monitoring, never other risk progress or document progress',()=>{
 const html=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period,groupId:'g1',profileFinalized:true}));
 assert.match(html,/Lihat pemantauan/);assert.match(html,/href="\/risk\/monitoring\/m1"/);
 assert.doesNotMatch(html,/Kertas kerja|Evaluasi/);
 const other=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period,groupId:'g2',profileFinalized:true}));
 assert.match(other,/Pending/);assert.doesNotMatch(other,/m1|Done/);
});
test('draft-only profiles cannot offer document creation even while window is open',()=>{
 const pending={status:'pending' as const,completed:0,total:0};
 const html=renderToStaticMarkup(createElement(ProfileDocumentPeriodCell,{period:{...period,workingPaper:pending,evaluation:pending},profileId:'draft',canCreate:false}));
 assert.doesNotMatch(html,/href=/);assert.match(html,/Pending/);
});

import { MonitoringDateField } from '../components/shared/design-system/domain/monitoring-date-field';
test('date help does not promise repeated observations in configured periods',()=>{
 const html=renderToStaticMarkup(createElement(MonitoringDateField,{id:'date',value:'2026-11-14',onChange:()=>{}}));
 assert.doesNotMatch(html,/beberapa kali/);
 assert.match(html,/aturan profil/);
});

test('risk monitoring cells show the window and action without progress counts', () => {
 const html=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period,groupId:'g1',profileFinalized:true}));
 assert.match(html,/Done/);
 assert.match(html,/Terbuka/);
 assert.doesNotMatch(html,/progressbar|100%|2\/2|Hingga/);
 const draft={...period,monitorings:[{groupId:'g1',status:'ongoing' as const,completed:1,total:2,id:'draft1'}]};
 const ongoing=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period:draft,groupId:'g1',profileFinalized:false}));
 assert.match(ongoing,/Ongoing/); assert.match(ongoing,/Lanjutkan pemantauan/);
 const start=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period,groupId:'g2',profileFinalized:true,onStart:()=>{},disabled:true}));
 assert.match(start,/Mulai pemantauan/); assert.match(start,/disabled/);
 const closed=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period:{...period,closesOn:'1900-12-31'},groupId:'g2',profileFinalized:true,onStart:()=>{}}));
 assert.match(closed,/Ditutup/); assert.match(closed,/Mulai pemantauan/); assert.match(closed,/disabled/);
 const unstarted=renderToStaticMarkup(createElement(RiskMonitoringPeriodCell,{period,groupId:'g2',profileFinalized:false}));
 assert.equal(unstarted,'');
});
