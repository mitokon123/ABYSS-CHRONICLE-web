/**
 * story.js
 * 物語の場面。決まった場面に来たとき、1度だけ流れる。
 *
 * 中身の決まりごとは ストーリー構成.md。**そこに書かれていない固有名詞・設定は足さない。**
 * 本文の元は scenario_yoran_改訂版.md（揺籃の穴 場面1〜8。2026-10-21 に作者が話を根本から変えた版）と
 * scenario_houga.md（萌芽の穴 場面9〜13。2026-11-18 に作者が送った版。v1.5.0）と
 * scenario_yosen.md（クロニクル杯 予選 場面14〜18。同じ日に作者が送った版。v1.5.0）と
 * scenario_kanyou.md（涵養の穴 場面19〜21。2026-11-27 に作者が書き直した版。v1.8.0）。直すときは両方をそろえる。
 *   改訂版の筋：主人公はモンスターが好きで、年に一度の大会「クロニクル杯」を目指して認定試験を受ける。
 *   前の版の「燃える村・親が消えた夜・小さな青い影・天蓋会」は外した（天蓋会は第2部で扱う）
 *
 * scenes : 場面のひとつひとつ
 *   id       : 識別子。**見たかどうかをこのidでセーブに残す**ので、
 *              一度出した場面のidは変えないこと（変えるともう一度流れる）
 *   trigger  : どこで流れるか。下の一覧から選ぶ
 *   when     : 流れる条件（省略するといつでも）。
 *                cleared: "ダンジョンid" … そのダンジョンをクリアしている
 *                event:   "出来事id"     … その出来事（data/dungeons.js の events）を済ませている
 *                result:  "win" など     … event の戦いの結果（win / lose / flee / scouted。配列で複数可。
 *                                           null は「結果が残っていない」＝結果を残す前のセーブ）
 *                caught:  "種族id"       … その種族を仲間にしたことがある
 *                seenAny: ["場面id", …]  … どれかをもう見た
 *                notSeen: ["場面id", …]  … どれもまだ見ていない
 *   order    : 同じ trigger に複数あるときの順番（小さいほど先）。
 *              条件を満たした場面が2つ以上あれば、この順に続けて流れる
 *   draft    : true にすると、画面の右上に「（仮の文章）」の印が出る。文章が決まったら消す
 *   repeat   : true にすると、見たあとも毎回流れる（v1.5.0。予選の場面15・16・18）
 *   notice   : 流し終えて拠点へ着いたとき、一度だけ出す知らせ（v1.5.0。場面13のあとの「予選の会場へ行けるようになった」）
 *   bgm      : 流す曲の id（data/audio.js の bgm）。"none" で止める。省略すると、いま鳴っている曲のまま
 *   letterbox: true にすると、上下に黒い帯が出る（映画のような画面）
 *   style    : 既定の見せ方。ページごとに上書きできる
 *     "narration" … 真ん中に文が浮かぶ（語り）
 *     "dialogue"  … 画面の下の窓に、話す人の名前と台詞が出る（会話）
 *     "title"     … 大きな見出しが、字間を詰めながら浮かぶ（区切り）
 *     "choice"    … 選択肢。choices: [{ label, pages: [...] }]。
 *                   前のページの台詞を窓に出したまま、右上に項目を並べる（lines を書けばそちらを出す）。
 *                   選んだ項目の pages がすぐあとに入り、終わったら選択肢の後ろのページへ続く
 *   bg       : 最初の背景（data/ui.js の story.backdrops の id）
 *   pages    : ページの並び。決定（クリック）で次へ進む
 *     lines   : 本文。1要素が1行。**折り返さないので、長すぎる行は自分で分ける**
 *               目安：語り 4行・25字まで／会話 3行・30字まで／見出し 2行・10字まで
 *     speaker : 話す人の名前（dialogue のときだけ出る）
 *     style   : このページだけ見せ方を変える
 *     bg      : 背景を変える。書かなければ前のページのまま（変わるときは溶けて切り替わる）
 *     transition: "black" … 暗転。真っ暗から明けていく（背景が前のページと同じなら暗転しない）
 *     if      : そのページを入れる条件（書き方は when と同じ）。場面の始まりで決まる
 *     marks   : そのページを見たら、ここに書いた場面も見たことにする（別の場面の代わりを務めるページ）
 *     delay   : 文字が出はじめるまで待つミリ秒（「少し間を置く」）
 *     actors  : 画面に立たせるもの。書かなければ前のページのまま。[] で全員下がる
 *       monster: "種族id" / player: true / sprite: "絵のid" のどれか
 *       x, y   : x は中心、y は足元（px）。size は大きさ（px）
 *       enter  : 登場の動き fade / rise / drop / left / right / grow（前のページにいたものは動かない）
 *       motion : 動き（data/motions.js）。モンスターは種族の動き、主人公は立ち姿の動きが既定
 *       silhouette : 色を書くと、その色の影だけを描く（正体を見せない）
 *       glow   : 後ろに淡い光を置く色
 *       id     : 同じものとして扱う名前。位置を変えて出し直したいときは、別の id にする
 *       ※ いなくなったものは、その場で薄れて下がる
 *     fx      : ページの頭の演出。1つか配列で
 *                 "shake"（揺れ）/ "flash"（光）/ { type: "memory", bg } 別の背景を一瞬だけ重ねる
 *                 { type, power, time, color, alpha } で強さや長さも変えられる
 *               揺れと光は、設定「エフェクトの濃さ」に従う（0 なら出ない）
 *     se      : ページの頭で鳴らす効果音（data/audio.js の se）
 *     bgm     : ページの頭で曲を変える（"none" で止める）
 *     cue     : 文字を出しきったあとに起きる演出（「この文のあと」）。
 *               { actors, fx, se }。actors を書くと、そこで立ち絵が入れ替わる。
 *               at にミリ秒を書くと、ページの頭からその時間で起きる
 *
 * ▼ 文の中で使える差し込み
 *   {player} … 主人公の名前（プレイヤーが決めたもの）
 *   {me}     … 主人公の一人称（私・僕・俺 など。プレイヤーが選んだもの。data/player.js）
 *
 * ▼ 流れる場面（trigger）の一覧
 *   newGame    … 新しく始めて、名前と見た目を決めた直後（拠点へ行く前）
 *   homeReturn … 拠点に着いたとき（探索の結果画面のあと・「続きから」で始めたとき）。
 *                when で「どの主を倒したあとか」を決める
 *   qualifier  … クロニクル杯の予選（v1.5.0）。きっかけで探さず、予選の流れ（NS.Qualifier）が id を指して流す
 *                （Game.playStoryScene。どの場面を使うかは data/bosses.js の tournament.qualifier.scenes）
 *   ★ 場面を増やすときは、その画面で game.playStory(trigger, 次の画面) を呼ぶ1行を足す。
 *     既にある trigger を使うならコードは触らない。
 *
 * ▼ 古いセーブ（この仕組みができる前）を読んだ場合
 *   その時点にある場面は**全部もう見た扱い**にする（チュートリアルと同じ）。
 *   あとで足した場面は、その人にもふつうに流れる。
 *
 * 画面の配置・背景の中身は data/ui.js の story、案内の文言は data/messages.js の story。
 * 人物の絵（オルド・イレーネ・探索者）は data/sprites_story.js。
 */
