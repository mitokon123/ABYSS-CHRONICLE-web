/**
 * sprites_ui.js
 * 画面の飾りに使う絵。モンスターでもダンジョンの中身でもないもの。
 *
 *   icon〇〇  … 拠点メニューの項目につく絵
 *   campfire … 拠点の背景のたき火
 *
 * どれも 16×16。メニューでは20px前後に拡大されるので、
 * 細かい模様は入れず「輪郭で形が分かる」ことを優先している。
 *
 * 書き方（パレット・pixels）と分け方の方針は data/sprites.js を参照。
 */
(function (NS) {
  "use strict";

  NS.extend("sprites", {

    // --- 拠点メニューのアイコン ---

    // ダンジョンへ潜る（岩に開いた入口）
    iconDungeon: {
      palette: {
        ".": null,
        "K": "#2b2a26",   // 輪郭
        "S": "#8b8778",   // 岩
        "D": "#05070c"    // 奥の闇
      },
      pixels: [
        "................",
        "................",
        "...KKKKKKKKKK...",
        "..KSSSSSSSSSSK..",
        "..KSSSKKKKSSSK..",
        "..KSSKDDDDKSSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KSKDDDDDDKSK..",
        "..KKKDDDDDDKKK..",
        "................",
        "................"
      ]
    },

    // 仲間（並んだ2体のうしろ姿）
    iconParty: {
      palette: {
        ".": null,
        "K": "#1a2030",
        "G": "#5fd18c",
        "B": "#6f86c9"
      },
      pixels: [
        "................",
        "................",
        "................",
        "....KKK...KKK...",
        "...KGGGK.KBBBK..",
        "...KGGGK.KBBBK..",
        "....KKK...KKK...",
        "..KKKKKK.KKKKK..",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        ".KGGGGGGKBBBBBK.",
        "..KKKKKK.KKKKK..",
        "................",
        "................"
      ]
    },

    // ショップ（金貨の入った袋）
    iconShop: {
      palette: {
        ".": null,
        "K": "#3a2a10",
        "B": "#8a5a2e",   // 革
        "Y": "#ffd75e"    // 金貨
      },
      pixels: [
        "................",
        "................",
        ".......KK.......",
        "......KYYK......",
        ".....KYYYYK.....",
        "....KKKKKKKK....",
        "...KBBBBBBBBK...",
        "..KBBBYYYYBBBK..",
        "..KBBYYYYYYBBK..",
        "..KBBYYYYYYBBK..",
        "..KBBBYYYYBBBK..",
        "...KBBBBBBBBK...",
        "....KKKKKKKK....",
        "................",
        "................",
        "................"
      ]
    },

    // 工房（かなづち）
    // 加護の編成。深淵の加護画面と同じ「輪の中の光」を小さくしたもの
    iconBlessing: {
      palette: {
        ".": null,
        "K": "#1a1430",   // 輪郭
        "R": "#8b6fd6",   // 輪
        "W": "#e6e0ff"    // 中の光
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "...KKRRRRRRKK...",
        "..KRRK....KRRK..",
        "..KRK..WW..KRK..",
        ".KRK..WWWW..KRK.",
        ".KRK.WWWWWW.KRK.",
        ".KRK.WWWWWW.KRK.",
        ".KRK..WWWW..KRK.",
        "..KRK..WW..KRK..",
        "..KRRK....KRRK..",
        "...KKRRRRRRKK...",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    iconCraft: {
      palette: {
        ".": null,
        "K": "#24201a",
        "S": "#b0b6c4",   // 金属
        "W": "#a06a34"    // 柄
      },
      pixels: [
        "................",
        "................",
        "...KKKKKKKK.....",
        "..KSSSSSSSSK....",
        "..KSSSSSSSSK....",
        "..KSSSSSSSSK....",
        "..KKKKSSKKKK....",
        "......KSSK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        ".......KK.......",
        "................",
        "................"
      ]
    },

    // 持ち物（ふた付きのかばん）
    iconItems: {
      palette: {
        ".": null,
        "K": "#2a1a0c",
        "B": "#a06a34",   // 革
        "W": "#744a20",   // ふた
        "Y": "#ffd75e"    // 留め金
      },
      pixels: [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "...KWWWWWWWWK...",
        "...KKKKKKKKKK...",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBYYBBBBBBK..",
        "..KBBYYBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "...KKKKKKKKKK...",
        "................",
        "................"
      ]
    },

    // 図鑑（開いた本）
    iconDex: {
      palette: {
        ".": null,
        "K": "#2a2438",
        "W": "#e8e0d0",   // 紙
        "L": "#7b86a4"    // 文字
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWWWWWKKWWWWWK.",
        ".KWLLLWKKWLLLWK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // --- タイトル画面のアイコン ---

    // 新しく始める（芽。まだ何も無いところから始まる）
    iconNewGame: {
      palette: {
        ".": null,
        "K": "#1c2a1c",   // 輪郭
        "G": "#5fd18c",   // 葉
        "H": "#8ce8b0",   // 葉の光が当たる面
        "S": "#6b5a3a"    // 茎の根もと
      },
      pixels: [
        "................",
        "................",
        ".......KK.......",
        "......KHHK......",
        "..KK.KHGGK.KK...",
        ".KHHKKHGGKKHHK..",
        ".KHGGKKGGKKGGK..",
        "..KGGKKGKKGGK...",
        "...KKKKGKKKK....",
        "......KGK.......",
        "......KGK.......",
        "......KSK.......",
        ".....KKSKK......",
        "....KSSSSSK.....",
        ".....KKKKK......",
        "................"
      ]
    },

    // 続きから（しおりの挟まった本。図鑑の開いた本とは別物にしてある）
    iconContinue: {
      palette: {
        ".": null,
        "K": "#241d2e",   // 輪郭
        "C": "#4a5a8c",   // 表紙
        "H": "#6f86c9",   // 表紙の光が当たる面
        "W": "#e8e0d0",   // 小口（紙）
        "R": "#e8896a"    // しおり
      },
      pixels: [
        "................",
        "..KKKKKKKKKKK...",
        ".KHHHHHHHHHHKK..",
        ".KHCCCCCCCCHWK..",
        ".KHCCCCCCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRRCCCHWK..",
        ".KHCCCRKRCCHWK..",
        ".KHCCCCCCCCHWK..",
        ".KHHHHHHHHHHWK..",
        "..KKKKKKKKKKK...",
        "................"
      ]
    },

    // パッチノート（巻いた書。バージョン表記の隣に置く）
    iconPatchNote: {
      palette: {
        ".": null,
        "K": "#2a2438",   // 輪郭
        "W": "#ddd5c4",   // 紙
        "H": "#f0e9db",   // 紙の光が当たる面
        "L": "#7b86a4",   // 書かれた文字
        "B": "#8c6a3a"    // 巻いた芯
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KBBKHHHHHHKBBK.",
        ".KBBKHLLLLHKBBK.",
        ".KBBKHHHHHHKBBK.",
        ".KBBKWLLLLWKBBK.",
        ".KBBKWWWWWWKBBK.",
        ".KBBKWLLLLWKBBK.",
        ".KBBKWWWWWWKBBK.",
        ".KBBKWLLLWWKBBK.",
        ".KBBKWWWWWWKBBK.",
        ".KBBKWWWWWWKBBK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................"
      ]
    },

    // セーブファイル（枠に番号札のついた石板）
    iconSlot: {
      palette: {
        ".": null,
        "K": "#20283a",   // 輪郭
        "P": "#5b6a94",   // ふち（光の当たる面）
        "A": "#2f3a55",   // 地
        "W": "#c8d0e8"    // 刻まれた線
      },
      pixels: [
        "................",
        "..KKKKKKKKKKKK..",
        ".KPPPPPPPPPPPPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAWWWWWWWWAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAWWWWWWAAAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAWWWWWWWWAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAWWWWWAAAAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPPPPPPPPPPPPK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................"
      ]
    },

    // 遊び方（掲示された立て札の「?」）
    //   図鑑（開いた本）と紛らわしくならないよう、
    //   本の形は使わず、板に大きく「?」を彫った形にしてある
    iconHelp: {
      palette: {
        ".": null,
        "K": "#20283a",   // 輪郭
        "P": "#5b6a94",   // 板のふち（光の当たる面）
        "A": "#2f3a55",   // 板の地
        "W": "#ffd75e"    // 彫られた「?」
      },
      pixels: [
        "................",
        "..KKKKKKKKKKKK..",
        ".KPPPPPPPPPPPPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAAAWWWWAAAPK.",
        ".KPAAWWAAWWAAPK.",
        ".KPAAAAAAWWAAPK.",
        ".KPAAAAAWWWAAPK.",
        ".KPAAAAWWWAAAPK.",
        ".KPAAAAWWAAAAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPAAAAWWAAAAPK.",
        ".KPAAAAWWAAAAPK.",
        ".KPAAAAAAAAAAPK.",
        ".KPPPPPPPPPPPPK.",
        "..KKKKKKKKKKKK.."
      ]
    },

    // セーブ（巻物）
    iconSave: {
      palette: {
        ".": null,
        "K": "#3a2f18",
        "C": "#a06a34",   // 巻いてある部分
        "W": "#e8e0d0"    // 紙
      },
      pixels: [
        "................",
        "................",
        "..KKKKKKKKKKKK..",
        ".KCCCCCCCCCCCCK.",
        ".KCCCCCCCCCCCCK.",
        "..KKKKKKKKKKKK..",
        "...KWWWWWWWWK...",
        "...KWKKKKKKWK...",
        "...KWWWWWWWWK...",
        "...KWKKKKKKWK...",
        "...KWWWWWWWWK...",
        "..KKKKKKKKKKKK..",
        ".KCCCCCCCCCCCCK.",
        ".KCCCCCCCCCCCCK.",
        "..KKKKKKKKKKKK..",
        "................"
      ]
    },

    // 設定（歯車）
    iconSettings: {
      palette: {
        ".": null,
        "K": "#2a2f3e",
        "S": "#9aa3bc",   // 金属
        "D": "#10141f"    // 中央の穴
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "...KKKSSSSKKK...",
        "...KSSSSSSSSK...",
        "..KKSSSKKSSSKK..",
        "..KSSSKDDKSSSK..",
        "..KSSKDDDDKSSK..",
        "..KSSKDDDDKSSK..",
        "..KSSSKDDKSSSK..",
        "..KKSSSKKSSSKK..",
        "...KSSSSSSSSK...",
        "...KKKSSSSKKK...",
        ".....KKKKKK.....",
        "................",
        "................"
      ]
    },

    // --- 仲間の画面の項目のアイコン（v1.6.2。作者の指定「様子を見るなどの項目の横にアイコン」）と、拠点の大会 ---

    // 大会（金の杯。v1.6.2）
    iconTournament: {
      palette: {
        ".": null,
        "K": "#3a2a10",   // 輪郭
        "Y": "#ffd75e",   // 金
        "O": "#c99a2e",   // 影
        "W": "#fff3b0"   // 光
      },
      pixels: [
        "................",
        "..KKKKKKKKKKKK..",
        "KKKYWYYYYYYYOKKK",
        "KYKYWYYYYYYYOKYK",
        "KYKYWYYYYYYYOKYK",
        ".KKKYWYYYYYOKKK.",
        "...KYYYYYYYOK...",
        "....KYYYYYOK....",
        ".....KKYOKK.....",
        "......KYOK......",
        "......KYOK......",
        ".....KYYOOK.....",
        "....KKKKKKKK....",
        "....KOOOOOOK....",
        "....KKKKKKKK....",
        "................"
      ]
    },

    // 様子を見る（虫めがね）
    iconActInspect: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "G": "#9fd3ff",   // レンズ
        "W": "#ffffff",   // 光
        "H": "#a8743a"   // 柄
      },
      pixels: [
        "................",
        "....KKKKK.......",
        "...KGGGGGK......",
        "..KGWWGGGGK.....",
        "..KGWGGGGGK.....",
        "..KGGGGGGGK.....",
        "..KGGGGGGGK.....",
        "..KGGGGGGGK.....",
        "...KGGGGGK......",
        "....KKKKKHK.....",
        ".........KHK....",
        "..........KHK...",
        "...........KHK..",
        "............KHK.",
        ".............KK.",
        "................"
      ]
    },

    // 技を使う（きらめき）
    iconActSkill: {
      palette: {
        ".": null,
        "B": "#7fd0ff",   // 青
        "W": "#ffffff"   // 芯
      },
      pixels: [
        "................",
        ".......B....W...",
        ".......B........",
        "......BWB.......",
        "......BWB.......",
        ".....BBWBB......",
        "..BBBBWWWBBBB...",
        "BBWWWWWWWWWWWBB.",
        "..BBBBWWWBBBB...",
        ".....BBWBB......",
        "......BWB.......",
        "......BWB.......",
        ".......B........",
        ".......B........",
        "................",
        "................"
      ]
    },

    // 預かり所へ預ける（箱へ入れる矢印）
    iconActDeposit: {
      palette: {
        ".": null,
        "K": "#2b1d0e",   // 輪郭
        "B": "#b5834a",   // 箱
        "D": "#7a5226",   // ふた
        "A": "#5fd18c"   // 矢印
      },
      pixels: [
        "......KKKK......",
        "......KAAK......",
        "......KAAK......",
        "....KKKAAKKK....",
        ".....KAAAAK.....",
        "......KAAK......",
        ".......KK.......",
        "..KKKKKKKKKKKK..",
        "..KDDDDDDDDDDK..",
        "..KBBBBBBBBBBK..",
        "..KBBBKKKKBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KKKKKKKKKKKK..",
        "................"
      ]
    },

    // パーティに加える（箱から出す矢印）
    iconActTake: {
      palette: {
        ".": null,
        "K": "#2b1d0e",   // 輪郭
        "B": "#b5834a",   // 箱
        "D": "#7a5226",   // ふた
        "A": "#5fd18c"   // 矢印
      },
      pixels: [
        ".......KK.......",
        "......KAAK......",
        ".....KAAAAK.....",
        "....KKKAAKKK....",
        "......KAAK......",
        "......KAAK......",
        "......KKKK......",
        "..KKKKKKKKKKKK..",
        "..KDDDDDDDDDDK..",
        "..KBBBBBBBBBBK..",
        "..KBBBKKKKBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KBBBBBBBBBBK..",
        "..KKKKKKKKKKKK..",
        "................"
      ]
    },

    // 並び替える（上と下の矢印）
    iconActReorder: {
      palette: {
        ".": null,
        "K": "#2a2410",   // 輪郭
        "A": "#ffd75e"   // 矢印
      },
      pixels: [
        "................",
        "...KK...........",
        "..KAAK..........",
        ".KAAAAK...KKKK..",
        "KAAAAAAK..KAAK..",
        "KKKAAKKK..KAAK..",
        "..KAAK....KAAK..",
        "..KAAK....KAAK..",
        "..KAAK....KAAK..",
        "..KAAK....KAAK..",
        "..KAAK....KAAK..",
        "..KAAK..KKKAAKKK",
        "..KAAK..KAAAAAAK",
        "..KKKK...KAAAAK.",
        "..........KAAK..",
        "...........KK..."
      ]
    },

    // 装備（剣）
    iconActEquip: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "S": "#cfd6e6",   // 刃
        "W": "#ffffff",   // 光
        "G": "#ffd75e",   // 鍔
        "H": "#8b5a2b"   // 柄
      },
      pixels: [
        "................",
        "............KKK.",
        "...........KWSK.",
        "..........KWSK..",
        ".........KWSK...",
        "........KWSK....",
        ".......KWSK.....",
        "..KK..KWSK......",
        "..KGKKWSK.......",
        "...KGGSK........",
        "....KGGK........",
        "...KHKKGK.......",
        "..KHK..KK.......",
        ".KHK............",
        ".KK.............",
        "................"
      ]
    },

    // 書（閉じた本。図鑑の開いた本と分ける）
    iconActBooks: {
      palette: {
        ".": null,
        "K": "#2a1212",   // 輪郭
        "R": "#c0504d",   // 表紙
        "D": "#7a2e2c",   // 背
        "Y": "#ffd75e",   // 題
        "P": "#efe6cf"   // 紙
      },
      pixels: [
        "................",
        "..KKKKKKKKKKKK..",
        "..KDRRRRRRRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRYYYYYRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRYYYYRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDRRRRRRRRRK..",
        "..KDKKKKKKKKKKK.",
        "..KDPPPPPPPPPPK.",
        "..KKKKKKKKKKKKK.",
        "................"
      ]
    },

    // 作戦（旗）
    iconActTactic: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "P": "#8b8778",   // 竿
        "F": "#5f8fe0",   // 旗
        "W": "#bcd2ff"   // 光
      },
      pixels: [
        "................",
        "..KKK...........",
        "..KPKKKKKKKKK...",
        "..KPKFFFFFFFFK..",
        "..KPKFWWFFFFFFK.",
        "..KPKFFFFFFFFFK.",
        "..KPKFFFFFFFFK..",
        "..KPKFFFFFFFK...",
        "..KPKKKKKKKK....",
        "..KPK...........",
        "..KPK...........",
        "..KPK...........",
        "..KPK...........",
        ".KKPKK..........",
        ".KKKKK..........",
        "................"
      ]
    },

    // 名前を変える（羽ペン）
    iconActName: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "F": "#e8eaf0",   // 羽
        "S": "#9aa4bf",   // 軸
        "I": "#5b6688"   // 線
      },
      pixels: [
        "................",
        "............KKK.",
        "..........KKFFK.",
        ".........KFFFFK.",
        "........KFFFFK..",
        ".......KFFFSK...",
        "......KFFFSFK...",
        ".....KFFFSFK....",
        ".....KFFSFK.....",
        "....KFFSFK......",
        "....KFSKK.......",
        "...KSKK.........",
        "..KSK...........",
        ".KSK............",
        ".KK..IIIIIIII...",
        "................"
      ]
    },

    // 逃がす（飛んでいく鳥）
    iconActRelease: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "W": "#e8eaf0"   // 羽
      },
      pixels: [
        "................",
        "................",
        "................",
        ".KK..........KK.",
        "KWWK........KWWK",
        ".KWWK......KWWK.",
        "..KWWK....KWWK..",
        "...KWWK..KWWK...",
        "....KWWKKWWK....",
        ".....KWWWWK.....",
        "......KWWK......",
        ".......KK.......",
        "................",
        "................",
        "................",
        "................"
      ]
    },

    // やめる（バツ）
    iconActCancel: {
      palette: {
        ".": null,
        "K": "#2a1212",   // 輪郭
        "R": "#d16a6a"   // バツ
      },
      pixels: [
        "................",
        "................",
        "..KKKK....KKKK..",
        "..KRRKK..KKRRK..",
        "..KKRRKKKKRRKK..",
        "...KKRRKKRRKK...",
        "....KKRRRRKK....",
        ".....KKRRKK.....",
        ".....KKRRKK.....",
        "....KKRRRRKK....",
        "...KKRRKKRRKK...",
        "..KKRRKKKKRRKK..",
        "..KRRKK..KKRRK..",
        "..KKKK....KKKK..",
        "................",
        "................"
      ]
    },

    // まだ分からない項目（v1.7.0。仲間の「書」は予選を突破するまでこれ。作者の指定）
    iconActUnknown: {
      palette: {
        ".": null,
        "K": "#1a2030",   // 輪郭
        "Q": "#8d9bc4"    // ？
      },
      pixels: [
        "................",
        ".....KKKKKK.....",
        "....KQQQQQQK....",
        "...KQQKKKKQQK...",
        "...KQK....KQQK..",
        "...KKK....KQQK..",
        ".........KQQK...",
        "........KQQK....",
        ".......KQQK.....",
        ".......KQQK.....",
        ".......KKKK.....",
        "................",
        ".......KKKK.....",
        ".......KQQK.....",
        ".......KKKK.....",
        "................"
      ]
    },

    // --- 店主（data/shop.js の keeper から参照する） ---

    // よろず屋。深い頭巾をかぶった行商
    keeperGeneral: {
      palette: {
        ".": null,
        "K": "#241a12",   // 輪郭
        "H": "#5a4a7a",   // 頭巾
        "S": "#f2c9a0",   // 顔
        "W": "#101425",   // 目
        "C": "#7a5a3a",   // 外套
        "Y": "#ffd75e"    // 帯
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KHHHHHHK....",
        "...KHHHHHHHHK...",
        "...KHSSSSSSHK...",
        "...KSSWSSWSSK...",
        "...KSSSSSSSSK...",
        "...KSSSKKSSSK...",
        "....KSSSSSSK....",
        "...KCCCCCCCCK...",
        "..KCCCCCCCCCCK..",
        "..KCCCYYYYCCCK..",
        "..KCCCCCCCCCCK..",
        "..KKCCCCCCCCKK..",
        "...KKKKKKKKKK..."
      ]
    },

    // 加護を売る謎の商人。深いフードで顔を隠し、目だけが光っている。
    // 深層をクリアするまでショップに並ばない
    keeperMystic: {
      palette: {
        ".": null,
        "K": "#0d0a14",   // 輪郭
        "H": "#221a33",   // 深いフード
        "D": "#100c1a",   // フードの影（顔があるはずのところ）
        "W": "#b98bff",   // 光る目
        "C": "#1a1428",   // 外套
        "Y": "#8b6fd6"    // 帯と縁飾り
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KHHHHHHK....",
        "...KHHHHHHHHK...",
        "..KHHDDDDDDHHK..",
        "..KHDDDDDDDDHK..",
        "..KHDDWDDWDDHK..",
        "..KHDDDDDDDDHK..",
        "...KHDDDDDDHK...",
        "...KYCCCCCCYK...",
        "..KCCCCCCCCCCK..",
        "..KCCCYYYYCCCK..",
        "..KCCCCCCCCCCK..",
        "..KKCCCCCCCCKK..",
        "...KKKKKKKKKK..."
      ]
    },

    // 写本堂の年老いた写本師（v1.6.0。台詞は作者が選んだ案A）。
    // 禿げた頭に白い髪と長いひげ、金縁の眼鏡、墨色の長衣。開いた書を両手で抱えている
    keeperScribe: {
      palette: {
        ".": null,
        "K": "#1e1a14",   // 輪郭
        "S": "#e8bd94",   // 顔・手
        "A": "#e8e4d8",   // 白い髪とひげ
        "B": "#b8b2a2",   // ひげの影（口もと）
        "G": "#d9b35a",   // 眼鏡の縁
        "W": "#101425",   // 目
        "R": "#2e4a58",   // 長衣
        "Y": "#c9a24a",   // 襟の縁
        "D": "#7a4a2a",   // 書の表紙
        "E": "#f2ead2"    // 書の頁
      },
      pixels: [
        "................",
        "................",
        ".....KKKKKK.....",
        "....KSSSSSSK....",
        "...KASSSSSSAK...",
        "...KAAASSAAAK...",
        "...KAGWGGWGAK...",
        "...KASSSSSSAK...",
        "...KSAABBAASK...",
        "....KAAAAAAK....",
        "...KYRAAAARYK...",
        "..KRRRRABRRRRK..",
        "..KRRDDDDDDRRK..",
        "..KRSEEEEEESRK..",
        "..KKRDDDDDDRKK..",
        "...KKKKKKKKKK..."
      ]
    },

    // 鉢巻きと前掛けの職人。今はどの店にも使っていないが、
    // 店を増やすときのためにそのまま置いてある
    // （data/shop.js の keeper に "keeperSmith" と書けば立つ）
    keeperSmith: {
      palette: {
        ".": null,
        "K": "#201814",
        "R": "#c0392b",   // 鉢巻き
        "S": "#f2c9a0",   // 顔
        "W": "#101425",   // 目
        "A": "#6b4a2e",   // 前掛け
        "B": "#8a8f9c"    // 留め具
      },
      pixels: [
        "................",
        "................",
        "....KKKKKKKK....",
        "...KRRRRRRRRK...",
        "...KSSSSSSSSK...",
        "...KSWSSSSWSK...",
        "...KSSSSSSSSK...",
        "...KSSKKKKSSK...",
        "....KSSSSSSK....",
        "..KKAAAAAAAAKK..",
        ".KAAAAAAAAAAAAK.",
        ".KAAAABBBBAAAAK.",
        ".KAAAAAAAAAAAAK.",
        ".KAAAAAAAAAAAAK.",
        ".KKAAAAAAAAAAKK.",
        "..KKKKKKKKKKKK.."
      ]
    },

    // --- 拠点の背景 ---

    // たき火。data/motions.js の blaze で揺らして使う
    campfire: {
      palette: {
        ".": null,
        "K": "#2a1a0c",   // 影
        "W": "#8a5a2e",   // 薪
        "R": "#e8542a",   // 炎（外）
        "O": "#ffa32e",   // 炎（中）
        "Y": "#ffe66e"    // 炎（芯）
      },
      pixels: [
        "................",
        "................",
        "................",
        ".......Y........",
        "......YOY.......",
        "......YOY.......",
        ".....YOOOY......",
        ".....YOOOY......",
        "....ROOOOOR.....",
        "....ROOOOOR.....",
        "...RROOOOORR....",
        "...RRRRRRRRR....",
        "..WWWKKKKKWWW...",
        ".WWWKKKKKKKWWW..",
        "..KKKKKKKKKKK...",
        "................"
      ]
    }
  });
})(window.MyGame);
