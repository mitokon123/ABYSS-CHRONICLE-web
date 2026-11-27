/**
 * AbilitySystem.js
 * アビリティ（特性）のうち、「どれが効くか」を決める。
 *
 * ▼ 役割
 * 種族データから、実際に効く特性の定義を並べて返すだけ。
 * 効果の集計（倍率を掛け合わせる・条件を見る）は js/systems/EffectSystem.js が
 * 装備・加護・強化とまとめて行う。
 *
 * ▼ 相手に必要なインターフェース
 *   getSpecies() : 種族データ（abilities に特性idの配列を持つ）
 *   bookAbilities : 特性の書で付けた特性idの配列（v1.6.0。無くてもよい）
 *
 * ▼ 書で付けた特性の補正（v1.8.0。作者の指定 2026-11-25）
 *   2つ目（bookAbilities の1つ目）は効き目 70%、3つ目は 50%（config.abilityBooks.slotScales）。
 *   弱めた特性は、効果を書き直した写し（AbilitySystem.scaleAbility）を返す。写しは特性と割合ごとに1つだけ作って
 *   使い回す（BattleSystem._effectSource が効果を === で探すため、呼ぶたびに作り直さない）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.GameData} gameData
   */
  function AbilitySystem(gameData) {
    this.data = gameData;
  }

  /**
   * そのモンスターが持つアビリティの定義を並べて返す。
   *
   * 1体が持てる数は data/config.js の abilityMax まで（現在は1つ）。
   * データに多く書かれていても、先頭から数えてこの数までしか効かない。
   *
   * @param {object} monster
   * @returns {object[]}
   */
  AbilitySystem.prototype.getAbilities = function (monster) {
    var species = (monster && monster.getSpecies) ? monster.getSpecies() : null;
    var result = this.resolveAbilities(species);
    // 特性の書で付けた特性（v1.6.0）を後ろに足す。種族の特性と同じものは重ねない
    var books = (monster && monster.bookAbilities) || [];
    for (var i = 0; i < books.length; i++) {
      var ability = (this.data.abilities || {})[books[i]];
      if (!ability || result.indexOf(ability) >= 0) continue;
      result.push(AbilitySystem.scaleAbility(ability, this.bookScale(books[i], i)));
    }
    return result;
  };

  /**
   * 書で付けた特性の効き目の割合（v1.8.0）。slot は bookAbilities の何番目か（0＝2つ目の特性）。
   * 補正しない特性（fullStrength）は 1
   */
  AbilitySystem.prototype.bookScale = function (abilityId, slot) {
    var cfg = ((this.data && this.data.config) || {}).abilityBooks || {};
    if ((cfg.fullStrength || []).indexOf(abilityId) >= 0) return 1;
    var scales = cfg.slotScales || [];
    var scale = scales[Math.min(slot, scales.length - 1)];
    return (typeof scale === "number") ? scale : 1;
  };

  function round4(v) { return Math.round(v * 10000) / 10000; }
  function towardOne(value, scale) { return round4(1 + (value - 1) * scale); }

  /**
   * 効果1つを弱めた写し。良い側だけ弱め、損の側（×1 より不利な倍率）はそのまま（作者の表 #2）。
   * 働くか働かないかの効果（先手・芽吹き・亡者の魂）は働く確率（chance）にする（#3）
   */
  AbilitySystem.scaleEffect = function (effect, scale) {
    var e = {};
    for (var k in effect) if (Object.prototype.hasOwnProperty.call(effect, k)) e[k] = effect[k];
    switch (effect.type) {
      case "statMultiplier":
      case "damageDealt":
        if (e.value > 1) e.value = towardOne(e.value, scale);
        break;
      case "damageTaken":
        if (e.value < 1) e.value = towardOne(e.value, scale);
        break;
      case "damageByTargetHp":
        e.tiers = (effect.tiers || []).map(function (tier) {
          var t = {};
          for (var key in tier) if (Object.prototype.hasOwnProperty.call(tier, key)) t[key] = tier[key];
          if (t.value > 1) t.value = towardOne(t.value, scale);
          return t;
        });
        break;
      case "counterStatus":
      case "counterModifier":
      case "shedStatus":
        e.chance = round4((effect.chance === undefined ? 1 : effect.chance) * scale);
        break;
      case "drain":
        e.value = round4((effect.value || 0) * scale);
        break;
      case "regen":
        e.value = round4((effect.value || 0) * scale);
        if (effect.max) e.max = Math.max(1, Math.round(effect.max * scale));
        break;
      case "tailwind":
        e.value = towardOne(effect.value || 1, scale);
        break;
      case "firstStrike":
      case "wardAlly":
      case "undying":
      case "endure":
        e.chance = round4((effect.chance === undefined ? 1 : effect.chance) * scale);
        break;
      default:
        break;   // ギャンブルなど、弱めるものが無い効果
    }
    return e;
  };

  /** 特性を弱めた写し（scale が 1 ならそのもの）。特性と割合ごとに1つだけ作る */
  AbilitySystem.scaleAbility = function (ability, scale) {
    if (!ability || scale === 1 || typeof scale !== "number") return ability;
    if (!ability._scaled) {
      Object.defineProperty(ability, "_scaled", { value: {}, enumerable: false, writable: true });
    }
    var key = String(scale);
    if (!ability._scaled[key]) {
      var copy = {};
      for (var k in ability) if (Object.prototype.hasOwnProperty.call(ability, k)) copy[k] = ability[k];
      copy.effects = (ability.effects || []).map(function (e) { return AbilitySystem.scaleEffect(e, scale); });
      copy.bookScale = scale;   // 画面が「効き目70%」と出すため
      ability._scaled[key] = copy;
    }
    return ability._scaled[key];
  };

  /**
   * 種族データから、実際に効く特性の定義を並べて返す。
   * 図鑑など、個体が無い場面でも使えるようにしてある。
   * @param {object} species 種族データ
   */
  AbilitySystem.prototype.resolveAbilities = function (species) {
    var ids = (species && species.abilities) || [];
    var limit = (this.data.config || {}).abilityMax;
    if (typeof limit !== "number") limit = ids.length;

    var result = [];
    for (var i = 0; i < ids.length && result.length < limit; i++) {
      var ability = (this.data.abilities || {})[ids[i]];
      if (ability) result.push(ability);
    }
    return result;
  };

  NS.AbilitySystem = AbilitySystem;
})(window.MyGame);
