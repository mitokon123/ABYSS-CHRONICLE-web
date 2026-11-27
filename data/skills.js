/**
 * skills.js
 * スキル（技）の定義。数値はすべてここで管理する。
 *
 * kind          : 技の種類（data/categories.js の skillKind）
 *                   resonance 共鳴 / breath ブレス / body 体技 / slash 斬撃 / dance 踊り
 *                 通常攻撃だけは書かない（どの種類にも入らない）。
 *                 種類で決まるもの：計算の係数（battle.js の damage.byKind）・
 *                 ブレスの「よけられない・クリティカルなし」（skillKind の rules）・封印で止まるか（共鳴だけ）
 * power         : 威力（0 なら通常攻撃と同じ計算になる）
 *                 ★ 斬撃（kind: "slash"）は「通常攻撃の基礎に掛ける倍率」（噛みつく＝1.15。2026-10-22 作者の指定）。
 *                   画面にもそのまま「威力 1.15」と出る。死神の鎌（踊りで damageKind が斬撃）は今までどおり威力の数
 *                 ★ 体技（v1.4.1・2026-11-12 作者の指定。クリティカルは出ない）：
 *                   1体の体技は斬撃と同じく倍率（体当たり＝1.1）。全体の体技は威力がそのままダメージの基礎（固定。攻撃力・防御力は効かない）。
 *                   分け方は BattleSystem.bodyModeOf
 *                 ★ ただし heal / modifier / status のどれかを持つ技は、威力0だと
 *                   「掛けるだけでダメージを与えない技」になる。
 *                   その技は図鑑・戦闘の説明に「威力」の行が出ない（BattleSystem.dealsDamage）
 * pp            : 使うのに必要なPP。0 なら何度でも使える
 * accuracy      : 命中率（0〜1）。書かなければ battle.js の defaultAccuracy（=100%）
 * criticalBonus : クリティカル率への上乗せ（書かなければ 0）
 * canCritical   : false と書くとクリティカルが出なくなる。
 *                 範囲全体の技はこれを付ける方針（1体ずつ判定すると、
 *                 運だけで一気に崩れる回ができてしまうため）。ブレスは書かなくても false
 * evadable      : false と書くと、相手の回避率（monsters.js の evasion）で
 *                 かわされなくなる。省略すると かわされる（ブレスは書かなくても false）
 * target        : 対象。次の3つが書ける
 *     "enemy"      … 相手を1体選ぶ
 *     "self"       … 自分。相手を選ばずに出せる
 *     "ally"       … 味方を1体選ぶ（自分も選べる）。回復役の技はこれ
 *     "allEnemies" … 向かい側の盤面にいる全員。宣言とPPの支払いは1回で、
 *                    命中判定とダメージは1体ずつ出す（避ける子・耐える子が出る）
 *     "allAllies"  … 自分の側の盤面にいる全員（自分も含む。v1.0.0 芽吹きの加護）。相手を選ばずに出せ、外れない。
 *                    書ける働きは modifier（全員に強化）と wardStatus（BattleSystem._performSkillOnAllies）
 *
 * wardStatus    : true で、状態異常を1回防ぐ守りを付ける（特性「芽吹き」と同じ守り）。
 *                 すでに守りがある者は付け直すだけ（重ならない）。戦闘が終わると消える。いまは使っている技が無い
 * drain         : 与えたダメージのうち、何割を自分のHPに戻すか（0〜1）。
 *                 書かなければ吸わない。威力を低くして釣り合いを取る
 * cureStatus    : 状態異常を治す技（クレンズ）。{ statuses: ["poison"] } のように書く
 *                 （道具の cureStatus と同じ決まり。statuses を省略すると curable のものを全部）。
 *                 治すものが無ければ「治すものがなかった」になる。探索中にも使える
 * ppDamage      : 相手のPPを減らす技（v1.0.0 ミステリーダンス）。{ min, max } の幅で減らす。PPが足りなければ残りぶんだけ
 * dispel        : 相手に掛かっている強化をすべて消す技（v1.8.0 波さらい。BattleSystem._applyDispel）。
 *                 { chance } … 0〜1。書かなければ必ず消す（ジャッジメントの「50% で消す」はここに 0.5 と書く予定）。
 *                 消えるのは技で掛かった強化（強化の色で出るもの。樹液の膜のような毎ターンの回復も入る）と、ちからためでためた力（作者の指定 2026-11-24）。
 *                 弱体は残る。威力も持つ技はダメージのあとで消す。敵は強化がいちばん多い相手を狙い、誰にも無ければ選ばない
 * sureHit       : true なら必中（v1.8.0）。どの技の影響も受けない（作者の指定）：盲目・命中の弱体（朧羽など）を受けず、よけられない。
 *                 立ち塞がるも無視して、選んだ相手に当たる（BattleSystem._coverFor）
 * useMessage    : 技を出したときの文を差し替える（「{actor} は やくそうを 使った!」のように、技に見せたくないとき）
 * heal          : HPを回復する技。{ min, max } か { amount } を書く
 *                 ★ 攻撃力では変わらない固定値にすること。
 *                   攻撃力に比例させると、育てるほど回復量まで伸びて手がつけられなくなる
 * ▼ modifier : 一時的な強化・弱体（バフ／デバフ）。書かなければ何も掛からない
 *     duration : 何ターン続くか。かけたターンを含めて数える
 *     effects  : 掛かる効果。書き方は data/abilities.js の特性とまったく同じ
 *                （statMultiplier / statBonus / damageDealt / damageTaken）
 *     message  : かかったときの文（省略時は messages.js の modifierUp / modifierDown）
 *     popup    : 画面上部の札に出す言葉（省略時は「防御力上昇」のように、変わる能力から作る）
 *     effects には accuracyMultiplier（命中の倍率。盲目とは別）も書ける
 *     exclusive に同じ名前を書いた強化どうしは重ならない。両方掛かっていれば、強いほう（1 からの離れが大きいほう）だけ効く
 *       （鼓舞の舞とハウリング "powerUp"。v1.5.0。EffectSystem.collectEffects）
 *   tier : 4 と書いた技（属性技の4段目。まだ無い）は、朧羽などの命中の弱体を受けない（v1.5.0 作者の指定）
 * cover         : true なら「立ち塞がる」。ターンの頭で（素早さに関係なく）出し、そのターン
 *                 向かい側からの攻撃をすべて自分が受ける（範囲全体の技も全員ぶん）。
 *                 受けるダメージを減らしたいときは modifier で damageTaken を掛ける（BattleSystem._applyCovers）
 *   威力（power）を持たない技は、掛けるだけでダメージを与えない。
 *   同じ技を重ねがけしても効果は重ならず、残りターン数が建て直されるだけ。
 *   戦闘が終わると全部消える。
 * ▼ status : 状態異常をあたえる。書き方は modifier と同じ考え方で1行だけ
 *     { id: "poison", chance: 0.6 }
 *   chance に相手の耐性（monsters.js の statusResist）が掛かって通りやすさが決まる。
 *   中身は data/statuses.js。威力も持つ技（どくばり）は、毒を入れたあとダメージへ進む。
 *   範囲技（allEnemies）では**1体ずつ判定する**ので、かかる子とかからない子が分かれる。
 * element       : 属性id（elements.js を参照）。"none" は耐性の影響を受けない
 * effect        : 当たったときの演出の型（data/effects.js の shapes のid）
 *                 省略すると演出なし。色は element から決まるので指定しない
 *                 （型の側に color が書いてあれば、そちらが優先。毒の息 miasma など）
 * effectAt      : "center" と書くと、演出を1体ずつではなく、並び全体の中心に1回だけ出す。
 *                 範囲技を「1回の息」に見せたいときに使う（どくのいき）
 * se            : 出した瞬間の音（data/audio.js の se のid）。省略で無音。
 *                 ★ se を書いた技は、当たったときの打撃／斬撃音を鳴らさない（技の音だけで完結）。
 *                 se の無い技は、effect の型（data/effects.js の hitSe）から打撃／斬撃が鳴る
 * hitSe         : 当たった音を自分で決めたいときだけ書く（"hit" / "slash" で鳴らす、null で止める）。ふつうは書かない
 * windupMs      : 技を出してから当たるまでの時間（ミリ秒）。溜めの長い専用の動きと、当たる瞬間をそろえるときだけ書く（死神の鎌）
 * damageKind    : ダメージの計算だけ、別の種類の式を使う（死神の鎌：踊りだが斬撃の式）
 * element2      : 2つ目の属性（烈火崩地斬）。相手ひとりずつ、element と element2 のよく効くほうで当たる。
 *                 演出の色と技の並べ替えは element を使う
 * hits          : 何回当てるか（二連斬り＝2）。1回ずつ命中を判定する
 * randomTargets : true なら hits の1回ごとに、向かい側の盤面からでたらめに1体選ぶ（歯車投げ。v1.3.0）
 * maxDamage     : 1回あたりのダメージの上限（二連斬り＝200。何回か当てる技は1回ずつに掛かる）。書かなければ上限なし
 * modifierSe    : 強化・弱体が掛かった瞬間の音を変えたいときだけ書く（null で鳴らさない。エレメントバリア）。
 *                 書かなければ buff / debuff が鳴る（BattleScene._playModifierSe）
 * description   : 技を選ぶときに出る説明文
 * fieldUse      : 探索中（戦闘の外）に、仲間画面の「技を使う」から使えるか。
 *                 ・威力を持つ技（攻撃の技）は、何を書いても使えない
 *                 ・HPを回復する技（heal）は、書かなくても使える（使わせたくないときは false）
 *                 ・それ以外の技は true と書いたものだけ（いまの仕組みで働くのは回復だけ）
 *                 判定は Game.isFieldSkill
 * showInDex     : false なら図鑑の「技」に載せない（省略すると載る）。
 *                 通常攻撃は覚える技ではなくコマンドなので、これで隠してある
 *
 * ★ 新しい技の追加は、このファイルに1エントリ足すだけでよい。
 *   演出も、型の名前を1行書くだけ（技ごとに絵を用意しない）。
 */
