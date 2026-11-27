/**
 * TextButton.js
 * 文字だけの小さなボタン。マウスだけでも操作できるようにするための部品。
 *
 * 押せることが見えるよう、カーソルを重ねると色が変わる。
 * どこに置くか・何と書くかは使う側が決める。
 *
 * 「戻る」ボタン（BackButton）も、探索中の「仲間 / 持ち物」もこれを使う。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {object} rect { x, y, w, h }
   * @param {string} label 表示する文字
   */
  function TextButton(panel, rect, label) {
    this.panel = panel;
    this.rect = rect || { x: 0, y: 0, w: 80, h: 30 };
    this.label = label || "";
    this.hovered = false;
  }

  /**
   * 入力を見る。カーソルが重なっていれば色を変え、押されたら true を返す。
   * @returns {boolean} 押されたか
   */
  TextButton.prototype.handleInput = function (input) {
    this.hovered = false;
    if (!input || !input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.inside) return false;
    if (!NS.Panel.containsPoint(this.rect, pointer)) return false;

    this.hovered = true;
    return !!pointer.clicked;
  };

  TextButton.prototype.render = function () {
    var t = this.panel.theme;
    var rect = this.rect;
    var ctx = this.panel.ctx;

    ctx.fillStyle = this.hovered ? (t.buttonHoverBg || "rgba(74,107,168,0.45)")
                                 : (t.panelBg || "rgba(8,10,20,0.92)");
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.strokeStyle = this.hovered ? (t.cursorColor || "#ffd75e")
                                   : (t.panelBorder || "#3a4266");
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

    this.panel.drawText(this.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5, {
      align: "center",
      font: t.smallFont,
      color: this.hovered ? t.cursorColor : t.subTextColor
    });
  };

  NS.TextButton = TextButton;

  /**
   * 個数を決めるときの押せるボタン（v1.8.0。作者の指定 2026-11-27「スマホ版で工房でアイテムを作れない・作る量を増やせない、ショップも同じ」）。
   * 「−10 −1 +1 +10」と「決定」を1列に並べる。キー（←→↑↓・決定）はこれまでどおり使える。
   * お店（ShopScene）と工房（CraftScene）の個数の窓の下に置く。
   *
   * @param {MyGame.Panel} panel
   * @param {object} area 並べる枠 { x, y, w, h }（右の説明欄の下の方）
   * @param {number} step まとめて動く数（layout.quantityStep）
   * @param {string} okLabel 「決定」の文字
   */
  function QuantityButtons(panel, area, step, okLabel) {
    this.panel = panel;
    var gap = 6, okW = Math.max(72, Math.floor(area.w * 0.28));
    var stepW = Math.floor((area.w - okW - gap * 4) / 4);
    var x = area.x;
    var deltas = [-step, -1, 1, step];
    this.buttons = [];
    for (var i = 0; i < deltas.length; i++) {
      var d = deltas[i];
      var label = (d > 0 ? "+" : "−") + Math.abs(d);
      this.buttons.push({ delta: d, button: new TextButton(panel, { x: x, y: area.y, w: stepW, h: area.h }, label) });
      x += stepW + gap;
    }
    this.ok = new TextButton(panel, { x: area.x + area.w - okW, y: area.y, w: okW, h: area.h }, okLabel || "決定");
  }

  /** @returns {{delta:number}|{confirm:true}|null} 押されたボタン */
  QuantityButtons.prototype.handleInput = function (input) {
    var hit = null;
    for (var i = 0; i < this.buttons.length; i++) {
      if (this.buttons[i].button.handleInput(input) && !hit) hit = { delta: this.buttons[i].delta };
    }
    if (this.ok.handleInput(input) && !hit) hit = { confirm: true };
    return hit;
  };

  QuantityButtons.prototype.render = function () {
    for (var i = 0; i < this.buttons.length; i++) this.buttons[i].button.render();
    this.ok.render();
  };

  /** 右の説明欄（layout.detail）の下の端に並べる枠 */
  QuantityButtons.areaFor = function (layout) {
    var d = (layout && layout.detail) || { x: 392, y: 122, w: 368, h: 372 };
    return { x: d.x + 12, y: d.y + d.h - 46, w: d.w - 24, h: 34 };
  };

  NS.QuantityButtons = QuantityButtons;
})(window.MyGame);
