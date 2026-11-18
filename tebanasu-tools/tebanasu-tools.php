<?php
/**
 * Plugin Name: 不動産の手放し方ツール
 * Description: 手放し方診断・相続土地国庫帰属制度の診断と負担金計算・相続放棄の期限計算・保存義務の診断・空き家の3,000万円特例の判定を、ショートコード [tebanasu_tool type="..."] でページに置けます。判定はブラウザ内で行い、入力値は保存しません。
 * Version: 1.0.0
 * Author: ミカタ株式会社
 * License: GPLv2 or later
 * Text Domain: tebanasu-tools
 *
 * ★設計上の決めごと（shakuchi-tools・fudosan-tools から引き継いだもの）:
 *   - 判定・計算はブラウザ側（assets/tbt.js）で行う。入力値をサーバーに送らない・保存しない。
 *   - 見出し・導入文・根拠の説明はPHPでサーバー出力する（検索エンジンに読ませるため）。
 *   - 判定の根拠は、記事と同じ公的資料（条文・施行令・法務省・国税庁・国交省）に限る。
 *     公的な基準が無い論点は「当たる可能性」と「確かめる先」で返し、断定しない。
 *   - 運営のミカタ株式会社は宅地建物取引業者・士業ではないため、結果を「査定」「法律相談」と呼ばない。
 *
 * 使い方:
 *   [tebanasu_tool type="houhou"]  手放し方診断
 *   [tebanasu_tool type="kokko"]   相続土地国庫帰属制度が使えるか診断
 *   [tebanasu_tool type="futan"]   国庫帰属の負担金・審査手数料の計算
 *   [tebanasu_tool type="kigen"]   相続放棄の期限（3か月）の計算
 *   [tebanasu_tool type="hozon"]   相続放棄後の保存義務の診断
 *   [tebanasu_tool type="akiya"]   空き家の3,000万円特例の判定
 */

if (!defined('ABSPATH')) exit;

define('TBT_VER', '1.0.0');
define('TBT_URL', plugin_dir_url(__FILE__));

/** 自動更新の置き場 */
define('TBT_UPDATE_URL', 'https://raw.githubusercontent.com/yoshimucom-gif/tebanasu-tools-plugin/main/update.json');

/* 更新チェッカー。is_admin() だけで囲わないこと（WP-Cron は管理画面外で走る） */
if (is_admin() || (defined('DOING_CRON') && DOING_CRON) || (defined('WP_CLI') && WP_CLI)) {
    require_once __DIR__ . '/includes/plugin-updater.php';
    new TBT_Tebanasu_Updater(__FILE__, TBT_UPDATE_URL);
}

require_once __DIR__ . '/includes/tools.php';

function tbt_enqueue() {
    wp_enqueue_style('tbt', TBT_URL . 'assets/tbt.css', array(), TBT_VER);
    wp_enqueue_script('tbt', TBT_URL . 'assets/tbt.js', array(), TBT_VER, true);
    wp_localize_script('tbt', 'TBT_LINKS', tbt_links());
}

add_shortcode('tebanasu_tool', function ($atts) {
    $a = shortcode_atts(array('type' => 'houhou'), $atts, 'tebanasu_tool');
    $type = sanitize_key($a['type']);
    $renderers = tbt_renderers();
    if (!isset($renderers[$type])) return '';
    tbt_enqueue();
    return '<div class="tbt" data-tbt="' . esc_attr($type) . '">' . call_user_func($renderers[$type]) . '</div>';
});
