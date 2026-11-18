// 判定・計算の機械テスト（境界値）。node test_tbt.js
const T = require('./tebanasu-tools/assets/tbt.js');
let n = 0, ng = 0;
function eq(a, b, msg) { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { ng++; console.log('NG', msg, 'got', a, 'want', b); } }
// 負担金（施行令5条・千円未満切り捨て）
eq(T.futan('sonota', 999), 200000, 'その他は20万円');
eq(T.futan('takuchi', 50), Math.floor((50*4070+208000)/1000)*1000, '宅地50');
eq(T.futan('takuchi', 50), 411000, '宅地50＝41万1,000円');
eq(T.futan('takuchi', 50.01), Math.floor((50.01*2720+276000)/1000)*1000, '宅地50超');
eq(T.futan('takuchi', 100), 548000, '宅地100＝100*2720+276000=548,000');
eq(T.futan('takuchi', 200), 793000, '宅地200＝200*2450+303000');
eq(T.futan('takuchi', 801), Math.floor((801*2010+479000)/1000)*1000, '宅地800超');
eq(T.futan('nouchi', 250), 510000, '農地250＝250*1210+208000=510,500→510,000');
eq(T.futan('nouchi', 4001), Math.floor((4001*640+608000)/1000)*1000, '農地4000超');
eq(T.futan('shinrin', 750), 254000, '森林750＝750*59+210000=254,250→254,000');
eq(T.futan('shinrin', 12000), 383000, '森林12000＝12000*8+287000');
eq(T.futan('shinrin', 12001), Math.floor((12001*6+311000)/1000)*1000, '森林12000超');
eq(T.futan('takuchi', 0), null, '面積0');
// 期限（民法140・143条）
const k = s => T.ymd(T.kigen(s));
eq(k('2026-11-18'), '2027-02-18', '11/18→2/18');
eq(k('2026-11-30'), '2027-02-28', '11/30→2/28（応当日なし）');
eq(k('2027-11-29'), '2028-02-29', 'うるう年 11/29→2/29');
eq(k('2026-10-31'), '2027-01-31', '10/31→1/31');
eq(k('2026-01-31'), '2026-04-30', '1/31→4/30');
eq(k('2026-12-31'), '2027-03-31', '12/31→3/31');
eq(k('2026-12-30'), '2027-03-30', '12/30→3/30');
eq(T.kigen('2026-02-30'), null, '存在しない日');
eq(T.kyujitsu(new Date(2027,0,2)), true, '1/2休日'); eq(T.kyujitsu(new Date(2026,11,28)), false, '12/28平日(月)');
// 空き家特例
const base = {souzoku:'2025-05-10', uru:'2027-06-01', kenchiku:'mae', kubun:'no', kyoju:'hitori', shiyou:'no', kakaku:'ika', kaoku:'torikowashi', kaite:'tanin', ninzu:'2', zumi:'no'};
let r = T.akiya(base); eq(r.ng.length, 0, '全部満たす'); eq(r.gendo, 3000, '3000万');
eq(T.akiya({...base, ninzu:'3'}).gendo, 2000, '3人以上2000万');
eq(T.akiya({...base, uru:'2028-01-01', souzoku:'2025-05-10'}).ng.length >= 1, true, '2027年末超え（3年要件内でも期限切れ）');
eq(T.akiya({...base, souzoku:'2022-03-01', uru:'2025-12-31'}).ng.length, 0, '3年経過年の12/31当日OK');
eq(T.akiya({...base, souzoku:'2022-03-01', uru:'2026-01-01'}).ng.length, 1, '翌年1/1はNG');
eq(T.akiya({...base, kenchiku:'ato'}).ng.length, 1, '昭和56年6月以降NG');
eq(T.akiya({...base, kaite:'shinzoku'}).ng.length, 1, '親族NG');
eq(T.akiya({...base, kaoku:'baishu', uru:'2023-12-31', souzoku:'2022-01-10'}).ng.length, 1, '令和5年以前は買主改修NG');
eq(T.akiya({...base, uru:'2025-01-01', souzoku:'2025-05-10'}).error !== undefined, true, '売る日が相続前');
// 国庫帰属
eq(T.kokko({who:'souzoku', share:'tandoku', kyakka:[], fushounin:[]}).level, 'ok', '問題なし');
eq(T.kokko({who:'kau', share:'tandoku', kyakka:[], fushounin:[]}).level, 'ng', '売買取得');
eq(T.kokko({who:'souzoku', share:'ng', kyakka:[], fushounin:[]}).level, 'ng', '共有不同意');
eq(T.kokko({who:'souzoku', share:'all', kyakka:['tatemono'], fushounin:[]}).level, 'ng', '建物');
eq(T.kokko({who:'souzoku', share:'tandoku', kyakka:[], fushounin:['gake']}).level, 'risk', '崖');
eq(T.kokko({who:'souzoku', share:'tandoku', kyakka:['kyoukai'], fushounin:['gake']}).level, 'ng', '却下が優先');
// 保存義務
eq(T.hozon({sumi:'yes', kan:'na', ato:'iru'}).level, 'high', '同居');
eq(T.hozon({sumi:'no', kan:'nashi', ato:'iru'}).level, 'low', '遠方');
eq(T.hozon({sumi:'no', kan:'kagi', ato:'zenin'}).level, 'mid', '鍵');
// 手放し方診断
let h = T.houhou({kind:'mansion', get:'souzoku', ki:'no', sell:'nooffer', pay:'yes', kyouyuu:'tandoku'}).list.map(x=>x.key);
eq(h.includes('kokko'), false, 'マンションに国庫帰属を出さない'); eq(h.includes('mansion'), true, 'マンション注意');
h = T.houhou({kind:'ie', get:'souzoku', ki:'yes', sell:'notyet', pay:'no', kyouyuu:'tandoku'}).list.map(x=>x.key);
eq(h[0], 'houki', '3か月以内は相続放棄が先頭'); eq(h.includes('kokko'), true, '家→国庫帰属（解体前提）'); eq(h.includes('hikitori'), false, '払えない・未相談なら有料引取を出さない');
h = T.houhou({kind:'nouchi', get:'kau', ki:'na', sell:'nooffer', pay:'yes', kyouyuu:'tandoku'}).list.map(x=>x.key);
eq(h.includes('kokko_ng'), true, '買った土地は国庫帰属不可'); eq(h.includes('nouchi'), true, '農地の窓口');
eq(T.houhou({kind:'ie'}).error !== undefined, true, '未回答');
console.log('tests', n, 'NG', ng);