(function (NS) {
  "use strict";

  // --- 拠点の夜（背景 camp）で人物が立つ位置。たき火は x 664〜716 ---
  //   たき火の左に、右から 主人公・スライム・オルド・イレーネ と並ぶ
  var PLAYER = { player: true, x: 596, y: 414, size: 64, enter: "fade" };
  var SLIME  = { monster: "slime", x: 534, y: 414, size: 46, enter: "fade" };
  //   person は data/sprites_story.js の charaLooks のid（v1.2.0。部品を重ねた新しい絵で、大きさは data/ui.js の story.personSize）。
  //   新しい絵が使えないときは sprite・size の 32×32 の絵で描く
  var ORD    = { id: "ord", person: "ord", sprite: "npcOrd", motion: "breathe", x: 462, y: 414, size: 68, enter: "fade" };
  var IRENE  = { id: "irene", person: "irene", sprite: "npcIrene", motion: "breathe", x: 388, y: 414, size: 66, enter: "fade" };

  // ルカ（第二章。v1.5.0）。イレーネと同じ所（オルドの左）に立つ
  var LUCA   = { id: "luca", person: "luca", sprite: "npcLuca", motion: "breathe", x: 388, y: 414, size: 66, enter: "left" };

  // --- 白砂の闘技場（背景 arena。v1.5.0・クロニクル杯）で立つ位置 ---
  //   主人公とスライムは拠点と同じ所。左に、イレーネ・ルカ・昨年の王者・黒い外套の探索者が入れ替わりで立つ
  //   王者と黒い外套の探索者のモンスターは、まだ正体を見せない（影だけ）。
  //   王者のほうは何も分からない真っ暗な影（シニガミを塗りつぶしたような形の championShadow。作者の指定 2026-11-18）。
  //   黒い外套のほうはヨドミの形の影（作者が了承）
  var ARENA_IRENE = { id: "irene", person: "irene", sprite: "npcIrene", motion: "breathe", x: 400, y: 414, size: 66, enter: "fade" };
  var ARENA_LUCA  = { id: "luca", person: "luca", sprite: "npcLuca", motion: "breathe", x: 400, y: 414, size: 66, enter: "left" };
  var ARENA_RAT   = { id: "lucaRat", monster: "mossRat", x: 470, y: 414, size: 38, enter: "left" };
  var CHAMPION    = { id: "champion", person: "champion", x: 300, y: 414, enter: "left" };
  var CHAMPION_MON = { id: "championMon", sprite: "championShadow", motion: "breathe", x: 165, y: 414, size: 150, enter: "left",
                       silhouette: "#050307" };
  var CLOAKED     = { id: "cloaked", person: "cloaked", x: 250, y: 414, enter: "fade" };
  var CLOAKED_MON = { id: "cloakedMon", monster: "murkling", x: 330, y: 414, size: 48, enter: "fade",
                      silhouette: "#14110d" };
  // 主人公の後ろに隠れるスライム（場面14）。主人公より先に並べて、後ろに描く
  var SLIME_HIDE  = { id: "slimeHide", monster: "slime", x: 628, y: 408, size: 40, enter: "right" };

  // 拠点に連れて帰ったヨミリュウ（場面4-誘う・場面7）。人物の左に立つ
  var DRAGON_CAMP = { id: "dragonCamp", monster: "abyssDragon", x: 210, y: 414, size: 170, enter: "fade" };

  // --- 場面4（ヨミリュウの報告）で、結果が違っても同じページ ---

  // 頭：「闇が息をした。」のあとに、竜を影だけで立たせる／揺れ／闇の息
  var YOMI_OPEN = {
    lines: [
      "深層の四階。",
      "闇が息をした。"
    ],
    cue: {
      actors: [ { id: "dragon", monster: "abyssDragon", x: 400, y: 545, size: 230,
                  enter: "fade", silhouette: "#0b0d1c", glow: "#5a44a8" } ],
      fx: ["shake"], se: "darkBreath", hold: 900
    }
  };
  // 暗転して拠点の夜。イレーネが立つ
  var YOMI_ASK = { transition: "black", bg: "camp", style: "dialogue", speaker: "イレーネ",
                   actors: [ PLAYER, SLIME, IRENE ], lines: [ "竜……ですか？　揺籃の穴に。" ] };
  var YOMI_NO_RECORD = { style: "dialogue", speaker: "イレーネ", lines: [
    "揺籃は、探索者が最初に潜る穴です。",
    "竜が出たという記録は、協会に一つもありません。"
  ] };
  var YOMI_SHADOW = { style: "dialogue", speaker: "イレーネ", lines: [
    "暗い深層では、影が大きく見えるものです。",
    "初めての試験ならなおさら。"
  ] };
  var YOMI_INSIST = { style: "dialogue", speaker: "{player}", lines: [
    "見間違いじゃありません。",
    "{me}は、この目で見ました。記録にも残しています。"
  ] };
  var YOMI_RECEIVE = { style: "dialogue", speaker: "イレーネ", lines: [ "記録は……受け取りますよ。" ] };
  // 前の台詞から少し間を置く
  var YOMI_REJECT = { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [ "受理はしませんがね。" ] };
  // イレーネが下がり、オルドが立つ
  var YOMI_ORD_SILENT = { actors: [ PLAYER, SLIME, ORD ], lines: [
    "オルドは何も言わなかった。",
    "ただ、じっと深淵のほうを見ていた。"
  ] };

  // 場面8（初めて全滅したとき）の本文。場面4-負けにも差し込むので、ここに置く
  var FIRST_DEFEAT_LINES = [
    "気がつくと、たき火のそばだった。",
    "持っていたはずの素材は",
    "どこにもない。"
  ];

  NS.rawData.story = {
    scenes: {

      /** --- 場面1 オープニング（新しく始めた直後） --- */
      opening: {
        id: "opening",
        trigger: "newGame",
        order: 1,
        bgm: "home",
        style: "narration",
        bg: "camp",
        pages: [
          { actors: [ PLAYER ], lines: [
            "深淵のほとりに、今夜もたき火が灯っている。",
            "明日、{me}はクロニクラーの認定試験を受ける。"
          ] },
          { lines: [
            "記録を重ねた者だけが出られる、",
            "年に一度の大会がある。",
            "{me}は、その舞台に立ちたかった。"
          ] },
          { lines: [
            "ただ勝ちたいのではない。",
            "モンスターと並んで、",
            "一緒に強くなりたかった。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "お前が{player}か。",
            "明日からの試験は揺籃の穴だ。",
            "四つの区画を抜け、主を記録して戻れ。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "同行するモンスターを一体、連れていく決まりだ。",
            "協会で預かっていたスライムだ。"
          ] },
          // スライムが主人公の足元へ寄ってくる（位置を変えて出し直す）
          { actors: [ PLAYER, { id: "slimeNear", monster: "slime", x: 562, y: 414, size: 46, enter: "left" }, ORD ], lines: [
            "スライムは、{me}の足元に寄ってきた。",
            "{me}がそっと手を伸ばすと、",
            "ひんやりと、柔らかかった。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "よろしく……"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "モンスターを好きなのは悪くない。",
            "だが好きだからといって、",
            "向こうも同じとは限らん。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "穴は、優しい場所じゃない。",
            "覚えておけ。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "はい……わかってます。"
          ] },
          { style: "title", bg: "night", actors: [], lines: [
            "揺籃の穴",
            "クロニクラー認定試験"
          ] }
        ]
      },

      /** --- 場面2 坑道の主のあと（苔むす坑道をクリアして拠点に戻ったとき） --- */
      mineCleared: {
        id: "mineCleared",
        trigger: "homeReturn",
        when: { cleared: "mossyMine" },
        order: 10,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "坑道の主を記録したか。",
            "見せてみろ。"
          ] },
          { style: "narration", lines: [
            "オルドは黙って頁をめくり、",
            "ある一行で、指を止めた。"
          ] },
          // 1行目はスライムの図鑑の説明文の引用（早見表/モンスターと絆.txt の「図鑑説明文」）。図鑑を変えたらここも揃える
          { speaker: "オルド", lines: [
            "「人を襲う可能性はある」か。",
            "……そのスライムは今日、お前を襲ったか？"
          ] },
          { speaker: "{player}", lines: [
            "……いえ。",
            "前に出て、守ってくれました。"
          ] },
          { speaker: "オルド", lines: [
            "……そうか。記録は見たとおりに書け。",
            "危険も、優しさもだ。",
            "それが、クロニクラーの仕事だ。"
          ] }
        ]
      },

      /** --- 場面3 亀裂の主のあと（灼熱の亀裂をクリアして拠点に戻ったとき） --- */
      fissureCleared: {
        id: "fissureCleared",
        trigger: "homeReturn",
        when: { cleared: "scorchingFissure" },
        order: 20,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "灼熱の獣を越えたか。",
            "……亀裂の熱も、モンスターも、妙に強くなかったか。"
          ] },
          // 選択肢。どちらを選んでも、最後の語りのページへ続く
          { style: "choice", choices: [
            { label: "はい", pages: [
              { speaker: "オルド", lines: [
                "そうだったろう。",
                "昔の揺籃は、もっとおとなしい穴だった。"
              ] },
              { speaker: "オルド", lines: [
                "ここ数年、底のほうで何かが詰まっている。",
                "……気のせいならいいがな。"
              ] }
            ] },
            { label: "いいえ", pages: [
              { speaker: "オルド", lines: [
                "そうか。……お前が強くなったのかもしれんな。",
                "だが、昔の揺籃は、もっとおとなしい穴だった。"
              ] },
              { speaker: "オルド", lines: [
                "ここ数年、底のほうで何かが詰まっている。",
                "……気のせいならいいがな。"
              ] }
            ] }
          ] },
          // スライムはたき火のそばで丸くなり、主人公はその隣に腰を下ろす
          { style: "narration",
            actors: [
              { id: "playerBeside", player: true, x: 596, y: 414, size: 64, enter: "fade" },
              { monster: "slime", x: 640, y: 420, size: 40, enter: "fade" },
              ORD
            ],
            lines: [
              "スライムは、たき火のそばで丸くなっていた。",
              "{me}は隣に腰を下ろし、",
              "揺れるスライムを、そっと撫でた。"
            ] }
        ]
      },

      /**
       * --- 場面4 ヨミリュウの報告（静寂の深層の地下4階でヨミリュウに襲われて戻ったとき） ---
       * 戦いの結果で4つに分かれる（負け・逃げ・勝ち・誘う）。頭の1ページはどれも同じ。
       * 「負け」には、結果を残す前のセーブ（result が null）も含める
       */
      yomiryuReport: {
        id: "yomiryuReport",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: ["lose", null] },
        order: 30,
        letterbox: true,
        bgm: "none",          // 曲なし
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "気づいたときには、",
            "{me}たちは地に伏していた。"
          ] },
          // 初めての全滅がこの戦いだったときだけ、場面8をここに差し込む（場面8は別には流れない）
          { "if": { notSeen: ["firstDefeat"] }, marks: "firstDefeat",
            transition: "black", bg: "camp", actors: [ PLAYER, SLIME ],
            lines: FIRST_DEFEAT_LINES },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "ひと息で、全員が倒されかけました。"
          ] },
          YOMI_NO_RECORD,
          YOMI_SHADOW,
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-逃げ --- */
      yomiryuReportFled: {
        id: "yomiryuReportFled",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "flee" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "{me}たちは、振り返らずに走った。",
            "背中を闇の気配が追ってきた。"
          ] },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "逃げるのが、やっとでした。"
          ] },
          YOMI_NO_RECORD,
          YOMI_SHADOW,
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-勝ち --- */
      yomiryuReportWon: {
        id: "yomiryuReportWon",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "win" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "何度も倒れかけ、",
            "それでも、{me}たちは立っていた。",
            "竜は深淵の闇へと崩れていった。"
          ] },
          YOMI_ASK,
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階です。黒い鱗の竜が、闇を吐いて……。",
            "なんとか倒しましたが……"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "試験中の新人が竜種を。",
            "……ますます、信じがたいですね。"
          ] },
          YOMI_INSIST,
          YOMI_RECEIVE,
          YOMI_REJECT,
          YOMI_ORD_SILENT
        ]
      },

      /** --- 場面4-誘う（ヨミリュウのスカウトに成功して戻ったとき） --- */
      yomiryuReportScouted: {
        id: "yomiryuReportScouted",
        trigger: "homeReturn",
        when: { event: "yomiryuAmbush", result: "scouted" },
        order: 30,
        letterbox: true,
        bgm: "none",
        bg: "depths",
        style: "narration",
        pages: [
          YOMI_OPEN,
          { lines: [
            "闇の中で竜はこちらを見ていた。",
            "そして――{me}たちの後ろに、",
            "静かについてきた。"
          ] },
          // ここで初めて竜の姿を見せる
          { transition: "black", bg: "camp", actors: [ DRAGON_CAMP, PLAYER, SLIME ], lines: [
            "野営地が、静まり返った。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE ], lines: [
            "……これは。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "深層の四階にいました。",
            "揺籃の穴に竜がいたんです。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "……ええ。"
          ] },
          { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [
            "このことはしばらく伏せておいてください。",
            "探索者たちが騒ぎますから。"
          ] },
          { actors: [ DRAGON_CAMP, PLAYER, SLIME, ORD ], lines: [
            "オルドが喉の奥で小さく笑った。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "誰も信じない竜を、連れて帰ってきたか。"
          ] }
        ]
      },

      /** --- 場面5 深層の主のあと（静寂の深層をクリアして拠点に戻ったとき） --- */
      depthsCleared: {
        id: "depthsCleared",
        trigger: "homeReturn",
        when: { cleared: "silentDepths" },
        order: 40,
        bgm: "home",
        bg: "camp",
        style: "narration",
        pages: [
          { lines: [
            "スライムたちの王を前にしても、",
            "この小さな一体は、{me}の前から",
            "一歩も退かなかった。"
          ] },
          { actors: [ PLAYER, SLIME ], lines: [
            "モンスターに守られる。",
            "それが不思議と誇らしかった。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "いい相棒を持ったな。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "はい。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "その気持ちも記録に書いておけ。",
            "見たとおりに、感じたとおりにな。"
          ] },
          // スライムが主人公の膝に乗って眠る（主人公に重ねて小さく出し直す）
          { actors: [ PLAYER, { id: "slimeLap", monster: "slime", x: 600, y: 420, size: 36, enter: "fade" }, ORD ], lines: [
            "その夜、スライムは{me}の膝に乗って眠った。",
            "思っていたより、ずっと重く、温かかった。"
          ] }
        ]
      },

      /** --- 場面6 試験の終わり（腐食の毒沼をクリアして拠点に戻ったとき） --- */
      marshCleared: {
        id: "marshCleared",
        trigger: "homeReturn",
        when: { cleared: "venomMarsh" },
        order: 50,
        bgm: "home",
        bg: "camp",
        style: "dialogue",
        pages: [
          { speaker: "イレーネ", actors: [ PLAYER, SLIME, IRENE, ORD ], lines: [
            "四つの主の記録、確かに受け取りました。",
            "揺籃の穴の踏破を、協会として認めます。"
          ] },
          { speaker: "イレーネ", se: "levelUp", lines: [
            "{player}、合格です。",
            "今日からあなたはクロニクラーです。"
          ] },
          { speaker: "イレーネ", lines: [
            "竜の記録は……まあ、保管しておきましょう。"
          ] },
          { speaker: "オルド", lines: [
            "よく戻った。"
          ] },
          // 年に一度の大会「クロニクル杯」（名前は作者が確定）。参加権は穴の主を記録した数で決まる
          { speaker: "イレーネ", lines: [
            "クロニクラーには、もうひとつ道が開かれます。",
            "年に一度の大会、クロニクル杯への参加です。"
          ] },
          { speaker: "イレーネ", lines: [
            "参加権を得るには、各地の穴の主を記録していくこと。",
            "焦らず、穴を巡って、仲間と力をつけなさい。"
          ] },
          { style: "narration", lines: [
            "スライムが、{me}の足元で小さく跳ねた。",
            "大会……この子と一緒に。"
          ] },
          { speaker: "{player}", lines: [
            "出たいです。"
          ] },
          { speaker: "オルド", lines: [
            "よく言った。"
          ] },
          // 少し間を置いてから
          { speaker: "オルド", delay: 700, lines: [
            "出るなら穴で本気を磨いてこい。"
          ] },
          { style: "title", bg: "night", actors: [], lines: [
            "記録はここから始まる"
          ] }
        ]
      },

      /**
       * --- 第一章の区切り（場面6のすぐあと） ---
       * 場面6と別にしてあるのは、場面6をもう見たセーブでも、次に拠点へ戻ったとき一度だけ流すため。
       * 新しい地方と地方選択は α-10 で入れる。それまではここで第一章が終わる
       */
      chapter1End: {
        id: "chapter1End",
        trigger: "homeReturn",
        when: { cleared: "venomMarsh", seenAny: ["marshCleared"] },
        order: 55,
        bgm: "none",
        bg: "night",
        letterbox: true,
        pages: [
          { style: "title", transition: "black", actors: [], lines: [
            "第一章　揺籃の穴",
            "― 完 ―"
          ] }
        ]
      },

      /**
       * --- 場面9 萌芽の穴へ（第一章の終わりのあと、続けて流れる。v1.5.0） ---
       * これを見たあとは、拠点が萌芽の穴のほとりに移る（Game.getHomePlace・data/ui.js の home.places.houga）
       */
      hougaArrival: {
        id: "hougaArrival",
        trigger: "homeReturn",
        when: { cleared: "venomMarsh", seenAny: ["chapter1End"] },
        order: 56,
        bgm: "home",
        bg: "hougaCamp",
        style: "narration",
        pages: [
          { transition: "black", actors: [ PLAYER ], lines: [
            "揺籃の穴を後にして、数日。",
            "{me}たちは、萌芽の穴のほとりに",
            "野営地を移した。"
          ] },
          { lines: [
            "穴の奥から、湿った土と",
            "若い葉の匂いが上がってくる。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "萌芽の穴だ。",
            "揺籃より若くいまも育ち続けている。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "中の命も同じだ。",
            "芽吹いたばかりのくせにどれも強い。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "オルドさんも、こっちに来てくれたんですね。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "協会の出張所の番だ。",
            "お前の世話をしに来たわけじゃない。"
          ] },
          { lines: [
            "そう言いながら、オルドは",
            "{me}の荷を、黙って運んでくれた。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "ここの主は二体。",
            "揺籃の四体と合わせて六体で、参加権を取得できる。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "入口の洞、奥の回廊、底の根。",
            "回廊に主はいない……だが一番たちが悪い場所でもある。"
          ] },
          { actors: [ PLAYER, SLIME, ORD ], lines: [
            "スライムが穴の縁に寄って、",
            "下をのぞき込んだ。",
            "ぷるりと震えたのは、怖さか、楽しみか。"
          ] },
          { style: "title", bg: "night", actors: [], lines: [
            "第二章",
            "萌芽の穴"
          ] }
        ]
      },

      /** --- 場面10 若葉の洞の主のあと（若葉の洞をクリアして拠点に戻ったとき。v1.5.0） --- */
      sproutCleared: {
        id: "sproutCleared",
        trigger: "homeReturn",
        when: { cleared: "sproutHollow" },
        order: 70,
        bgm: "home",
        bg: "hougaCamp",
        style: "dialogue",
        pages: [
          { style: "narration", actors: [ PLAYER ], lines: [
            "切り株の主は、若芽の姿をして、",
            "ずっと古い力で根を振るった。"
          ] },
          { speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "揺籃の主とは格が違ったろう。"
          ] },
          // 選択肢。どちらを選んでも、次の「萌芽の主は穴と一緒に育つ。」へ続く
          { style: "choice", choices: [
            { label: "はい", pages: [
              { speaker: "{player}", lines: [ "根の一撃が重くて……。" ] },
              { speaker: "オルド", lines: [ "そうだろう。" ] }
            ] },
            { label: "いいえ", pages: [
              { speaker: "{player}", lines: [ "そんなことはなかったです。" ] },
              { speaker: "オルド", lines: [ "それでよかろう。" ] }
            ] }
          ] },
          { speaker: "オルド", lines: [
            "萌芽の主は穴と一緒に育つ。",
            "次来る時にはもっと強くなっているかもしれんな。"
          ] },
          { style: "narration", lines: [
            "そのとき、野営地の入口で、",
            "誰かが大きな声を上げた。"
          ] },
          { speaker: "ルカ", actors: [ PLAYER, ORD, LUCA ], lines: [
            "あーっ！もしかして、洞の主を記録した？"
          ] },
          { speaker: "ルカ", lines: [
            "僕はルカ。きみと同じ時期に認定を受けたんだ。",
            "洞の主、明日やるつもりだったのに……先越された！"
          ] },
          // コケネズミはルカの肩に乗っていて、語りを出しきったあとスライムの隣へ降りてくる
          { style: "narration",
            actors: [ PLAYER, SLIME, ORD, LUCA, { id: "ratShoulder", monster: "mossRat", x: 406, y: 342, size: 30, enter: "fade" } ],
            lines: [
              "ルカの肩で、コケネズミが鼻をひくつかせた。",
              "スライムと目が合うと、ちょこんと跳ねて",
              "スライムの隣に降りてきた。"
            ],
            cue: { actors: [ PLAYER, SLIME, ORD, LUCA, { id: "ratGround", monster: "mossRat", x: 506, y: 414, size: 38, enter: "drop" } ] } },
          { speaker: "ルカ", lines: [
            "こいつ、人見知りなのに。",
            "きみのモンスターとは息が合うかも。"
          ] },
          { speaker: "ルカ", lines: [
            "僕も参加権、狙ってるんだ。",
            "大会で会おう。負けないからね！"
          ] },
          // ルカとコケネズミが下がる
          { speaker: "オルド", actors: [ PLAYER, SLIME, ORD ], lines: [
            "騒がしいやつだ。",
            "……だが相棒の扱いはいい。"
          ] }
        ]
      },

      /** --- 場面11 回廊を抜けたあと（蔦這う回廊をクリアして拠点に戻ったとき。v1.5.0） --- */
      ivyCleared: {
        id: "ivyCleared",
        trigger: "homeReturn",
        when: { cleared: "ivyCorridor" },
        order: 80,
        bgm: "home",
        bg: "ivy",
        letterbox: true,
        style: "narration",
        pages: [
          { actors: [], lines: [
            "蔦の闇を抜けたとき、",
            "{me}は、仲間の数を数えていた。"
          ] },
          { lines: [
            "全員いる。",
            "それだけのことが、こんなにうれしい。"
          ] },
          { style: "dialogue", speaker: "オルド", transition: "black", bg: "hougaCamp", actors: [ PLAYER, ORD ], lines: [
            "抜けたか……顔色が悪いな。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "空間が軋むような音がするたび、",
            "誰かが倒れるんじゃないかって……"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "穴は優しい場所じゃない。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "怖いと思ったなら、それも記録に書いておけ。",
            "怖さを知っている者のほうが、仲間を守れる。"
          ] },
          // オルドが下がり、たき火のそばにスライム
          { actors: [ PLAYER, { id: "slimeFire", monster: "slime", x: 640, y: 420, size: 40, enter: "fade" } ], lines: [
            "たき火のそばで、スライムが",
            "新しい仲間たちの間を、行ったり来たりしていた。",
            "一体ずつ、確かめるように。"
          ] },
          { lines: [
            "{me}の膝で眠っていた小さな相棒は、",
            "いつの間にか、みんなの面倒を見ていた。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "……ありがとう。"
          ] }
        ]
      },

      /** --- 場面12 千年樹の根底の主のあと（千年樹の根底をクリアして拠点に戻ったとき。v1.5.0） --- */
      rootsCleared: {
        id: "rootsCleared",
        trigger: "homeReturn",
        when: { cleared: "ancientRoots" },
        order: 90,
        bgm: "home",
        bg: "rootdeep",
        style: "narration",
        pages: [
          { actors: [], lines: [
            "千年樹の根の底。",
            "琥珀の中で、時は止まっていた。"
          ] },
          { lines: [
            "そこで、古いからくりが",
            "いまも根を守り続けていた。"
          ] },
          { style: "dialogue", speaker: "{player}", transition: "black", bg: "hougaCamp", actors: [ PLAYER, ORD, IRENE ], lines: [
            "あのからくりは、誰が作ったんでしょう。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "わからん。協会の記録にも無い。",
            "千年前から、あそこにいたのかもしれん。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "穴の中には、まだ誰も知らないことが多いのです。",
            "……だから、記録が要るのですよ。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "揺籃の四体、萌芽の二体。",
            "六つの主の記録、確かに受け取りました。"
          ] },
          { style: "dialogue", speaker: "イレーネ", se: "levelUp", lines: [
            "{player}、クロニクル杯の参加権を認めます。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "予選は、地上の会場で開かれます。",
            "各地の穴から、記録を重ねた者が集まりますよ。"
          ] },
          { actors: [ PLAYER, SLIME, ORD, IRENE ], lines: [
            "スライムが、{me}の足元で跳ねた。",
            "ルカも、きっと来る。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "行こう。みんなで。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "浮かれるな……だが、よくやった。"
          ] }
        ]
      },

      /** --- 場面13 第二章の終わり（場面12のあと、続けて流れる。v1.5.0） --- */
      chapter2End: {
        id: "chapter2End",
        trigger: "homeReturn",
        when: { cleared: "ancientRoots", seenAny: ["rootsCleared"] },
        order: 95,
        bgm: "none",
        bg: "night",
        letterbox: true,
        pages: [
          { style: "title", transition: "black", actors: [], lines: [
            "第二章　萌芽の穴",
            "― 完 ―"
          ] }
        ],
        // 拠点へ着いたときに一度だけ出す（v1.5.0。scenario_yosen.md「千年樹の根底のクリア後に知らせ」）
        notice: "拠点の「大会」から、予選の会場へ行けるようになった"
      },

      /**
       * --- 場面14 予選の朝（v1.5.0。はじめて予選の会場へ向かったときだけ） ---
       * ここから場面18までは、きっかけ（trigger）で探さない。予選の流れ（NS.Qualifier）が id を指して流す
       */
      qualifierMorning: {
        id: "qualifierMorning",
        trigger: "qualifier",
        order: 140,
        bgm: "none",
        bg: "arena",
        style: "narration",
        pages: [
          { transition: "black", actors: [], lines: [
            "萌芽の穴を出て、三日。",
            "{me}たちは、地上の街に着いた。"
          ] },
          { lines: [
            "白砂の闘技場は、人であふれていた。",
            "各地の穴から集まった探索者と、",
            "見たこともないモンスターたち。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ PLAYER, SLIME, ARENA_IRENE ], lines: [
            "来ましたね、{player}。",
            "クロニクル杯は、協会が開く大会です。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "予選は三戦の勝ち抜きです。",
            "三人に勝てば、本戦の八人に入れます。"
          ] },
          { style: "dialogue", speaker: "イレーネ", lines: [
            "戦いの合間には、協会の者が仲間を手当てします。",
            "負けても参加権はなくなりません。何度でも挑めますよ。"
          ] },
          { actors: [ PLAYER, SLIME ], lines: [
            "そのとき、人垣の向こうから歓声が上がった。"
          ] },
          { actors: [ PLAYER, SLIME, CHAMPION_MON, CHAMPION ], lines: [
            "昨年の王者だった。",
            "連れたモンスターは大きく、強そうだった。"
          ] },
          { style: "dialogue", speaker: "昨年の王者", lines: [
            "予選の顔ぶれか。",
            "本戦まで上がってこられるといいな。"
          ] },
          { actors: [ PLAYER, SLIME ], lines: [
            "王者は、モンスターのほうを",
            "一度も見なかった。"
          ] },
          { actors: [ PLAYER, SLIME, CLOAKED, CLOAKED_MON ], lines: [
            "人垣の外れに、黒い外套の探索者が立っていた。",
            "足元のモンスターは、まばたきひとつしない。"
          ] },
          { actors: [ SLIME_HIDE, PLAYER, CLOAKED, CLOAKED_MON ], lines: [
            "スライムが、{me}の後ろに隠れた。",
            "こんなことは、初めてだった。"
          ] },
          { style: "dialogue", speaker: "ルカ", actors: [ SLIME_HIDE, PLAYER, ARENA_LUCA, ARENA_RAT ], lines: [
            "来たね、{player}！",
            "僕たちも予選から。お互い、勝ち抜こう！"
          ] },
          { style: "dialogue", speaker: "ルカ", lines: [
            "……さっきの黒い外套の人見た？",
            "あのモンスター、なんだかしんどそうだった。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "うん……"
          ] },
          { style: "title", bg: "arena", actors: [], lines: [
            "クロニクル杯",
            "予選"
          ] }
        ]
      },

      /** --- 場面15 一戦目に勝ったとき（毎回。v1.5.0） --- */
      qualifierWin1: {
        id: "qualifierWin1",
        trigger: "qualifier",
        order: 150,
        repeat: true,
        bg: "arena",
        style: "narration",
        pages: [
          { actors: [ PLAYER, SLIME ], lines: [
            "一戦目、勝ち抜け。",
            "仲間たちが、得意げに胸を張った。"
          ] },
          { style: "dialogue", speaker: "協会の係員", lines: [
            "次の相手が待っています。",
            "仲間の手当ては、こちらで済ませました。"
          ] }
        ]
      },

      /** --- 場面16 二戦目に勝ったとき（毎回。v1.5.0） --- */
      qualifierWin2: {
        id: "qualifierWin2",
        trigger: "qualifier",
        order: 160,
        repeat: true,
        bg: "arena",
        style: "narration",
        pages: [
          { actors: [ PLAYER, SLIME ], lines: [
            "二戦目も、勝った。",
            "客席のどこかで、ルカの声がした。"
          ] },
          { style: "dialogue", speaker: "ルカ", lines: [
            "あと一つだよ、{player}！"
          ] }
        ]
      },

      /** --- 場面17 予選を勝ち抜いたとき（一度だけ。v1.5.0） --- */
      qualifierPassed: {
        id: "qualifierPassed",
        trigger: "qualifier",
        order: 170,
        bg: "arena",
        style: "narration",
        pages: [
          { actors: [ PLAYER, SLIME ], lines: [
            "三体目のモンスターが、倒れた。",
            "闘技場に、歓声が響いた。"
          ] },
          { style: "dialogue", speaker: "イレーネ", se: "levelUp", actors: [ PLAYER, SLIME, ARENA_IRENE ], lines: [
            "{player}、予選の勝ち抜けを認めます。",
            "本戦の八人に、あなたの名前を記録しました。"
          ] },
          { style: "dialogue", speaker: "ルカ", actors: [ PLAYER, SLIME, ARENA_LUCA, ARENA_RAT ], lines: [
            "やったね！僕も勝ち抜けたよ。",
            "次は本戦だ。当たっても、手加減しないから。"
          ] },
          { actors: [ PLAYER, SLIME ], lines: [
            "勝ち抜けた者の名に、",
            "黒い外套の探索者の名もあった。"
          ] },
          { lines: [
            "王者は、予選には出ていない。",
            "本戦で、待っている。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ PLAYER, SLIME, ARENA_IRENE ], lines: [
            "本戦は、少し先になります。",
            "それまで、穴で力をつけておきなさい。"
          ] },
          { actors: [ PLAYER, SLIME ], lines: [
            "スライムが、{me}の足元で跳ねた。",
            "今朝、後ろに隠れていたのが嘘のように。"
          ] }
        ]
      },

      /** --- 場面18 予選で負けたとき（毎回。v1.5.0） --- */
      qualifierLost: {
        id: "qualifierLost",
        trigger: "qualifier",
        order: 180,
        repeat: true,
        bgm: "none",
        bg: "arena",
        style: "narration",
        pages: [
          { actors: [], lines: [
            "仲間たちが、膝をついた。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ PLAYER, ARENA_IRENE ], lines: [
            "今回は、ここまでですね。",
            "穴で鍛え直して、また来なさい。予選はいつでも受け付けます。"
          ] },
          { transition: "black", bg: "hougaCamp", actors: [ PLAYER, SLIME ], lines: [
            "帰り道、スライムが{me}の足に",
            "ぴたりと寄り添っていた。"
          ] }
        ]
      },

      /**
       * --- 場面19 涵養の穴へ（v1.8.0・scenario_kanyou.md） ---
       * 予選を勝ち抜いた場面17のあと、拠点へ戻るところで続けて流れる（Qualifier が playStoryScene に "homeReturn" を渡す）。
       * もう勝ち抜いているセーブでは、次に拠点へ着いたとき（homeReturn）に流れる。
       * 滴る鍾乳洞が遊べるようになるまで（data/dungeons.js の ready: false のあいだ）は流さない（when.ready）。2026-11-27 に開いた。
       * これを見たあとは、拠点が涵養の穴のほとりに移る（Game.getHomePlace・data/ui.js の home.places.kanyou）
       */
      kanyouArrival: {
        id: "kanyouArrival",
        trigger: "homeReturn",
        when: { event: "chronicleQualifier", ready: "drippingCave" },
        order: 100,
        bgm: "home",
        bg: "kanyouCamp",
        style: "narration",
        pages: [
          { transition: "black", actors: [ PLAYER ], lines: [
            "本戦まで、まだ日がある。",
            "{me}たちは、三つ目の穴へ向かった。"
          ] },
          { lines: [
            "穴の縁に立つと、足もとの岩が濡れていた。",
            "奥から、水の滴る音が",
            "いくつも重なって聞こえてくる。"
          ] },
          { style: "dialogue", speaker: "オルド", actors: [ PLAYER, ORD ], lines: [
            "涵養の穴だ。",
            "水が地にしみて、命を育てる穴。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "オルドさん、また来てくれたんですね。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "また出張所の番だ。",
            "……お前の行く先に、出張所があるだけだ。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "一つ言っておく。",
            "ここの連中は、萌芽とは違う。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "補助で手を組んでくる。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "主は二体。入口の鍾乳洞と、底の湖。",
            "大会の前に、ここで鍛え直してこい。"
          ] },
          { actors: [ PLAYER, SLIME, ORD ], lines: [
            "スライムが、濡れた岩の上を",
            "ぷるんと跳ねて進んでいった。",
            "水の匂いに、どこか得意げだった。"
          ] },
          { style: "title", bg: "night", actors: [], lines: [
            "第三章",
            "涵養の穴"
          ] }
        ]
      },

      /**
       * --- 場面20 鍾乳洞から戻ったとき（v1.8.0。滴る鍾乳洞から、はじめて拠点に戻ったとき。クリアしていなくても） ---
       * 戻った印は結果の画面で付ける（Game.markDungeonReturned・when.returned）。
       * はじめての挑戦でハンザキまで倒したときは、このあとに場面21が続く（order）
       */
      dripReturned: {
        id: "dripReturned",
        trigger: "homeReturn",
        when: { returned: "drippingCave", seenAny: ["kanyouArrival"] },
        order: 110,
        bgm: "home",
        bg: "kanyouCamp",
        style: "narration",
        pages: [
          { actors: [ PLAYER ], lines: [
            "滴る鍾乳洞は、静かだった。",
            "静かなまま、こちらを崩しにきた。"
          ] },
          { lines: [
            "石筍に足を取られ、動きが鈍った隙に、",
            "青い狼が、雫の音に紛れて鋭い爪で裂いてくる。"
          ] },
          { style: "dialogue", speaker: "{player}", actors: [ PLAYER, ORD ], lines: [
            "……言われたとおりでした。",
            "手を組んできて……"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "崩されたら、立て直せ。",
            "立て直せないなら、崩される前に潰せ。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "記録に残しておくんだな。",
            "お前なりに攻略するんだ。"
          ] },
          { lines: [
            "{me}は記録を開いた。",
            "見たとおりに書く。",
            "それが、次に勝つための一行になる。"
          ] }
        ]
      },

      /**
       * --- 場面21 ハンザキのあと（v1.8.0。滴る鍾乳洞をクリアして拠点に戻ったとき） ---
       * 「水の滴る音（あれば）」の効果音はまだ無いので鳴らさない
       */
      dripCleared: {
        id: "dripCleared",
        trigger: "homeReturn",
        when: { cleared: "drippingCave", seenAny: ["kanyouArrival"] },
        order: 120,
        bgm: "home",
        bg: "drip",
        letterbox: true,
        style: "narration",
        pages: [
          { actors: [], lines: [
            "淵の主は、大きな山椒魚だった。",
            "ぬめる厚い皮が、どの刃も鈍らせた。"
          ] },
          { lines: [
            "倒した。そう思ったとき",
            "主は裂けかけた体で、",
            "もう一度、首をもたげた。"
          ] },
          { lines: [
            "二度目は、立たなかった。",
            "淵の水面が、静かに揺れていた。"
          ] },
          { style: "dialogue", speaker: "オルド", transition: "black", bg: "kanyouCamp", actors: [ PLAYER, ORD ], lines: [
            "ハンザキに会ったか。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "半分に裂いても生きている。",
            "だから、半裂き。昔からの呼び名だ。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "一度起き上がりました。",
            "……怖かったです。"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "怖いと思えたなら、上出来だ。",
            "それでも倒しきったんだろう。"
          ] },
          { actors: [ PLAYER, SLIME, ORD ], lines: [
            "焚き火の向こうで、",
            "仲間たちが、濡れた体を寄せ合って眠っていた。"
          ] },
          { lines: [
            "そのとき、穴の奥から、低い音が届いた。",
            "水の流れに混じって、とん、とん、と。"
          ] },
          { style: "dialogue", speaker: "{player}", lines: [
            "……太鼓？"
          ] },
          { style: "dialogue", speaker: "オルド", lines: [
            "水路の先を記録したものは少ない。",
            "行くなら、明日だ。今日は寝ろ。"
          ] }
        ]
      },

      /**
       * --- 場面7 報告が受理される ---
       * 場面4を「負け／逃げ／勝ち」で見たあと、ヨミリュウを仲間にして拠点に戻ったとき（一度だけ）。
       * 場面4-誘う を見た場合は流さない。場面6の前でも後でもよい
       */
      reportAccepted: {
        id: "reportAccepted",
        trigger: "homeReturn",
        when: {
          caught: "abyssDragon",
          seenAny: ["yomiryuReport", "yomiryuReportFled", "yomiryuReportWon"],
          notSeen: ["yomiryuReportScouted"]
        },
        order: 35,
        bgm: "home",
        bg: "camp",
        style: "narration",
        pages: [
          { actors: [ DRAGON_CAMP, PLAYER, SLIME ], lines: [
            "竜を連れて戻った{me}を見て、",
            "イレーネは、しばらく何も言わなかった。"
          ] },
          { style: "dialogue", speaker: "イレーネ", actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE ], lines: [
            "……先日の報告ですが。"
          ] },
          { style: "dialogue", speaker: "イレーネ", delay: 900, lines: [
            "受理しておきます。"
          ] },
          { actors: [ DRAGON_CAMP, PLAYER, SLIME, IRENE, ORD ], lines: [
            "オルドが喉の奥で小さく笑った。"
          ] }
        ]
      },

      /**
       * --- 場面8 初めて全滅したとき（一度だけ） ---
       * 初めての全滅がヨミリュウ戦だったときは、場面4-負けに差し込まれて、こちらは流れない
       * （差し込んだページが marks: "firstDefeat" で、これを見たことにする）
       */
      firstDefeat: {
        id: "firstDefeat",
        trigger: "homeReturn",
        when: { event: "defeated" },
        order: 60,
        bgm: "home",
        bg: "void",
        style: "narration",
        pages: [
          // 暗転のまま、拠点の夜へ
          { transition: "black", bg: "camp", actors: [ PLAYER, SLIME ], lines: FIRST_DEFEAT_LINES }
        ]
      }
    }
  };
})(window.MyGame);
