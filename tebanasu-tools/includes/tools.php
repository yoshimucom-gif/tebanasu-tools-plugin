<?php
/**
 * 6つのツールの画面（サーバー出力）。判定はすべて assets/tbt.js。
 * 文言の根拠は、記事と同じ事実リスト（facts/topics/*.json・facts/*.json）。
 */
if (!defined('ABSPATH')) exit;

/** 結果から案内する記事（公開済みのものだけ） */
function tbt_links() {
    $s = array(
        'houhou'   => 'fudousan-tebanasu-houhou',
        'kokko'    => 'souzoku-tochi-kokko-kizoku',
        'kokko_ng' => 'kokko-kizoku-tsukaenai',
        'houki'    => 'tochi-souzoku-houki',
        'houki_ie' => 'houki-ie-kaitai-hiyou',
        'tochi'    => 'iranai-tochi-tebanasu',
        'akiya'    => 'akiya-shobun',
        'sanrin'   => 'sanrin-shobun',
        'nouchi'   => 'nouchi-shobun',
        'bessou'   => 'bessouchi-shobun',
        'resort'   => 'resort-mansion-urenai',
        'mansion'  => 'mansion-urenai',
        'wakeari'  => 'wakeari-kaitori',
        'hikitori' => 'fudousan-yuuryou-hikitori',
        'mushou'   => 'tochi-musyou-jouto',
        'touki'    => 'souzoku-touki-hitsuyou-shorui',
    );
    $out = array();
    foreach ($s as $k => $slug) $out[$k] = home_url('/' . $slug . '/');
    return $out;
}

function tbt_renderers() {
    return array(
        'houhou' => 'tbt_render_houhou',
        'kokko'  => 'tbt_render_kokko',
        'futan'  => 'tbt_render_futan',
        'kigen'  => 'tbt_render_kigen',
        'hozon'  => 'tbt_render_hozon',
        'akiya'  => 'tbt_render_akiya',
    );
}

/** ラジオの1問 */
function tbt_q($name, $label, $options, $note = '') {
    $h = '<fieldset class="tbt-q" data-name="' . esc_attr($name) . '"><legend>' . esc_html($label) . '</legend>';
    if ($note) $h .= '<p class="tbt-note">' . esc_html($note) . '</p>';
    $h .= '<div class="tbt-opts">';
    foreach ($options as $v => $t) {
        $id = 'tbt-' . $name . '-' . $v . '-' . wp_rand(1000, 9999);
        $h .= '<label class="tbt-opt" for="' . esc_attr($id) . '"><input type="radio" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr($v) . '"><span>' . esc_html($t) . '</span></label>';
    }
    return $h . '</div></fieldset>';
}

function tbt_box($title, $lead, $body, $btn = '結果を見る') {
    return '<div class="tbt-head"><p class="tbt-title">' . esc_html($title) . '</p><p class="tbt-lead">' . esc_html($lead) . '</p></div>'
        . '<form class="tbt-form" onsubmit="return false;">' . $body
        . '<button type="button" class="tbt-go">' . esc_html($btn) . '</button></form>'
        . '<div class="tbt-result" aria-live="polite"></div>';
}

/* ---------------------------------------------------------------- 1 */
function tbt_render_houhou() {
    $b  = tbt_q('kind', '手放したい不動産の種類は？', array('takuchi' => '土地（建物なし）', 'ie' => '家・空き家（建物あり）', 'sanrin' => '山林・原野', 'nouchi' => '田・畑（農地）', 'bessou' => '別荘地', 'mansion' => 'マンション・リゾートマンション'));
    $b .= tbt_q('get', 'どうやって取得しましたか？', array('souzoku' => '相続・遺贈で取得した', 'mada' => 'まだ相続していない（親などの名義）', 'kau' => '自分で買った・贈与を受けた'));
    $b .= tbt_q('ki', '相続したと知ってから3か月以内ですか？', array('yes' => '3か月以内', 'no' => '3か月を過ぎた', 'na' => '当てはまらない'), '相続放棄は、自分のために相続が始まったことを知った時から3か月以内にしなければなりません（民法915条1項）。');
    $b .= tbt_q('sell', '不動産会社に売却や買取の相談をしましたか？', array('notyet' => 'まだしていない', 'nooffer' => '相談したが値段が付かなかった', 'offer' => '値段は付いたが低すぎる'));
    $b .= tbt_q('pay', '手放すために費用を払えますか？', array('yes' => '数十万円程度なら払える', 'no' => 'できるだけ払いたくない'));
    $b .= tbt_q('kyouyuu', '名義は？', array('tandoku' => '自分だけ', 'kyouyuu' => 'ほかの人との共有'));
    return tbt_box('手放し方診断', '6つの質問に答えると、あなたの不動産で候補になる手放し方を、試す順に並べます。', $b, '候補を見る')
        . '<div class="tbt-src"><p>判定の根拠：民法915条1項・939条（相続放棄）、相続土地国庫帰属法2条3項・5条1項（国庫帰属の要件）、法務省「相続土地国庫帰属制度」（国庫帰属以外の手放し方）、国土交通省「不動産の『引取サービス』について」。</p></div>';
}

