/**
 * audio.js
 * BGMと効果音の一覧。
 *
 * basePath : 音源ファイルを置くフォルダ
 * bgm / se : 鳴らすものの定義
 *   file   : ファイル名（basePath からの相対）。**書かなければ「無音」**
 *   volume : このファイル自体の音量（0〜1）。素材ごとの音量差をここで揃える
 *   loop   : 繰り返すか（BGMは既定で true、効果音は false）
 *   loopStart : BGMだけ。繰り返すときの戻り先（秒）。書いた曲は、最後まで来たら頭ではなくここへ戻る（v1.3.0）。
 *               頭に前奏がある曲を、前奏を鳴らし直さずに繰り返すため。書かない曲は今までどおり頭へ戻る
 *   loopEnd   : BGMだけ。ここまで来たら loopStart へ戻る（秒）。書かなければファイルの最後
 *               ★ 戻り先は 開発用サーバー（8124）の 効果音の一覧 の「つなぎ目」で聞いて決める
 *   solo   : 効果音だけ。重ねずに頭から鳴り直す（メニュー音の連打対策）
 *   synth  : 効果音だけ。ファイルの代わりに波形の指定から音を作る（file があればそちら優先）
 *
 * ★ 音を足すときは、ファイルを assets/audio/ に置いて、
 *   ここに1行書くだけでよい。コードは触らない。
 *
 * ─────────────────────────────────────────────
 * ▼ 種類を増やす —— コードを触らずにできること
 *
 * 【同じ場面で音を散らす】 file に配列を書く。毎回どれかがランダムに鳴る
 *     hit: { file: ["hit1.wav", "hit2.wav", "hit3.wav"], volume: 0.6 }
 *   同じ攻撃音が毎回まったく同じだと機械的に聞こえるので、2〜3種で散らすとよい。
 *
 * 【ダンジョンごとのBGM】 bgm にidを足して、data/dungeonThemes.js の bgm から指す
 *     bgm:   { mine: { file: "mine.mp3" }, ... }
 *     theme: { mine: { bgm: "mine", ... } }
 *
 * 【主ごとのBGM】 bgm にidを足して、data/bosses.js の bgm から指す
 *     bgm:    { swampLordTheme: { file: "swamp.mp3" } }
 *     bosses: { swampLord: { bgm: "swampLordTheme", ... } }
 *
 * 【技ごとの効果音】 se にidを足して、data/skills.js の se から指す
 *     se:     { fire: { file: "fire.wav" }, aqua: { file: "aqua.wav" } }
 *     skills: { ember: { se: "fire", ... } }
 *   技を出した瞬間に鳴る。当たったときの hit はそのまま別に鳴る。
 *
 * 【状態異常ごとの効果音】 se にidを足して、data/statuses.js の se から指す
 *     se:       { statusPoison: { file: "poison.mp3" } }
 *     statuses: { poison: { se: "statusPoison", ... } }
 *   戦闘中に掛かった瞬間と、ターン終了時のダメージ（毒）の両方で同じ音が鳴る。
 *   ダンジョンを歩いているときの毒ダメージでは鳴らさない。
 *
 * ▼ 新しい場面で鳴らしたいとき（コードが1行要る）
 *   「毒のダメージを受けた」「宝箱が空だった」など、まだ鳴らす場所が無い場面は
 *   その瞬間のコードに game.audio.playSe("id") を1行足す。
 *   場面を教えてもらえれば足せる。
 *
 * ─────────────────────────────────────────────
 * ▼ ファイルが無くても動く
 *
 * file を書いていない項目、または読み込めなかったファイルは
 * **黙って無音になる**。エラーも出さず、ゲームも止まらない。
 * 音源を1つも置いていない状態でも、今までどおり遊べる。
 *
 * ▼ なぜ new Audio() で鳴らすのか（Web Audio を使わない理由）
 *
 * Web Audio の decodeAudioData は fetch が要る。
 * fetch は file:// では止められるので、**ダブルクリックで起動したときに
 * 音だけ鳴らない**ことになる。このゲームは file:// での起動を大事にしているので、
 * 音声要素（new Audio）で鳴らす方を選んだ。
 *   ★ loopStart を書いた BGM だけは、http で開いているとき Web Audio で鳴らす（戻り先へサンプル単位で戻れるため）。
 *     file:// や読み込みに失敗したときは、音声要素2つを交互に使って同じ戻り先へ戻す（2つ目を先に音量0で鳴らして位置を揃えておき、つなぎ目は数十ミリ秒の重なりになる）。
 *     js/systems/AudioManager.js の LoopedBgm と ElementLoopBgm
 *
 * ▼ 形式
 *
 * mp3 を基本にする。ogg しか無い素材のときは、そのまま ogg を指定してよい
 * （どちらも今のブラウザなら鳴る）。wav は容量が大きいので効果音だけにする。
 *
 * ▼ 音量の決まり方
 *
 *   実際の音量 = ここの volume × 設定の全体音量 × 設定のBGM音量（または効果音量）
 *
 * 設定は data/settings.js。素材ごとの大小はここの volume で吸収して、
 * 設定はプレイヤーの好みだけに使えるようにする。
 * ─────────────────────────────────────────────
 */
