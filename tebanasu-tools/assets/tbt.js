/* 不動産の手放し方ツール：判定と計算はすべてこのファイル（入力値はどこにも送らない）。
 * 判定関数（TBT.*）は画面から独立させ、node のテストから直接呼べるようにしている。 */
(function (root) {
  'use strict';

  var TBT = {};

  /* ---------- 3. 負担金（施行令5条） ---------- */
  var FUTAN = {
    takuchi: [[50, 4070, 208000], [100, 2720, 276000], [200, 2450, 303000], [400, 2250, 343000], [800, 2110, 399000], [Infinity, 2010, 479000]],
    nouchi: [[250, 1210, 208000], [500, 850, 298000], [1000, 810, 318000], [2000, 740, 388000], [4000, 650, 568000], [Infinity, 640, 608000]],
    shinrin: [[750, 59, 210000], [1500, 24, 237000], [3000, 17, 248000], [6000, 12, 263000], [12000, 8, 287000], [Infinity, 6, 311000]]
  };
  TBT.SHINSA = 14000; // 施行令3条：一筆ごとに1万4,000円
  TBT.futan = function (shu, men) {
    if (shu === 'sonota') return 200000; // 施行令5条1項4号
    var t = FUTAN[shu];
    if (!t || !(men > 0)) return null;
    for (var i = 0; i < t.length; i++) {
      if (men <= t[i][0]) {
        return Math.floor((men * t[i][1] + t[i][2]) / 1000) * 1000; // 5条2項：千円未満切り捨て
      }
    }
    return null;
  };

  /* ---------- 4. 相続放棄の期限（民法140条・143条） ---------- */
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getMonth() === +m[2] - 1) ? d : null;
  }
  TBT.parse = parse;
  TBT.ymd = ymd;
  /** 知った日 → 期間の満了日（初日不算入・3か月・応当日の前日、応当日が無ければ月末） */
  TBT.kigen = function (shittaStr) {
    var k = parse(shittaStr);
    if (!k) return null;
    var start = new Date(k.getFullYear(), k.getMonth(), k.getDate() + 1); // 初日は数えない（140条）
    var tm = start.getMonth() + 3, ty = start.getFullYear() + Math.floor(tm / 12);
    tm = tm % 12;
    var last = new Date(ty, tm + 1, 0).getDate();
    var end;
    if (start.getDate() <= last) {
      end = new Date(ty, tm, start.getDate() - 1); // 応当日の前日（143条2項）
    } else {
      end = new Date(ty, tm, last); // 応当日が無い → その月の末日（143条2項ただし書）
    }
    return end;
  };
  /** 民事訴訟法95条3項の休日（土日・12/29〜1/3。祝日は判定しない） */
  TBT.kyujitsu = function (d) {
    var w = d.getDay(), m = d.getMonth() + 1, day = d.getDate();
    return w === 0 || w === 6 || (m === 12 && day >= 29) || (m === 1 && day <= 3);
  };

  /* ---------- 6. 空き家の3,000万円特例 ---------- */
  TBT.akiya = function (v) {
    var ng = [], ok = [];
    var s = parse(v.souzoku), u = parse(v.uru);
    if (!s || !u) return { error: '相続の開始日と売る予定日を入れてください。' };
    if (u < s) return { error: '売る予定日が相続の開始日より前になっています。' };
    var lim3 = new Date(s.getFullYear() + 3, 11, 31);
    var limLaw = new Date(2027, 11, 31);
    var start = new Date(2016, 3, 1);
    var jp = function (d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; };
    var lim = lim3 < limLaw ? lim3 : limLaw;
    if (u > lim3) ng.push('相続の開始があった日から3年を経過する日の属する年の12月31日（' + jp(lim3) + '）までに売る必要があります。');
    if (u > limLaw) ng.push('特例の対象は令和9年（2027年）12月31日までの譲渡です。');
    if (u <= lim) ok.push('売る時期は期限内です。この相続での売却の期限は' + jp(lim) + 'です（相続から3年を経過する日の属する年の12月31日と、特例の期限の令和9年12月31日の早いほう）。');
    if (u < start) ng.push('特例の対象は平成28年4月1日以後の譲渡です。');
    if (v.kenchiku === 'ato') ng.push('家屋は昭和56年5月31日以前に建築されたものに限られます。');
    else if (v.kenchiku === 'fumei') ng.push('建築日が分からないと判定できません。登記事項証明書で確かめてください（昭和56年5月31日以前が条件）。');
    if (v.kubun === 'yes') ng.push('区分所有建物の登記がされた建物（マンションなど）は対象外です。');
    if (v.kyoju === 'doukyo') ng.push('相続開始の直前に、亡くなった人以外に住んでいた人がいないことが条件です。');
    if (v.kyoju === 'home') ok.push('老人ホーム等に入所していた場合は、入所の直前まで住んでいたこと、要介護認定などを受けていたこと、入所後も家を物品の保管などに使い、貸付けや他人の居住に使っていないことが条件です。');
    if (v.shiyou === 'yes') ng.push('相続から売るまで（取り壊す場合は取り壊すまで）、事業・貸付け・居住に使っていないことが条件です。');
    if (v.kakaku === 'koeru') ng.push('売却代金が1億円以下であることが条件です（分けて売った分や、ほかの相続人が売った分も含めて判定）。');
    if (v.kaoku === 'sonomama') ng.push('家付きで売るなら、譲渡の時に耐震基準を満たしているか、売った年の翌年2月15日までに耐震改修か取り壊しをする必要があります。');
    if (v.kaoku === 'baishu') {
      if (u < new Date(2024, 0, 1)) ng.push('売った後に買主が耐震改修や取り壊しをする形は、令和6年1月1日以後の譲渡から対象です。');
      else ok.push('買主が売った年の翌年2月15日までに耐震改修か取り壊しをする必要があります。売買契約で取り決め、買主の協力を得てください。');
    }
    if (v.kaite === 'shinzoku') ng.push('親子・夫婦・生計を一にする親族・同族会社など、特別の関係がある人への売却は対象外です。');
    if (v.zumi === 'yes') ng.push('同じ亡くなった人から相続した家や敷地で、すでにこの特例を受けていると使えません。');
    var need = ['kenchiku', 'kubun', 'kyoju', 'shiyou', 'kakaku', 'kaoku', 'kaite', 'ninzu', 'zumi'];
    for (var i = 0; i < need.length; i++) if (!v[need[i]]) return { error: 'すべての質問に答えてください。' };
    var gendo = (v.ninzu === '3' && u >= new Date(2024, 0, 1)) ? 2000 : 3000;
    return { ng: ng, ok: ok, gendo: gendo, lim3: lim3 };
  };

  /* ---------- 2. 国庫帰属 ---------- */
  TBT.kokko = function (v) {
    var out = { level: 'ok', reasons: [], fix: [] };
    if (!v.who || !v.share) return { error: '取得の経緯と名義を選んでください。' };
    if (v.who !== 'souzoku') {
      out.level = 'ng';
      out.reasons.push(v.who === 'kau'
        ? '売買など相続等以外の原因で自ら取得した土地は、基本的にこの制度を使えません。'
        : '法定相続人以外の人が遺贈で取得した土地は対象外です。');
    }
    if (v.share === 'ng') { out.level = 'ng'; out.reasons.push('共有地は、共有者全員が共同で申請する場合に限り申請できます。1人でも同意しなければ申請できません。'); }
    var K = {
      tatemono: ['建物がある土地は申請できません（却下）。', '建物を解体すれば、この理由は外れます。'],
      tanpo: ['担保権や使用収益を目的とする権利が設定されている土地は申請できません（却下）。', '抵当権の抹消や、権利を外す話し合いが先に必要です。'],
      tsuro: ['通路・墓地内・境内地・水道用地・用悪水路・ため池として使われている土地は申請できません（却下）。', ''],
      osen: ['特定有害物質で汚染されている土地は申請できません（却下）。', ''],
      kyoukai: ['境界が明らかでない土地や、所有権の範囲などに争いがある土地は申請できません（却下）。', '隣地の所有者と境界を確認すると、この理由は外れます。']
    };
    var F = {
      gake: '勾配30度以上かつ高さ5メートル以上の崖があり、管理に過分の費用や労力がかかる土地は承認されません（不承認）。',
      chijou: '管理や処分を妨げる工作物・車両・樹木などが地上にある土地は承認されません（不承認）。令和8年10月31日現在、不承認105件のうち49件がこの理由です。',
      chika: '取り除かないと管理や処分ができない物が地下にある土地は承認されません（不承認）。',
      rinchi: '隣地との争訟によらなければ管理・処分できない土地（通行が妨げられている袋地など）は承認されません（不承認）。',
      sonota: '災害防止の措置が必要な土地、鳥獣・病害虫の被害がある土地、追加の整備が必要な森林、国が金銭債務を負う土地などは承認されません（不承認）。令和8年10月31日現在、不承認105件のうち39件が「追加の整備が必要な森林」です。'
    };
    (v.kyakka || []).forEach(function (k) {
      if (K[k]) { out.level = 'ng'; out.reasons.push(K[k][0]); if (K[k][1]) out.fix.push(K[k][1]); }
    });
    (v.fushounin || []).forEach(function (k) {
      if (F[k]) { if (out.level === 'ok') out.level = 'risk'; out.reasons.push(F[k]); }
    });
    return out;
  };

  /* ---------- 5. 保存義務 ---------- */
  TBT.hozon = function (v) {
    if (!v.sumi || !v.kan || !v.ato) return { error: 'すべての質問に答えてください。' };
    var r = { level: '', text: [] };
    if (v.sumi === 'yes') {
      r.level = 'high';
      r.text.push('法務省は、親と同居していた子が放棄し、放棄の時に建物を現に占有していたと評価されれば保存義務を負う、と例を挙げています。あなたの状況はこの例に近いです。');
    } else if (v.kan === 'nashi') {
      r.level = 'low';
      r.text.push('法務省は、生前から遠方に住んでいて現に占有していたと評価されなければ保存義務を負わない、と例を挙げています。あなたの状況はこの例に近いです。');
    } else {
      r.level = 'mid';
      r.text.push('鍵を持って出入りしている、荷物を置いているといった場面は、法務省の例（同居している子・遠方に住む子）に入っていません。現に占有していたと評価されるかは、条文と国の説明だけでは決まりません。');
    }
    r.text.push('保存義務を負う場合も、中身は「自己の財産と同一の注意」で家を保存することで、相続人か相続財産清算人に引き渡せば終わります（民法940条1項）。条文の上で解体や建て替えを求める言葉は入っていません。');
    if (v.ato === 'zenin') r.text.push('相続人全員が放棄すると、家庭裁判所が選ぶ相続財産清算人に引き渡すまで保存が続く形になります。清算人の選任には申立てが必要で、予納金を求められることがあります。');
    return r;
  };

  /* ---------- 1. 手放し方診断 ---------- */
  TBT.houhou = function (v) {
    var need = ['kind', 'get', 'ki', 'sell', 'pay', 'kyouyuu'];
    for (var i = 0; i < need.length; i++) if (!v[need[i]]) return { error: 'すべての質問に答えてください。' };
    var c = [];
    function add(key, title, why, link) { c.push({ key: key, title: title, why: why, link: link }); }
    var souzoku = v.get === 'souzoku';
    if (souzoku && v.ki === 'yes') add('houki', '相続放棄（3か月以内）', '3か月以内なら、家庭裁判所に申述して相続人でなかったことにできます。ただし預貯金や借金を含む相続全体を放棄することになり、放棄の時に家を現に占有していれば保存義務が残ります。', 'houki');
    if (v.sell === 'notyet') add('baikyaku', 'まず不動産会社に売却・買取の相談', '値段が付くかどうかで、選べる手放し方が変わります。国庫帰属の取下げ1,195件のうち606件は、有効活用の見込みが生じたことによるものです（令和8年10月31日現在）。', v.kind === 'mansion' ? 'mansion' : 'tochi');
    if (v.kind === 'mansion') {
      add('mansion', 'マンションは国庫帰属を使えない', '建物がある土地は国庫帰属の申請ができないため、マンションは対象外です。売却・買取か、費用を払って引き取ってもらう方法が候補です。', 'mansion');
    } else if (souzoku) {
      var why = '相続・遺贈で取得した土地は、要件を満たせば国に引き取ってもらえます。審査手数料は一筆1万4,000円、負担金は原則20万円（区分によっては面積に応じて増える）です。';
      if (v.kind === 'ie') why += '建物がある土地は申請できないため、先に解体が必要です。';
      if (v.kyouyuu === 'kyouyuu') why += '共有地は、共有者全員で申請する必要があります。';
      add('kokko', '相続土地国庫帰属制度', why, 'kokko');
    } else if (v.get === 'kau') {
      add('kokko_ng', '国庫帰属は基本的に使えない', '売買など相続等以外の原因で取得した土地は、基本的にこの制度を使えません。', 'kokko');
    }
    if (v.kind === 'nouchi') add('nouchi', '農地中間管理機構・農業委員会への相談', '法務省は、国庫帰属以外の手放し方として農地中間管理機構の活用を挙げています。農地を売ったり貸したりするには農地法の許可が要ります。', 'nouchi');
    if (v.kind === 'sanrin') add('sanrin', '森林経営管理制度・森林組合への相談', '法務省は、森林の手放し方として森林経営管理制度の利用を挙げています。', 'sanrin');
    if (v.kind === 'bessou') add('bessou', '別荘地の管理会社・隣地所有者への譲渡の相談', '別荘地は管理費の扱いが手放し方を左右します。', 'bessou');
    add('kifu', '自治体・隣地・個人への寄付や無償譲渡', '寄付を受け入れるかは自治体ごとの基準で決まり、受け入れられない土地もあります。隣地の所有者など個人に無償で譲ると、受け取った人に贈与税がかかることがあります（基礎控除は年110万円）。', 'mushou');
    if (v.pay === 'yes' || v.sell !== 'notyet') add('hikitori', '有料引き取り（費用を払って業者に引き取ってもらう）', '国土交通省の調査では、土地1筆約15万円（2筆目以降5万円）などの引取料の例があります。名義が移ったことを登記で確かめてから払うのが国の示す確認点です。', 'hikitori');
    return { list: c };
  };

  root.TBT = TBT;
  if (typeof module !== 'undefined' && module.exports) { module.exports = TBT; return; }

  /* =================== 画面 =================== */
  var L = root.TBT_LINKS || {};
  function yen(n) { return n.toLocaleString('ja-JP') + '円'; }
  function man(n) { return n >= 10000 ? (Math.floor(n / 10000) + '万' + (n % 10000 ? (n % 10000).toLocaleString('ja-JP') : '') + '円') : yen(n); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function link(key, text) { return L[key] ? '<a class="tbt-link" href="' + esc(L[key]) + '">' + esc(text) + '</a>' : ''; }
  function wd(d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + '日月火水木金土'.charAt(d.getDay()) + '）'; }

  function values(box) {
    var v = {};
    box.querySelectorAll('.tbt-q').forEach(function (fs) {
      var n = fs.getAttribute('data-name');
      if (fs.classList.contains('tbt-checks')) {
        v[n] = Array.prototype.map.call(fs.querySelectorAll('input:checked'), function (i) { return i.value; });
        return;
      }
      var r = fs.querySelector('input[type=radio]:checked');
      if (r) { v[n] = r.value; return; }
      var t = fs.querySelector('input:not([type=radio])');
      if (t) v[n] = t.value;
    });
    return v;
  }

  var R = {
    futan: function (v) {
      var men = parseFloat(v.men), hitsu = Math.max(1, parseInt(v.hitsu || '1', 10));
      if (!v.shu) return '<p class="tbt-err">種目を選んでください。</p>';
      if (v.shu !== 'sonota' && !(men > 0)) return '<p class="tbt-err">面積を入れてください。</p>';
      var f = TBT.futan(v.shu, men), s = TBT.SHINSA * hitsu;
      return '<div class="tbt-num-out"><p><span>負担金（一筆として計算）</span><b>' + man(f) + '</b></p><p><span>審査手数料（' + hitsu + '筆）</span><b>' + man(s) + '</b></p><p class="tbt-sum"><span>合計</span><b>' + man(f + s) + '</b></p></div>'
        + '<ul class="tbt-list"><li>負担金は、承認の通知が届いた日の翌日から30日以内に一括で納めます。納めた時点で土地の所有権が国に移ります。</li>'
        + '<li>審査手数料は、取り下げた場合や却下・不承認になった場合も返還されません。</li>'
        + (hitsu > 1 ? '<li>隣接する2筆以上の土地が同じ区分なら、1つの土地とみなして負担金を算定するよう申し出られます。</li>' : '')
        + '<li>どの区分に当たるかは、申請先の法務局（本局）が判断します。事前相談で確かめられます。</li></ul>'
        + link('kokko', '相続土地国庫帰属制度の要件と申請の流れ');
    },
    kigen: function (v) {
      var end = TBT.kigen(v.shitta);
      if (!end) return '<p class="tbt-err">知った日を入れてください。</p>';
      var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      var days = Math.round((end - today) / 86400000);
      var h = '<div class="tbt-num-out"><p class="tbt-sum"><span>3か月の期間の満了日</span><b>' + wd(end) + '</b></p><p><span>今日から</span><b>' + (days >= 0 ? 'あと' + days + '日' : days * -1 + '日過ぎています') + '</b></p></div><ul class="tbt-list">';
      h += '<li>この日までに、家庭裁判所に相続放棄を申述するか、期間の伸長を申し立てます。伸長の申立ても、同じ3か月の中でする必要があります（相続人1人につき収入印紙800円分と郵便切手）。</li>';
      if (TBT.kyujitsu(end)) h += '<li>満了日が土日または年末年始に当たります。民事訴訟法95条3項（家事事件手続法34条5項で準用）には翌日に満了する定めがありますが、熟慮期間にそのまま当てはまるかは申述先の家庭裁判所に確かめ、満了日より前の平日までに出してください。祝日は判定していません。</li>';
      if (days < 0) h += '<li>期間内に放棄も限定承認もしなかった場合は、単純承認したものとみなされます（民法921条2号）。期間の起算点に事情がある場合は、家庭裁判所や弁護士・司法書士に確かめてください。</li>';
      h += '<li>先の順位の相続人が全員放棄して自分に回ってきた場合は、そのことを知った日から数えます。</li></ul>';
      return h + link('houki', '土地の相続放棄の手続きと、放棄した後の扱い');
    },
    akiya: function (v) {
      var r = TBT.akiya(v);
      if (r.error) return '<p class="tbt-err">' + esc(r.error) + '</p>';
      var h = r.ng.length
        ? '<p class="tbt-verdict tbt-ng">このままでは特例の要件に当てはまらない点があります</p><ul class="tbt-list tbt-ng-list">' + r.ng.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'
        : '<p class="tbt-verdict tbt-ok">選んだ条件では、特例の要件に当てはまる見込みです（控除は最高' + (r.gendo === 2000 ? '2,000' : '3,000') + '万円）</p>';
      if (r.gendo === 2000 && !r.ng.length) h += '<p class="tbt-note">令和6年1月1日以後の譲渡で、家と敷地を相続した相続人が3人以上のときは、控除は最高2,000万円です。</p>';
      if (r.ok.length) h += '<ul class="tbt-list">' + r.ok.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
      h += '<ul class="tbt-list"><li>特例を受けるには、物件のある市区町村から「被相続人居住用家屋等確認書」の交付を受け、確定申告書に添付します。</li><li>取得費加算の特例とは、同じ家・敷地で併用できません。どちらが有利かは税務署か税理士に確かめてください。</li></ul>';
      return h + link('akiya', '空き家の処分方法と手順');
    },
    kokko: function (v) {
      var r = TBT.kokko(v);
      if (r.error) return '<p class="tbt-err">' + esc(r.error) + '</p>';
      var head = { ok: '<p class="tbt-verdict tbt-ok">選んだ条件では、申請できる土地の候補です</p>', risk: '<p class="tbt-verdict tbt-mid">申請はできますが、審査で承認されないおそれがあります</p>', ng: '<p class="tbt-verdict tbt-ng">このままでは申請できません（却下の理由に当たります）</p>' }[r.level];
      var h = head;
      if (r.reasons.length) h += '<ul class="tbt-list tbt-ng-list">' + r.reasons.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
      if (r.fix.length) h += '<p class="tbt-sub">解消できる理由</p><ul class="tbt-list">' + r.fix.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
      h += '<ul class="tbt-list"><li>申請先は、土地のある都道府県の法務局・地方法務局の本局です。事前相談（予約制・1回30分）で、担当者の見解を聞けます。ただし見解は承認を保証するものではありません。</li><li>審査手数料は一筆1万4,000円、承認されたら負担金を納めます。</li></ul>';
      return h + link('kokko_ng', '国庫帰属制度が使えない土地の要件') + link('kokko', '国庫帰属制度の費用と申請の流れ');
    },
    hozon: function (v) {
      var r = TBT.hozon(v);
      if (r.error) return '<p class="tbt-err">' + esc(r.error) + '</p>';
      var head = { high: '<p class="tbt-verdict tbt-ng">保存義務を負う可能性が高い状況です</p>', mid: '<p class="tbt-verdict tbt-mid">保存義務を負うかは、事情によって分かれる状況です</p>', low: '<p class="tbt-verdict tbt-ok">保存義務を負わない可能性が高い状況です</p>' }[r.level];
      var h = head + '<ul class="tbt-list">' + r.text.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
      if (r.level !== 'low') h += '<p class="tbt-note">放棄の前に、家の写真・鍵の扱い・出入りの記録を残し、弁護士か司法書士に家との関わりを伝えて確かめてください。</p>';
      return h + link('houki_ie', '相続放棄した家の解体費用と倒壊したときの責任');
    },
    houhou: function (v) {
      var r = TBT.houhou(v);
      if (r.error) return '<p class="tbt-err">' + esc(r.error) + '</p>';
      var h = '<p class="tbt-verdict tbt-ok">候補になる手放し方（上から順に検討）</p><ol class="tbt-rank">';
      r.list.forEach(function (c) { h += '<li><p class="tbt-rank-t">' + esc(c.title) + '</p><p>' + esc(c.why) + '</p>' + link(c.link, '詳しく読む') + '</li>'; });
      return h + '</ol><p class="tbt-note">この診断は、選んだ条件から公的な制度の要件に当てはめた目安です。個別の判断は、法務局・家庭裁判所・市区町村・弁護士・司法書士・税理士にご確認ください。</p>' + link('houhou', '不動産を手放す方法の全体像');
    }
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tbt-go');
    if (!b) return;
    var box = b.closest('.tbt');
    var type = box.getAttribute('data-tbt');
    var out = box.querySelector('.tbt-result');
    out.innerHTML = R[type](values(box));
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})(typeof window !== 'undefined' ? window : globalThis);
