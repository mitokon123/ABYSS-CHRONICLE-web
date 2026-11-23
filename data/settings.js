/**
 * settings.js
 * プレイヤーが調整できる設定の定義。
 *
 * storageKey : 設定を保存するときの localStorage のキー名
 * items      : 設定項目。上から順に設定画面へ並ぶ
 *   id       : 識別子（SettingsManager.get(id) で参照する）
 *   label    : 表示名
 *   type     : "range"（数値を左右で増減。v1.7.0 から ◀・棒・値の所を押しても変わる）
 *   min/max/step : range のときの範囲と刻み
 *   default  : 初期値
 *   unit     : 表示につける単位（省略可）
 *   valueLabels : 値ごとの表示名（min の値から順に対応）。指定すると数値の代わりに表示する
 *   description : 選んでいるとき、一覧の下の欄に出す説明（v1.4.0）
 *   valueDescriptions : 値ごとの説明（min の値から順に対応。v1.6.1）。指定すると description の代わりに出す
 *
 * ★ 設定項目を増やすときは items に1エントリ足すだけでよい。
 *   （音量は音声システムの実装後に実際の再生音量へつながる）
 */
(function (NS) {
  "use strict";

  NS.rawData.settings = {
    storageKey: "abyss-chronicle.settings",

    /**
     * タイトルの音量（v1.7.0。作者の指定「タイトル専用で覚える」2026-11-24。
     *   同じ日に「表面は設定、中身は全体音量だけ」）。
     *   タイトルではこの音量で鳴らす（無ければ前と同じく、最後に保存した設定の音量）。
     *   ファイルを選ぶと、そのファイルの音量に切り替わる。
     *   新しく始めたファイルは、この音量から始まる（ほかの項目は既定値）。
     *   storageKey … 保存先（ファイルの設定とは別）  items … タイトルで変えられる項目
     */
    titleVolume: {
      storageKey: "abyss-chronicle.titleVolume",
      items: ["masterVolume"]
    },
    items: [
      /**
       * 別の画面を開く項目。
       *   type: "action" … 左右では変わらない。決定で action の画面が開く
       * ★ 数値ではないので、横棒ではなく「いまの中身」が右に出る。
       *   開く先を増やすときは、SettingsScene._activate に1行 case を足す。
       */
      { id: "playerLook", label: "名前と見た目", type: "action", action: "playerSetup",
        description: "主人公の名前・髪型・髪の色・服などを変える。決定か、行を押すと開く。" },

      // 戦闘の文が進む速さ。1が最も遅く、8が最速。演出（技の演出・HPバーなど）の速さは変えない（v1.6.1 作者の指定）
      // 実際の倍率は data/ui.js の battle.animation.speedTable で決まる。
      //   遅い 954ms ／ 標準 620ms ／ 最速 62ms（出来事1つあたり）。最も遅いは決定キーで1つずつ（manualLevels）
      // 「標準」が文章を読み切れる速さになるようにしてある。
      // 説明は速さごとに変わる（valueDescriptions。v1.6.1 作者の指定）
      { id: "battleSpeed", label: "戦闘速度", type: "range",
        min: 1, max: 8, step: 1, default: 4,
        valueLabels: ["最も遅い", "遅い", "やや遅い", "標準",
                      "やや速い", "速い", "とても速い", "最速"],
        valueDescriptions: [
          "決定キーを押したときだけ戦闘が進む。押すたびに次の文へ。",
          "文がゆっくり進む。決定キーで次の文へ送れる。",
          "文が少しゆっくり進む。決定キーで次の文へ送れる。",
          "押さなくても文が流れる。決定キーで次の文へ送れる。",
          "文が少し速く進む。決定キーで次の文へ送れる。",
          "文が速く進む。決定キーで次の文へ送れる。",
          "文がとても速く進む。決定キーで次の文へ送れる。",
          "文が目で追えないほど速く進む。"
        ],
        description: "戦闘の文が進む速さ。演出の速さはどれも同じ。" },

      // 技の演出と、画面の揺れ・発光の濃さ。
      // 実際の倍率は data/ui.js の battle.animation.effectScale で決まる。
      // 0（なし）にすると演出そのものを出さないので、
      // 光の点滅が苦手な人でも遊べる。
      { id: "effectLevel", label: "エフェクトの濃さ", type: "range",
        min: 0, max: 3, step: 1, default: 2,
        valueLabels: ["なし", "薄い", "標準", "濃い"],   // v1.6.1 作者の指定（全くなし・薄め・濃いめ から）
        description: "技の演出・画面の揺れ・光の強さ。「なし」にすると演出が出ない。" },

      // マウスのホイールを1段回したときに動く行数。
      // 一覧の選択にも、図鑑の説明のスクロールにも同じだけ効く。
      { id: "scrollSpeed", label: "スクロール速度", type: "range",
        min: 1, max: 5, step: 1, default: 1,
        valueLabels: ["1行ずつ", "2行ずつ", "3行ずつ", "4行ずつ", "5行ずつ"],
        description: "マウスのホイールを1段回したときに動く行数。一覧にも、右の説明にも効く。" },

      // 初めての場面で出る説明を出すか。
      //   ふきだしの Esc を押すと、ここが「出さない」に変わる。
      //   戻せば、まだ見ていない説明はまた出る（一度見たものは出ない）。
      //   ★ 0/1 の2択なので range のまま作れる。専用の型は要らない
      { id: "tutorial", label: "チュートリアル", type: "range",
        min: 0, max: 1, step: 1, default: 1,
        valueLabels: ["出さない", "出す"],
        description: "初めての場面で出る説明。「出す」に戻すと、まだ見ていない説明がまた出る。" },

      { id: "masterVolume", label: "全体音量", type: "range",
        min: 0, max: 100, step: 10, default: 70, unit: "%",
        description: "全ての音の大きさ。BGM・効果音の元の音量を変える。" },   // 説明は v1.6.1 作者の指定
      { id: "bgmVolume",    label: "BGM音量",  type: "range",
        min: 0, max: 100, step: 10, default: 70, unit: "%",
        description: "曲の大きさ。変更後すぐ反映される。" },
      { id: "seVolume",     label: "効果音量", type: "range",
        min: 0, max: 100, step: 10, default: 80, unit: "%",
        description: "効果音の大きさ。変更後すぐ反映される。" }
    ]
  };
})(window.MyGame);