/* ---------------------------------------------------------------- 2 */
function tbt_render_kokko() {
    $b  = tbt_q('who', '土地をどうやって取得しましたか？', array('souzoku' => '相続・相続人への遺贈で取得した', 'izou' => '相続人ではない立場で遺贈を受けた', 'kau' => '売買・贈与で取得した'));
    $b .= tbt_q('share', '名義は？', array('tandoku' => '自分だけ', 'all' => '共有で、共有者全員が申請に同意している', 'ng' => '共有で、同意しない共有者がいる'));
    $b .= '<fieldset class="tbt-q tbt-checks" data-name="kyakka"><legend>当てはまるものをすべて選んでください（申請の段階で却下される土地）</legend><div class="tbt-opts">';
    foreach (array(
        'tatemono' => '建物が建っている',
        'tanpo'    => '抵当権などの担保権や、賃借権などの使う権利が付いている',
        'tsuro'    => '通路・墓地・境内地・水道用地・用悪水路・ため池として使われている',
        'osen'     => '土壌汚染（特定有害物質）がある',
        'kyoukai'  => '境界がはっきりしない・所有権の範囲などに争いがある',
    ) as $v => $t) $b .= '<label class="tbt-opt"><input type="checkbox" value="' . $v . '"><span>' . esc_html($t) . '</span></label>';
    $b .= '</div></fieldset><fieldset class="tbt-q tbt-checks" data-name="fushounin"><legend>当てはまるものをすべて選んでください（審査で不承認になる土地）</legend><div class="tbt-opts">';
    foreach (array(
        'gake'   => '管理に手間や費用がかかる崖がある（勾配30度以上かつ高さ5メートル以上）',
        'chijou' => '管理や処分の妨げになる工作物・車両・樹木などが地上にある',
        'chika'  => '取り除かないと管理や処分ができない物が地下に埋まっている',
        'rinchi' => '隣地との争いや、通行の妨げ・使用の妨害がある',
        'sonota' => '災害の危険への対策が必要／鳥獣や病害虫の被害がある／森林の追加の整備が必要／法令で金銭の負担が付いている',
    ) as $v => $t) $b .= '<label class="tbt-opt"><input type="checkbox" value="' . $v . '"><span>' . esc_html($t) . '</span></label>';
    $b .= '</div></fieldset>';
    return tbt_box('相続土地国庫帰属制度が使えるか診断', '取得の経緯と土地の状態を選ぶと、申請できるか、どこで引っかかるかを示します。', $b)
        . '<div class="tbt-src"><p>判定の根拠：相続土地国庫帰属法2条1項・3項（申請できる人と却下事由）、4条1項（手続の却下）、5条1項（不承認事由）、同法施行令2条・4条。法務省「相続土地国庫帰属制度」。</p></div>';
}

/* ---------------------------------------------------------------- 3 */
function tbt_render_futan() {
    $b  = tbt_q('shu', '土地の種目は？', array(
        'takuchi' => '宅地（市街化区域内、または区域区分のない都市計画区域の用途地域内）',
        'nouchi'  => '農地（市街化区域内・農用地区域内・土地改良事業等の施行区域内）',
        'shinrin' => '森林',
        'sonota'  => '上のどれにも当たらない土地（区域外の宅地・農地、雑種地、原野など）',
    ), '負担金は施行令5条の区分で決まります。どの区分に当たるかは申請先の法務局が判断します。');
    $b .= '<fieldset class="tbt-q" data-name="men"><legend>面積（平方メートル）</legend><input type="number" class="tbt-num" name="men" min="1" step="0.01" inputmode="decimal" placeholder="例：120"></fieldset>';
    $b .= '<fieldset class="tbt-q" data-name="hitsu"><legend>申請する土地の筆数</legend><input type="number" class="tbt-num" name="hitsu" min="1" step="1" value="1" inputmode="numeric"></fieldset>';
    return tbt_box('国庫帰属の負担金・審査手数料の計算', '種目と面積を入れると、施行令の算定式で負担金を出し、審査手数料と合わせた金額を示します。', $b, '計算する')
        . '<div class="tbt-src"><p>計算の根拠：相続等により取得した土地所有権の国庫への帰属に関する法律施行令5条1項・2項（1,000円未満の端数は切り捨て）、法務省「相続土地国庫帰属制度」（審査手数料は土地一筆あたり1万4,000円）。</p></div>';
}

