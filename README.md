# 不動産の手放し方ツール（tebanasu-tools）

fudosan-tebanasu.jp（運営：ミカタ株式会社）の6つの診断・計算ツール。WordPressプラグイン。

| ショートコード | ツール | 根拠 |
|---|---|---|
| `[tebanasu_tool type="houhou"]` | 手放し方診断 | 民法915条・939条、国庫帰属法、法務省・国交省 |
| `[tebanasu_tool type="kokko"]` | 相続土地国庫帰属制度が使えるか診断 | 国庫帰属法2条・4条・5条、施行令2条・4条 |
| `[tebanasu_tool type="futan"]` | 負担金・審査手数料の計算 | 施行令3条・5条（千円未満切り捨て） |
| `[tebanasu_tool type="kigen"]` | 相続放棄の期限（3か月）の計算 | 民法915条・140〜143条、家事事件手続法34条5項、民訴法95条3項 |
| `[tebanasu_tool type="hozon"]` | 相続放棄後の保存義務の診断 | 民法940条、法務省の説明 |
| `[tebanasu_tool type="akiya"]` | 空き家の3,000万円特例の判定 | 措置法35条3項、国税庁No.3306、国交省 |

- 判定はブラウザ内（assets/tbt.js）。入力値は送信・保存しない。
- 判定ロジックのテスト：`node test_tbt.js`
- 配布：`py build.py 1.0.1 "変更点"` → `git add -A && git commit -m v1.0.1 && git push`（update.json を見て全サイトに更新通知が出る）
