/**
 * effects.js
 * 技を当てたときに出す演出の「型」。
 *
 * ▼ 考え方
 * 技ごとに絵を用意しない。形の型をいくつか用意し、
 * 色は data/elements.js の属性色をそのまま使う。
 * こうすると、同じ「弾ける」が火なら赤く、水なら青く出る。
 * 技が増えても、増えるのは data/skills.js の effect 1行だけ。
 *
 * ▼ 書き方
 * shape    : どんな形で描くか（描き方は js/ui/SkillEffect.js が持つ）
 * duration : 出てから消えるまでの時間（ms）
 * glow     : にじみの強さ。暗い背景で色が沈まないようにする。0で無し
 * hitAt    : 当たる瞬間（duration の何割のところか。0〜1）。書くと、戦闘では演出を先に始めて、
 *            ダメージの数字・HPバー・揺れ・音・文を、この瞬間まで待ってから出す（v1.8.0 作者の指定）。
 *            書かない演出は今までどおり、演出と数字が同時に出る。待ちには戦闘速度が掛かり、決定キーで飛ばせる
 * hitSe    : この型で当たったときの音（data/audio.js の se のid）。
 *            書かなければ hit（打撃音）。斬る型だけ slash（斬撃音）にしてある。
 *            通常攻撃は種族の attackEffect（data/monsters.js）で型が決まるので、
 *            爪や翼で斬る種族は自然と斬撃音になる
 * 残りの項目は shape ごとに意味が変わる（下のコメントを参照）
 *
 * 色は指定しない。使う技の属性から決まる。
 * どうしても固定したいときだけ color を書く。
 *
 * ★ 型を増やすときは、ここに1エントリ足して
 *   js/ui/SkillEffect.js に描き方を1つ足す（他は変更不要）。
 */