/* ---------------------------------------------------------------- 4 */
function tbt_render_kigen() {
    $b  = '<fieldset class="tbt-q" data-name="shitta"><legend>自分が相続人になったと知った日</legend><p class="tbt-note">親が亡くなったことを知った日。先の順位の相続人が全員放棄して自分に回ってきた場合は、そのことを知った日です。</p><input type="date" class="tbt-num" name="shitta"></fieldset>';
    return tbt_box('相続放棄の期限（3か月）の計算', '知った日を入れると、民法の期間の数え方で、相続放棄と期間の伸長を申し立てられる期限を出します。', $b, '期限を出す')
        . '<div class="tbt-src"><p>計算の根拠：民法915条1項（3か月の期間と伸長）、140条（初日は数えない）、141条、143条（月による期間）、142条。家事事件手続法34条5項・民事訴訟法95条3項（末日が休日の扱い）。裁判所「相続の承認又は放棄の期間の伸長」。</p></div>';
}

/* ---------------------------------------------------------------- 5 */
function tbt_render_hozon() {
    $b  = tbt_q('sumi', '相続放棄をする時点で、その家に住んでいますか？', array('yes' => '住んでいる（親と同居していた）', 'no' => '住んでいない'));
    $b .= tbt_q('kan', '家との関わりは？（住んでいない場合）', array('kagi' => '鍵を持って出入りし、管理や片付けをしている', 'nimotsu' => '自分の荷物を置いている・ときどき使っている', 'nashi' => '生前から遠方に住み、出入りしていない', 'na' => '当てはまらない（住んでいる）'));
    $b .= tbt_q('ato', '放棄した後、家を受け継ぐ人は？', array('iru' => 'ほかの相続人が受け継ぐ', 'zenin' => '相続人全員が放棄する予定', 'fumei' => 'まだ分からない'));
    return tbt_box('相続放棄後の保存義務（民法940条）の診断', '放棄の時の家との関わりを選ぶと、家の保存義務を負う可能性と、義務の中身を示します。', $b, '結果を見る')
        . '<div class="tbt-src"><p>判定の根拠：民法940条1項（2023年4月1日施行）、法務省「令和3年民法・不動産登記法改正、相続土地国庫帰属法のポイント」の説明（現に占有の例）。同居や遠方以外の場面は法務省の説明に例がないため、可能性で示します。</p></div>';
}

/* ---------------------------------------------------------------- 6 */
function tbt_render_akiya() {
    $b  = '<fieldset class="tbt-q" data-name="souzoku"><legend>相続の開始日（亡くなった日）</legend><input type="date" class="tbt-num" name="souzoku"></fieldset>';
    $b .= '<fieldset class="tbt-q" data-name="uru"><legend>売る予定日</legend><input type="date" class="tbt-num" name="uru"></fieldset>';
    $b .= tbt_q('kenchiku', '家が建てられたのは？', array('mae' => '昭和56年5月31日以前', 'ato' => '昭和56年6月1日以降', 'fumei' => '分からない'), '登記事項証明書の「原因及びその日付」や建築確認の書類で確かめられます。');
    $b .= tbt_q('kubun', 'マンションなど区分所有の登記がされた建物ですか？', array('no' => 'いいえ（一戸建て）', 'yes' => 'はい'));
    $b .= tbt_q('kyoju', '亡くなる直前、家に住んでいたのは？', array('hitori' => '亡くなった人がひとりで住んでいた', 'home' => '老人ホーム等に入所していた（要介護認定などを受けていた）', 'doukyo' => 'ほかにも住んでいる人がいた'));
    $b .= tbt_q('shiyou', '相続してから売るまで、家を貸したり住んだり事業に使ったりしましたか？', array('no' => '使っていない', 'yes' => '使った'));
    $b .= tbt_q('kakaku', '売却代金は？', array('ika' => '1億円以下', 'koeru' => '1億円を超える'));
    $b .= tbt_q('kaoku', '家はどうして売りますか？', array('torikowashi' => '取り壊して更地で売る', 'taishin' => '耐震基準を満たした状態で家付きで売る', 'baishu' => '家付きで売り、翌年2月15日までに買主が耐震改修か取り壊しをする', 'sonomama' => '耐震基準を満たさないまま家付きで売り、改修・取り壊しもしない'));
    $b .= tbt_q('kaite', '買主は？', array('tanin' => '第三者', 'shinzoku' => '親子・夫婦・生計を一にする親族・同族会社など特別の関係がある人'));
    $b .= tbt_q('ninzu', 'この家と敷地を相続した相続人の人数は？', array('2' => '1〜2人', '3' => '3人以上'));
    $b .= tbt_q('zumi', '同じ亡くなった人の家・敷地で、この特例をすでに受けましたか？', array('no' => 'いいえ', 'yes' => 'はい'));
    return tbt_box('空き家の3,000万円特例の判定', '日付と条件を選ぶと、被相続人の居住用財産（空き家）の3,000万円特別控除の要件に当てはまるかを示します。', $b, '判定する')
        . '<div class="tbt-src"><p>判定の根拠：租税特別措置法35条3項、国税庁タックスアンサーNo.3306「被相続人の居住用財産（空き家）を売ったときの特例」、国土交通省「空き家の発生を抑制するための特例措置」。最終的な適用は税務署の判断です。</p></div>';
}