(function (NS) {
  "use strict";

  NS.rawData.skills = {
    // 「攻撃」コマンドで使う通常攻撃。PPを使わないので何度でも出せる
    normalAttack: {
      id: "normalAttack",
      name: "攻撃",
      power: 0,
      pp: 0,
      target: "enemy",
      element: "none",
      effect: "impact",
      // 覚える技ではなくコマンドなので、図鑑には載せない
      showInDex: false,
      description: "PPを使わない基本の攻撃。いつでも出せる。"
    },

    tackle: {
      id: "tackle",
      name: "体当たり",
      kind: "body",
      // v1.4.1（作者の指定）：1体の体技は倍率になったので 7 → 1.1（通常攻撃の1.1倍）。
      // 盲目の効果を受けない（ignoreBlind）。朧羽などの命中の倍率は受ける
      power: 1.1,
      ignoreBlind: true,
      pp: 1,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "impact",
      description: "体ごとぶつかる。消費が軽く、必ず当たる。"
    },

    bite: {
      id: "bite",
      name: "噛みつく",
      kind: "slash",
      // 斬撃なので倍率（通常攻撃の基礎 ×1.15）。2026-10-22 に威力15 から（作者）
      power: 1.15,
      pp: 2,
      accuracy: 0.9,
      criticalBonus: 0.15,
      target: "enemy",
      element: "none",
      effect: "slash",
      description: "鋭くかみつく。クリティカルが出やすいが、やや外れやすい。"
    },

    // 各属性の基本技。威力15 / PP2 / 命中100% でそろえてある
    ember: {
      id: "ember",
      name: "ファイア",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "fire",
      effect: "burst",
      se: "fire",
      description: "小さな炎を放つ。火に弱い相手によく効く。"
    },

    rockThrow: {
      id: "rockThrow",
      name: "ストーン",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "earth",
      effect: "shards",
      se: "earth",
      description: "石を投げつける。地に弱い相手によく効く。"
    },

    glimmer: {
      id: "glimmer",
      name: "フラッシュ",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "light",
      effect: "flash",
      se: "light",
      description: "強い光を浴びせる。光に弱い相手によく効く。"
    },

    darkSpore: {
      id: "darkSpore",
      name: "シャドウ",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "dark",
      effect: "shadowGrasp",
      se: "dark",
      description: "闇をまとわせる。闇に弱い相手によく効く。"
    },

    aqua: {
      id: "aqua",
      name: "アクア",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "water",
      effect: "rain",
      se: "water",
      description: "水をぶつける。水に弱い相手によく効く。"
    },

    gust: {
      id: "gust",
      name: "ウィンド",
      kind: "resonance",
      power: 15,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "wind",
      effect: "windCutter",
      se: "wind",
      // 見た目は「切る」が、共鳴なのでその場から放つ（RC-1 から動きは技の種類で決まる）
      description: "鋭い風で切りつける。風に弱い相手によく効く。"
    },

    // --- 範囲技 ---

    // ゲーム中で初めての範囲全体の技。マグマウルフだけが使う。
    // 1体あたりの威力は基本技と同じ15で、3体に届くぶん総量は3倍になる。
    // そのかわりクリティカルが出ず、PPも重い（息の技に共通の決まり）
    fireBreath: {
      id: "fireBreath",
      name: "火の息",
      // ブレスは種類の決まりで「よけられない・クリティカルなし」（data/categories.js の skillKind）。
      // 息は広がるのでよけようがなく、範囲全体の技は3体それぞれでクリティカルを判定すると
      // 運だけで一気に崩れる回ができてしまうため
      kind: "breath",
      power: 15,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "fire",
      // 炎の息が並びの中心から広がる（どくのいきと同じ出し方）
      effect: "flameBreath",
      effectAt: "center",
      se: "fireBreath",
      description: "熱い息を吐き、相手全体を焼く。1体ずつへの威力は低い。"
    },

    // 重い体をそのまま叩きつける。属性を持たないので耐性で軽くならない
    bodyPress: {
      id: "bodyPress",
      name: "ボディプレス",
      kind: "body",
      // v1.4.1（作者の指定）：威力20 → 倍率1.35・PP 4 → 3
      power: 1.35,
      pp: 3,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "impact",
      se: "bodyPress",
      description: "全体重をかけてのしかかる。重い一撃だが、消費するPPも大きい。"
    },

    // 威力を低くするかわりに、与えたぶんの一部を自分のHPに変える。
    // 削る速さより「粘れること」に価値がある技
    drainBite: {
      id: "drainBite",
      name: "吸血",
      kind: "slash",
      // 斬撃なので倍率（通常攻撃の基礎 ×0.85）。2026-10-22 に威力5 から（作者）
      power: 0.85,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "fangDrain",
      drain: 0.3,
      description: "相手に噛みついて精力を吸う。与えたダメージの3割ぶん、自分のHPが回復する。"
    },

    // 竜だけが使う範囲技。火の息と同じ枠（威力15/PP3）で、属性だけが違う。
    // 範囲技の方針どおり、よけられず・クリティカルも出ない
    abyssBreath: {
      id: "abyssBreath",
      name: "奈落の息",
      kind: "breath",
      power: 15,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "dark",
      // 闇の息が並びの中心から広がる（どくのいきと同じ出し方）
      effect: "abyssBreath",
      effectAt: "center",
      se: "darkBreath",
      description: "底なしの闇を吐き出し、相手全体を呑み込む。"
    },

    // ゲーム中で初めての回復技。
    // 回復量は攻撃力に比例させず固定にしてある（育てても回復量は変わらない）
    cure: {
      id: "cure",
      name: "キュア",
      kind: "resonance",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "ally",
      element: "none",
      effect: "healing",
      heal: { min: 35, max: 45 },
      description: "味方1体のHPを回復する。回復する量は使う者の強さでは変わらない。"
    },

    // キュアの上（RC-1・作者の指定）。回復量はキュアの2倍強、PPは3倍
    greaterCure: {
      id: "greaterCure",
      name: "キュアラ",
      kind: "resonance",
      power: 0,
      pp: 6,
      accuracy: 1.0,
      target: "ally",
      element: "none",
      effect: "healingGreat",
      heal: { min: 75, max: 105 },
      description: "味方1体のHPを大きく回復する。回復する量は使う者の強さでは変わらない。"
    },

    // 毒を治す（RC-1・作者の指定）。解毒草と同じ働きの技。
    // cureStatus … 治す状態異常（書き方は道具の cureStatus と同じ。statuses を省略すると治せるものを全部）。
    // 探索中にも仲間画面から使える（Game.isFieldSkill）
    cleanse: {
      id: "cleanse",
      name: "クレンズ",
      kind: "resonance",
      power: 0,
      pp: 1,
      accuracy: 1.0,
      target: "ally",
      element: "none",
      effect: "cleanseDrop",
      cureStatus: { statuses: ["poison"] },
      description: "味方1体の毒を治す。"
    },

    // --- 強化・弱体の技 ---

    harden: {
      id: "harden",
      name: "こうか",
      kind: "body",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "self",
      element: "none",
      effect: "hardenShell",
      modifier: {
        duration: 3,
        // この技だけの言い回し。書かなければ messages.js の modifierUp が使われる
        message: "{target} の 守りが 高まった!",
        // 防御 ×1.5 だけ。α-9 までは受けるダメージ ×0.8 も混ぜていたが、
        // 序盤から効きすぎ、成長率の段階で防御が伸びる後半はほぼ無敵になったので外した
        // （2026-09-29 作者の判断。防御の高い種族が使うほど効く、素直な技にしてある）
        effects: [
          { type: "statMultiplier", stat: "defense", value: 1.5 }
        ]
      },
      description: "体を硬くして、しばらく守りを上げる。"
    },

    // こうか（自分を強くする）と対になる、相手を弱くするほうの技。
    // 弱体であることは自動で判定されるので、印は赤・演出は上から下になる
    sapStrength: {
      id: "sapStrength",
      name: "ちからぬき",
      kind: "body",
      power: 0,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      // こうかと同じく無属性。耐性で効いたり効かなかったりすると分かりにくいため
      element: "none",
      effect: "drainAway",
      modifier: {
        duration: 3,
        message: "{target} の 攻める力が 落ちた!",
        // 攻撃はダメージ式で係数を掛けられる側（通常攻撃 0.75・技 0.40）なので、倍率がそのまま効く。
        // 防御と違って引き算ではないため、こうかのような補強は要らない
        // 2026-10-16 作者の指定で 0.8 → 0.75
        effects: [
          { type: "statMultiplier", stat: "attack", value: 0.75 }
        ]
      },
      description: "相手にからみついて力を奪い、しばらく攻撃を下げる。"
    },

    /**
     * --- 状態異常をあたえる技 ---
     *
     * 書き方はバフ／デバフ（modifier）と同じ考え方で、1行足すだけ。
     *   status: { id: "poison", chance: 0.6 }
     * 通る確率は、ここに書いた chance に相手の耐性が掛かる
     * （data/statuses.js の説明を参照。耐性10で無効、5で半減）。
     *
     * ★ 属性は無属性にしてある。
     *   毒に効く属性は無いので、属性耐性で通ったり通らなかったりすると
     *   何が効いているのか分からなくなる。通りやすさは statusResist だけで決める。
     */

    // 単体に毒。「殴るためではなく毒を入れるための技」という位置づけ。
    // 斬撃なので倍率（通常攻撃の基礎 ×0.75）。2026-10-22 に威力8 から（作者）
    venomSting: {
      id: "venomSting",
      name: "どくばり",
      kind: "slash",
      power: 0.75,
      pp: 2,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "poisonSting",
      se: "venomSting",
      status: { id: "poison", chance: 0.6 },
      description: "毒を含んだ針で刺す。高い確率で相手を毒におかす。"
    },

    // 全体に毒。ダメージは無く、毒を撒くことだけが役目。
    // 息の技なので、火の息・奈落の息と同じくよけられない
    venomBreath: {
      id: "venomBreath",
      name: "どくのいき",
      kind: "breath",
      power: 0,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "none",
      // 毒の息が並びの中心から広がる（1体ずつではなく1回だけ）
      effect: "miasma",
      effectAt: "center",
      se: "venomBreath",
      // 1体ずつ判定するので、避ける子・かかる子が分かれる。
      // 単体（60%）より低いのは、3体に届くぶんの釣り合い
      status: { id: "poison", chance: 0.35 },
      description: "毒の息を吐き、相手全体を毒におかす。"
    },

    /**
     * あわ。ヌシガエルが使う水の範囲技。
     *
     * 火の息・奈落の息と同じ枠（PP3 / 全体 / よけられない / クリティカルなし）。
     * 水属性の範囲技はこれが初めてで、火・闇に続く3つ目の「息」枠になる。
     * ★ 威力だけ12のまま（火の息・奈落の息は15に上げた）。主の技なので別枠で見ている
     *
     * ★ 主のローテで効くのはこれ。
     *   通常攻撃（威力0・単体）を1回撃つより、全体に届くぶん
     *   1ターンあたりのダメージ総量が3倍近くになる。
     *   「攻撃」ばかりのローテだと主が弱くなるのは、単体×威力0を繰り返すため
     */
    bubble: {
      id: "bubble",
      name: "あわ",
      kind: "breath",
      power: 12,
      pp: 3,
      accuracy: 1.0,
      target: "allEnemies",
      element: "water",
      // 泡の息が並びの中心から広がる（どくのいきと同じ出し方）
      effect: "bubbleBreath",
      effectAt: "center",
      se: "bubble",
      description: "泡を吐き出して相手全体を包む。"
    },

    // 光の大技。サンダーと同じ「特別枠」で、威力を上げてPPを重くしてある
    //   他の属性の基本技 … 威力15 / PP2
    //   シャイン         … 威力32 / PP5
    // 闇に強く守られた相手（ヨミリュウ）を崩すための答えとして置いてある
    shine: {
      id: "shine",
      name: "シャイン",
      kind: "resonance",
      power: 32,
      pp: 5,
      accuracy: 1.0,
      target: "enemy",
      element: "light",
      effect: "radiance",   // 閃光（flash）の一段上。技が強くなったと分かる見せ方
      se: "shine",
      description: "目を灼くほどの光を放つ。闇を頼る相手ほど深く突き刺さる。"
    },

    // 雷だけは他の属性と枠が違う。elements.js の方針どおり、
    // 威力を上げるかわりにPPを重くして「強いが撃てる回数が少ない」形にしてある
    //   他の属性の基本技 … 威力15 / PP2
    //   サンダー         … 威力20 / PP3
    // 使い手はビリムシ1種だけ。仲間にすれば、こちらも撃てるようになる
    thunderBolt: {
      id: "thunderBolt",
      name: "サンダー",
      kind: "resonance",
      power: 20,
      pp: 3,
      accuracy: 1.0,
      target: "enemy",
      element: "thunder",
      effect: "thunderBolt",
      se: "thunder",
      description: "強い電気を落とす。威力は高いが、消費するPPも大きい。"
    },

    /**
     * --- 属性技の2段目（tier2。RC-1） ---
     * 数値は 早見表/技.txt のまま（作者の判断：共鳴の係数が ×1.50 になったあとも見直さない。
     * 光の2段目のシャインが、もう同じ帯で釣り合っているため）。
     * 覚えるのは同じ属性の1段目を覚える種族で、Lv18 前後（data/monsters.js の learnset）。
     * いまの敵（深層 Lv10〜15・毒沼 Lv14〜19）は、ほとんど使ってこない高さに置いてある。
     * 全体の技は、今の全体技と同じく「よけられない・クリティカルなし」。
     * 音は2段目専用の se_*_2.wav（data/audio.js の flame〜volt）
     */
    flame: {
      id: "flame",
      name: "フレイム",
      kind: "resonance",
      power: 36,
      pp: 5,
      accuracy: 1.0,
      target: "enemy",
      element: "fire",
      effect: "blaze",   // ファイア（burst）の一段上。シャインの radiance と同じ考え方
      se: "flame",
      description: "燃えさかる炎を放つ。火に弱い相手を大きく焼く。"
    },

    wave: {
      id: "wave",
      name: "ウェーブ",
      kind: "resonance",
      power: 30,
      pp: 4,
      accuracy: 1.0,
      target: "enemy",
      element: "water",
      effect: "surge",   // アクア（rain）の一段上
      se: "wave",
      description: "大きな波を打ちつける。水に弱い相手によく効く。"
    },

    // 風は全体の属性。1体ずつへの威力を下げて、3体に届かせる
    gale: {
      id: "gale",
      name: "ゲイル",
      kind: "resonance",
      power: 25,
      pp: 5,
      accuracy: 1.0,
      target: "allEnemies",
      element: "wind",
      // 全体の型。並び全体に1回だけ出す（data/effects.js の全体の共鳴）
      effect: "galeSweep",
      effectAt: "center",
      se: "gale",
      evadable: false,
      canCritical: false,
      description: "吹き荒れる風で、相手全体を切り裂く。"
    },

    // 当てたあとに、相手の受けるダメージを2ターン上げる（当てたその一撃には乗らない。BattleSystem._resolveHit）
    rockSpike: {
      id: "rockSpike",
      name: "ロックスパイク",
      kind: "resonance",
      power: 30,
      pp: 6,
      accuracy: 1.0,
      target: "enemy",
      element: "earth",
      effect: "spikes",   // ストーン（shards）の一段上
      se: "rockSpike",
      modifier: {
        duration: 2,
        message: "{target} の 守りに ひびが入った!",
        popup: "被ダメージ上昇",
        effects: [ { type: "damageTaken", value: 1.10 } ]
      },
      description: "岩の棘で突き上げる。当たった相手は2ターンのあいだ、受けるダメージが少し増える。"
    },

    darkNebula: {
      id: "darkNebula",
      name: "ダークネビュラ",
      kind: "resonance",
      power: 26,
      pp: 6,
      accuracy: 1.0,
      target: "allEnemies",
      element: "dark",
      effect: "darkNebula",
      effectAt: "center",
      se: "darkNebula",
      evadable: false,
      canCritical: false,
      description: "闇の雲を広げ、相手全体を呑み込む。"
    },

    // 雷の枠（強いが重い）のまま全体へ。1体ずつ麻痺を判定する（ダメージを見せたあと）
    volt: {
      id: "volt",
      name: "ボルト",
      kind: "resonance",
      power: 35,
      pp: 11,
      accuracy: 1.0,
      target: "allEnemies",
      element: "thunder",
      effect: "thunderstorm",
      effectAt: "center",
      se: "volt",
      evadable: false,
      canCritical: false,
      status: { id: "paralysis", chance: 0.15 },
      description: "雷を降らせ、相手全体を撃つ。麻痺させることがある。"
    },

    /**
     * --- 専用技（愛情度が「絆」に届くと覚える。data/monsters.js の bondReward） ---
     * 効果・数値は作者が決めたもの（早見表/モンスターと絆.txt の「絆と記録」）。
     * その種族らしい働きで個性を出す。どれも覚えるのはその種族だけ（learnset には書かない）
     */

    // スライム。最初の相棒が仲間の盾になる。
    // cover … ターンの頭で（素早さに関係なく）立ち塞がり、そのターン向かい側からの攻撃を
    //         すべて自分が受ける（範囲全体の技も全員ぶん）。受けるダメージは modifier で軽くする
    standGuard: {
      id: "standGuard",
      name: "立ち塞がる",
      kind: "body",
      power: 0,
      pp: 12,   // v1.5.1 で 5 → 12（作者の指定 2026-11-22）
      accuracy: 1.0,
      target: "self",
      element: "none",
      effect: "standWall",
      se: "guard",
      modifierSe: null,   // 掛かったときの強化の音は鳴らさず、se_guard だけ（v1.8.0）
      cover: true,
      modifier: {
        duration: 1,
        message: "{target} は 仲間の前に立ち塞がった!",
        popup: "全ダメージ引き受け",
        effects: [ { type: "damageTaken", value: 0.75 } ]
      },
      description: "使ったターンのあいだ、仲間への攻撃をすべて引き受ける。受けるダメージは少し減る。"
    },

    // コウモリ。羽ばたきで相手の目を眩ませる。盲目（状態異常）とは別の弱体で、両方掛かれば重なる
    hazyWing: {
      id: "hazyWing",
      name: "朧羽",
      // 踊りの第1号。羽ばたいて惑わす
      kind: "dance",
      power: 0,
      pp: 10,   // v1.5.1 で 8 → 10（作者の指定 2026-11-22）
      accuracy: 1.0,
      target: "allEnemies",
      element: "dark",
      effect: "hazyFeathers",
      evadable: false,
      canCritical: false,
      // 2026-11-18 作者の指定で ×0.8 → ×0.75。どの技の命中にも掛かる（tier4 の技＝tier: 4 と書いた技には掛からない。BattleSystem._accuracyMultiplier）
      // 続くターンは v1.5.1 で 2 → 3（作者の指定 2026-11-22）
      modifier: {
        duration: 3,
        message: "{target} は 朧な羽ばたきに 目を奪われた!",
        effects: [ { type: "accuracyMultiplier", value: 0.75 } ]
      },
      description: "朧な羽ばたきで、相手全体の命中率を3ターンのあいだ下げる。"
    },

    // ヒカリムシ。味方を先へ導く光（2026-10-16 作者の指定で 共鳴 → 体技。封印されても出せる）
    guidingLight: {
      id: "guidingLight",
      name: "導きの光",
      kind: "body",
      power: 0,
      pp: 6,
      accuracy: 1.0,
      target: "ally",
      element: "light",
      effect: "guidingLight",
      modifier: {
        duration: 3,
        message: "{target} は 光に導かれ、足が軽くなった!",
        // 2026-10-20 作者の指定で ×2.0 → ×2.25
        effects: [ { type: "statMultiplier", stat: "speed", value: 2.25 } ]
      },
      description: "味方1体を光で導き、3ターンのあいだ素早さを大きく上げる。"
    },

    // キノコン。味方が使える初めての眠りの技
    sleepSpore: {
      id: "sleepSpore",
      name: "眠りの胞子",
      // 胞子を撒くのでブレス（よけられない・クリティカルなし は種類の決まり）
      kind: "breath",
      power: 0,
      pp: 8,
      accuracy: 1.0,
      target: "allEnemies",
      element: "none",
      effect: "sporeCloud",
      effectAt: "center",
      // 2026-10-20 作者の指定で 50% → 70%
      status: { id: "sleep", chance: 0.7 },
      description: "眠りを誘う胞子を撒き、相手全体を眠らせることがある。"
    },

    // キングスライム。王として自らを奮い立たせる。特性「王の威厳」と重なる
    kingsCommand: {
      id: "kingsCommand",
      name: "王の号令",
      kind: "body",
      power: 0,
      pp: 10,
      accuracy: 1.0,
      target: "self",
      element: "none",
      effect: "royalCommand",
      modifier: {
        duration: 3,
        message: "{target} は 王の号令を上げた!",
        // 2026-10-20 作者の指定で 攻撃・防御 ×1.5 → 攻撃 ×1.75・防御 ×2.0（ブレイブ＋シールドに負けていたため）
        effects: [
          { type: "statMultiplier", stat: "attack", value: 1.75 },
          { type: "statMultiplier", stat: "defense", value: 2.0 }
        ]
      },
      description: "王の号令を上げ、3ターンのあいだ自分の攻撃と防御を大きく上げる。"
    },

    // フレイミン（絆の技）。燃える牙の一撃。
    // 斬撃なので倍率（通常攻撃の基礎 ×1.5）。2026-10-22 に威力50 から（作者。×1.88 の案は Lv99 で強すぎたので 1.5）
    blazeFang: {
      id: "blazeFang",
      name: "焔牙",
      kind: "slash",
      // v1.8.0（2026-11-25 作者の指定）：×1.5・クリティカル率 +40% → ×1.66・+55%
      power: 1.66,
      pp: 8,   // v1.5.1 で 6 → 8（作者の指定 2026-11-22）
      accuracy: 1.0,
      criticalBonus: 0.55,
      target: "enemy",
      element: "fire",
      effect: "blazeFang",
      se: "fire",
      description: "燃える牙で食らいつく。威力が高く、クリティカルがとても出やすい。"
    },

    // ヌマボネ。眼窩の青い光で呪う。味方が使える初めての呪いの技
    // （2026-10-16 作者の指定で 共鳴 → 体技、呪い 75% → 80%）
    blueGlare: {
      id: "blueGlare",
      name: "青い眼光",
      kind: "body",
      power: 0,
      pp: 7,
      accuracy: 1.0,
      target: "enemy",
      element: "dark",
      effect: "blueGlare",
      se: "dark",
      status: { id: "curse", chance: 0.8 },
      description: "眼窩の青い光で見つめ、相手を呪うことがある。"
    },

    /**
     * --- v1.0.0 萌芽の穴・若葉の洞で足した技（作者が決めたもの） ---
     * どちらも、いまは敵のときに使う技（data/monsters.js の enemySkills）。
     */

    // ユラツボミ。揺れながら眠りを誘う。踊りなので封印されても出せる
    lullaby: {
      id: "lullaby",
      name: "ララバイ",
      kind: "dance",
      power: 0,
      pp: 4,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "lullaby",
      status: { id: "sleep", chance: 0.75 },
      description: "ゆらゆらと揺れて眠りを誘い、相手1体を眠らせることがある。"
    },

    // コダマ。強い光で目をくらませる。共鳴なので封印されると出せない。
    // 盲目にする技はこれが最初
    glare: {
      id: "glare",
      name: "グレア",
      kind: "resonance",
      power: 0,
      pp: 4,
      accuracy: 1.0,
      target: "enemy",
      element: "light",
      effect: "glareBeam",
      se: "light",
      // 2026-11-18 作者の指定で 65% → 85%
      status: { id: "blind", chance: 0.85 },
      description: "まばゆい光を放ち、相手1体を盲目にすることがある。"
    },

    // コダマの専用技（絆。作者が決めたもの 2026-10-13）。味方全員の、すべての状態異常の耐性を3ターン +4。
    // 効果・PP・範囲・属性・種類（体技。封印されても出せる）は作者の指定
    // ★ 耐性は10で無効なので、もとが6以上の状態異常はこのあいだ効かなくなる
    sproutBlessing: {
      id: "sproutBlessing",
      name: "芽吹きの加護",
      kind: "body",
      power: 0,
      pp: 15,
      accuracy: 1.0,
      target: "allAllies",
      element: "none",
      effect: "sproutBlessing",
      modifier: {
        duration: 3,
        message: "{target} は 芽吹きの加護に 包まれた!",
        popup: "状態異常耐性上昇",
        effects: [ { type: "resistBonus", status: "all", value: 4 } ]
      },
      description: "芽吹きの加護で味方全体を包み、3ターンのあいだ、すべての状態異常にかかりにくくする。"
    },

    /**
     * --- 技の大幅追加（2026-10-15。採用・数値は作者が決めたもの。my game/技の追加案.md） ---
     * 名前・覚える種族は 2026-10-20 に作者が確定（my game の 技と習得_最終版.md。learnset は data/monsters.js の Lv22〜30）。
     * id は仮の名前のころのまま（セーブが技を id で持っているので変えない）。
     * 種類の使い分け：共鳴は効き目が大きいが封印で止まる／踊りは封印されても出せる
     */

    // A. 強化（味方に掛ける）
    fightSong: {
      id: "fightSong", name: "ブレイブ", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,   // v1.5.1 で PP 3 → 6（作者の指定 2026-11-22）
      target: "ally", element: "none", effect: "rally",
      modifier: { duration: 3, message: "{target} の 闘志が 高まった!",
        effects: [ { type: "statMultiplier", stat: "attack", value: 1.5 } ] },
      description: "闘志を呼び起こす響きで、味方1体の攻撃を3ターンのあいだ上げる。"
    },
    guardSong: {
      id: "guardSong", name: "シールド", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,   // v1.5.1 で PP 3 → 6（作者の指定 2026-11-22）
      target: "ally", element: "none", effect: "barrier",
      modifier: { duration: 3, message: "{target} の 守りが 高まった!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 1.5 } ] },
      description: "守りを固める響きで、味方1体の防御を3ターンのあいだ上げる。"
    },
    galeSong: {
      id: "galeSong", name: "ヘイスト", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,   // v1.5.1 で PP 3 → 6（作者の指定 2026-11-22）
      target: "ally", element: "none", effect: "haste",
      modifier: { duration: 3, message: "{target} の 足が 軽くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 1.5 } ] },
      description: "風のような響きで、味方1体の素早さを3ターンのあいだ上げる。"
    },
    rallyDance: {
      id: "rallyDance", name: "鼓舞の舞", kind: "dance", power: 0, pp: 7, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "rally",
      // 2026-11-18 作者の指定で ×1.25 → ×1.15。ハウリングとは重ならない（exclusive。両方掛かっていれば強いほうだけ効く。説明には書かない＝作者の指定）
      // v1.5.1（作者の指定 2026-11-22）：攻撃 ×1.15 → 与えるダメージ ×1.15（ハウリングと同じ種類）
      modifier: { duration: 3, message: "{target} の 攻める力が 上がった!", popup: "与ダメージ上昇", exclusive: "powerUp",
        effects: [ { type: "damageDealt", value: 1.15 } ] },
      description: "仲間を鼓舞する舞で、味方全体の与えるダメージを3ターンのあいだ少し上げる。"
    },
    fortressForm: {
      id: "fortressForm", name: "堅守の陣", kind: "dance", power: 0, pp: 12, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "fortress",
      // 2026-11-18 作者の指定で ×0.85 → ×0.8
      modifier: { duration: 2, message: "{target} は 守りの陣に 入った!", popup: "被ダメージ低下",
        effects: [ { type: "damageTaken", value: 0.8 } ] },
      description: "守りの陣を敷き、味方全体の受けるダメージを2ターンのあいだ減らす。"
    },
    powerResonance: {
      id: "powerResonance", name: "ハウリング", kind: "resonance", power: 0, pp: 7, accuracy: 1.0,
      target: "self", element: "none", effect: "howl",
      // 2026-10-20 作者の指定で ×1.2・2ターン → ×1.35・3ターン（2ターンだと強くなるのが次の1回だけだった）。
      // 2026-11-18 作者の指定で ×1.35 → ×1.20。鼓舞の舞とは重ならない（exclusive。強いほうだけ効く。説明には書かない＝作者の指定）
      modifier: { duration: 3, message: "{target} の 力が 共鳴している!", popup: "与ダメージ上昇", exclusive: "powerUp",
        effects: [ { type: "damageDealt", value: 1.20 } ] },
      description: "自分の力を共鳴させ、3ターンのあいだ与えるダメージを上げる。"
    },
    // エレメントバリア（v1.8.0。作者の仕様 2026-11-26）。〇〇ベール7つの代わり（敵の属性がわからないと使えず、7つも枠を取っていたため）。
    // 味方全体・全属性への耐性 +3・3ターン・PP8。音はベールと同じ se_veil（modifierSe: null で、掛かったときの強化の音は鳴らさない）。
    // 覚えるのはスライム 27・ハイバネ 28・コダマ 28・コウモリ 33 だけ（作者）。書は無い（作者 2026-11-26）
    elementBarrier: {
      id: "elementBarrier", name: "エレメントバリア", kind: "resonance", power: 0, pp: 8, accuracy: 1.0, se: "veil", modifierSe: null,
      target: "allAllies", element: "none", effect: "elementBarrier",
      modifier: { duration: 3, message: "{target} は すべての属性に 強くなった!", popup: "全属性耐性上昇",
        effects: [ { type: "resistBonus", element: "all", value: 3 } ] },
      description: "味方全体の、すべての属性への耐性を3ターンのあいだ上げる。"
    },

    /**
     * 反射の技（v1.8.0。作者の仕様 2026-11-26）。名前と覚える種族は作者が決めた（2026-11-27。カウンターはリバーサルに）
     *   どちらも共鳴・味方1体（自分も選べる）・3ターン・PP12。強化として掛かる（黄昏の風・波さらい・ジャッジメントで消える）
     *   リフレクト … 相手の共鳴を返す（ダメージも、状態異常・弱体などの追加の効果も。即死も返る）
     *   リバーサル … 相手の通常攻撃と斬撃を返す
     *   返したダメージは、撃った側が自分に当てたものとして計算し直す（撃った側の攻撃・防御・強化・弱体・耐性で決まる）。
     *   返した側はダメージを受けない。返った技はもう一度は返らない。全体の技は、返す相手のぶんだけ返る。
     *   撃った側に「攻撃の強化」（攻撃力・与えるダメージだけを上げる強化：ブレイブ・ウォークライ・オーバードライブ・鼓舞の舞・ハウリング）が
     *   掛かっていれば、返されずにそのまま当たる（ちからため・王の号令は入らない）。味方から受けた技は返さない。
     *   働かせるのは BattleSystem._reflectorFor（効果の種類 reflect。against: "resonance" / "physical"）
     */
    reflect: {
      id: "reflect", name: "リフレクト", kind: "resonance", power: 0, pp: 12, accuracy: 1.0,
      target: "ally", element: "none", effect: "reflectWall",
      modifier: { duration: 3, message: "{target} の まわりに 共鳴を はね返す 壁が できた!", popup: "共鳴を反射",
        effects: [ { type: "reflect", against: "resonance" } ] },
      description: "味方1体のまわりに壁を張り、3ターンのあいだ相手の共鳴をはね返す。攻撃の強化が掛かった相手の共鳴は防げない。"
    },
    reversal: {
      id: "reversal", name: "リバーサル", kind: "resonance", power: 0, pp: 12, accuracy: 1.0,
      target: "ally", element: "none", effect: "reversal",
      modifier: { duration: 3, message: "{target} は 攻撃を 返す 構えを とった!", popup: "攻撃を反射",
        effects: [ { type: "reflect", against: "physical" } ] },
      description: "味方1体に返しの構えを取らせ、3ターンのあいだ相手の通常攻撃と斬撃をはね返す。攻撃の強化が掛かった相手の攻撃は防げない。"
    },

    // B. 弱体（相手に掛ける。主など弱体の耐性を持つ相手には入らないことがある）
    armorBreak: {
      // v1.4.1（作者の指定）：威力10 → 倍率1.0（通常攻撃と同じ）
      // v1.5.1（作者の指定 2026-11-22）：PP 6 → 8・防御 ×0.5 → ×0.7
      id: "armorBreak", name: "鎧くずし", kind: "body", power: 1.0, pp: 8, accuracy: 1.0,
      target: "enemy", element: "none", effect: "shatter",
      modifier: { duration: 3, message: "{target} の 守りが 崩れた!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 0.7 } ] },
      description: "体ごとぶつかって守りを崩す。当たった相手は3ターンのあいだ防御が下がる。"
    },
    slowDance: {
      // v1.8.0（2026-11-25 作者の指定）：素早さ ×0.5・PP3 → ×0.8・PP7（強すぎた）
      id: "slowDance", name: "足止めの舞", kind: "dance", power: 0, pp: 7, accuracy: 1.0,
      target: "enemy", element: "none", effect: "entangle",
      modifier: { duration: 3, message: "{target} の 足が 重くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.8 } ] },
      description: "まとわりつく舞で、相手1体の素早さを3ターンのあいだ下げる。"
    },
    intimidRoar: {
      id: "intimidRoar", name: "威圧の咆哮", kind: "breath", power: 0, pp: 7, accuracy: 1.0,
      // 演出は並び全体に1回だけ広がる咆哮（effectAt: "center"）
      target: "allEnemies", element: "none", effect: "intimidate", effectAt: "center",
      // 2026-10-20 作者の指定で ×0.85・2ターン → ×0.77・3ターン
      modifier: { duration: 3, message: "{target} は 威圧されて 力が 落ちた!",
        effects: [ { type: "statMultiplier", stat: "attack", value: 0.77 } ] },
      description: "大きく吠えて威圧し、相手全体の攻撃を3ターンのあいだ下げる。"
    },

    // C. 状態異常
    dazzleMist: {
      id: "dazzleMist", name: "幻惑の息", kind: "breath", power: 0, pp: 5, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "blindMist", effectAt: "center",
      status: { id: "blind", chance: 0.45 },
      description: "目をくらます息を吐き、相手全体を盲目にすることがある。"
    },
    sealSong: {
      id: "sealSong", name: "サイレス", kind: "resonance", power: 0, pp: 4, accuracy: 1.0,
      target: "enemy", element: "none", effect: "sealRing",
      status: { id: "seal", chance: 0.7 },
      description: "共鳴を乱す響きで、相手1体を封印にすることがある。"
    },
    numbPowder: {
      id: "numbPowder", name: "しびれ粉", kind: "body", power: 0, pp: 5, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "numbCloud", effectAt: "center",
      evadable: false, canCritical: false,
      status: { id: "paralysis", chance: 0.45 },
      description: "しびれる粉を撒き散らし、相手全体を麻痺にすることがある。"
    },
    numbNeedle: {
      // 斬撃なので倍率（通常攻撃の基礎 ×0.75）。2026-10-22 に威力10 から（作者）
      id: "numbNeedle", name: "しびれ針", kind: "slash", power: 0.75, pp: 4, accuracy: 1.0,
      target: "enemy", element: "none", effect: "needle",
      status: { id: "paralysis", chance: 0.4 },
      description: "しびれを含んだ針で刺す。当たった相手を麻痺にすることがある。"
    },
    curseSong: {
      id: "curseSong", name: "不吉な舞", kind: "dance", power: 0, pp: 6, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "hex",
      evadable: false, canCritical: false,
      status: { id: "curse", chance: 0.5 },
      description: "不吉な歌と踊りで、相手全体を呪いにすることがある。"
    },

    // D. 治す
    wakeSong: {
      id: "wakeSong", name: "ディンド", kind: "resonance", power: 0, pp: 2, accuracy: 1.0,
      target: "ally", element: "none", effect: "wake",
      cureStatus: { statuses: ["sleep", "paralysis"] },
      description: "味方1体の眠りと麻痺を治す。"
    },
    purifyLight: {
      id: "purifyLight", name: "リカバー", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,
      target: "ally", element: "none", effect: "purify",
      // 封印も治す（2026-10-16 作者の指定）。封印は道具では治せない（curable: false）ので、治すものを並べて書く
      cureStatus: { statuses: ["poison", "paralysis", "sleep", "seal", "blind", "curse"] },
      description: "味方1体の、状態異常を全て治す。"
    },
    purifyRain: {
      id: "purifyRain", name: "クレンズレイン", kind: "resonance", power: 0, pp: 3, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "cleanseRain",
      cureStatus: { statuses: ["poison"] },
      description: "味方全体の毒を治す。"
    },

    // リザレクト・キュアオール（2026-11-06 作者の指定。種類は共鳴にした。キュアの仲間）。
    // revive … 倒れた味方を起こす。chance は起きる確率、hpRatio は戻るHPの割合（神鳥の羽と同じ起こし方）。
    //          外れてもPPは払う。敵は使わない（BattleSystem._chooseEnemyAction）。
    //          作戦で使うのは reviveSafeHp を書いた作戦だけ（data/battle.js。いまは「仲間を守る」）
    resurrect: {
      id: "resurrect", name: "リザレクト", kind: "resonance", power: 0, pp: 10, accuracy: 1.0,
      target: "ally", element: "none", effect: "reviveRise", se: "revive",
      revive: { hpRatio: 0.55, chance: 0.5 },
      description: "倒れた味方1体を、半分の確率で起こす。起きるとHPが55%まで戻る。"
    },
    cureAll: {
      id: "cureAll", name: "キュアオール", kind: "resonance", power: 0, pp: 12, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "healingAll",
      heal: { min: 75, max: 105 },
      description: "味方全体のHPを大きく回復する。回復する量は使う者の強さでは変わらない。"
    },

    // 樹液の膜（ジュエキスライムの絆の技。2026-11-11 作者の指定：単体・水・PP18・4ターンのあいだ毎ターン HP10〜15% と PP3）。
    // 種類は書かれていなかったので、キュアの仲間として共鳴にした（私の判断。封印で止まる）。
    // 戻すのはターンの終わり（BattleSystem._tickRegen の regenOverTime・_tickPpRegen）。使ったターンから数えて4回。
    // 特性「再生」や装備の毎ターン回復とは別に戻る（重なる）。探索中は使えない（戦闘のあいだだけの効果のため）。
    // 演出は専用の sapVeil（琥珀のしずく → 膜が体を包む → 光と泡。data/effects.js）
    sapVeil: {
      id: "sapVeil", name: "樹液の膜", kind: "resonance", power: 0, pp: 18, accuracy: 1.0,
      target: "ally", element: "water", effect: "sapVeil",
      modifier: {
        duration: 4,
        message: "{target} は 樹液の膜に 包まれた!",
        popup: "HP・PP回復",
        effects: [ { type: "regenOverTime", min: 0.10, max: 0.15 }, { type: "ppRegen", value: 3 } ]
      },
      description: "味方1体を樹液の膜で包み、4ターンのあいだ毎ターンHPを10〜15%、PPを3回復する。"
    },

    // E. 攻撃に何かが付く技（新しい仕組み。BattleSystem の _applyRecoil・_applyCharge・hits）
    recklessTackle: {
      // 2026-10-20 作者の指定で 威力40 → 35・反動 1/4 → 与えたダメージそのまま。v1.4.1 で倍率1.65（作者の指定）
      id: "recklessTackle", name: "捨て身の体当たり", kind: "body", power: 1.65, pp: 4, accuracy: 1.0,
      target: "enemy", element: "none", effect: "crash",
      recoil: 1.0,
      description: "捨て身でぶつかる。威力が高いが、与えたダメージと同じだけ自分も受ける。"
    },
    chargeUp: {
      id: "chargeUp", name: "ちからため", kind: "body", power: 0, pp: 0, accuracy: 1.0,
      target: "self", element: "none", effect: "gather", se: "charge",
      charge: { min: 1.85, max: 2.25 },
      // 乗るのは1体の通常攻撃・体技・斬撃だけ（v1.4.1 作者の指定。BattleSystem._chargeApplies）。
      // 次の自分の手番で乗る技を使わなければ消える（動けなかったときも）。ためている間に使っても何も起きない
      description: "力をためる。次の手番の、1体への攻撃・体技・斬撃のダメージが1.85〜2.25倍になる。"
    },
    doubleSlash: {
      // 2026-10-20 作者の指定で 威力12 → 10・1回のダメージ上限200（斬撃は攻撃力がよく効き、2回ぶん伸びるので終盤に強すぎた）。
      // 2026-10-22 から斬撃は倍率なので、1回 ×0.7（2回で ×1.4）。上限200は残す（作者：無くすと強化や装備で大きく上回る）
      id: "doubleSlash", name: "二連斬り", kind: "slash", power: 0.7, pp: 4, accuracy: 1.0,
      target: "enemy", element: "none", effect: "crossSlash",
      hits: 2, maxDamage: 200,
      description: "続けざまに2回斬りつける。1回ずつ命中を判定する。"
    },
    // 稲妻斬り（2026-10-22 作者の指定：斬撃・雷・PP4・1体）。斬撃なので倍率（通常攻撃の基礎 ×1.2）。
    // 最初は威力18・補正 ×1.05 だったが、斬撃を倍率にしたので 1.2 にまとめた（作者）。
    // 雷の斬撃はゲームで初めて。覚えるのはザンガルド（Lv22）。敵のザンガルドも使う（data/dungeons.js の IVY_ZAN）
    thunderSlash: {
      id: "thunderSlash", name: "稲妻斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      // 音は当たった瞬間に雷（サンダーと同じ音）。出した瞬間には鳴らさない（斬ってから落ちる）
      target: "enemy", element: "thunder", effect: "thunderSlash", se: "slashThunder", hitSe: "thunder",
      description: "稲妻をまとった刃で、相手1体を斬りつける。"
    },
    // 歯車投げ（v1.3.0。千年樹の根底の主の専用技。作者の指定 2026-11-03：命中100%・無・3回・斬撃・1回ごとにでたらめな相手・威力0.7）。
    // 斬撃なので倍率（通常攻撃の基礎 ×0.7 を3回）。ちからため・盲目も効く。
    // PP は仮（主は PP無限）。演出は回る歯車が飛んできて当たる（data/effects.js の gearHit。1回当たるごとに出る）
    gearThrow: {
      id: "gearThrow", name: "歯車投げ", kind: "slash", power: 0.7, pp: 6, accuracy: 1.0,
      target: "enemy", element: "none", effect: "gearHit",
      hits: 3, randomTargets: true,
      description: "体の歯車を外して投げつける。ランダムな対象に3回当たる。"
    },
    // 属性の斬撃（v1.3.0。ウェポンの技。作者の指定 2026-11-04：ウェポンは火・水・風・地の斬撃を使う。名前は私の案を作者が了承）。
    // 岩砕斬りの名前は作者の指定（2026-11-05）。火炎斬りも作者が了承（2026-11-05。焔牙はフレイミンの絆の専用技なので使わない）。
    // 威力と PP は稲妻斬りと同じ（×1.2・PP4）で、仮
    flameSlash: {
      id: "flameSlash", name: "火炎斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "fire", effect: "flameSlash", se: "slashFire",
      description: "炎をまとった刃で、相手1体を斬りつける。"
    },
    flowSlash: {
      id: "flowSlash", name: "流水斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "water", effect: "flowSlash", se: "slashWater",
      description: "水流をまとった刃で、相手1体を斬りつける。"
    },
    galeSlash: {
      id: "galeSlash", name: "疾風斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "wind", effect: "galeSlash", se: "slashWind",
      description: "風を切る速さで、相手1体を斬りつける。"
    },
    rockSlash: {
      id: "rockSlash", name: "岩砕斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "earth", effect: "rockSlash", se: "slashEarth",
      description: "岩も砕く重い刃で、相手1体を斬りつける。"
    },
    // ウェポン（絆の技。名前・PP・命中・威力・火と地の混合・全体は作者の指定 2026-11-05）。
    // 種類は斬撃、混合の計算（よく効くほう）・クリティカルなし・演出は私の案。
    blazingRift: {
      id: "blazingRift", name: "烈火崩地斬", kind: "slash", power: 1.0, pp: 15, accuracy: 1.0,
      target: "allEnemies", element: "fire", element2: "earth",
      effect: "blazingRift", effectAt: "center", se: "fire", canCritical: false,
      description: "炎の刃で大地ごと斬り裂き、相手全体を攻撃する。火と地のうち、よく効くほうの属性で当たる。"
    },

    /**
     * --- v1.0.0 若葉の洞の主の技（作者が決めたもの） ---
     * いまは主の行動手順（data/bosses.js の hollowLord）だけで使う
     */

    // 眠りを誘う息を全体に吐く。2026-11-18 作者の指定で 35% → 45%
    sleepBreath: {
      id: "sleepBreath",
      name: "眠りの息",
      kind: "breath",
      power: 0,
      pp: 4,
      accuracy: 1.0,
      target: "allEnemies",
      element: "none",
      effect: "sporeCloud",
      effectAt: "center",
      status: { id: "sleep", chance: 0.45 },
      description: "眠りを誘う息を吐き、相手全体を眠らせることがある。"
    },

    // 地中に根を伸ばし、相手全体を下から突き上げる
    rootSpike: {
      id: "rootSpike",
      name: "ルートスパイク",
      kind: "body",
      // v1.4.1（作者の指定）：全体の体技は固定ダメージ。20 → 40
      power: 40,
      pp: 7,
      accuracy: 1.0,
      target: "allEnemies",
      element: "earth",
      effect: "spikes",
      se: "rockSpike",
      canCritical: false,
      description: "根を伸ばして、相手全体を下から突き上げる。"
    },

    // しんくうは（2026-10-22 作者の指定：体技・風・全体・威力20・PP5。v1.4.1 で固定ダメージ40）。
    // 全体技だがよけられる。ダメージを与える全体の体技はよけられる、という作者の決め（ルートスパイクも同じ）。
    // クリティカルは出ない。覚えるのはツリガネ（Lv30）
    vacuumWave: {
      id: "vacuumWave",
      name: "しんくうは",
      kind: "body",
      power: 40,
      pp: 5,
      accuracy: 1.0,
      target: "allEnemies",
      element: "wind",
      effect: "vacuumWave",
      effectAt: "center",
      se: "wind",
      canCritical: false,
      description: "真空の刃を飛ばして、相手全体を切り裂く。"
    },

    // いなずま（2026-10-26 作者の指定：体技・雷・全体・威力25・PP8。v1.4.1 で固定ダメージ50）。しんくうはと同じく、全体の体技なのでよけられる。
    // クリティカルは出ない。覚えるのはザンガルド（Lv27）。演出はボルトと同じ型を、太く速くしたもの（data/effects.js の lightning）
    lightning: {
      id: "lightning",
      name: "いなずま",
      kind: "body",
      power: 50,
      pp: 8,
      accuracy: 1.0,
      target: "allEnemies",
      element: "thunder",
      effect: "lightning",
      effectAt: "center",
      se: "thunder",
      canCritical: false,
      description: "体にためた雷を落とし、相手全体を撃つ。"
    },

    // 目を見開いて相手を惑わせる
    dazzleEye: {
      id: "dazzleEye",
      name: "幻惑の瞳",
      kind: "body",
      power: 0,
      pp: 5,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "dazzleEye",
      // 2026-11-18 作者の指定で 60% → 80%
      status: { id: "blind", chance: 0.80 },
      description: "怪しく光る目で見つめ、相手1体を盲目にすることがある。"
    },

    // 不思議な踊りで相手の気力を奪う。PPを減らす技はこれが最初（ppDamage。BattleSystem._applyPpDamage）
    mysteryDance: {
      id: "mysteryDance",
      name: "ミステリーダンス",
      kind: "dance",
      power: 0,
      pp: 5,
      accuracy: 1.0,
      target: "enemy",
      element: "none",
      effect: "mystery",
      ppDamage: { min: 3, max: 7 },
      description: "不思議な踊りで、相手1体のPPを3〜7減らす。"
    },

    /**
     * --- シニガミの技（蔦這う回廊。名前・数値は作者が決めたもの 2026-10-21） ---
     * 即死を付ける技（status の id が instantDeath）は、特性「死神」を持つ者が使うと PP を使わない（BattleSystem.ppCostOf）。
     * 即死は主には効かない（data/battle.js の bossImmuneToStatus）
     */

    // 死神の鎌。踊りだが、ダメージの計算は斬撃の式（damageKind: "slash"）。よけられない（説明には書かない。作者）。
    // PP666 なので、仲間のシニガミ（PP666）は満タンから1回だけ撃てる。敵のときは PP が減らない（data/dungeons.js の infinitePp）。
    // 動きは専用（motion: "reap" → monsters.js の shinigami の motions.reap）
    deathScythe: {
      id: "deathScythe",
      name: "死神の鎌",
      kind: "dance",
      damageKind: "slash",
      power: 666,
      pp: 666,
      accuracy: 1.0,
      evadable: false,
      target: "enemy",
      element: "none",
      effect: "reap",
      se: "death",
      // 技を出した瞬間、シニガミのまわりに出す前ぶれ（data/effects.js の reapOmen。種類の演出の代わり）
      casterEffect: "reapOmen",
      hitSe: "slash",
      motion: "reap",
      // 技を出してから当たるまで（ミリ秒）。専用の動き reaperScythe の振り下ろしのコマ（0.56 × 1500ms）にそろえてある
      windupMs: 840,
      description: "死神の鎌を振り下ろす。"
    },

    // 死の踊り。相手全体に即死を 25%。よけられない（説明には書かない。作者）
    deathDance: {
      id: "deathDance", name: "死の踊り", kind: "dance", power: 0, pp: 10, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "deathMark", se: "death",
      evadable: false, canCritical: false,
      status: { id: "instantDeath", chance: 0.5 },   // v1.4.1：25% → 50%
      description: "死を招く踊りで、相手全体を即死させることがある。"
    },

    // デス。相手1体に即死を 75%（v1.4.1：35% → 90%。v1.5.0：90% → 75%。耐性3で52.5%・5で37.5%）
    death: {
      id: "death", name: "デス", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,
      target: "enemy", element: "none", effect: "deathMark", se: "death",
      status: { id: "instantDeath", chance: 0.75 },
      description: "死の響きで、相手1体を即死させることがある。"
    },

    // デスラ。相手全体に即死を 50%（v1.4.1：25% → 65%。v1.5.0：65% → 50%）。全体の技の決まりどおり、よけられない・クリティカルなし
    deathra: {
      id: "deathra", name: "デスラ", kind: "resonance", power: 0, pp: 12, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "deathMark", se: "death",
      evadable: false, canCritical: false,
      status: { id: "instantDeath", chance: 0.5 },
      description: "死の響きで、相手全体を即死させることがある。"
    },

    // 波さらい（v1.8.0。2026-11-24 作者が確定：体技・水・PP10・必中（どの技の影響も受けない）・1体・ダメージなし）。
    // 相手1体の強化をすべて消す（ちからためも消える。作者の指定）。涵養の穴の主ミズチ（仮名）が使う。
    // ルナリスの「黄昏の風」（相手全体）の1体版。まだ誰も覚えないので図鑑には出さない
    tideSweep: {
      id: "tideSweep", name: "波さらい", kind: "body", power: 0, pp: 10, accuracy: 1.0,
      target: "enemy", element: "water", effect: "tideSweep", se: "wave",
      sureHit: true,
      dispel: {},
      showInDex: false,
      description: "波で洗い流し、相手1体に掛かっている強化をすべて消す。ためた力も消える。必ず当たる。"
    },

    /**
     * --- 技の大幅追加（v1.8.0・2026-11-25。数値・範囲・効き目は作者が決めたもの） ---
     * もとは デスクトップの「技の追加案_ブレスと強化.md」「覚える技_確定.md」と 早見表/技の一覧_全部.md、
     * 決めごとは game/技の追加_確認.md（作者が確かめた表）。説明文は私が書いた（作者が見て直す）。
     * 演出（effect）はいまある型を仮に使っている。新しい絵は作者が見て決める
     * 新しい書き方（BattleSystem）：
     *   hitsMax       … 回数を hits〜hitsMax から毎回でたらめ（_rollHits）
     *   critOnly      … クリティカルのときだけ当たる（会心斬り）
     *   priority      … そのターンの最初に動く（先手打ち。特性の先手と同じ組で、素早さの順）
     *   guard         … かばう（ターンの頭。選んだ味方1体への攻撃を代わりに受ける。_applyGuards）
     *   ppShare       … 自分のいまの PP の半分を味方に分ける（分け与え）
     *   notSelf       … 味方を選ぶ技で、自分は選べない
     *   cleanse       … 弱体をすべて消す（リフレッシュ）
     *   heal.full     … HP を全快（キュアリス）。焦熱のときは減っているぶんの半分
     *   enemyRevive   … 敵も倒れた仲間を起こすのに使う（リザレクション）
     *   extraStatus   … 2つ目の状態異常（セイントノヴァの封印）
     *   modifier.chance … 弱体が掛かる確率（書かなければ必ず。弱体への耐性はそのあと）
     *   modifier.name / endMessage … 弱体の名前（焦熱・裂傷）と、切れたときの文
     *   damageFormula … "normalRate"（斬撃と同じ式）か { stat, factor, defenseFactor }（彗星のサンバ・不動のボレロ）
     *   powerText     … 図鑑・技の説明で、威力の代わりに出す言葉（式で決まる技）
     */

    // A. ブレス（tier2 は火・水・闇だけ。最上位は全属性）
    scorchBreath: {
      id: "scorchBreath", name: "灼熱の息", kind: "breath", power: 30, pp: 7, accuracy: 1.0,
      target: "allEnemies", element: "fire", effect: "scorchBreath", effectAt: "center", se: "fireBreath",
      description: "灼けつく息を吐き、相手全体を焼く。"
    },
    whirlpool: {
      id: "whirlpool", name: "大渦", kind: "breath", power: 28, pp: 7, accuracy: 1.0,
      target: "allEnemies", element: "water", effect: "whirlpool", effectAt: "center", se: "wave",
      modifier: { duration: 2, chance: 0.3, message: "{target} は 渦に 足を取られた!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.8 } ] },
      description: "大きな渦を起こして相手全体を呑む。2ターンのあいだ素早さを下げることがある。"
    },
    deepBreath: {
      id: "deepBreath", name: "深淵の息", kind: "breath", power: 30, pp: 7, accuracy: 1.0,
      target: "allEnemies", element: "dark", effect: "deepBreath", effectAt: "center", se: "darkBreath",
      status: { id: "curse", chance: 0.15 },
      description: "深淵の冷たい息を吐き、相手全体を包む。呪うことがある。"
    },
    scorchingHell: {
      id: "scorchingHell", name: "焦熱地獄", kind: "breath", power: 140, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "fire", effect: "scorchingHell", effectAt: "center", se: "fireBreathMax",
      modifier: { duration: 3, name: "焦熱", popup: "回復量減少",
        message: "{target} は 焦熱に包まれた! 受ける回復が 半分になった!",
        endMessage: "{target} の 焦熱が おさまった。",
        effects: [ { type: "healReceived", value: 0.5 } ] },
      description: "地獄の業火を吐き、相手全体を焼き尽くす。3ターンのあいだ、焦熱を付与する。"
    },
    tidalBreath: {
      id: "tidalBreath", name: "怒濤海嘯", kind: "breath", power: 125, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "water", effect: "tidalBreath", effectAt: "center", se: "waterBreathMax",
      modifier: { duration: 3, message: "{target} は 大波に 足を取られた!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.7 } ] },
      description: "押し寄せる大波で相手全体を呑み込む。3ターンのあいだ素早さを下げる。"
    },
    netherBreath: {
      id: "netherBreath", name: "冥府魔道", kind: "breath", power: 125, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "dark", effect: "netherBreath", effectAt: "center", se: "darkBreathMax",
      status: { id: "curse", chance: 0.6 },
      description: "冥府の闇を吐き出し、相手全体を包む。呪うことがある。"
    },
    bladeStorm: {
      id: "bladeStorm", name: "千刃旋風", kind: "breath", power: 120, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "wind", effect: "bladeStorm", effectAt: "center", se: "windBreathMax",
      modifier: { duration: 3, name: "裂傷", popup: "スリップダメージ",
        message: "{target} は 裂傷を負った!",
        endMessage: "{target} の 裂傷が ふさがった。",
        effects: [ { type: "slipDamage", min: 30, max: 50 } ] },
      description: "千の刃を含む旋風を吐き、相手全体を切り刻む。3ターンのあいだ、裂傷を付与する。"
    },
    earthCollapse: {
      id: "earthCollapse", name: "大地崩落", kind: "breath", power: 130, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "earth", effect: "earthCollapse", effectAt: "center", se: "earthBreathMax",
      modifier: { duration: 3, message: "{target} の 足もとが 崩れた!", popup: "被ダメージ上昇",
        effects: [ { type: "damageTaken", value: 1.2 } ] },
      description: "大地を崩す息を吐き、相手全体を落とす。3ターンのあいだ、受けるダメージが増える。"
    },
    // 光芒万丈は使い手がまだいない。使い手ができるまで図鑑に出さない（波さらいと同じ。作者の指定 2026-11-25）
    radiantBreath: {
      id: "radiantBreath", name: "光芒万丈", kind: "breath", power: 125, pp: 40, accuracy: 1.0,
      target: "allEnemies", element: "light", effect: "radiantBreath", effectAt: "center", se: "lightBreathMax",
      status: { id: "blind", chance: 0.9 },
      showInDex: false,
      description: "まばゆい光の息を放ち、相手全体を射る。盲目にすることがある。"
    },
    // ★ 強化を消す 20% は作者が「あとで弱めるかも」
    thunderHeaven: {
      id: "thunderHeaven", name: "万雷轟天", kind: "breath", power: 140, pp: 50, accuracy: 1.0,
      target: "allEnemies", element: "thunder", effect: "thunderHeaven", effectAt: "center", se: "thunderBreathMax",
      status: { id: "paralysis", chance: 0.5 },
      dispel: { chance: 0.2 },
      description: "天を揺るがす万の雷を吐き、相手全体を撃つ。麻痺させることがあり、強化を消すこともある。"
    },

    // B. 強化（共鳴・3ターン）。同じ能力の強化は、いちばん強いものだけ効く（EffectSystem.collectEffects）
    warCry: {
      id: "warCry", name: "ウォークライ", kind: "resonance", power: 0, pp: 15, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "warCry",
      modifier: { duration: 3, message: "{target} の 闘志が 高まった!",
        effects: [ { type: "statMultiplier", stat: "attack", value: 1.5 } ] },
      description: "鬨の声を響かせ、味方全体の攻撃を3ターンのあいだ上げる。"
    },
    protection: {
      id: "protection", name: "プロテクション", kind: "resonance", power: 0, pp: 12, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "protection",
      modifier: { duration: 3, message: "{target} の 守りが 高まった!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 1.5 } ] },
      description: "守りの響きで味方全体を包み、防御を3ターンのあいだ上げる。"
    },
    quickle: {
      id: "quickle", name: "クイックル", kind: "resonance", power: 0, pp: 13, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "quickle",
      modifier: { duration: 3, message: "{target} の 足が 軽くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 1.5 } ] },
      description: "風のような響きで、味方全体の素早さを3ターンのあいだ上げる。"
    },
    overdrive: {
      id: "overdrive", name: "オーバードライブ", kind: "resonance", power: 0, pp: 22, accuracy: 1.0,
      target: "ally", element: "none", effect: "overdrive",
      modifier: { duration: 3, message: "{target} の 力が あふれ出した!",
        effects: [ { type: "statMultiplier", stat: "attack", value: 2.0 } ] },
      description: "限界を超える響きで、味方1体の攻撃を3ターンのあいだ大幅に上げる。"
    },
    aegis: {
      id: "aegis", name: "アイギス", kind: "resonance", power: 0, pp: 16, accuracy: 1.0,
      target: "ally", element: "none", effect: "aegis",
      modifier: { duration: 3, message: "{target} は 神盾に 守られた!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 2.0 } ] },
      description: "神の盾の響きで、味方1体の防御を3ターンのあいだ大幅に上げる。"
    },
    accel: {
      id: "accel", name: "アクセル", kind: "resonance", power: 0, pp: 18, accuracy: 1.0,
      target: "ally", element: "none", effect: "accel",
      modifier: { duration: 3, message: "{target} の 動きが 加速した!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 2.0 } ] },
      description: "加速する響きで、味方1体の素早さを3ターンのあいだ大幅に上げる。"
    },

    // C. 弱体（共鳴・3ターン。弱体への耐性が掛かる）
    crack: {
      id: "crack", name: "クラック", kind: "resonance", power: 0, pp: 5, accuracy: 1.0,
      target: "enemy", element: "none", effect: "crack",
      modifier: { duration: 3, message: "{target} の 守りに ひびが入った!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 0.7 } ] },
      description: "守りにひびを入れる響きで、相手1体の防御を3ターンのあいだ下げる。"
    },
    slow: {
      id: "slow", name: "スロウ", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,
      target: "enemy", element: "none", effect: "slow",
      modifier: { duration: 3, message: "{target} の 足が 重くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.7 } ] },
      description: "動きを鈍らせる響きで、相手1体の素早さを3ターンのあいだ下げる。"
    },
    collapse: {
      id: "collapse", name: "コラプス", kind: "resonance", power: 0, pp: 11, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "collapse",
      evadable: false, canCritical: false,
      modifier: { duration: 3, message: "{target} の 守りが 崩れた!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 0.7 } ] },
      description: "守りを崩す響きで、相手全体の防御を3ターンのあいだ下げる。"
    },
    gravity: {
      id: "gravity", name: "グラビティ", kind: "resonance", power: 0, pp: 15, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "gravity",
      evadable: false, canCritical: false,
      modifier: { duration: 3, message: "{target} の 体が 重くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.7 } ] },
      description: "重さを掛ける響きで、相手全体の素早さを3ターンのあいだ下げる。"
    },
    shatterArmor: {
      id: "shatterArmor", name: "シャター", kind: "resonance", power: 0, pp: 16, accuracy: 1.0,
      target: "enemy", element: "none", effect: "shatterArmor",
      modifier: { duration: 3, message: "{target} の 守りが 砕けた!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 0.5 } ] },
      description: "守りを砕く響きで、相手1体の防御を3ターンのあいだ大きく下げる。"
    },
    bind: {
      id: "bind", name: "バインド", kind: "resonance", power: 0, pp: 25, accuracy: 1.0,
      target: "enemy", element: "none", effect: "bind",
      modifier: { duration: 3, message: "{target} は 縛りつけられた!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.5 } ] },
      description: "縛りつける響きで、相手1体の素早さを3ターンのあいだ大きく下げる。"
    },

    // D. 回復と蘇生（共鳴）
    curaris: {
      id: "curaris", name: "キュアリス", kind: "resonance", power: 0, pp: 10, accuracy: 1.0,
      target: "ally", element: "none", effect: "curaris",
      heal: { full: true },
      description: "味方1体のHPをすべて回復する。"
    },
    curarisAll: {
      id: "curarisAll", name: "キュアリスオール", kind: "resonance", power: 0, pp: 40, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "curarisAll",
      heal: { full: true },
      description: "味方全体のHPをすべて回復する。"
    },
    // 敵も使う（作者の指定 2026-11-25）。起こされた相手を倒し直しても、経験値・お金・落とし物は1回ぶんだけ
    resurrection: {
      id: "resurrection", name: "リザレクション", kind: "resonance", power: 0, pp: 25, accuracy: 1.0,
      target: "ally", element: "none", effect: "resurrection", se: "revive",
      revive: { hpRatio: 1.0, chance: 1.0 },
      enemyRevive: true,
      description: "倒れた味方1体を必ず起こし、HPをすべて回復する。"
    },

    // E. 支える技
    refresh: {
      id: "refresh", name: "リフレッシュ", kind: "resonance", power: 0, pp: 6, accuracy: 1.0,
      target: "ally", element: "none", effect: "refresh",
      cleanse: true,
      description: "味方1体に掛かっている弱体を、すべて消す。"
    },
    hush: {
      id: "hush", name: "ハッシュ", kind: "resonance", power: 0, pp: 10, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "hush",
      evadable: false, canCritical: false,
      status: { id: "seal", chance: 0.5 },
      description: "静寂の響きを広げ、相手全体を封印にすることがある。"
    },
    // かばう：ターンの頭に出る。選んだ味方1体への攻撃を代わりに受ける（減らない）。必中の技はかばえない
    guardAlly: {
      id: "guardAlly", name: "かばう", kind: "body", power: 0, pp: 8, accuracy: 1.0,
      target: "ally", element: "none", effect: "guardAlly", se: "guard",
      guard: true, notSelf: true,
      description: "このターン、味方1体への攻撃を代わりに受ける。自分は選べない。"
    },
    sharePp: {
      id: "sharePp", name: "分け与え", kind: "body", power: 0, pp: 0, accuracy: 1.0,
      target: "ally", element: "none", effect: "sharePp",
      ppShare: true, notSelf: true,
      description: "自分のいまのPPの半分を、味方1体に分ける。自分は選べない。"
    },
    quickStrike: {
      id: "quickStrike", name: "先手打ち", kind: "body", power: 0.8, pp: 3, accuracy: 1.0,
      target: "enemy", element: "none", effect: "quickStrike", se: "senteuchi",
      priority: true,
      description: "相手1体に素早く打ちかかる。必ずそのターンの最初に動く。"
    },
    duskWind: {
      id: "duskWind", name: "黄昏の風", kind: "body", power: 0, pp: 18, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "duskWind", effectAt: "center", se: "wind",
      sureHit: true,
      dispel: {},
      description: "黄昏の風を吹かせ、相手全体に掛かっている強化をすべて消す。"
    },

    // F. 属性技の3段目・4段目（共鳴）。4段目（tier: 4）は必中で、命中の弱体を受けない
    blaze: {
      id: "blaze", name: "ブレイズ", kind: "resonance", power: 70, pp: 16, accuracy: 1.0,
      target: "enemy", element: "fire", effect: "blazeVortex", se: "flame",
      criticalBonus: 0.12,
      description: "燃え盛る炎で、相手1体を焼く。クリティカルが出やすい。"
    },
    torrent: {
      id: "torrent", name: "トレント", kind: "resonance", power: 62, pp: 10, accuracy: 1.0,
      target: "enemy", element: "water", effect: "torrentJet", se: "wave",
      drain: 0.15,
      description: "激しい水流で相手1体を打つ。与えたダメージの一部を吸い取る。"
    },
    cyclone: {
      id: "cyclone", name: "サイクロン", kind: "resonance", power: 52, pp: 12, accuracy: 1.0,
      target: "allEnemies", element: "wind", effect: "cycloneFunnel", se: "gale",
      evadable: false, canCritical: false,
      description: "渦巻く風で、相手全体を切り裂く。"
    },
    rockBurst: {
      id: "rockBurst", name: "ロックバースト", kind: "resonance", power: 60, pp: 14, accuracy: 1.0,
      target: "enemy", element: "earth", effect: "rockBurst", se: "rockSpike",
      modifier: { duration: 2, message: "{target} の 守りに ひびが入った!", popup: "被ダメージ上昇",
        effects: [ { type: "damageTaken", value: 1.15 } ] },
      description: "岩を炸裂させて相手1体を打つ。2ターンのあいだ、受けるダメージが増える。"
    },
    prism: {
      id: "prism", name: "プリズム", kind: "resonance", power: 66, pp: 15, accuracy: 1.0,
      target: "enemy", element: "light", effect: "prism", se: "shine",
      status: { id: "blind", chance: 0.5 },
      description: "分かれた光で相手1体を射る。盲目にすることがある。"
    },
    abyss: {
      id: "abyss", name: "アビス", kind: "resonance", power: 68, pp: 15, accuracy: 1.0,
      target: "enemy", element: "dark", effect: "abyss", se: "darkNebula",
      status: { id: "curse", chance: 0.3 },
      description: "深い闇で相手1体を呑む。呪うことがある。"
    },
    plasma: {
      id: "plasma", name: "プラズマ", kind: "resonance", power: 75, pp: 26, accuracy: 1.0,
      target: "allEnemies", element: "thunder", effect: "plasma", effectAt: "center", se: "volt",
      evadable: false, canCritical: false,
      status: { id: "paralysis", chance: 0.2 },
      description: "荒れ狂う電光で、相手全体を撃つ。麻痺させることがある。"
    },
    inferno: {
      id: "inferno", name: "インフェルノ", kind: "resonance", power: 160, pp: 28, accuracy: 1.0,
      target: "enemy", element: "fire", effect: "inferno", se: "fire4",
      tier: 4, sureHit: true,
      criticalBonus: 0.25,
      description: "地の底の業火で、相手1体を焼き尽くす。クリティカルがとても出やすい。必ず当たる。"
    },
    maelstrom: {
      id: "maelstrom", name: "メイルシュトローム", kind: "resonance", power: 130, pp: 20, accuracy: 1.0,
      target: "enemy", element: "water", effect: "maelstrom", se: "water4",
      tier: 4, sureHit: true,
      drain: 0.4,
      description: "巨大な渦で相手1体を呑み込み、与えたダメージの多くを吸い取る。必ず当たる。"
    },
    tempest: {
      id: "tempest", name: "テンペスト", kind: "resonance", power: 135, pp: 24, accuracy: 1.0,
      target: "allEnemies", element: "wind", effect: "tempest", effectAt: "center", se: "wind4",
      tier: 4, sureHit: true, canCritical: false,
      description: "吹き荒れる嵐で、相手全体を打ちのめす。必ず当たる。"
    },
    terraBurst: {
      id: "terraBurst", name: "テラバースト", kind: "resonance", power: 125, pp: 25, accuracy: 1.0,
      target: "allEnemies", element: "earth", effect: "terraBurst", effectAt: "center", se: "earth4",
      tier: 4, sureHit: true, canCritical: false,
      modifier: { duration: 2, message: "{target} の 守りに ひびが入った!", popup: "被ダメージ上昇",
        effects: [ { type: "damageTaken", value: 1.15 } ] },
      description: "大地を炸裂させ、相手全体を打つ。2ターンのあいだ、受けるダメージが増える。必ず当たる。"
    },
    saintNova: {
      id: "saintNova", name: "セイントノヴァ", kind: "resonance", power: 145, pp: 26, accuracy: 1.0,
      target: "enemy", element: "light", effect: "saintNova", se: "light4",
      tier: 4, sureHit: true,
      status: { id: "blind", chance: 0.4 },
      extraStatus: { id: "seal", chance: 0.4 },
      description: "聖なる光の爆発で相手1体を射る。盲目や封印にすることがある。必ず当たる。"
    },
    grandNebula: {
      id: "grandNebula", name: "グランドネビュラ", kind: "resonance", power: 130, pp: 24, accuracy: 1.0,
      target: "allEnemies", element: "dark", effect: "grandNebula", effectAt: "center", se: "dark4",
      tier: 4, sureHit: true, canCritical: false,
      status: { id: "curse", chance: 0.25 },
      description: "果てしない闇の雲で、相手全体を呑み込む。呪うことがある。必ず当たる。"
    },
    judgment: {
      id: "judgment", name: "ジャッジメント", kind: "resonance", power: 155, pp: 40, accuracy: 1.0,
      target: "enemy", element: "thunder", effect: "judgment", se: "thunder4",
      tier: 4, sureHit: true,
      status: { id: "paralysis", chance: 0.4 },
      dispel: { chance: 0.5 },
      description: "裁きの雷を落とし、相手1体を撃つ。麻痺させることがあり、強化を消すこともある。必ず当たる。"
    },

    // G. 斬撃（通常攻撃の基礎 × 倍率）
    lightSlash: {
      id: "lightSlash", name: "閃光斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "light", effect: "lightSlash", se: "slashLight",
      description: "光をまとった刃で、相手1体を斬りつける。"
    },
    shadowSlash: {
      id: "shadowSlash", name: "影斬り", kind: "slash", power: 1.2, pp: 4, accuracy: 1.0,
      target: "enemy", element: "dark", effect: "shadowSlash", se: "slashDark",
      description: "影をまとった刃で、相手1体を斬りつける。"
    },
    crimsonSlash: {
      id: "crimsonSlash", name: "紅蓮斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "fire", effect: "crimsonSlash", se: "slashFire",
      criticalBonus: 0.15,
      description: "紅蓮の炎の刃で、相手1体を斬りつける。クリティカルが出やすい。"
    },
    // ウルヴァーグの絆の技（v1.8.0。名前・斬撃・水・威力1.25・相手1体・必ず先手は作者の指定 2026-11-26）。PP 6 は私の案のまま
    // 演出は専用の dropCleave（雫が落ちきる前に、水の一閃が雫ごと斬る。data/effects.js）
    dropCleave: {
      id: "dropCleave", name: "雫断ち", kind: "slash", power: 1.25, pp: 6, accuracy: 1.0,
      target: "enemy", element: "water", effect: "dropCleave",
      priority: true,
      description: "雫が落ちきるより速く、水の刃で相手1体を斬りつける。必ずそのターンの最初に動く。"
    },
    torrentSlash: {
      id: "torrentSlash", name: "激流斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "water", effect: "torrentSlash", se: "slashWater",
      drain: 0.15,
      description: "激流の刃で相手1体を斬りつけ、与えたダメージの一部を吸い取る。"
    },
    whirlSlash: {
      id: "whirlSlash", name: "旋風斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "wind", effect: "whirlSlash", se: "slashWind",
      modifier: { duration: 2, chance: 0.3, message: "{target} の 足が 重くなった!",
        effects: [ { type: "statMultiplier", stat: "speed", value: 0.8 } ] },
      description: "旋風の刃で相手1体を斬りつける。2ターンのあいだ素早さを下げることがある。"
    },
    earthSlash: {
      id: "earthSlash", name: "大地斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "earth", effect: "earthSlash", se: "slashEarth",
      modifier: { duration: 2, chance: 0.3, message: "{target} の 守りが 崩れた!",
        effects: [ { type: "statMultiplier", stat: "defense", value: 0.8 } ] },
      description: "大地を割る刃で相手1体を斬りつける。2ターンのあいだ防御を下げることがある。"
    },
    raijinSlash: {
      id: "raijinSlash", name: "雷神斬り", kind: "slash", power: 1.40, pp: 12, accuracy: 1.0,
      target: "enemy", element: "thunder", effect: "raijinSlash", se: "slashThunder", hitSe: "thunder",
      status: { id: "paralysis", chance: 0.15 },
      description: "雷神の刃で相手1体を斬りつける。麻痺させることがある。"
    },
    holySlash: {
      id: "holySlash", name: "聖光斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "light", effect: "holySlash", se: "slashLight",
      status: { id: "blind", chance: 0.2 },
      description: "聖なる光の刃で相手1体を斬りつける。盲目にすることがある。"
    },
    darkShadowSlash: {
      id: "darkShadowSlash", name: "黒影斬り", kind: "slash", power: 1.35, pp: 10, accuracy: 1.0,
      target: "enemy", element: "dark", effect: "darkShadowSlash", se: "slashDark",
      status: { id: "curse", chance: 0.15 },
      description: "黒い影の刃で相手1体を斬りつける。呪うことがある。"
    },
    // 1回ずつクリティカルがある（二連斬りと同じ）
    wildSlash: {
      id: "wildSlash", name: "乱れ斬り", kind: "slash", power: 0.6, pp: 7, accuracy: 1.0,
      target: "enemy", element: "none", effect: "wildSlash",
      hits: 3, hitsMax: 4, randomTargets: true,
      description: "刃を振り回し、ランダムな対象を3〜4回斬る。"
    },
    // 先にふつうの命中、当たったらクリティカルを判定（ふだんの率＋40%）。クリティカルでなければ外れ
    criticalSlash: {
      id: "criticalSlash", name: "会心斬り", kind: "slash", power: 1.0, pp: 15, accuracy: 1.0,
      target: "enemy", element: "none", effect: "criticalSlash",
      critOnly: true, criticalBonus: 0.4,
      description: "急所だけを狙って斬る。クリティカルのときだけ当たる。"
    },
    sweepSlash: {
      id: "sweepSlash", name: "薙ぎ払い", kind: "slash", power: 0.75, pp: 8, accuracy: 1.0,
      target: "allEnemies", element: "none", effect: "sweepSlash", effectAt: "center",
      canCritical: false,
      description: "刃を大きく振るい、相手全体を薙ぎ払う。"
    },
    allOutSlash: {
      id: "allOutSlash", name: "渾身斬り", kind: "slash", power: 1.8, pp: 20, accuracy: 1.0,
      target: "enemy", element: "none", effect: "allOutSlash",
      canCritical: false,
      description: "渾身の力で、相手1体を斬りつける。クリティカルは出ない。"
    },

    // H. 踊り（と ばくれつけん）。踊りの攻撃はかわされる・クリティカルなし。「でたらめ」は1回ごとに選ぶ
    swordDance: {
      id: "swordDance", name: "つるぎの舞", kind: "dance", power: 0.4, pp: 15, accuracy: 1.0,
      target: "enemy", element: "none", effect: "swordDance",
      damageFormula: "normalRate", canCritical: false,
      hits: 3, hitsMax: 6, randomTargets: true, maxDamage: 100,
      description: "刃のように舞い、ランダムな対象を3〜6回斬る。"
    },
    burstFist: {
      id: "burstFist", name: "ばくれつけん", kind: "body", power: 0.5, pp: 15, accuracy: 1.0,
      target: "enemy", element: "none", effect: "burstFist",
      hits: 4, randomTargets: true, maxDamage: 150,
      description: "目にも止まらぬ拳を4回、ランダムな対象に打ち込む。"
    },
    heatHaze: {
      id: "heatHaze", name: "陽炎の舞", kind: "dance", power: 0, pp: 12, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "heatHaze",
      modifier: { duration: 3, message: "{target} の 姿が 揺らめいた!", popup: "回避率上昇",
        effects: [ { type: "evasionBonus", value: 0.15 } ] },
      description: "陽炎のように揺らめく舞で、味方全体の回避率を3ターンのあいだ上げる。"
    },
    // 焦熱のときは1回ずつ半分。探索中は使えない（でたらめに当たるのは戦闘の仕組みのため）
    hustleDance: {
      id: "hustleDance", name: "ハッスルダンス", kind: "dance", power: 0, pp: 18, accuracy: 1.0,
      target: "allAllies", element: "none", effect: "hustleDance",
      heal: { min: 55, max: 80 },
      hits: 3, hitsMax: 6, randomTargets: true,
      fieldUse: false,
      description: "陽気に踊り、ランダムな味方を3〜6回回復する。"
    },
    cometSamba: {
      id: "cometSamba", name: "彗星のサンバ", kind: "dance", power: 1, pp: 20, accuracy: 1.0,
      target: "enemy", element: "none", effect: "cometSamba",
      damageFormula: { stat: "speed", factor: 0.15, defenseFactor: 0.1 }, powerText: "素早さ",
      canCritical: false,
      hits: 4, randomTargets: true, maxDamage: 150,
      description: "彗星のような速さで踊り、4回、ランダムな対象を攻撃する。自分の素早さが高いほど強い。"
    },
    steadyBolero: {
      id: "steadyBolero", name: "不動のボレロ", kind: "dance", power: 1, pp: 20, accuracy: 1.0,
      target: "enemy", element: "none", effect: "steadyBolero",
      damageFormula: { stat: "defense", factor: 0.15, defenseFactor: 0.1 }, powerText: "防御",
      canCritical: false,
      hits: 4, randomTargets: true, maxDamage: 150,
      description: "どっしりと構えて踊り、4回、ランダムな対象を攻撃する。自分の防御が高いほど強い。"
    },

    // 主が頭の葉から薬草を取って、自分に使う（道具の薬草と同じ20回復）。
    // 技ではなく道具を使った見え方にするので、宣言の文を useMessage で差し替え、図鑑には載せない
    bossHerb: {
      id: "bossHerb",
      name: "やくそう",
      power: 0,
      pp: 0,
      accuracy: 1.0,
      target: "self",
      element: "none",
      effect: "herbLeaves",
      heal: { amount: 20 },
      useMessage: "{actor} は やくそうを 使った!",
      showInDex: false,
      description: "頭の葉から薬草を取って、自分に使う。"
    }
  };
})(window.MyGame);