(function (NS) {
  "use strict";

  NS.rawData.effects = {
    // 属性が無いときに使う色（data/elements.js の none と同じ）
    defaultColor: "#9aa4c0",
    // どの型でも中心に置く明るい芯の色
    coreColor: "#ffffff",

    /**
     * 強化・弱体（data/skills.js の modifier）の演出の色。
     *
     * これらの技は属性ではなく「何が変わるか」で色を決める。
     * そのほうが、守りが上がったのか攻撃が上がったのかが目で分かるため。
     * 上がるときも下がるときも同じ色で、向きは名前の横の印（↑↓）で伝える。
     */
    statColors: {
      hp:      "#5fd18c",   // 緑
      attack:  "#e8542a",   // 赤
      defense: "#4fb0d1",   // 青
      speed:   "#7fd9a8",   // 明るい緑
      pp:      "#8b6fd6"    // 紫
    },

    shapes: {
      /**
       * 打つ。中心から輪が広がり、短い線が四方へ散る。
       *   radius … 輪がどこまで広がるか
       *   rays / rayLength … 散る線の本数と長さ
       */
      impact: {
        shape: "impact",
        duration: 420,
        glow: 8,
        radius: 54,
        lineWidth: 4,
        rays: 7,
        rayLength: 26
      },

      /**
       * 斬る。太い筋が斜めに走る。
       *   streaks … 筋の本数（少しずつ遅れて走る）
       *   length / thickness … 筋の長さと太さ
       *   tilt … 傾き（回転数。0.125 で45度）
       */
      slash: {
        shape: "slash",
        hitSe: "slash",
        duration: 460,
        glow: 10,
        streaks: 3,
        length: 108,
        thickness: 9,
        tilt: -0.1,
        spread: 24
      },

      /**
       * 弾ける。中心から粒が放射状に飛ぶ。
       *   count / radius … 粒の数と飛ぶ距離
       */
      burst: {
        shape: "burst",
        duration: 580,
        glow: 12,
        count: 22,
        radius: 66,
        minSize: 4,
        maxSize: 9
      },

      /**
       * 閃光。円が一気に広がって、すぐ消える。
       *   radius … どこまで広がるか
       *   alpha  … いちばん濃いときの薄さ。上げすぎると相手が見えなくなる
       */
      flash: {
        shape: "flash",
        duration: 440,
        glow: 18,
        radius: 76,
        alpha: 0.55
      },

      /**
       * 光芒。閃光の一段上（シャインなど、属性の基本技より強い技に）。
       * 大きく閃いたあと、光の筋が四方へ伸び、輪が外へ抜け、少し遅れてもう一度光る。
       *   radius     … 最初の閃きの大きさ（flash の 76 より大きい）
       *   rays / rayLength / rayWidth … 筋の本数・長さ・太さ（1本おきに短くなる）
       *   ringRadius / ringWidth      … 外へ抜ける輪
       *   alpha      … 閃きの濃さ。flash と同じく上げすぎると相手が見えなくなる
       * ★ さらに上の技を作るときは、この数値を上げるより新しい型を足すほうがよい
       *   （「最終奥義」に見せるための型はまだ無い）
       */
      radiance: {
        shape: "radiance",
        duration: 640,
        glow: 22,
        radius: 96,
        rays: 8,
        rayLength: 126,
        rayWidth: 5,
        ringRadius: 136,
        ringWidth: 4,
        alpha: 0.55
      },

      /**
       * --- 属性技の2段目（RC-1。シャインの radiance と同じく、1段目の型の一段上） ---
       */

      // フレイム。burst の一段上。大きく弾け、足元から炎の舌が立ち昇り、輪が抜けて、もう一度小さく弾ける
      //   tongues / tongueHeight / tongueWidth … 炎の数・高さ・太さ   accentColor … 3つに1つの炎と火の粉の色
      blaze: {
        shape: "blaze",
        duration: 720,
        glow: 18,
        accentColor: "#ffd75e",
        radius: 84,
        count: 26,
        minSize: 4,
        maxSize: 9,
        tongues: 7,
        tongueHeight: 96,
        tongueWidth: 18,
        ringRadius: 124,
        ringWidth: 4
      },

      // ウェーブ。rain の一段上。白い泡を乗せた波が横から2枚打ち寄せ、しぶきが散り、足元に波紋が広がる
      //   waveWidth / waveHeight / thickness … 波の大きさと太さ   drops / splash … しぶきの数と飛ぶ強さ
      surge: {
        shape: "surge",
        duration: 820,
        glow: 14,
        waveWidth: 160,
        waveHeight: 74,
        thickness: 12,
        drops: 24,
        splash: 96,
        minSize: 3,
        maxSize: 6,
        rippleRadius: 72,
        footY: 30
      },

      // ロックスパイク。shards の一段上。足元から尖った岩が突き上がり、かけらが飛び散って、土煙が広がる
      //   spikes / spikeHeight / spikeWidth / spread … 棘の数・高さ・太さ・並ぶ幅   gravity … かけらの落ちる強さ
      spikes: {
        shape: "spikes",
        duration: 820,
        glow: 10,
        spikes: 5,
        spikeHeight: 84,
        spikeWidth: 22,
        spread: 92,
        footY: 34,
        count: 16,
        radius: 84,
        gravity: 170,
        minSize: 4,
        maxSize: 8,
        dustRadius: 84
      },

      /**
       * 降りそそぐ。上から粒が落ちてくる。
       *   spread … 左右の広がり   height … どこから落ちてくるか
       */
      rain: {
        shape: "rain",
        duration: 680,
        glow: 10,
        count: 26,
        spread: 56,
        height: 78,
        minSize: 4,
        maxSize: 7
      },

      /**
       * 共鳴（RC-1）。共鳴の技を出した本人のまわりに出す（当てる演出とは別）。
       * 足元に響きの輪が何重にも広がり、光の粒が本人のまわりを巡りながら昇る。
       * 色は技の属性（回復の共鳴はHPの緑）。data/categories.js の skillKind.resonance.casterEffect が指す
       *   ripples / radius / flatten … 広がる輪の数・大きさ・つぶれ具合（足元の楕円に見せる）
       *   motes / orbit / rise        … 巡る粒の数・回る半径・昇る高さ
       *   turns                       … 粒が回る回数
       */
      //   layered: true … 奥（体の後ろ）と手前を描き分ける。後ろを回る粒はモンスターの後ろに隠れる（RC-1）
      resonance: {
        shape: "resonance",
        layered: true,
        duration: 760,
        glow: 14,
        ripples: 3,
        radius: 58,
        flatten: 0.38,
        lineWidth: 3,
        motes: 8,
        orbit: 30,
        rise: 34,
        turns: 1.2,
        minSize: 3,
        maxSize: 5
      },

      /**
       * 砕ける。粒が横へ飛び、落ちていく。
       *   gravity … 落ちる強さ
       */
      shards: {
        shape: "shards",
        duration: 620,
        glow: 10,
        count: 18,
        radius: 58,
        gravity: 100,
        minSize: 4,
        maxSize: 8
      },

      /**
       * 毒の息。並びの中心で吐き出され、左右へもくもくと広がる。
       * 1体ずつではなく並び全体に1回だけ出す型なので、技の側に effectAt: "center" を書く。
       *   spread  … 左右にどこまで広がるか（敵3体の両端 ±210 より少し広く）
       *   height  … 上下の広がり
       *   count / minSize / maxSize … 煙の玉の数と大きさ
       *   bubbles … 煙の中から昇る泡の数
       *   color / accentColor … 毒の色は属性に無いので、ここで固定する
       *     （紫の煙に、毒の印と同じ緑を混ぜる。data/statuses.js の poison.color）
       *   ほかに書けるもの（火の息・奈落の息で使う）
       *     color を書かない … 技の属性の色になる
       *     particle       … 昇る粒の形。"bubble"（泡の輪・既定）／"spark"（四角い粒）
       *     particleColor  … 粒の色（省略で accentColor）
       *     lift           … 煙が昇る高さ（既定 12）
       *     particleScale  … 粒の大きさの倍率（既定 1）
       */
      miasma: {
        shape: "miasma",
        duration: 1000,
        glow: 14,
        color: "#9b59c9",
        accentColor: "#7fd06a",
        spread: 250,
        height: 70,
        count: 22,
        minSize: 18,
        maxSize: 34,
        bubbles: 16
      },

      /**
       * 火の息。どくのいきと同じ「息」の形で、色は火の属性色（橙）。
       * 3つに1つの煙を黄色にし、火の粉（spark）を散らす。熱で煙が高く昇る（lift）
       */
      flameBreath: {
        shape: "miasma",
        duration: 950,
        glow: 18,
        accentColor: "#ffd75e",
        particle: "spark",
        spread: 250,
        height: 70,
        lift: 34,
        count: 24,
        minSize: 16,
        maxSize: 32,
        bubbles: 22
      },

      /**
       * 眠りの胞子（キノコン）。眠りの印と同じ淡い紫の煙に、白い泡がゆっくり昇る。
       * ほかの息より遅く、低く広がる（眠気が漂う感じ）
       */
      sporeCloud: {
        shape: "miasma",
        duration: 1200,
        glow: 12,
        color: "#a88ce0",
        accentColor: "#e0d6ff",
        particleColor: "#f2eeff",
        particle: "bubble",
        spread: 250,
        height: 60,
        lift: 6,
        count: 22,
        minSize: 16,
        maxSize: 30,
        bubbles: 14
      },

      /**
       * あわ。色は水の属性色（青）。
       * 3つに1つの煙を淡い水色にし、大きめの泡の輪（particleScale）をたくさん昇らせる。
       * 泡は軽いので少しだけ浮く
       */
      bubbleBreath: {
        shape: "miasma",
        duration: 1000,
        glow: 14,
        accentColor: "#bfe9ff",
        particleColor: "#e6f7ff",
        particle: "bubble",
        particleScale: 1.8,
        spread: 250,
        height: 70,
        lift: 16,
        count: 20,
        minSize: 14,
        maxSize: 28,
        bubbles: 26
      },

      /**
       * 奈落の息。色は闇の属性色（紫）。
       * 3つに1つの煙を濃い闇色にして底の深さを出し、薄紫の粒が漂う。煙はあまり昇らない（重い闇）
       */
      abyssBreath: {
        shape: "miasma",
        duration: 1100,
        glow: 16,
        accentColor: "#3a2466",
        particleColor: "#c9b8ff",
        particle: "spark",
        spread: 260,
        height: 80,
        lift: 4,
        count: 26,
        minSize: 20,
        maxSize: 38,
        bubbles: 18
      },

      /**
       * --- 全体の共鳴（RC-1。ゲイル・ダークネビュラ・ボルト） ---
       * 息と同じく並び全体に1回だけ出す型（effectAt: "center"）。
       * 相手ひとりずつの位置を画面からもらうので、つむじ風や稲妻はそれぞれの相手の上に出る
       */

      // ゲイル。風の筋が並びを左から右へ駆け抜け、相手ごとの足元からつむじ風が昇る
      //   streaks / streakLength … 風の筋の数と長さ   rings / swirlRadius / rise … つむじ風の輪
      galeSweep: {
        shape: "galeSweep",
        duration: 900,
        glow: 12,
        spread: 270,
        height: 80,
        streaks: 10,
        streakLength: 150,
        thickness: 4,
        rings: 3,
        swirlRadius: 42,
        rise: 64,
        lineWidth: 3,
        count: 20,
        minSize: 4,
        maxSize: 7
      },

      // しんくうは。三日月の風の刃が相手ひとりずつへ飛んで切り、切り口へ空気が吸い込まれる
      //   travel … 刃が飛ぶ距離   bladeRadius … 刃の大きさ   stagger … 相手ごとの遅れ   pullRadius … 吸い込みの輪
      vacuumWave: {
        shape: "vacuumWave",
        duration: 820,
        glow: 12,
        travel: 220,
        bladeRadius: 44,
        thickness: 7,
        stagger: 0.08,
        cutLength: 100,
        pullRadius: 60,
        lineWidth: 3,
        count: 8,
        minSize: 3,
        maxSize: 5
      },

      // 稲妻斬り。斜めの一閃のあと、切り口へ稲妻が落ちて火花が散る（音は当たった瞬間の雷。技の hitSe）
      //   tilt … 一閃の傾き（回転数）   boltAt … 稲妻が落ち始める時刻   height / jag … 稲妻の長さとジグザグ
      thunderSlash: {
        shape: "thunderSlash",
        duration: 720,
        glow: 16,
        length: 130,
        thickness: 10,
        tilt: 0.36,
        boltAt: 0.3,
        height: 150,
        segments: 6,
        jag: 26,
        boltWidth: 7,
        glowRadius: 26,
        sparks: 9,
        sparkRadius: 46
      },

      // ダークネビュラ。渦を巻く闇の雲が並び全体を呑み込み、中で星が瞬く
      //   turns … 雲が回る量   coreRadius … 相手ごとに沈む闇の大きさ   stars / starColor … 星
      darkNebula: {
        shape: "nebula",
        duration: 1100,
        glow: 16,
        accentColor: "#2a1650",
        starColor: "#e6dcff",
        spread: 270,
        height: 100,
        count: 40,
        minSize: 14,
        maxSize: 28,
        turns: 0.35,
        coreRadius: 40,
        stars: 18
      },

      // ボルト。相手ひとりずつに稲妻が少しずつ遅れて落ち、並び全体が光る
      //   height … 稲妻の長さ   stagger … 相手ごとの遅れ   jag … ジグザグの幅   alpha … 全体の閃きの濃さ
      thunderstorm: {
        shape: "thunderstorm",
        duration: 900,
        glow: 20,
        spread: 270,
        height: 170,
        stagger: 0.08,
        segments: 7,
        jag: 34,
        boltWidth: 7,
        alpha: 0.3,
        sparks: 8,
        sparkRadius: 40
      },

      // いなずま（ザンガルドの体技）。ボルトと同じ型で、稲妻を太く・ほぼ同時に落とし、短く強く光らせる
      lightning: {
        shape: "thunderstorm",
        duration: 720,
        glow: 24,
        spread: 270,
        height: 200,
        stagger: 0.03,
        segments: 6,
        jag: 40,
        boltWidth: 11,
        alpha: 0.42,
        sparks: 12,
        sparkRadius: 52
      },

      /**
       * --- 技の大幅追加（2026-10-20）の型 ---
       * 無属性の技が多いので、灰色にならないよう、意味の分かる色を color で固定したものがある。
       * 強化・弱体で能力が変わる技（シールド・ブレイブ・鎧くずし など）は、color を書かず statColors の色になる
       */

      // 二連斬り。× の字に2本走る（1回当たるごとに出る）
      crossSlash: {
        shape: "crossSlash", hitSe: "slash", duration: 440, glow: 10,
        length: 112, thickness: 8, tilt: 0.125, delay: 0.2
      },

      // 捨て身の体当たり。打つ（impact）の重い版。反動の重さが伝わるよう、赤みのある色で固定
      crash: {
        shape: "crash", duration: 620, glow: 12, color: "#ff8a5c",
        radius: 74, lineWidth: 6, cracks: 7, crackLength: 50, count: 14, gravity: 150, minSize: 4, maxSize: 8
      },

      // ちからため。力が体に吸い込まれる。攻撃の赤
      gather: {
        shape: "gather", duration: 760, glow: 14, color: "#e8542a",
        radius: 86, count: 18, rings: 3, minSize: 3, maxSize: 6
      },

      // 鎧くずし。六角の盾が砕ける。色は下がる能力（防御の青）
      shatter: {
        shape: "shatter", duration: 760, glow: 10,
        radius: 46, fly: 42, gravity: 130
      },

      // しびれ針。針が刺さり、小さな稲妻が散る。麻痺の黄色（data/statuses.js の paralysis.color）
      needle: {
        shape: "needle", hitSe: "slash", duration: 560, glow: 12, color: "#ffd75e",
        length: 70, sparks: 7, sparkLength: 18
      },

      // シールド。六角の障壁。色は上がる能力（防御の青）
      barrier: {
        shape: "barrier", duration: 820, glow: 12, radius: 52
      },

      // 堅守の陣。障壁と同じ形で、受けるダメージが減ることを防御の青で見せる（能力ではないので色を固定）
      fortress: {
        shape: "barrier", duration: 900, glow: 14, color: "#4fb0d1", radius: 56
      },

      // ブレイブ・鼓舞の舞。矢じりが昇る。色は上がる能力（攻撃の赤）
      rally: {
        shape: "rally", duration: 760, glow: 12,
        radius: 42, rise: 72, count: 9, laneGap: 22, chevron: 9
      },

      // 足止めの舞。帯が巻きつき、締まりながら足元へずり落ちる。色は下がる能力（素早さの緑）
      entangle: {
        shape: "entangle", duration: 900, glow: 10,
        ribbons: 3, radius: 44, height: 72, turns: 1.6, groundRadius: 42, count: 8, minSize: 3, maxSize: 5
      },

      // ミステリーダンス。相手の体から光の玉が渦を巻いて抜け出し、頭の上で星が回る。PPの紫（statColors.pp）に桃色を混ぜる
      mystery: {
        shape: "mystery", duration: 1000, glow: 14, color: "#8b6fd6", accentColor: "#ff8ad8",
        count: 12, radius: 70, turns: 1.2, stars: 5, minSize: 4, maxSize: 7
      },

      // ヘイスト。速い筋が駆け抜ける。色は上がる能力（素早さの緑）
      haste: {
        shape: "haste", duration: 700, glow: 10,
        streaks: 9, width: 130, height: 72, radius: 36
      },

      // ハウリング。自分のまわりに咆哮の輪。与えるダメージが上がるので攻撃の赤で固定
      howl: {
        shape: "roar", duration: 760, glow: 12, color: "#e8542a",
        waves: 4, radius: 84, flatten: 0.75, lineWidth: 5, spikes: 14
      },

      // 威圧の咆哮。並び全体に1回だけ広がる咆哮（技の側に effectAt: "center"）。色は下がる能力（攻撃の赤）
      intimidate: {
        shape: "roar", duration: 900, glow: 14,
        waves: 4, radius: 300, flatten: 0.3, lineWidth: 6, spikes: 28
      },

      // エレメントバリア（v1.8.0。〇〇ベール7つの代わり）。光の幕が降りて包む。幕の帯と粒が7属性の色（data/elements.js と同じ色）
      elementBarrier: { shape: "elementBarrier", duration: 1000, glow: 16, color: "#e8f4ff",
        colors: ["#e8542a", "#4fb0d1", "#7fd9a8", "#c8a35e", "#ffd75e", "#f2f0d8", "#8b6fd6"],
        width: 70, height: 96, strips: 7, count: 14, minSize: 3, maxSize: 5 },
      // リフレクト（v1.8.0）。六角の鏡の板が体のまわりに集まって球になり、光が板の上を走る
      //   radius … 球の大きさ   panels … 板の数   sweep … 光の筋が走る速さ
      reflectWall: { shape: "reflectWall", duration: 1000, glow: 16, color: "#9fe6ff", accentColor: "#ffffff",
        radius: 52, panels: 10, panelSize: 15 },
      // リバーサル（v1.8.0）。足元から赤い気が立ち、体の前で刃のような弧が2本交差して構える
      reversal: { shape: "reversal", duration: 900, glow: 16, color: "#ff8a4a", accentColor: "#ffe0b0",
        radius: 48, spikes: 10 },
      // はね返した瞬間（反射の技。v1.8.0）。返した側の前で板がはじけ、矢じりが撃った側へ飛ぶ。
      // 色は返したもので変わる（共鳴は水色・攻撃は橙。BattleScene が渡す）
      reflectBounce: { shape: "reflectBounce", duration: 520, glow: 18, color: "#9fe6ff", accentColor: "#ffffff",
        radius: 40, arrows: 5 },

      // 幻惑の息。目をくらます暗い息（盲目の色。data/statuses.js の blind.color）。粒は暗い火の粉
      blindMist: {
        shape: "miasma", duration: 1100, glow: 8, color: "#6b625c",
        accentColor: "#2a2420", particleColor: "#d8d0c8", particle: "spark",
        spread: 250, height: 70, lift: 8, count: 24, minSize: 16, maxSize: 32, bubbles: 14
      },

      // しびれ粉。黄色い粉が広がり、きらきらした粒が舞う（麻痺の色）
      numbCloud: {
        shape: "miasma", duration: 1100, glow: 14, color: "#e8c84a",
        accentColor: "#fff3a0", particleColor: "#fffbe0", particle: "spark",
        spread: 250, height: 64, lift: 10, count: 22, minSize: 14, maxSize: 28, bubbles: 22
      },

      // サイレス。印の輪が締まる（封印の色。data/statuses.js の seal.color）
      sealRing: {
        shape: "sealRing", duration: 820, glow: 12, color: "#a77bd6", radius: 58, marks: 8
      },

      // 不吉な舞。頭の上の輪から影がしたたる（呪いの色。data/statuses.js の curse.color）
      hex: {
        shape: "hex", duration: 960, glow: 12, color: "#c04a7a", accentColor: "#3a1430",
        headOffset: 46, drips: 7, fall: 80, count: 12, minSize: 8, maxSize: 14
      },

      // ディンド。朝の光のような、やわらかいきらめき
      wake: {
        shape: "sparkle", duration: 760, glow: 14, color: "#ffe9a8", radius: 44, stars: 10, spread: 70, alpha: 0.5
      },

      // リカバー。澄んだ光が大きくふくらみ、きらめきが多い
      purify: {
        shape: "sparkle", duration: 900, glow: 18, color: "#bff4ff", radius: 58, stars: 16, spread: 86, alpha: 0.6
      },

      // 死神の鎌（シニガミ。2026-10-21 に作り直した）。刃の軌跡と残像 → 閃き → 体を横切る裂け目が割れる → 魂が昇る → 足元の波紋
      // 時間（作者の指定で長くした）：三日月は 0〜0.2 で走り、crescentHold（0.42）まで残ってから薄れる。
      //   赤い裂け目は cutAt（0.36）から。前は三日月がすぐ消え、裂け目も 0.16 で出ていた
      reap: {
        shape: "reap", duration: 2000, glow: 18, crescentHold: 0.42, cutAt: 0.36, color: "#d8dce8", accentColor: "#c0102a", particleColor: "#140812",
        soulColor: "#bfe0ff", souls: 7, soulRise: 110,
        // 三日月を大きく（作者の指定。前は radius 78・width 18）。裂け目・閃き・波紋もそれに合わせて大きくした
        radius: 125, width: 30, count: 24, minSize: 3, maxSize: 8, flashRadius: 95, cutLength: 130, ringRadius: 150
      },

      // 死神の鎌の前ぶれ。技を出した瞬間にシニガミのまわりに出す（技の casterEffect）。
      // 闇が吸い込まれ、足元の輪が縮み、最後に赤い目が強く光る。溜め（技の windupMs 840）と同じ長さ
      reapOmen: {
        shape: "reapOmen", duration: 840, glow: 10, color: "#2a0a18", accentColor: "#c0102a",
        radius: 92, count: 22, minSize: 6, maxSize: 12, eyeOffset: 16, eyeGap: 12
      },

      // 即死の技（デス・デスラ・死の踊り）。頭の上に赤黒い輪が浮かび、影がしたたって靄が沈む（不吉な舞と同じ形・色だけ違う）
      deathMark: {
        shape: "hex", duration: 1000, glow: 14, color: "#c0102a", accentColor: "#120008",
        headOffset: 46, drips: 9, fall: 86, count: 14, minSize: 8, maxSize: 15
      },

      // クレンズレイン。澄んだ水色の雨が降り、きらめく
      cleanseRain: {
        shape: "rain", duration: 760, glow: 12, color: "#9fe3ff", count: 26, spread: 56, height: 80, minSize: 3, maxSize: 6
      },

      /**
       * --- v1.3.0：ほかの技の演出を借りていた技の専用の型（2026-11-03 作者の指定で全部専用に） ---
       * 色を書いていないものは、属性の色か、変わる能力の色（statColors）になる
       */

      // キュア。体がやわらかく光り、十字の光が昇る（HPの緑）
      healing: {
        shape: "healing", duration: 820, glow: 14, color: "#5fd18c", radius: 34, crosses: 6, crossSize: 7, rise: 70
      },
      // キュアラ。キュアの大きい版。上から光の柱が降りる
      healingGreat: {
        shape: "healing", duration: 1000, glow: 18, color: "#5fd18c", radius: 40, crosses: 10, crossSize: 8, rise: 86, column: true
      },
      // キュアオール。キュアラと同じ量を全員へ。柱は降りず、1体ずつ十字の光が昇る
      healingAll: {
        shape: "healing", duration: 960, glow: 16, color: "#5fd18c", radius: 38, crosses: 8, crossSize: 7, rise: 78
      },
      // リザレクト。金色の光の柱が降り、十字の光が高く昇る（起きたときだけ出る）
      reviveRise: {
        shape: "healing", duration: 1200, glow: 22, color: "#ffe08a", radius: 44, crosses: 12, crossSize: 8, rise: 100, column: true
      },
      // 樹液の膜（ジュエキスライムの絆の技。2026-11-11）。琥珀のしずくが落ち、透けた膜が頭から体を包み、光が走って泡が昇る
      sapVeil: {
        shape: "sapVeil", duration: 1300, glow: 12, color: "#f0b040", deepColor: "#a86414", radius: 40, drops: 4
      },
      // 波さらい（v1.8.0）。相手のまわりに強化の光（上向きの印）が浮かび、横から来た波がそれをさらって流れ去る。
      // 色は水の属性の色。印は強化の緑（statColors.hp）
      tideSweep: {
        shape: "tideSweep", duration: 1150, glow: 12, buffColor: "#5fd18c", foamColor: "#e8fbff", width: 110, height: 90, marks: 5
      },
      // クレンズ。澄んだ雫が落ちて輪が広がり、きらめく
      cleanseDrop: {
        shape: "cleanse", duration: 860, glow: 12, color: "#9fe3ff", count: 7
      },
      // 主のやくそう。葉が体を巡りながら昇る
      herbLeaves: {
        shape: "herbLeaves", duration: 900, glow: 10, color: "#84c95a", count: 8
      },
      // こうか。板が集まって体を覆う。色は上がる能力（防御の青）
      hardenShell: {
        shape: "hardenShell", duration: 820, glow: 12, plates: 6, radius: 44
      },
      // ちからぬき。赤い粒が抜け出て、矢じりが沈む。色は下がる能力（攻撃の赤）
      drainAway: {
        shape: "drainAway", duration: 860, glow: 10, count: 14, minSize: 3, maxSize: 6
      },
      // 立ち塞がる。足元から石積みの壁がせり上がる
      standWall: {
        shape: "standWall", duration: 900, glow: 8, color: "#b9a27a", width: 96, height: 104
      },
      // 朧羽。ぼんやりした羽が舞い落ち、もやが包む（1体ずつに出る）
      hazyFeathers: {
        shape: "hazyFeathers", duration: 1000, glow: 12, color: "#a596d0", count: 7
      },
      // 導きの光。光が降りて体を照らし、足元から前へ光の跡が流れる（素早さの緑ではなく光の色で固定）
      guidingLight: {
        shape: "guidingLight", duration: 900, glow: 16, color: "#fff0a8"
      },
      // 王の号令。冠の光と、二重の衝撃の輪（王の金）
      royalCommand: {
        shape: "royalCommand", duration: 900, glow: 16, color: "#ffd75e"
      },
      // ララバイ。音符が揺れながら昇り、z が浮かぶ
      lullaby: {
        shape: "lullaby", duration: 1000, glow: 10, color: "#ff9ad0", count: 5
      },
      // 芽吹きの加護。足元から双葉が芽を出し、花びらが昇る
      sproutBlessing: {
        shape: "sproutBlessing", duration: 1000, glow: 10, color: "#84c95a", count: 5
      },
      // サンダー。上から稲妻が落ち、またたいて足元に光が弾ける（雷の色）
      thunderBolt: {
        shape: "thunderBolt", duration: 620, glow: 20, height: 150
      },
      // 青い眼光。二つの鋭い光がまたたき、横へ筋が走る（ヌマボネの眼窩の青）
      blueGlare: {
        shape: "blueGlare", duration: 760, glow: 16, color: "#5fa8ff"
      },
      // グレア。光の十字が大きく開いてすぐ閉じる（光の色）
      glareBeam: {
        shape: "glareBeam", duration: 620, glow: 22, length: 90
      },
      // 幻惑の瞳。大きな瞳が開き、渦の輪が広がる
      dazzleEye: {
        shape: "dazzleEye", duration: 860, glow: 14, color: "#c07ae0"
      },
      // ウィンド。三日月の刃が横切り、渦が残る（風の色）
      windCutter: {
        shape: "windCutter", hitSe: "slash", duration: 620, glow: 12, blades: 3
      },
      // 吸血。牙が噛み合い、赤い雫が昇る
      fangDrain: {
        shape: "fang", hitSe: "slash", duration: 760, glow: 10, color: "#d8344a", spill: "drops", count: 8
      },
      // 焔牙。牙が噛み合い、炎が立ち昇る（火の色）
      blazeFang: {
        shape: "fang", hitSe: "slash", duration: 760, glow: 16, spill: "flames", count: 10
      },
      // 歯車投げ。回る歯車が飛んできて当たり、火花が散る（真鍮の色）。1回当たるごとに出る
      gearHit: {
        shape: "gearHit", hitSe: "slash", duration: 520, glow: 10, color: "#c49a3a", radius: 16
      },
      // どくばり。針が突き刺さり、毒の雫が飛び散る（毒の色。data/statuses.js の poison.color）
      poisonSting: {
        shape: "poisonSting", hitSe: "slash", duration: 640, glow: 10, color: "#7fd06a", count: 9
      },
      // シャドウ。足元の影から黒い手が伸びて包む（闇の色）
      shadowGrasp: {
        shape: "shadowGrasp", duration: 760, glow: 12, count: 6
      },
      // 火炎斬り（v1.3.0）。三日月の太刀筋が右上から左下へ走り、筋に沿って炎の舌が立ち昇る。
      //   radius / width … 太刀筋の大きさと太さ   flames / flameHeight … 炎の数と高さ   embers … 火の粉
      flameSlash: {
        shape: "flameSlash", hitSe: "slash", duration: 720, glow: 18,
        radius: 92, width: 24, flames: 9, flameHeight: 66, embers: 12, minSize: 3, maxSize: 6
      },
      // 流水斬り。水の帯がS字に流れ、薄い帯が2本追いかける。水しぶきが飛んで落ちる。
      //   length / amplitude / width … 帯の長さ・うねり・太さ   drops / gravity … 雫の数と落ち方
      flowSlash: {
        shape: "flowSlash", hitSe: "slash", duration: 760, glow: 14,
        length: 184, amplitude: 30, width: 20, drops: 16, gravity: 110, minSize: 3, maxSize: 6
      },
      // 疾風斬り。細く鋭い筋が速く3本走り、切り口から風の線が横へ流れる。ほかの3つより短い。
      //   length / width … 筋の長さと太さ   gusts … 風の線の数
      galeSlash: {
        shape: "galeSlash", hitSe: "slash", duration: 460, glow: 12,
        length: 190, width: 7, gusts: 9
      },
      // 岩砕斬り。太い一撃が真上から落ち、当たったところから岩のかけらが飛び散る。
      //   length / width … 一撃の長さと太さ   cracks … ひび   rocks / gravity … かけらの数と落ち方
      rockSlash: {
        shape: "rockSlash", hitSe: "slash", duration: 760, glow: 10,
        length: 170, width: 52, cracks: 6, crackLength: 62, rocks: 12, gravity: 170, minSize: 6, maxSize: 13
      },

      // 烈火崩地斬（ウェポンの絆の技）。相手ひとりずつを炎の一閃で斬り下ろし、足元が割れて岩と火の粉が噴き上がる。
      // 並び全体に1回だけ出す型（技の側に effectAt: "center"）。一閃と火の粉は属性の色（火）、ひびと岩は earthColor（地の色）
      //   stagger … 相手ごとの遅れ   length / thickness … 一閃   crackWidth / groundY … ひびの幅と足元の位置   rise … 噴き上がる高さ
      blazingRift: {
        shape: "blazingRift", hitSe: "slash", duration: 1050, glow: 16,
        earthColor: "#c8a35e", stagger: 0.07,
        length: 190, thickness: 14, tilt: 0.17,
        crackWidth: 120, groundY: 48, rise: 96,
        rocks: 8, embers: 12, minSize: 4, maxSize: 9
      },

      /**
       * --- v1.8.0 の技（2026-11-25 から少しずつ描く。作者が見て決める） ---
       * ブレスの2段目（灼熱の息・大渦・深淵の息）は、1段目の息（miasma の項目）に、相手ひとりずつの足元の演出を重ねる
       */
      // 灼熱の息。火の息より濃く広い炎の息＋足元から立ち昇る炎の舌＋熱の揺らぎ
      scorchBreath: {
        shape: "scorchBreath", duration: 1100, glow: 20,
        accentColor: "#ffd75e", particle: "spark",
        spread: 260, height: 72, lift: 40, count: 28, minSize: 18, maxSize: 36, bubbles: 26,
        flames: 4, flameHeight: 100, groundY: 44
      },
      // 大渦。泡の息＋足元で回りながら締まる渦と、上へ細くなる水の輪（漏斗）・しぶき
      whirlpool: {
        shape: "whirlpool", duration: 1250, glow: 14,
        accentColor: "#bfe9ff", particleColor: "#e6f7ff", particle: "bubble", particleScale: 1.6,
        spread: 250, height: 60, lift: 12, count: 14, minSize: 12, maxSize: 24, bubbles: 14,
        foamColor: "#e8fbff", deepColor: "#16305a",
        radius: 64, arms: 3, squash: 0.4, groundY: 30, levels: 3, drops: 10
      },
      // 深淵の息。奈落の息より濃い闇＋足元の影だまりから伸びて絡みつく闇の手
      deepBreath: {
        shape: "deepBreath", duration: 1250, glow: 16,
        accentColor: "#2a1650", particleColor: "#c9b8ff", particle: "spark",
        spread: 260, height: 80, lift: 4, count: 28, minSize: 20, maxSize: 40, bubbles: 18,
        darkColor: "#1a0f33", tendrils: 4, reach: 92, groundY: 44
      },

      // ブレスの最上位（2026-11-25）。並び全体を包む大きな演出
      // 焦熱地獄。閃光 → 濃い炎の息 → 炎の海 → 火の粉 → 足元に燻る輪（焦熱）
      scorchingHell: {
        shape: "scorchingHell", duration: 1500, glow: 22, hitAt: 0.15,
        accentColor: "#ffd75e", deepColor: "#8a1a08", particle: "spark",
        spread: 300, height: 80, lift: 46, count: 32, minSize: 20, maxSize: 40, bubbles: 30,
        flames: 22, flameHeight: 150, embers: 30, groundY: 44
      },
      // 怒濤海嘯。並びより背の高い大波（2枚）が左から右へ抜け、しぶきが上がり、水が降る
      tidalBreath: {
        shape: "tidalBreath", duration: 1500, glow: 14, hitAt: 0.25,
        foamColor: "#e8fbff", deepColor: "#1d4f8a",
        spread: 300, waveHeight: 200, waveLength: 380, groundY: 56
      },
      // 冥府魔道。闇の息 → 並びの上に冥府の門 → 闇の流れが降り注ぐ → 亡者の炎が回って昇る → 門が閉じる
      netherBreath: {
        shape: "netherBreath", duration: 1600, glow: 16, hitAt: 0.45,
        accentColor: "#2a1650", particleColor: "#c9b8ff", particle: "spark",
        spread: 260, height: 70, lift: 4, count: 22, minSize: 18, maxSize: 34, bubbles: 14,
        darkColor: "#12081f", rimColor: "#c9b8ff", gateHeight: 130, gateWidth: 280, wisps: 5
      },
      // 千刃旋風。風の息 → 並び全体を巻く旋風の輪 → その中を回る無数の刃 → 相手ごとの切り傷と赤いしずく（裂傷）
      //   stormHeight … 旋風の高さ   blades / bladeSize … 刃の数と大きさ   cuts / cutColor … 切り傷の数と色
      bladeStorm: {
        shape: "bladeStorm", duration: 1400, glow: 14, hitAt: 0.3,
        accentColor: "#eef6ff", particle: "spark",
        spread: 280, height: 70, lift: 20, count: 20, minSize: 16, maxSize: 30, bubbles: 12,
        stormHeight: 110, rings: 5, blades: 44, bladeSize: 18, bladeColor: "#eef6ff",
        cuts: 4, cutColor: "#ff6b6b"
      },
      // 大地崩落。砂の息 → 足元に地割れが走る → 地面が割れて板が傾きながら沈み、穴が開く → 岩が降って土煙が立つ
      //   groundY … 足元の高さ   pitColor … 穴の奥の色   rocks … 飛ぶ岩のかけらの数
      earthCollapse: {
        shape: "earthCollapse", duration: 1500, glow: 10, hitAt: 0.36,
        accentColor: "#d9b77a", particle: "spark",
        spread: 300, height: 60, lift: 10, count: 22, minSize: 18, maxSize: 34, bubbles: 14,
        groundY: 44, pitColor: "#1a120a", rocks: 26
      },
      // 万雷轟天。雷の息 → 並びの上に雷雲 → 細い雷が降りそそぐ（万雷）→ 相手ごとに太い雷と閃光 → 体を這う電気（麻痺）
      //   cloudHeight / cloudMinY … 雷雲の高さ（画面の上で止める）   bolts … 細い雷の数
      thunderHeaven: {
        shape: "thunderHeaven", duration: 1600, glow: 22, hitAt: 0.42,
        accentColor: "#fff6c2", particle: "spark",
        spread: 300, height: 70, lift: 20, count: 18, minSize: 16, maxSize: 30, bubbles: 16,
        cloudColor: "#3b4060", cloudHeight: 120, cloudMinY: 18, bolts: 18, groundY: 44
      },
      // 光芒万丈。光の息 → 並びの上に光の玉が昇り、回りながら光の筋（光芒）を四方へ伸ばす
      //   → 相手ごとに光の柱が降りる → 白い閃光 → 相手のまわりで星がまたたく（盲目）
      //   sunHeight / sunMinY … 光の玉の高さ（画面の上で止める）   rays … 光の筋の数   stars … またたく星の数
      radiantBreath: {
        shape: "radiantBreath", duration: 1600, glow: 22, hitAt: 0.4,
        accentColor: "#ffffff", particle: "spark",
        spread: 300, height: 70, lift: 24, count: 20, minSize: 16, maxSize: 30, bubbles: 18,
        sunHeight: 110, sunMinY: 34, sunRadius: 30, rays: 16, rayLength: 420, stars: 6
      },

      // 強化の技（2026-11-25）。色は書かず、上がる能力の色（statColors）になる
      // ウォークライ。とげとげの声の輪が広がり、体から炎のような闘気が立ちのぼり、矢じりが昇る
      //   shouts … 声の輪の数   radius … 輪の広がり   flames … 闘気の炎の数
      warCry: {
        shape: "warCry", duration: 950, glow: 14, hitAt: 0.15,
        shouts: 3, radius: 78, spikes: 14, flames: 7, flameHeight: 70, count: 6
      },
      // プロテクション。足元から六角の板が下から上へ組み上がって体を包み、光がなでてから体に吸い込まれる
      //   radius … 包む大きさ   rings / cells … 六角の段の数と1段の数
      protection: {
        shape: "protection", duration: 1000, glow: 12, hitAt: 0.3,
        radius: 54, rings: 4, cells: 8, cellSize: 13
      },
      // クイックル。足元に小さな翼が生えて羽ばたき、緑の風が体を巻いて昇り、羽根が舞う
      //   wing … 翼の大きさ   swirls … 昇る風の数   feathers … 舞う羽根の数
      quickle: {
        shape: "quickle", duration: 950, glow: 10,
        wing: 40, swirls: 3, radius: 40, rise: 80, feathers: 8
      },
      // オーバードライブ。足元が光って、太い闘気の柱が立ち、まわりで稲妻がはじけ、炎の闘気が体を包む（ウォークライの一段上）
      //   pillar … 柱の太さ   flames … 闘気の炎の数   arcs … はじける稲妻の数
      overdrive: {
        shape: "overdrive", duration: 1150, glow: 20, hitAt: 0.25, accentColor: "#ffd75e",
        pillar: 52, pillarHeight: 150, flames: 10, flameHeight: 96, arcs: 5, count: 14
      },
      // アイギス。体の前に大きな丸い盾が現れて輝き、光がなでたあと、六角の殻になって体を包む（プロテクションの一段上）
      //   shield … 盾の大きさ   radius … 殻の大きさ
      aegis: {
        shape: "aegis", duration: 1300, glow: 18, hitAt: 0.45, accentColor: "#fff3c4",
        shield: 46, radius: 60, rings: 4, cells: 9, cellSize: 14
      },
      // アクセル。胸の前の時計の針がどんどん速く回り、緑の風が速く昇り、最後に速い筋が四方へはじける（クイックルの一段上）
      //   dial … 時計の大きさ   swirls … 昇る風の数   burst … はじける筋の数
      accel: {
        shape: "accel", duration: 1100, glow: 14, hitAt: 0.55,
        dial: 30, swirls: 5, radius: 42, rise: 96, burst: 12
      },

      // 弱体の技（2026-11-25）。色は書かず、下がる能力の色（statColors）になる
      // クラック。体の前に守りの板が現れ、当たったところからひびが走り、割れて落ちる
      //   plate … 板の大きさ   cracks … ひびの本数   shards … かけらの数
      crack: {
        shape: "crack", duration: 1000, glow: 12, hitAt: 0.45,
        plate: 40, cracks: 6, shards: 10
      },
      // スロウ。頭の上の時計の針がだんだん遅くなって止まり、足元に重い沼が広がって、下向きの矢じりが沈む
      //   dial … 時計の大きさ   count … 矢じりの数
      slow: {
        shape: "slow", duration: 1100, glow: 10, hitAt: 0.2,
        dial: 24, count: 6, radius: 46
      },
      // コラプス。六角の殻が体を包んだあと、ひびが入り、板がばらばらに崩れ落ちる（全体）
      collapse: {
        shape: "collapse", duration: 1200, glow: 12, hitAt: 0.4,
        radius: 54, rings: 4, cells: 8, cellSize: 13
      },
      // グラビティ。上から重い輪が何枚も降りて体を押しつぶし、足元の地面がへこみ、粒が下へ引かれる（全体）
      //   rings … 降りる輪の数   radius … 輪の大きさ   count … 引かれる粒の数
      gravity: {
        shape: "gravity", duration: 1150, glow: 12, hitAt: 0.3, darkColor: "#0c1020",
        rings: 5, radius: 50, count: 14
      },
      // シャター。クラックの一段上。響きの輪が外から板へ集まり、ひびが走って、板がはじけ飛ぶ（防御の青）
      //   plate … 板の大きさ   shards … はじけるかけらの数
      shatterArmor: {
        shape: "shatterArmor", duration: 1150, glow: 16, hitAt: 0.5,
        plate: 46, cracks: 8, shards: 18
      },
      // バインド。スロウの一段上。足元に魔法の輪が描かれ、光の鎖が3本巻きついて締まり、前に錠の印が光る（素早さの緑）
      //   radius … 鎖の輪の大きさ   chains … 鎖の本数   links … 1本の鎖の輪の数
      bind: {
        shape: "bind", duration: 1200, glow: 12, hitAt: 0.4,
        radius: 48, chains: 3, links: 26
      },

      // 回復と蘇生（2026-11-25）
      // キュアリス。足元に回る花の魔法陣 → 光の柱 → 体のまわりで光の花びらが開いて昇る → 頭の上に大きな十字が輝いてほどける
      //   radius … 魔法陣の大きさ   petals … 花びらの数   column … 光の柱を出すか   bigCross … 頭の上の十字を出すか
      curaris: {
        shape: "fullHeal", duration: 1250, glow: 18, hitAt: 0.3, color: "#5fd18c", accentColor: "#e9ffe0",
        radius: 44, petals: 8, crosses: 10, rise: 96, column: true, bigCross: true
      },
      // キュアリスオール。キュアリスを全員へ。柱と大きな十字は出さず、魔法陣と花びらと十字の光
      curarisAll: {
        shape: "fullHeal", duration: 1150, glow: 16, hitAt: 0.3, color: "#5fd18c", accentColor: "#e9ffe0",
        radius: 40, petals: 8, crosses: 8, rise: 86
      },
      // リザレクション。上から金の羽根が舞い降り、触れたところから金の柱が立ち、背に光の翼が開き、頭の上に光の輪が浮かぶ
      //   wing … 翼の大きさ   feathers … 1枚の翼の羽根の数
      resurrection: {
        shape: "resurrection", duration: 1600, glow: 22, hitAt: 0.28, color: "#ffe08a", accentColor: "#fffbe8",
        radius: 44, wing: 90, feathers: 7, crosses: 12, rise: 110
      },

      // 支える技（2026-11-26）
      // リフレッシュ。体のまわりに弱体の印（下向きの矢じり・暗い色）が浮かび、澄んだ光の渦が下から巻き上げて砕き、きらめきが昇る
      //   marks … 弱体の印の数   radius … 渦の大きさ   markColor … 弱体の印の色
      refresh: {
        shape: "refresh", duration: 1100, glow: 14, hitAt: 0.45, color: "#8fe3d0", markColor: "#a58bd0",
        marks: 6, radius: 46, stars: 12
      },
      // ハッシュ。相手の左右から音の波が出て、縮みながら平らな線になって消え（静寂）、頭の上に封印の輪が閉じる。色は封印の紫
      //   waves … 片側の音の波の数
      hush: {
        shape: "hush", duration: 1100, glow: 12, hitAt: 0.5, color: "#a77bd6",
        waves: 3, radius: 40
      },
      // かばう。横から大きな盾が滑りこんで体の前に立ち、ぶつかった輪が広がって、光がなでる
      //   shield … 盾の大きさ   from … 盾が来る横の距離
      guardAlly: {
        shape: "guardAlly", duration: 900, glow: 12, hitAt: 0.28, color: "#ffcf6b",
        shield: 34, from: 120
      },
      // 分け与え。PPの紫の玉が上から弧を描いて降り、体に吸いこまれて、まわりの輪が半分まで満ちる
      //   orbs … 玉の数   radius … 満ちる輪の大きさ
      sharePp: {
        shape: "sharePp", duration: 1100, glow: 14, hitAt: 0.35, color: "#8b6fd6", accentColor: "#d9ccff",
        orbs: 7, radius: 46
      },
      // 先手打ち。速い筋が横から集まり、相手の上で鋭い星がはじけ、残像の矢じりが流れる
      //   streaks … 速い筋の数   star … 星の大きさ
      quickStrike: {
        shape: "quickStrike", duration: 560, glow: 12, hitAt: 0.3,
        streaks: 8, star: 34
      },
      // 黄昏の風。夕焼け色の風の帯が並びを左から右へ吹き抜け、相手のまわりの強化の印（上向きの矢じり）を吹き飛ばす
      //   buffColor … 強化の印の色   marks … 相手ごとの印の数   streaks … 風の筋の数
      duskWind: {
        shape: "duskWind", duration: 1200, glow: 12, hitAt: 0.25, color: "#f0a060", accentColor: "#b88ae0", buffColor: "#5fd18c",
        spread: 280, height: 90, marks: 4, streaks: 14
      },

      // 属性の共鳴の3段目（2026-11-26）。2段目（フレイム・ウェーブ・ゲイル・ロックスパイク）の一段上
      // ブレイズ。炎の舌が相手のまわりを渦を巻いて昇り、真ん中で白く光って、火柱と火の粉が上へはじける
      //   tongues … 渦の炎の数   radius … 渦の大きさ   embers … 火の粉の数
      blazeVortex: {
        shape: "blazeVortex", duration: 900, glow: 20, hitAt: 0.45, accentColor: "#ffd75e",
        tongues: 10, radius: 50, height: 100, embers: 18
      },
      // トレント。左から太い水流がまっすぐ打ちこみ、しぶきが上がり、吸い取った水の粒が左へ流れ戻る
      //   width … 水流の太さ   drops … しぶきの数   drain … 流れ戻る粒の数
      torrentJet: {
        shape: "torrentJet", duration: 1000, glow: 14, hitAt: 0.2, foamColor: "#e8fbff", deepColor: "#1d4f8a",
        width: 34, length: 260, drops: 16, drain: 10
      },
      // サイクロン。相手ごとに足元から竜巻が立ち、上へ広がりながら回って、葉と粒が巻き上がる（全体）
      //   funnelHeight … 竜巻の高さ   rings … 輪の数   debris … 巻き上がる粒の数
      cycloneFunnel: {
        shape: "cycloneFunnel", duration: 1000, glow: 12, hitAt: 0.2,
        funnelHeight: 130, rings: 7, debris: 10
      },
      // ロックバースト。まわりから岩が集まって大岩になり、ひびが光って、四方へ炸裂する。足元に土煙の輪
      //   gather … 集まる岩の数   boulder … 大岩の大きさ   shards … 炸裂するかけらの数
      rockBurst: {
        shape: "rockBurst", duration: 950, glow: 10, hitAt: 0.5,
        gather: 9, boulder: 30, shards: 18
      },
      // プリズム。相手の上に光の三角柱が現れ、上から入った白い光が6色に分かれて相手へ降り注ぎ、星がまたたく
      //   prismSize … 三角柱の大きさ   colors … 分かれる光の色
      prism: {
        shape: "prism", duration: 1050, glow: 16, hitAt: 0.42, prismSize: 22,
        colors: ["#ff8a8a", "#ffc27a", "#fff38a", "#8affc1", "#8ad1ff", "#c49aff"]
      },
      // アビス。足元に闇の淵が開いて渦を巻き、闇の手が伸びて、闇の球が相手を呑みこみ、淵へ沈んで消える
      //   radius … 淵の大きさ   tendrils … 闇の手の数
      abyss: {
        shape: "abyss", duration: 1250, glow: 16, hitAt: 0.5, darkColor: "#12081f", rimColor: "#c9b8ff",
        radius: 60, tendrils: 6
      },
      // プラズマ。相手ごとに電気の球がはじけ、球と球のあいだを稲妻がつなぎ、最後に球がはじける（全体）
      //   orb … 球の大きさ
      plasma: {
        shape: "plasma", duration: 1250, glow: 20, hitAt: 0.25, orb: 34
      },

      // 属性の共鳴の4段目（最上位。2026-11-26）。画面を属性の色に染めて、大きく派手に出す
      // インフェルノ。画面が赤く染まる → 足元に溶岩の魔法陣が開く → 巨大な火柱が噴き上がり、閃光と衝撃の輪
      //   → 火の玉が四方へ降り、火の粉が舞う → 足元に炎の輪が燃え残る
      //   pillar / pillarHeight … 火柱の太さと高さ   meteors … 降る火の玉の数   ring … 燃え残る炎の数
      inferno: {
        shape: "inferno", duration: 1750, glow: 26, hitAt: 0.28, accentColor: "#ffd75e", deepColor: "#5a0a02",
        radius: 80, pillar: 120, pillarHeight: 280, meteors: 8, embers: 40, ring: 14
      },
      // メイルシュトローム。画面が深い青に染まる → 足元に巨大な渦が開いて速く回る → 渦から水の壁がせり上がって相手を包む
      //   → 水の壁が崩れて大きなしぶき → 吸い取った水が3本の流れになって左へ戻る
      //   radius … 渦の大きさ   walls / wallHeight … 水の壁の数と高さ
      maelstrom: {
        shape: "maelstrom", duration: 1750, glow: 18, hitAt: 0.4, foamColor: "#e8fbff", deepColor: "#0b2a55",
        radius: 120, arms: 5, walls: 16, wallHeight: 190, drops: 30
      },
      // テンペスト。画面が深い緑に染まる → 風の筋が何本も画面を駆け抜ける → 相手ひとりずつの足元から巨大な竜巻
      //   → 竜巻の中で風の刃が相手を斬り、足元に衝撃の輪 → 大きな突風が画面を薙いで、竜巻がほどけて広がる（全体）
      //   streaks … 風の筋の数   funnelHeight / levels … 竜巻の高さと段の数   debris … 巻き上がる木の葉の数
      tempest: {
        shape: "tempest", duration: 1700, glow: 16, hitAt: 0.35, accentColor: "#effff6", deepColor: "#0b2a1d",
        streaks: 28, funnelHeight: 210, levels: 14, debris: 12
      },
      // テラバースト。画面が土の色に染まる → 並びの真ん中から左右へ大地の割れ目が走り、マグマのような光が漏れる
      //   → 相手ひとりずつの足元から岩の柱が突き上がる → 破片・土煙・衝撃の輪 → 体に光るひびが残る（全体）
      //   spikes / spikeHeight … 岩の柱の数と高さ   rocks … 飛び散る破片の数
      terraBurst: {
        shape: "terraBurst", duration: 1700, glow: 8, hitAt: 0.4, accentColor: "#ffb347", deepColor: "#2a1606",
        rockColor: "#5a4026", spikes: 7, spikeHeight: 150, rocks: 14
      },
      // セイントノヴァ。画面が暗い藍に沈む → 相手に重なって聖なる魔法陣（二重の輪と六芒星）が開き、光が集まる
      //   → 魔法陣が1点に縮んで大爆発。画面が白く光り、光芒と大きな十字の星、衝撃の輪 → 光の十字架と降る光の粒
      //   radius … 魔法陣の大きさ   rays / rayLength … 光芒の数と長さ
      saintNova: {
        shape: "saintNova", duration: 1700, glow: 24, hitAt: 0.42, accentColor: "#ffe08a", deepColor: "#120e2a",
        radius: 78, rays: 18, rayLength: 380, motes: 28, sparkles: 26
      },
      // グランドネビュラ。ダークネビュラの超進化として、並び全体に1つの大きな星雲を出す（作者の指定 11-26）
      //   画面が闇に沈み星がまたたく → 並びの真ん中に、紫と桃色の腕が渦を巻く巨大な星雲が開く
      //   → 速く回りながら真ん中へ吸い込まれて黒い穴になる → 並び全体を覆う闇の爆発・紫の破片と輪
      //   → 相手ひとりずつに闇が沈み、呪いの靄が昇る（全体）
      //   spread / flatten … 星雲の広さと平たさ   arms / puffs … 腕の数と腕ごとの雲の数   twinkles … 中で瞬く星   shards … 破片
      grandNebula: {
        shape: "grandNebula", duration: 1750, glow: 18, hitAt: 0.45, accentColor: "#e07ad8", deepColor: "#06020e",
        starColor: "#e6dcff", stars: 40, spread: 400, flatten: 0.34, arms: 3, puffs: 22, twinkles: 26, shards: 28
      },
      // ジャッジメント。画面が夜空の色に沈む → 相手の上に雷の紋章が開いて回り、輪の上を稲妻が走る
      //   → 紋章から光の柱と巨大な稲妻が落ち、画面が白く光る → まわりに追いの雷・足元を這う稲妻・衝撃の輪 → 体のまわりで稲妻がはじける
      //   sigil / sigilMinY … 紋章の大きさと、画面の上で止める高さ   column … 光の柱の太さ   branches … 足元を這う稲妻の数
      judgment: {
        shape: "judgment", duration: 1700, glow: 22, hitAt: 0.45, accentColor: "#fffbe0", deepColor: "#090b1c",
        sigil: 96, sigilMinY: 22, column: 70, branches: 9
      },

      // 1.8.0 の斬撃（2026-11-26）。当たる瞬間（hitAt）で数字が出る
      // 閃光斬り。白い芯の光の刃がまっすぐ走る → 切り口で十字の星と横の光の筋・光の輪 → 光の欠片が散る
      //   length / width … 刃の長さと太さ   flare … 十字の星の大きさ   shards … 欠片の数
      lightSlash: {
        shape: "lightSlash", hitSe: "slash", duration: 640, glow: 16, hitAt: 0.18,
        length: 170, width: 12, flare: 46, shards: 12
      },
      // 影斬り。うすい影の刃が2本先に走り、紫の縁に黒い芯の刃が続く → 切り口から黒い煙が滲んで垂れ、細い影がうねる
      //   accentColor … 黒い芯と煙の色   smoke … 煙の数
      shadowSlash: {
        shape: "shadowSlash", hitSe: "slash", duration: 720, glow: 12, hitAt: 0.22, accentColor: "#1a0c30",
        length: 170, width: 13, smoke: 14
      },
      // 紅蓮斬り。炎の三日月が2本、× の字に走って炎の舌が立つ → 交わったところで爆炎が四方へ噴き出し、衝撃の輪 → 火の粉
      //   radius / width … 太刀筋の大きさと太さ   flameHeight … 炎の舌の高さ   burst … 噴き出す炎の数
      crimsonSlash: {
        shape: "crimsonSlash", hitSe: "slash", duration: 950, glow: 18, hitAt: 0.3, accentColor: "#ffd75e", deepColor: "#b3150a",
        radius: 96, width: 30, flameHeight: 70, burst: 12, embers: 18
      },
      // 雫断ち（ウルヴァーグの絆の技）。上から雫が落ちてくる → 左から速い水の筋が走り、雫が落ちきる前に一閃 →
      // 雫が二つに割れて左右へ落ち、切り口から細かいしぶきが散る
      //   length / width … 一閃の長さと太さ   drop … 雫の大きさ   streaks … 速い筋の数   drops … しぶきの数
      dropCleave: {
        shape: "dropCleave", hitSe: "slash", duration: 720, glow: 14, hitAt: 0.34, accentColor: "#e8fbff", deepColor: "#1d5fa8",
        length: 200, width: 9, drop: 16, streaks: 7, drops: 14, minSize: 2, maxSize: 4
      },
      // 激流斬り。水の刃が相手のまわりを回り込んで横一文字に薙ぐ → 切り口から水が噴き出し、泡の輪 → 吸い取った水が2本の流れで左へ戻る
      //   radius / width … 薙ぐ輪の大きさと刃の太さ   drops … しぶきの数
      torrentSlash: {
        shape: "torrentSlash", hitSe: "slash", duration: 950, glow: 14, hitAt: 0.3, accentColor: "#e8fbff", deepColor: "#1d5fa8",
        radius: 96, width: 22, drops: 22, jets: 6
      },
      // 旋風斬り。風の刃が3枚、相手のまわりを回りながら輪を縮める → × の字に鋭い筋が2本 → 風の筋と木の葉がらせんで上へ抜ける
      //   radius … 旋風の始めの大きさ   length … × の筋の長さ   leaves … 木の葉の数
      whirlSlash: {
        shape: "whirlSlash", hitSe: "slash", duration: 850, glow: 14, hitAt: 0.32, accentColor: "#effff6",
        radius: 92, length: 160, leaves: 10
      },
      // 大地斬り。太い刃が真上から足元まで振り下ろされる → 足元から左右へ大地が割れ、岩の柱が順に突き上がる → かけらと土煙
      //   length / width … 刃の長さと太さ   spikes / spikeHeight … 岩の柱の数と高さ   rocks … かけらの数
      earthSlash: {
        shape: "earthSlash", hitSe: "slash", duration: 900, glow: 8, hitAt: 0.28, accentColor: "#f3dfae", rockColor: "#5a4026",
        length: 200, width: 13, spikes: 6, spikeHeight: 70, rocks: 14
      },
      // 雷神斬り。稲妻をまとった刃が走る → 切り口へ上から太い稲妻が落ちて大きく光る → 四方へ稲妻が走り火花が散る → 体のまわりで小さな稲妻がはじける
      //   topMinY … 稲妻が落ち始める高さ（画面の上の端で止める）   arcs … 四方へ走る稲妻の数
      raijinSlash: {
        shape: "raijinSlash", duration: 900, glow: 18, hitAt: 0.3, accentColor: "#fffbe0",
        length: 180, width: 14, topMinY: 8, arcs: 8
      },
      // 聖光斬り。縦に一閃、続けて横に一閃して光の十字が残る → 十字が強く光り、光の柱と輪 → 金の羽根が舞い落ちる
      //   length … 十字の大きさ   feathers … 羽根の数
      holySlash: {
        shape: "holySlash", hitSe: "slash", duration: 950, glow: 18, hitAt: 0.32, accentColor: "#ffe08a",
        length: 170, feathers: 8
      },
      // 黒影斬り。切り上げる刃が黒い残像を4枚引き連れて走る → 切り口が黒い裂け目になって開き、ふちが紫に脈打つ
      //   → 裂け目から影の手が伸びて相手をつかみ、紫の粒が沈む
      darkShadowSlash: {
        shape: "darkShadowSlash", hitSe: "slash", duration: 950, glow: 14, hitAt: 0.3, accentColor: "#1a0c30", pinkColor: "#e07ad8",
        length: 190
      },
      // 乱れ斬り。1回当たるごとに、毎回ちがう向きに鋭い筋が2本すばやく走り、交わったところで火花が散る（3〜4回）
      wildSlash: {
        shape: "wildSlash", hitSe: "slash", duration: 420, glow: 10, hitAt: 0.2, color: "#dfe6f0",
        length: 150
      },
      // 会心斬り。急所に赤い照準が縮みながら合わさり、きらりと光る → 細く鋭い筋が一瞬で貫く → 赤と金の星がはじけ、鋭い線が四方へ
      //   length … 筋の長さ
      criticalSlash: {
        shape: "criticalSlash", hitSe: "slash", duration: 800, glow: 14, hitAt: 0.42, color: "#ff5a5a", accentColor: "#fff3c4",
        length: 220
      },
      // 薙ぎ払い。並び全体に1回だけ出す。右から左へ、並びより広い三日月の刃が横に走り、通り過ぎた相手ごとに切り傷と火花
      //   spread / height … 刃が描く弧の横の広さと高さ
      sweepSlash: {
        shape: "sweepSlash", hitSe: "slash", duration: 800, glow: 12, hitAt: 0.25, color: "#dfe6f0",
        spread: 400, height: 70
      },
      // 渾身斬り。橙の力の輪が何重にも縮み、空気が震える → とても太い刃が重く一気に走る → 白く光り、横に衝撃波が2つ。切り口が光って残る
      //   length / width … 刃の長さと太さ   accentColor … 力の色
      allOutSlash: {
        shape: "allOutSlash", hitSe: "slash", duration: 1000, glow: 14, hitAt: 0.45, color: "#e8eef8", accentColor: "#ff8a3c",
        length: 240, width: 24
      },
      // つるぎの舞。1回当たるごとに、細い刃が3枚リボンの跡を引いて相手のまわりを回り、真ん中で交わって花びらの光が散る（3〜6回）
      swordDance: {
        shape: "swordDance", hitSe: "slash", duration: 520, glow: 12, hitAt: 0.4, color: "#c8e6ff", accentColor: "#ff9ad5"
      },
      // ばくれつけん。1回当たるごとに、体の3か所へすばやく続けて拳が当たる（4回）。当たるところは毎回変わる
      burstFist: {
        shape: "burstFist", duration: 420, glow: 10, hitAt: 0.2, color: "#ffb870"
      },
      // 陽炎の舞。味方ひとりずつに、足元から揺れる熱の筋が立ち昇り、体の左右にうすい影の姿が2つずれて揺れる。金の粒が昇る
      //   waves / height … 熱の筋の数と高さ   shift … 影の姿がずれる幅   motes … 粒の数
      heatHaze: {
        shape: "heatHaze", duration: 1100, glow: 12, hitAt: 0.35, color: "#ffb35e", accentColor: "#ffe08a",
        waves: 10, height: 110, shift: 26, motes: 14
      },
      // ハッスルダンス。1回回復するごとに、音符が2つ跳ねて飛び出し、緑の十字がぽんと膨らんで紙吹雪が散る（3〜6回）
      //   confetti … 紙吹雪と音符の色   pieces … 紙吹雪の数
      hustleDance: {
        shape: "hustleDance", duration: 640, glow: 10, hitAt: 0.3, color: "#5fd18c",
        confetti: ["#ffd75e", "#ff8ad8", "#7fd9ff", "#5fd18c"], pieces: 14
      },
      // 彗星のサンバ。1回当たるごとに、上の左か右から光の尾を引いた彗星が飛んできて当たり、星がはじける（4回）
      //   reach / drop … 彗星が飛んでくる横と上の距離   topMinY … 画面の上の端で止める高さ
      cometSamba: {
        shape: "cometSamba", duration: 520, glow: 14, hitAt: 0.45, color: "#9fe8ff", accentColor: "#ffe08a",
        reach: 200, drop: 150, topMinY: 6
      },
      // 不動のボレロ。1回当たるごとに、青い四角の紋章が回りながら降りてきて、どしんと落ちる。地面に四角い衝撃と土ぼこり（4回）
      //   size … 紋章の大きさ
      steadyBolero: {
        shape: "steadyBolero", duration: 560, glow: 12, hitAt: 0.4, color: "#4fb0d1", accentColor: "#d8f2ff",
        size: 34
      }
    }
  };
})(window.MyGame);
