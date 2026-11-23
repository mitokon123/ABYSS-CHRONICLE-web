/**
 * sprites_story.js
 * 物語の場面に立つ人物の絵（data/story.js の actors から sprite で参照する）。
 *
 * ★ 見た目はこの絵で確定（ストーリー構成.md の「導入で話す人物」）。
 *   描き直すときは id を変えなければ、場面の側（data/story.js）は触らなくてよい。
 *
 * 大きさは主人公（playerWalk1）と同じ 32×32。並べたときに背丈がそろうようにしてある。
 * 書き方（パレット・pixels）は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    /**
     * オルド（試験官）。ベテランの探索者。
     * 灰色の髪と髭、膝まである茶色の外套。主人公より肩幅を広くしてある
     */
    npcOrd: {
      palette: {
        ".": null,
        "K": "#101425",   // 輪郭・目
        "G": "#8e949e",   // 髪
        "W": "#c4c8d0",   // 髭
        "S": "#e0b48c",   // 肌
        "T": "#b88a66",   // 肌の影
        "L": "#8a6440",   // 外套の光が当たる面
        "C": "#6b4a2e",   // 外套
        "c": "#4a321e",   // 外套の影
        "M": "#2a1e14",   // ベルト
        "P": "#34343e",   // ズボン
        "N": "#1e1a16"    // 靴
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............KKKKKKKK............",
        "...........KGGGGGGGGK...........",
        "..........KGGGGGGGGGGK..........",
        "..........KGGSSSSSSGGK..........",
        "..........KGSSSSSSSSGK..........",
        "..........KGSKKSSKKSGK..........",
        "..........KGSSSSSSSSGK..........",
        "..........KSWWWTTWWWSK..........",
        "..........KSWWWWWWWWSK..........",
        "...........KWWWWWWWWK...........",
        "........KLLLLLLLLLLLLLLK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "......KLLLLCCCCcCCCCCccccK......",
        "......KLLLLCCCCcCCCCCccccK......",
        "......KSSLLCCCCcCCCCCccSSK......",
        "........KLLCCCCcCCCCCccK........",
        "........KMMMMMMMMMMMMMMK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "........KLLCCCCcCCCCCccK........",
        "........KKKKKKKKKKKKKKKK........",
        "..........KPPK...KPPK...........",
        "..........KPPK...KPPK...........",
        ".........KNNNK...KNNNK..........",
        ".........KKKKK...KKKKK..........",
        "................................",
        "................................"
      ]
    },

    /**
     * イレーネ（探索者協会の支部長）。
     * 肩まで届く暗い髪、金の縁取りのある紺の長衣
     */
    npcIrene: {
      palette: {
        ".": null,
        "K": "#101425",   // 輪郭・目
        "H": "#3a2a4a",   // 髪
        "h": "#5a4470",   // 髪の光
        "S": "#f2d0b0",   // 肌
        "T": "#d4a88a",   // 肌の影・口
        "R": "#2e3f7a",   // 長衣
        "r": "#1f2b58",   // 長衣の影
        "O": "#d8b24a",   // 金の縁取り
        "N": "#1a1a26"    // 靴
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............KKKKKKKK............",
        "...........KhHHHHHHHK...........",
        "..........KhHHHHHHHHHK..........",
        "..........KHHSSSSSSHHK..........",
        "..........KHSSSSSSSSHK..........",
        "..........KHSKKSSKKSHK..........",
        "..........KHSSSSSSSSHK..........",
        "..........KHSSSTTSSSHK..........",
        ".........KHHKSSSSSSKHHK.........",
        ".........KHHHKSSSSKHHHK.........",
        ".........KHHOOOOOOOOHHK.........",
        ".........KHRRRROORRRrHK.........",
        ".........KHRRRROORRRrHK.........",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KSSRRRRROORRRRrSSK.......",
        ".........KRRRRROORRRrrK.........",
        ".........KOOOOOOOOOOOOK.........",
        ".........KRRRRROORRRrrK.........",
        "........KRRRRRROORRRRrrK........",
        "........KRRRRRROORRRRrrK........",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KRRRRRRROORRRRrrrK.......",
        ".......KOOOOOOOOOOOOOOOOK.......",
        "..........KNNK....KNNK..........",
        "..........KKKK....KKKK..........",
        "................................",
        "................................"
      ]
    },

    /**
     * 昨年の王者のモンスター（場面14。v1.5.0）。正体はまだ見せない、何も分からない真っ暗な影。
     * 作者の指定（2026-11-18）「シニガミをぬりつぶしたみたいな」：シニガミの影のかたまりから、目と鎌を抜いた形。
     * 物語では silhouette で塗りつぶして立たせるので、色は形のためだけ
     */
    championShadow: {
      palette: { ".": null, "K": "#030106", "N": "#0c0816" },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "..........KK....KK..............",
        "........KKNNK..KNNKK............",
        ".......KNNNNNKKNNNNNNK..........",
        ".......KNNNNNNNNNNNNNNNK........",
        "......KKNNNNNNNNNNNNNNNNK.......",
        ".....KNNNNNNNNNNNNNNNNNNK.......",
        ".....KNNNNNNNNNNNNNNNNNNNK......",
        "...KKKNNNNNNNNNNNNNNNNNNNNK.....",
        "..KNNNNNNNNNNNNNNNNNNNNNNN......",
        "...KNNNNNNNNNNNNNNNNNNNNNNK.....",
        "..KKNNNNNNNNNNNNNNNNNNNNNNNK....",
        ".KNNNNNNNNNNNNNNNNNNNNNNNNNNK...",
        ".KNNNNNNNNNNNNNNNNNNNNNNNNNNK...",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNKK...",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "KKNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "NNNNNNNNNNNNNNNNNNNNNNNNNNNNK...",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        ".KNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        "NNNNNNNNNNNNNNNNNNNNNNNNNNNNK...",
        "KNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..",
        ".KKNNNNNNNNNNNNNNNNNNNNNNNKKK...",
        "...KNNKNNNNKNNNNNKNNNNNNNK......",
        "....KNKNNKNKNNKNNKNNKNNNK.......",
        ".....K.KNKNKNKKNNKKNKNKK........",
        ".......KNKKKNK.KNKKNKK.........."
      ]
    },

    /**
     * ルカ（v1.5.0・第二章）。主人公と同じ時期に認定を受けた探索者。相棒はコケネズミ。
     * 明るい橙のツンツン頭、黄色のスカーフ、青緑の上着。
     * 物語では下の charaLooks の絵を使う。これは新しい絵が使えないときの 32×32
     */
    npcLuca: {
      palette: {
        ".": null,
        "K": "#101425",   // 輪郭・目
        "H": "#d8782a",   // 髪
        "h": "#f0a050",   // 髪の光
        "S": "#f2d0b0",   // 肌
        "T": "#d4a88a",   // 肌の影・口
        "Y": "#e8c23a",   // スカーフ
        "G": "#3a8a7a",   // 上着
        "g": "#2a6458",   // 上着の影
        "M": "#3e2c22",   // ベルト
        "P": "#2a3352",   // ズボン
        "N": "#1e1a16"    // 靴
      },
      pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "...........K.K.K.K.K............",
        "...........KHKHKHKHKK...........",
        "..........KhHHHHHHHHHK..........",
        "..........KhHHHHHHHHHK..........",
        "..........KHHSSSSSSHHK..........",
        "..........KHSSSSSSSSHK..........",
        "..........KHSKKSSKKSHK..........",
        "..........KSSSSSSSSSSK..........",
        "..........KSSSSTTSSSSK..........",
        "...........KSSSSSSSSK...........",
        "..........KYYYYYYYYYYK..........",
        "........KGGYYYYYYYYYYGGK........",
        "........KGGGGGGYYGGGGggK........",
        "......KGGGGGGGGYYGGGGggggK......",
        "......KGGGGGGGGYYGGGGggggK......",
        "......KSSGGGGGGYYGGGGggSSK......",
        "........KGGGGGGGGGGGGggK........",
        "........KMMMMMMMMMMMMMMK........",
        "........KGGGGGGGGGGGGggK........",
        "........KKKKKKKKKKKKKKKK........",
        "..........KPPK...KPPK...........",
        "..........KPPK...KPPK...........",
        "..........KPPK...KPPK...........",
        ".........KNNNK...KNNNK..........",
        ".........KKKKK...KKKKK..........",
        "................................",
        "................................"
      ]
    }
  });

  /**
   * 人間の登場人物の見た目（v1.2.0）。
   * 部品を重ねて描く仕組み（js/systems/CharaRig.js）で、主人公と同じ大きさ・描き方にそろえる。
   * ★ これから出る人間の登場人物も、ここに1人ずつ足していく（作者の指定 2026-10-29）。
   *   書き方は CharaRig.makeLook の説明のとおり。色は上の 32×32 の絵の色をそのまま使っている。
   *
   * ★ いまは見本（chara-viewer.html）で見るだけ。物語の場面ではまだ上の 32×32 の絵を使っている。
   */
  NS.extend("charaLooks", {
    // オルド：灰色の髪と髭、膝まである茶色の外套。肩幅を広く
    ord: {
      name: "オルド",
      body: "male", build: "broad", outfit: "coat", hair: "slick", buckle: false,
      skin:      { base: "#e0b48c", light: "#ecc8a4", shadow: "#b88a66" },
      hairColor: { base: "#8e949e", light: "#b4b9c2", shadow: "#686d78" },
      beard:     { base: "#c4c8d0", light: "#e2e5ea", shadow: "#9a9fab" },
      cloth:     { base: "#6b4a2e", light: "#8a6440", shadow: "#4a321e" },
      belt:      { base: "#2a1e14", light: "#3e2e20", shadow: "#1a120c" },
      pants:     { base: "#34343e", light: "#4a4a56", shadow: "#22222a" },
      shoes:     { base: "#1e1a16", light: "#34302a", shadow: "#120f0c" },
      eye:       { base: "#2a2a34", light: "#4a4a5a", shadow: "#1a1a22" }
    },

    // イレーネ：肩まで届く暗い髪、金の縁取りのある紺の長衣
    irene: {
      name: "イレーネ",
      body: "female", outfit: "robe", hair: "medium", buckle: false,
      skin:      { base: "#f2d0b0", light: "#fadfc6", shadow: "#d4a88a" },
      hairColor: { base: "#3a2a4a", light: "#5a4470", shadow: "#24182e" },
      cloth:     { base: "#2e3f7a", light: "#40549a", shadow: "#1f2b58" },
      trim:      { base: "#d8b24a", light: "#f0d47a", shadow: "#a8862a" },
      shoes:     { base: "#1a1a26", light: "#2e2e40", shadow: "#101018" },
      eye:       { base: "#3a2a5a", light: "#6a5490", shadow: "#24183a" }
    },

    // ルカ（第二章・場面10 から。v1.5.0）：明るい橙のツンツン頭、黄色のスカーフ、青緑の上着
    luca: {
      name: "ルカ",
      body: "male", outfit: "tunic", hair: "spiky",
      skin:      { base: "#f2d0b0", light: "#fadfc6", shadow: "#d4a88a" },
      hairColor: { base: "#d8782a", light: "#f0a050", shadow: "#a8541a" },
      cloth:     { base: "#3a8a7a", light: "#56a896", shadow: "#2a6458" },
      pants:     { base: "#2a3352", light: "#3d4a72", shadow: "#1b2138" },
      belt:      { base: "#3e2c22", light: "#563f31", shadow: "#291c15" },
      eye:       { base: "#2a4a3a", light: "#4a7a5a", shadow: "#1a2e24" },
      acc:       { scarf: { color: "#e8c23a" } }
    },

    // 昨年の王者（場面14。v1.5.0・名前はまだ出さない）：後ろへ流した金の髪、白い長い上着に金の縁取り、赤いマント。
    //   余裕のある、目立つ人。仮（作者が見て決める）
    champion: {
      name: "昨年の王者",
      body: "male", build: "broad", outfit: "coat", hair: "slick", buckle: false,
      skin:      { base: "#ecc6a0", light: "#f6d8b8", shadow: "#c89e78" },
      hairColor: { base: "#e0b84a", light: "#f4d67a", shadow: "#b08a2a" },
      cloth:     { base: "#e6e2d6", light: "#fbf8ee", shadow: "#b8b2a2" },
      trim:      { base: "#d8a838", light: "#f0cc68", shadow: "#a87c1c" },
      pants:     { base: "#3a3040", light: "#4e4256", shadow: "#26202c" },
      shoes:     { base: "#2a2018", light: "#3e3226", shadow: "#18120c" },
      eye:       { base: "#3a5a8a", light: "#5a7aaa", shadow: "#243a5a" },
      acc:       { cape: { color: "#a8282e" } }
    },

    // 黒い外套の探索者（場面14。v1.5.0・名前は出さない・この予選では話さない）：黒い長衣、白っぽい髪、顔の下半分を覆う黒い布。
    //   仮（作者が見て決める）
    cloaked: {
      name: "黒い外套の探索者",
      body: "male", outfit: "robe", hair: "medium", buckle: false,
      skin:      { base: "#d8c4b4", light: "#e8d6c8", shadow: "#b09a8a" },
      hairColor: { base: "#c8ccd4", light: "#e4e6ec", shadow: "#9a9ea8" },
      cloth:     { base: "#1c1c24", light: "#2c2c38", shadow: "#101016" },
      trim:      { base: "#3a3a48", light: "#4c4c5c", shadow: "#26262f" },
      shoes:     { base: "#121216", light: "#22222a", shadow: "#08080a" },
      eye:       { base: "#8a2a2a", light: "#b04040", shadow: "#5a1a1a" },
      acc:       { scarf: { color: "#14141a" }, cape: { color: "#16161c" } }
    },

    // 探索者（場面6。名前なし）：形は主人公と同じで、髪と服の色だけ変える
    scout: {
      name: "探索者",
      body: "male", outfit: "tunic", hair: "short",
      hairColor: { base: "#6a4a2a", light: "#8a6a44", shadow: "#4a3018" },
      cloth:     { base: "#5a7a4a", light: "#7a9a64", shadow: "#3e5a36" }
    }
  });
})(window.MyGame);