(function (NS) {
  "use strict";

  NS.rawData.audio = {
    basePath: "assets/audio/",
    // 公開版の音の鍵（tools/make-web.py が初めて作ったときに決め、あとは使い回す。AudioManager がほどく）
    audioCipher: { key: "O76yI9fTAcAELqWxwsDcNYcwmfIYVtXRD2CBhlrJOg0=" },

    // 場面の切り替えでBGMを入れ替えるときの、消え際・出はじめの長さ（ms）
    fadeMs: 600,

    /**
     * BGM。
     *
     * ★ 同じidを続けて指定しても鳴らし直さない。
     *   拠点 → ショップ → 拠点 と移ってもBGMが途切れないようにするため。
     *
     * ダンジョンのBGMは data/dungeonThemes.js の bgm で上書きできる
     * （書かなければ dungeon が鳴る）。
     */
    bgm: {
      // タイトルと拠点は静かな場面なので、戦闘曲より小さめにしてある
      title:   { file: "title.dat", volume: 0.45 },
      home:    { file: "home.dat",  volume: 0.45 },
      // 拠点の中の店と工房。入ると切り替わり、拠点へ戻ると home に戻る
      shop:    { file: "shop.dat",   volume: 0.45 },
      craft:   { file: "koubou.dat", volume: 0.45 },
      /**
       * 探索中の曲。
       * ★ 地方ごとに変える予定。いまは地方が「深淵」ひとつなので、
       *   共通の dungeon ＝ 深淵の曲にしてある。
       *   地方を足すときは abyss / xxx とidを分けて、地方のデータの bgm から指す
       *   （ダンジョンごとに変えたいときは今までどおり dungeonThemes.js の bgm）
       */
      dungeon: { file: "abyss_dg.dat", volume: 0.6 },
      // 戦闘曲。穴（地方）ごとに変えられる（data/regions.js の battleBgm）。書いていない穴はこの battle
      // 戻り先 8.2187秒（2026-11-03 作者が聞いて決めた）
      battle:  { file: "abyss_battle.dat",     volume: 0.7, loopStart: 8.2187 },
      // 萌芽の穴のふつうの戦闘曲（v1.0.0。作者の指定。音楽の卵）
      // 音量は揺籃の戦闘曲（battle）と聞こえの大きさをそろえた値（2026-10-14 に測定。差は0.13dB）
      // 戻り先 12.4128秒（2026-11-03 作者が聞いて決めた。1小節 約2.069秒の6小節目）
      hougaBattle: { file: "houga_battle.dat", volume: 0.69, loopStart: 12.4128 },
      // クロニクル杯の戦い（v1.5.0。作者が足した曲。音楽の卵）。予選の3戦すべて（data/bosses.js の tournament.qualifier.battles の bgm）
      // ファイルは 49.5858秒 から頭の約3.8秒をもう一度入れた作り。波形を比べると 49.585805秒（2186734 サンプル）ずらすと頭と重なる（差 0.35%）。
      // そこで 1.0秒 から 50.585805秒 までを繰り返す（どちらも重なる所の中。頭の 0.1秒 は響きの入り方が違うので避けた）。2026-11-18 に私が測り、11-19 に作者が聞いて了承
      // 音量は萌芽の穴の戦闘曲（hougaBattle 0.69）と同じ聞こえになる値（RMS 0.2206 と 0.2448 の比で 0.77）
      taikaiBattle: { file: "taikai_battle.dat", volume: 0.77, loopStart: 1.0, loopEnd: 50.585805 },
      // 涵養の穴のふつうの戦闘曲（v1.8.0。作者が足した曲 2026-11-27）。63.05秒・音は 0.1035秒から最後まで鳴る。
      // 音量は萌芽の穴の戦闘曲と同じ聞こえ（RMS 0.2453 と 0.2448 でほぼ同じなので 0.69 のまま）。
      // 終わりは前のどこかと重なる作りではないので、いまは最後まで来たら音の始まり（0.1035秒）へ戻す（戻り先は作者が聞いて決める）
      kanyouBattle: { file: "kanyoubattle.dat", volume: 0.69, loopStart: 0.1035 },
      // 主との戦い。萌芽の穴の主もこの曲（作者の指定）。戻り先 6.18126秒（2026-11-03 作者が決めた）
      boss:    { file: "abyss_bossbattle.dat", volume: 0.8, loopStart: 6.18126 },
      // 勝ったときの曲。戦闘曲を止めてから流し、繰り返さない（BattleScene の battleEnd）
      victory: { file: "victory.dat", volume: 0.7, loop: false },
      // 全滅したときの曲。同じく battleEnd で流し、結果画面まで続く。拠点に着くと拠点の曲に変わる
      lose:    { file: "lose.dat", volume: 0.6, loop: false },
      // エンディングは入れない（v1.0.0 では使わない）
      ending:  { file: null, volume: 0.7 }
    },

    /**
     * 効果音。
     *
     * ★ 同じ音が重なって鳴ることがある（複数体が同時に殴られる、など）ので、
     *   1つの音につき数個ぶん用意して使い回す（js/systems/AudioManager.js）。
     */
    se: {
      // メニュー。
      // ★ solo … 重ねない。鳴っている最中にもう一度鳴らすと、頭から鳴り直す。
      //   連打すると同じ音が何個も重なって膨らむのを防ぐ（メニュー音向け）
      // メニュー音は小さめ。いちばん頻繁に鳴るので、主張しすぎないように
      cursor:  { file: "cursor.dat",  volume: 0.2, solo: true },
      confirm: { file: "confirm.dat", volume: 0.4, solo: true },
      cancel:  { file: "cancel.dat",  volume: 0.2, solo: true },
      // できなかったとき（お金が足りない・使えない・選べない など）。戻る音と同じファイル。
      // 決定音の代わりに鳴る（Game.playError）。別の音にしたければ file を変えるだけ
      error:   { file: "cancel.dat",  volume: 0.2, solo: true },

      /**
       * 戦闘。
       *
       * ★ file が無く synth があるものは、ゲームが波形から音を作って鳴らす（ファミコン風の電子音）。
       *   ファイルを置いて file に書けば、そちらが優先される（synth はそのまま残してよい）。
       *   synth は「層」の配列。書き方は js/systems/AudioManager.js の _playSynth を参照。
       *     kind "tone"  … wave / from / to / start / duration / gain
       *     kind "noise" … filterFrom / filterTo / start / duration / gain
       */

      // 当たった。どちらが鳴るかは演出の型（data/effects.js の hitSe）で決まる。
      //   hit   … 打撃。2つからランダム（毎回同じ音だと機械的に聞こえるので）
      //   slash … 斬撃。爪や翼で斬る種族の通常攻撃（attackEffect: "slash"）
      hit:   { file: ["dageki1.dat", "dageki2.dat"], volume: 0.45 },
      slash: { file: "zangeki1.dat", volume: 0.45 },
      // ★ 音を付けない、と決めてあるもの：クリティカル（当たった音だけ）・いまひとつ・スカウトの成否・
      //   状態異常が解けた・動けなかったターン・主の登場・戦闘後の経験値やドロップ・初クリア・図鑑の新登録
      // 外れた・かわされた・無効・状態異常が効かなかった。
      // file があるので synth は使われない（外せば波形の「シュッ」に戻る）
      miss: { file: "se_miss.dat", volume: 0.4, synth: [
        { kind: "noise", filterFrom: 3000, filterTo: 600, duration: 0.18, gain: 0.5 },
        { kind: "tone", wave: "sine", from: 700, to: 250, duration: 0.18, gain: 0.3 }
      ] },
      // 回復ぜんぶ（HP・PP・状態異常を治す。技も道具も）
      heal:   { file: "heal.dat",   volume: 0.45 },
      // 強化・弱体（data/skills.js の modifier が掛かった瞬間）
      buff:   { file: "buff.dat",   volume: 0.45 },
      debuff: { file: "debuff.dat", volume: 0.45 },
      faint:    { file: "faint.dat", volume: 0.45 },
      // レベルアップ：4音のファンファーレ
      levelUp: { file: null, volume: 0.55, synth: [
        { kind: "tone", wave: "square", from: 523,  start: 0.00, duration: 0.12, gain: 0.4 },
        { kind: "tone", wave: "square", from: 659,  start: 0.09, duration: 0.12, gain: 0.4 },
        { kind: "tone", wave: "square", from: 784,  start: 0.18, duration: 0.12, gain: 0.4 },
        { kind: "tone", wave: "square", from: 1047, start: 0.27, duration: 0.40, gain: 0.45 },
        { kind: "tone", wave: "triangle", from: 523, start: 0.27, duration: 0.40, gain: 0.25 }
      ] },
      // 逃げる。成功でも失敗でも鳴る（「逃げようとした」音）
      flee:     { file: "flee.dat",  volume: 0.4 },

      /**
       * 技の音（data/skills.js の se から指す。技を出した瞬間に鳴り、当たった音は別に鳴る）。
       * 属性ごとに1つ ＋ 技の形が特別なもの（息・あわ）。
       */
      fire:    { file: "se_fire_1.dat",    volume: 0.45 },   // ファイア
      water:   { file: "se_water_1.dat",   volume: 0.45 },   // アクア
      wind:    { file: "se_wind_1.dat",    volume: 0.45 },   // ウィンド
      earth:   { file: "se_earth_1.dat",   volume: 0.45 },   // ストーン
      thunder: { file: "se_thunder_1.dat", volume: 0.45 },   // サンダー
      light:   { file: "se_light_1.dat",   volume: 0.45 },   // フラッシュ
      dark:    { file: "se_dark_1.dat",    volume: 0.45 },   // シャドウ
      shine:       { file: "se_light_2.dat",      volume: 0.45 },   // シャイン（光の大技）
      // 属性技の2段目（RC-1）
      flame:       { file: "se_fire_2.dat",       volume: 0.45 },   // フレイム
      wave:        { file: "se_water_2.dat",      volume: 0.45 },   // ウェーブ
      gale:        { file: "se_wind_2.dat",       volume: 0.45 },   // ゲイル
      rockSpike:   { file: "se_earth_2.dat",      volume: 0.45 },   // ロックスパイク
      darkNebula:  { file: "se_dark_2.dat",       volume: 0.45 },   // ダークネビュラ
      volt:        { file: "se_thunder_2.dat",    volume: 0.45 },   // ボルト
      fireBreath:  { file: "se_fire_breath.dat",  volume: 0.45 },   // 火の息
      darkBreath:  { file: "se_dark_breath.dat",  volume: 0.45 },   // 奈落の息
      venomBreath: { file: "se_poison_breath.dat", volume: 0.45 },  // どくのいき
      bubble:      { file: "se_awa.dat",          volume: 0.45 },   // あわ
      bodyPress:   { file: "se_bodypress.dat",    volume: 0.45 },   // ボディプレス
      venomSting:  { file: "se_dokubari.dat",     volume: 0.45 },   // どくばり
      // エレメントバリア（自作）。ほかの技の音より 2dB ほど大きいので、0.45 から少し下げてそろえた
      veil:        { file: "se_veil.dat",         volume: 0.37 },
      // 作者が作った音（2026-11-26。assets/audio/効果音の一覧.md）。音の大きさはほかの技の音と同じくらいなので 0.45 にそろえた
      // 共鳴の4段目
      fire4:    { file: "se_fire_4.dat",    volume: 0.45 },   // インフェルノ
      water4:   { file: "se_water_4.dat",   volume: 0.45 },   // メイルシュトローム
      wind4:    { file: "se_wind_4.dat",    volume: 0.45 },   // テンペスト
      earth4:   { file: "se_earth_4.dat",   volume: 0.45 },   // テラバースト
      light4:   { file: "se_light_4.dat",   volume: 0.45 },   // セイントノヴァ
      dark4:    { file: "se_dark_4.dat",    volume: 0.45 },   // グランドネビュラ
      thunder4: { file: "se_thunder_4.dat", volume: 0.45 },   // ジャッジメント
      // 属性の斬撃（下の段と上の段で同じ音）。この音があるので、当たったときの斬撃音は重ねない
      slashFire:    { file: "se_slash_fire.dat",    volume: 0.45 },   // 火炎斬り・紅蓮斬り
      slashWater:   { file: "se_slash_water.dat",   volume: 0.45 },   // 流水斬り・激流斬り
      slashWind:    { file: "se_slash_wind.dat",    volume: 0.45 },   // 疾風斬り・旋風斬り
      slashEarth:   { file: "se_slash_earth.dat",   volume: 0.45 },   // 岩砕斬り・大地斬り
      slashThunder: { file: "se_slash_thunder.dat", volume: 0.45 },   // 稲妻斬り・雷神斬り
      slashLight:   { file: "se_slash_light.dat",   volume: 0.45 },   // 閃光斬り・聖光斬り
      slashDark:    { file: "se_slash_dark.dat",    volume: 0.45 },   // 影斬り・黒影斬り
      // 最上位のブレス
      fireBreathMax:    { file: "se_fire_breath_max.dat",    volume: 0.45 },   // 焦熱地獄
      waterBreathMax:   { file: "se_water_breath_max.dat",   volume: 0.45 },   // 怒濤海嘯
      darkBreathMax:    { file: "se_dark_breath_max.dat",    volume: 0.45 },   // 冥府魔道
      windBreathMax:    { file: "se_wind_breath_max.dat",    volume: 0.45 },   // 千刃旋風
      earthBreathMax:   { file: "se_earth_breath_max.dat",   volume: 0.45 },   // 大地崩落
      lightBreathMax:   { file: "se_light_breath_max.dat",   volume: 0.45 },   // 光芒万丈
      thunderBreathMax: { file: "se_thunder_breath_max.dat", volume: 0.45 },   // 万雷轟天
      // 起こす（リザレクト・リザレクション）。起きたときの回復の音は重ねない（BattleScene）
      revive:    { file: "se_revive.dat",    volume: 0.45 },
      // 体技など
      senteuchi: { file: "se_senteuchi.dat", volume: 0.45 },   // 先手打ち
      guard:     { file: "se_guard.dat",     volume: 0.45 },   // かばう・立ち塞がる（強化の音は重ねない）
      charge:    { file: "se_charge.dat",    volume: 0.45 },   // ちからため（強化の音は重ねない）
      // デス・デスラ・死の踊り・死神の鎌を出した瞬間。即死が入ったときは今までどおり statusInstantDeath
      death:     { file: "se_death.dat",     volume: 0.45 },

      // 状態異常。data/statuses.js の se から指す（掛かった瞬間と毒のダメージで鳴る）。
      // ★ 即死は、この音が「倒れる」音を兼ねる（直後の faint は鳴らさない。BattleScene）
      statusPoison:       { file: "poison.dat", volume: 0.45 },
      statusParalysis:    { file: "se_st_mahi.dat",  volume: 0.45 },
      statusSleep:        { file: "se_st_sleep.dat", volume: 0.45 },
      statusSeal:         { file: "se_st_fuin.dat",  volume: 0.45 },
      statusBlind:        { file: "se_st_blind.dat", volume: 0.45 },
      statusCurse:        { file: "se_st_noroi.dat", volume: 0.45 },
      statusInstantDeath: { file: "se_st_death.dat", volume: 0.45 },

      // 探索・拠点
      stairs:  { file: "stairs.dat",  volume: 0.45 },
      chest:   { file: "openbox.dat", volume: 0.45 },
      // 手に入れた音は宝箱と同じ（作るで鳴る）
      itemGet: { file: "openbox.dat", volume: 0.4 },
      spring:  { file: "izumi.dat",   volume: 0.45 },
      trap:    { file: "trap.dat",    volume: 0.45 },
      escape:  { file: "kikan.dat",   volume: 0.45 },   // 帰還の石で拠点へ戻る
      save:    { file: "save.dat",    volume: 0.4 },
      buy:     { file: "buy.dat",     volume: 0.45 }
    },

    /**
     * 決定・キャンセル・カーソルの音（js/core/Game.js の _pickUiSound）。
     * どの画面でも共通で、入力を見ている1か所から鳴る。
     *   confirm / cancel / cursor … se のid
     *   error                   … できなかったときの音。画面が game.playError() を呼ぶと、
     *                             その操作の決定音の**代わりに**鳴る（重ならない）
     *   cursorKeys              … カーソル音を鳴らすキー（data/input.js のアクション名）
     * 探索中の矢印キーは歩く操作なので鳴らさない（DungeonScene の silentCursor）。
     */
    ui: {
      confirm: "confirm",
      cancel:  "cancel",
      cursor:  "cursor",
      error:   "error",
      cursorKeys: ["up", "down", "left", "right"]
    },

    /**
     * 素材の出どころ。ここに書いた順で、
     *   ・タイトル画面の左下
     *   ・「遊び方」の「音楽・効果音について」
     * の両方にそのまま並ぶ。
     *
     *   label … 種類（「音楽」「効果音」など）。「音楽：ユーフルカ …」の先頭の語
     *   name  … 作者名・サイト名
     *   url   … サイトのURL。表記にURLが要らないサイトなら省いてよい
     *   note  … 補足（何に使ったか、など）。「遊び方」だけに出る
     *
     * ★ クレジット表記が条件の素材を使うときは、**必ずここに足すこと**。
     *   魔王魂・OtoLogic・効果音ラボなど、表記が要るサイトは多い。
     *   表記の書き方（サイト名だけでよいか、URLも要るか）は
     *   サイトごとに違うので、各サイトの規約に合わせて書く。
     *
     * ★ もうひとつ、**再配布して良いかも確かめること**。
     *   GitHubなどにファイルを置くこと自体が再配布にあたる。
     *   「素材の再配布禁止」とある素材は、置き方を考える必要がある。
     *
     * 書き方の例：
     *   { label: "効果音", name: "魔王魂", url: "https://maou.audio/", note: "戦闘の音" }
     */
    credits: [
      { label: "音楽", name: "ユーフルカ", url: "https://youfulca.com/", note: "タイトル・拠点・探索・戦闘・主との戦いのBGM" },
      { label: "音楽", name: "音楽の卵", url: "https://ontama-m.com/", note: "勝利・敗北・萌芽の穴の戦闘・大会の戦闘のBGM" },
      { label: "効果音", name: "ポケットサウンド", url: "https://pocket-se.info/", note: "決定・宝箱・階段など" },
      // se_*.wav（技の音・毒以外の状態異常・外れ）はすべて自作なのでクレジット不要。
      // 打撃・斬撃・回復・強化・弱体・泉・帰還（dageki1/2・zangeki1・heal・buff・debuff・izumi・kikan.mp3）は
      // 効果音ラボ（https://soundeffect-lab.info/）。表記は任意なので出していない
      { label: "効果音", name: "OpenTracks", url: "https://opentracks.com/", note: "毒の効果音" }
    ]
  };
})(window.MyGame);
