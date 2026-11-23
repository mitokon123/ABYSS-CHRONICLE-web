/**
 * SettingsScene.js
 * 設定画面。左で音量などを調整し、右で操作キーを確認する。
 *
 * ▼ 操作
 *   上下  … 項目を選ぶ
 *   左右  … 値を変える
 *   Esc/X … 保存して前の画面へ戻る
 *
 * ▼ v1.4.0
 *   左の下に、選んでいる項目の説明（data/settings.js の description）。
 *   右の操作キーは、キーを枠つきの札で出す。
 *
 * ▼ v1.7.0 指・マウスで値を変える（作者の指定「設定画面でタッチやクリックで変えれるように」）
 *   ◀ の所を押す … 1段下げる   棒の右（値・▶）を押す … 1段上げる
 *   棒を押す・なぞる … 押した位置の値にする（段に丸める）
 *   どれも選んでいない行でも効く（押した行を選んでから変える）
 *
 * 調整できる項目は data/settings.js、操作キーは data/keys.js、
 * 配置は data/ui.js の settings、文言は data/messages.js の settings で管理する。
 * どれもデータを足すだけで項目を増やせる。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1400; // 通知を表示しておく時間（ms）
  var KEY_BASELINE = 20;      // 操作キーの行の、上端から文字の下端までの高さ

  /**
   * @param {MyGame.Game} game
   * @param {object} returnScene 閉じたときに戻るシーン
   */
  function SettingsScene(game, returnScene) {
    this.game = game;
    this.returnScene = returnScene;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.settings || {};
    this.texts = (game.data.messages || {}).settings || {};
    this.keyConfig = game.data.keys || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.renderer = new NS.Renderer(game.ctx);
    this.backButton = new NS.BackButton(this.panel, game.data);
    this.settings = game.settings || new NS.SettingsManager(game.data);

    this.index = 0;
    this.notice = new NS.Notice(this.theme.notice);
    this._sliding = -1;      // 棒をつまんでいる行（v1.7.0）。つまんでいないときは -1
    this._wasDown = false;   // 前のフレームで押していたか（押し始めを見分ける）

    // 操作キーの一覧。行数が多いので、持ち物などの一覧と同じバーで送る（読むだけ）
    var self = this;
    var K = this.layout.keys || {};
    var origin = this.panel.innerOrigin(K);
    this.keyList = new NS.ScrollList(this.panel, {
      x: K.x, y: origin.y + 38 - KEY_BASELINE, w: K.w,
      h: K.visibleRows * K.rowHeight, rowHeight: K.rowHeight,
      visibleRows: K.visibleRows, frame: false
    }, {
      readOnly: true,
      renderRow: function (row, i, y) { self._renderKeyRow(row.action, y + KEY_BASELINE); }
    });
  }

  SettingsScene.prototype.enter = function () {
    this.index = 0;

    var order = this.keyConfig.order || [];
    var rows = [];
    for (var i = 0; i < order.length; i++) rows.push({ type: "line", action: order[i] });
    this.keyList.setRows(rows);
  };

  // --- 更新 ---

  SettingsScene.prototype.update = function (dt) {
    var input = this.game.input;
    var items = this.settings.items;

    this.notice.update(dt);

    if (items.length > 0) {
      if (input.isPressed("up")) this.index = (this.index - 1 + items.length) % items.length;
      if (input.isPressed("down")) this.index = (this.index + 1) % items.length;

      if (input.isPressed("left")) this._changeValue(-1);
      if (input.isPressed("right")) this._changeValue(1);
      if (input.isPressed("confirm")) this._activate();

      this._handleMouse(input);
    }

    this._updateKeyScroll(input);

    if (input.isPressed("cancel") || this.backButton.handleInput(input)) this._close();
  };

  /**
   * 操作キーの一覧を送る。
   * 上下は設定の項目を選ぶのに使っているので、
   * ホイール・右端のバー・Q/E（左右のタブ送り）で動かす。端で止まる。
   */
  SettingsScene.prototype._updateKeyScroll = function (input) {
    this.keyList.handleInput(input);
    if (input.isPressed("prevTab")) this.keyList.scrollByRows(-1);
    if (input.isPressed("nextTab")) this.keyList.scrollByRows(1);
  };

  /**
   * 項目1つぶんの四角。描画（_renderItems）と同じ計算にしてある。
   * ずれると「押した場所と選ばれる項目」が食い違う。
   */
  SettingsScene.prototype._itemRowRect = function (index) {
    var I = this.layout.items;
    var box = this._itemsRect();
    var origin = this.panel.innerOrigin(box);
    var top = origin.y + 34;

    return {
      x: box.x, y: top + I.rowHeight * index - I.rowHeight + 10,
      w: box.w, h: I.rowHeight
    };
  };

  /**
   * 値を変える所（v1.7.0）。描画（_renderItemRow）と同じ計算にしてある。
   *   minus … ◀ の所（棒の左）  bar … 棒  plus … 棒の右から枠の右端まで（値と ▶）
   * 縦は行の高さぶん全部（指で押しやすいように）
   */
  SettingsScene.prototype._valueZones = function (index) {
    var I = this.layout.items;
    var row = this._itemRowRect(index);
    var box = this._itemsRect();
    var barX = this.panel.innerOrigin(box).x + 18 + (I.labelWidth || 112);
    var barEnd = barX + I.barWidth;
    var minusW = 24;
    return {
      barX: barX, barW: I.barWidth,
      minus: { x: barX - minusW, y: row.y, w: minusW, h: row.h },
      bar:   { x: barX, y: row.y, w: I.barWidth, h: row.h },
      plus:  { x: barEnd, y: row.y, w: box.x + box.w - barEnd, h: row.h }
    };
  };

  /** 棒の上の x から値を決める（段に丸める。v1.7.0） */
  SettingsScene.prototype._valueAt = function (item, zones, x) {
    var min = item.min === undefined ? 0 : item.min;
    var max = item.max === undefined ? 100 : item.max;
    var step = item.step || 1;
    var ratio = Math.max(0, Math.min(1, (x - zones.barX) / zones.barW));
    return min + Math.round(ratio * (max - min) / step) * step;
  };

  /** 値を決めて、音量ならその場で鳴らし方を変える */
  SettingsScene.prototype._setValue = function (item, value) {
    if (this.settings.get(item.id) === value) return;
    this.settings.set(item.id, value);
    if (this.game.audio) this.game.audio.applyVolume();
  };

  /**
   * マウス・指で項目を選び、値を変える（v1.7.0）。別の画面を開く項目なら押して開く。
   *
   * ★ ここが無いと、**マウスだけでは「名前と見た目」を開けなかった**。
   * ★ 棒は押し始めた行だけをつまむ。つまんだまま上下の行へ指がずれても、その行のまま
   */
  SettingsScene.prototype._handleMouse = function (input) {
    if (!input.getPointer) return;

    var pointer = input.getPointer();
    var items = this.settings.items;
    var pressStart = !!pointer.down && !this._wasDown;
    this._wasDown = !!pointer.down;

    // 棒をつまんでいる間は、横の位置で値を変える
    if (this._sliding >= 0) {
      var held = items[this._sliding];
      if (held) this._setValue(held, this._valueAt(held, this._valueZones(this._sliding), pointer.x));
      if (!pointer.down) this._sliding = -1;
      return;
    }

    if (!pointer.inside) return;
    if (!pointer.moved && !pointer.clicked && !pressStart) return;

    for (var i = 0; i < items.length; i++) {
      if (!NS.Panel.containsPoint(this._itemRowRect(i), pointer)) continue;

      this.index = i;
      var item = items[i];
      if (item.type !== "range") {
        if (pointer.clicked) this._activate();
        return;
      }
      var z = this._valueZones(i);
      if (NS.Panel.containsPoint(z.bar, pointer) && (pressStart || pointer.clicked)) {
        // 押し始めでつまむ。押して離すのが1フレームで終わったとき（クリックが速い）は clicked で拾う
        this._setValue(item, this._valueAt(item, z, pointer.x));
        if (pressStart && pointer.down) this._sliding = i;
      } else if (pointer.clicked && NS.Panel.containsPoint(z.minus, pointer)) {
        this._changeValue(-1);
      } else if (pointer.clicked && NS.Panel.containsPoint(z.plus, pointer)) {
        this._changeValue(1);
      }
      return;
    }
  };

  SettingsScene.prototype._changeValue = function (direction) {
    var item = this.settings.items[this.index];
    if (!item) return;

    this.settings.step(item.id, direction);

    // 音量はその場で反映する。動かしてから戻るまで分からないと、
    // どれくらいにしたのか確かめようがない。
    // 効果音の大きさは、左右を押したときのカーソル音（Game._playUiSounds）で
    // そのまま聞ける。あちらは画面の更新のあとに鳴るので、変えた後の大きさになる
    if (this.game.audio) this.game.audio.applyVolume();
  };

  /**
   * 決定を押したときの動き。
   *
   * ふつうの項目（range）は左右で値を変えるだけなので、決定では何も起きない。
   * 別の画面を開く項目（type: "action"）だけがここで反応する。
   *
   * ★ 開く先は data/settings.js の action に書く。
   *   画面を増やしたいときは、ここに1行 case を足すだけでよい。
   */
  SettingsScene.prototype._activate = function () {
    var item = this.settings.items[this.index];
    if (!item || item.type !== "action") return;

    if (item.action === "playerSetup") {
      // 設定はここで保存しておく（別の画面へ移るので、戻ってこない場合がある）
      this.settings.save();
      this.game.scenes.change(new NS.PlayerSetupScene(this.game, this, "edit"));
    }
  };

  /** 設定を保存してから前の画面へ戻る */
  SettingsScene.prototype._close = function () {
    var result = this.settings.save();
    if (!result.success) {
      // 保存できなかったときは戻らず知らせる（設定が消えることに気づけるように）
      this._showNotice(this.texts.saveFailed || "");
      this.game.playError();
      return;
    }
    this.game.scenes.change(this.returnScene);
  };

  SettingsScene.prototype._showNotice = function (text) {
    this.notice.show(text, NOTICE_DURATION);
  };

  // --- 描画 ---

  SettingsScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;
    var L = this.layout;

    this.renderer.clear(L.background || "#000000", w, h);

    this._renderHeading();
    this._renderItems();
    this._renderAbout();
    this._renderKeyList();
    this._renderNotice(ctx);
    this._renderHint();
    this.backButton.render();
  };

  SettingsScene.prototype._renderHeading = function () {
    var title = this.layout.title || {};
    var subtitle = this.layout.subtitle || {};

    this.panel.drawText(this.texts.title || "", title.x, title.y,
      { font: title.font, color: title.color });
    this.panel.drawText(this.texts.subtitle || "", subtitle.x, subtitle.y,
      { font: subtitle.font, color: subtitle.color });
  };

  /** 左側：調整できる項目 */
  /**
   * 項目の枠。
   *
   * 高さは**項目数から決める**。data/ui.js に書いた h は「最低の高さ」として扱う。
   * こうしないと、設定を1つ増やしただけで最後の項目が枠からはみ出す
   * （実際に「エフェクトの濃さ」を足したときに、効果音量がはみ出した）。
   */
  SettingsScene.prototype._itemsRect = function () {
    var I = this.layout.items;
    var padding = (this.theme.padding || 8);
    var count = (this.settings.items || []).length;
    // 見出し（volumeTitle）のぶん 34px と、下の余白を足す
    var needed = padding + 34 + I.rowHeight * count;

    return { x: I.x, y: I.y, w: I.w, h: Math.max(I.h || 0, needed) };
  };

  SettingsScene.prototype._renderItems = function () {
    var I = this.layout.items;
    if (!I) return;

    var t = this.theme;
    var box = this._itemsRect();
    this.panel.drawBox(box);

    var origin = this.panel.innerOrigin(box);
    this.panel.drawText(this.texts.volumeTitle || "", origin.x, origin.y + 12,
      { font: t.smallFont, color: t.subTextColor });

    var top = origin.y + 34;
    for (var i = 0; i < this.settings.items.length; i++) {
      this._renderItemRow(this.settings.items[i], i, origin.x, top + I.rowHeight * i, I);
    }
  };

  SettingsScene.prototype._renderItemRow = function (item, i, x, y, I) {
    var t = this.theme;
    var selected = (i === this.index);
    var color = selected ? t.cursorColor : t.textColor;

    if (selected) this.panel.drawText("▶", x, y, { color: t.cursorColor });
    this.panel.drawText(item.label, x + 18, y, { color: color });

    // 別の画面を開く項目は、横棒ではなく「いまの中身」を出す
    if (item.type === "action") {
      this._renderActionRow(item, x, y, I, selected, color);
      return;
    }

    // 値を横棒で表す（選択中は左右で変えられることを ◀ ▶ で示す）
    var barX = x + 18 + (I.labelWidth || 112);
    var barY = y - 8;
    var ratio = valueRatio(item, this.settings.get(item.id));

    this.panel.ctx.fillStyle = t.hpBarBg || "#2a3350";
    this.panel.ctx.fillRect(barX, barY, I.barWidth, I.barHeight);
    this.panel.ctx.fillStyle = selected ? (t.cursorColor || "#ffd75e") : (t.subTextColor || "#9aa4c0");
    this.panel.ctx.fillRect(barX, barY, Math.round(I.barWidth * ratio), I.barHeight);

    var valueText = this.settings.formatValue(item.id);
    this.panel.drawText(valueText, barX + I.barWidth + 12, y, { font: t.smallFont, color: color });

    // ◀ ▶ は全部の行に出す（v1.7.0。押せば変わるので）。選んでいない行は薄く
    var ctx = this.panel.ctx;
    ctx.save();
    if (!selected) ctx.globalAlpha = (I.faintArrowAlpha === undefined) ? 0.35 : I.faintArrowAlpha;
    var arrowColor = selected ? t.cursorColor : t.subTextColor;
    this.panel.drawText("◀", barX - 14, y, { font: t.smallFont, color: arrowColor });
    // ▶ は値の文字のすぐ右（「とても速い」のような長い値でも重ならない）
    ctx.font = t.smallFont;
    var valueW = ctx.measureText(valueText).width;
    this.panel.drawText("▶", barX + I.barWidth + 12 + valueW + 6, y, { font: t.smallFont, color: arrowColor });
    ctx.restore();
  };

  /**
   * 別の画面を開く項目の行。
   * 数値ではないので横棒は出さず、**いま何になっているか**を出す。
   * 名前と色なら「ソウタ／青」のように、開かなくても分かるようにする。
   */
  SettingsScene.prototype._renderActionRow = function (item, x, y, I, selected, color) {
    var t = this.theme;
    var text = "";

    if (item.action === "playerSetup" && NS.PlayerLook) {
      var def = NS.PlayerLook.colorDef(this.game.data, this.game.getPlayerColor());
      text = this.game.getPlayerName() + (def ? ("  /  " + def.name) : "");
    }

    this.panel.drawText(text, x + 18 + (I.labelWidth || 112), y, { font: t.smallFont, color: color });

    // 右端は枠の内側（右揃え）
    if (selected) {
      var box = this._itemsRect();
      this.panel.drawText(this.texts.openAction || "決定で開く",
        box.x + box.w - (t.padding || 8) - 4, y,
        { align: "right", font: t.smallFont, color: t.cursorColor });
    }
  };

  /** 左の下：選んでいる項目の説明（v1.4.0）。名前・いまの値・説明 */
  SettingsScene.prototype._renderAbout = function () {
    var A = this.layout.about;
    var item = this.settings.items[this.index];
    if (!A || !item) return;

    var t = this.theme;
    var items = this._itemsRect();
    var box = { x: items.x, y: items.y + items.h + (A.gap || 10), w: items.w, h: A.h || 84 };
    this.panel.drawBox(box);
    var origin = this.panel.innerOrigin(box);
    var lh = A.lineHeight || 17;
    var y = origin.y + 14;

    this.panel.drawText(item.label, origin.x, y, { font: t.smallFont, color: t.cursorColor });
    if (item.type !== "action") {
      this.panel.drawText(this.settings.formatValue(item.id), box.x + box.w - (t.padding || 8) - 4, y,
        { align: "right", font: t.smallFont, color: t.textColor });
    }
    y += lh + 2;
    // 値ごとの説明があれば、いまの値のものを出す（戦闘速度。v1.6.1）
    var description = item.description || "";
    if (item.valueDescriptions) {
      var value = this.settings.get(item.id);
      description = item.valueDescriptions[value - (item.min || 0)] || description;
    }
    var lines = NS.wrapText(description, A.charsPerLine || 27);
    for (var i = 0; i < lines.length && y < box.y + box.h; i++) {
      this.panel.drawText(lines[i], origin.x, y, { font: t.smallFont, color: t.subTextColor });
      y += lh;
    }
  };

  /** 右側：操作キーの一覧（data/keys.js の内容をそのまま表示する） */
  SettingsScene.prototype._renderKeyList = function () {
    var K = this.layout.keys;
    if (!K) return;

    var t = this.theme;
    this.panel.drawBox(K);

    var origin = this.panel.innerOrigin(K);
    this.panel.drawText(this.texts.keysTitle || "", origin.x, origin.y + 12,
      { font: t.smallFont, color: t.subTextColor });

    this.keyList.render();
  };

  /** 操作キー1行（y は文字の下端）。キーの表示はバーが出ているときその幅を空ける */
  SettingsScene.prototype._renderKeyRow = function (action, y) {
    var K = this.layout.keys;
    var t = this.theme;
    var labels = this.keyConfig.actionLabels || {};
    var right = K.x + K.w - (t.padding || 8) - this.keyList.barSpace();

    this.panel.drawText(labels[action] || action, this.panel.innerOrigin(K).x, y,
      { font: t.smallFont });

    // キーを右から札にして並べる（v1.4.0）
    var ctx = this.panel.ctx;
    var keys = this.game.input.getKeyLabels(action);
    var capH = K.capHeight || 20;
    var x = right;
    for (var i = keys.length - 1; i >= 0; i--) {
      ctx.save();
      ctx.font = t.smallFont;
      var w = Math.max(capH, Math.ceil(ctx.measureText(keys[i]).width) + 12);
      x -= w;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x, y - capH + 5, w, capH);
      ctx.strokeStyle = t.panelBorder || "#3a4670";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y - capH + 5.5, w - 1, capH - 1);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 1, y + 3, w - 2, 2);   // 下の縁を少し濃く（押せる札に見えるように）
      ctx.restore();
      this.panel.drawText(keys[i], x + w / 2, y, { align: "center", font: t.smallFont, color: t.textColor });
      x -= 4;
    }
  };

  SettingsScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;
    var pos = this.layout.notice || { x: 400, y: 526 };

    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    ctx.font = "14px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this.notice.getText(), pos.x, pos.y);
    ctx.restore();
  };

  SettingsScene.prototype._renderHint = function () {
    if (NS.isTouchMode && NS.isTouchMode()) return;   // 指で遊んでいるときはキーの案内を出さない（v1.7.0。作者の指定）
    var pos = this.layout.hint || { x: 48, y: 570 };
    this.panel.drawText(this.texts.hint || "", pos.x, pos.y,
      { font: this.theme.smallFont, color: this.theme.hintColor });
  };

  /** 現在値が min〜max のどのあたりかを 0〜1 で返す */
  function valueRatio(item, value) {
    var min = item.min === undefined ? 0 : item.min;
    var max = item.max === undefined ? 100 : item.max;
    if (max === min) return 0;
    return Math.max(0, Math.min(1, ((value || 0) - min) / (max - min)));
  }

  NS.SettingsScene = SettingsScene;
})(window.MyGame);
