/**
 * TitleScene.js
 * タイトル画面。ゲーム名・世界名の表示と、「新しく始める」「続きから」の選択。
 *
 * 演出は「深淵（Abyss）へ落ちていく」イメージ。
 *   背景のたてグラデーション → 奥へ続く同心円 → ゆっくり降る粒子 → 文字
 * の順に重ねて描いている。
 *
 * ▼ この画面は「どのファイルで遊ぶか」を決めない
 *   どちらを選んでも SaveSlotScene へ渡す。
 *   セーブファイルが3つあるので、始めるにも続けるにも
 *   「どのファイルか」を必ず通ることになる。
 *
 * ▼ パッチノートはメニューに置かない
 *   遊ぶための入口（始める・続ける）と、読み物は性質が違う。
 *   バージョン表記の隣に書のアイコンを置き、そこから開く。
 *   押せることが分かるよう、カーソルを乗せると明るくなる。
 *
 * ▼ v1.4.0（2026-11-13・作者が見本の案 A「深淵の光」を選んだ）
 *   穴の底から光の筋が上がる（_renderLightShaft）・世界名の両脇に飾り線（_renderOrnament）・
 *   メニューは枠をなくし、選んでいる項目が光って両脇に◆（_renderMenu）・その下に前回遊んだファイルの1行。
 *   前回の1行に、クリアした区画の数は出さない（作者の指定）。
 *
 * ▼ v1.7.0 音量（作者の指定 2026-11-24「タイトル画面に音量調整を」）
 *   メニューの最後に「設定」。選ぶと窓が出て、全体音量を棒で変える（設定の画面と同じ押し方）。
 *   項目は data/settings.js の titleVolume.items（作者「表面は設定、中身は全体音量だけ」）。
 *   ここで決めた音量はタイトル専用に覚える（SettingsManager.saveTitleVolume。閉じたときに書く）。
 *
 * 配置・配色は data/ui.js の title、文言は data/messages.js の title で管理する。
 * ゲーム名と世界名は data/config.js から取得する。
 */
(function (NS) {
  "use strict";

  var NOTICE_DURATION = 1800; // 通知を表示しておく時間（ms）

  function TitleScene(game) {
    this.game = game;
    this.elapsed = 0;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.title || {};
    this.texts = (game.data.messages || {}).title || {};

    this.panel = new NS.Panel(game.ctx, this.theme);
    this.sprites = new NS.SpriteRenderer(game.ctx, game.assets);
    // 絵の描き手を渡すと、項目の左にアイコンが付く
    this.menu = new NS.CommandMenu(this.panel, this.layout.menu, this.sprites);

    // バージョン表記の隣の、パッチノートを開くボタン
    this._patchHovered = false;

    // 粒子は奥・中・手前の3層。奥ほど遅く薄いので、重ねると奥行きが出る。
    // 層の設定が無い場合は、これまでどおり1層だけで動く
    this.particleLayers = NS.ParticleField.createLayers(
      this.layout.particleLayers || [this.layout.particles],
      game.canvas.width, game.canvas.height
    );

    this.saveManager = new NS.SaveManager(game.data);
    this.notice = new NS.Notice(this.theme.notice);

    // 開いたときの明転。1度だけ流す（パッチノートから戻るたびには流さない）
    this._introTimer = 0;
    this._introPlayed = false;

    this._buildMenu();
  }

  /**
   * メニューは「新しく始める」「続きから」。
   * 探索を中断したファイルがあるときだけ「中断したところから」が先頭に足される。
   * どれを選んでもセーブファイルの選択へ進むので、
   * ここで確認（はい／いいえ）は挟まない。上書きの確認はその先で行う。
   */
  TitleScene.prototype._buildMenu = function () {
    var items = [];
    if (this.saveManager.hasAnySuspend()) {
      items.push({ label: this.texts.resume || "resume", value: "resume", icon: "iconContinue" });
    }
    items.push({ label: this.texts.newGame  || "new",      value: "new",      icon: "iconNewGame" });
    items.push({ label: this.texts.continue || "continue", value: "continue", icon: "iconContinue" });
    items.push({ label: this.texts.volume || "volume", value: "volume", icon: "iconSettings" });   // v1.7.0
    this.menu.setItems(items);
  };

  TitleScene.prototype.enter = function () {
    // どのファイルも選んでいないので、最後に遊んだファイルの設定に戻す。音量はタイトルの音量（v1.7.0）
    this.game.useTitleSettings();
    this._volume = null;
    this.game.audio.playBgm("title");
    // 中断の有無は探索から戻るたびに変わるので、開くたびに組み直す
    this._buildMenu();
    this._lastPlayed = this._findLastPlayed();

    if (this._introPlayed) return;
    this._introPlayed = true;
    this.elapsed = 0;
    this._introTimer = (this.layout.intro || {}).duration || 0;
  };


  /**
   * 前回遊んだファイル（保存した日時がいちばん新しいもの）。無ければ null。
   * 開くたびに読み直す（探索から戻ると変わっている）
   */
  TitleScene.prototype._findLastPlayed = function () {
    var list;
    try { list = this.saveManager.peekAll(); } catch (e) { return null; }
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s.exists || s.broken || !s.savedAt) continue;
      if (!best || String(s.savedAt) > String(best.savedAt)) best = s;
    }
    return best;
  };

  /** 明転の進み具合（0=まだ真っ暗 〜 1=終わり） */
  TitleScene.prototype._introProgress = function () {
    var duration = (this.layout.intro || {}).duration || 0;
    if (duration <= 0 || this._introTimer <= 0) return 1;
    return 1 - (this._introTimer / duration);
  };

  // --- 更新 ---

  TitleScene.prototype.update = function (dt) {
    this.elapsed += dt;
    if (this._introTimer > 0) this._introTimer -= dt;

    for (var i = 0; i < this.particleLayers.length; i++) {
      this.particleLayers[i].update(dt);
    }

    this.notice.update(dt);

    // 音量の窓が出ている間は、ほかを押せない（v1.7.0）
    if (this._volume) { this._updateVolume(); return; }

    this._updatePatchButton();
    this._updateMenu();
  };

  TitleScene.prototype._updateMenu = function () {
    var result = this.menu.handleInput(this.game.input);
    if (!result || result.type !== "confirm") return;

    if (result.value === "new") this._openSlots("new");
    else if (result.value === "continue") this._openSlots("continue");
    else if (result.value === "resume") this._openSlots("resume");
    else if (result.value === "volume") this._openVolume();
  };

  // --- 音量の窓（v1.7.0。作者の指定） ---

  /** 窓で変える項目（data/settings.js の titleVolume.items の順） */
  TitleScene.prototype._volumeItems = function () {
    var S = this.game.settings, list = [];
    var ids = (S && S.titleItems) || [];
    for (var i = 0; i < ids.length; i++) {
      var item = S.getItem(ids[i]);
      if (item) list.push(item);
    }
    return list;
  };

  TitleScene.prototype._openVolume = function () {
    this._volume = { index: 0, sliding: -1, wasDown: false };
  };

  /** 閉じる。タイトルの音量として覚える */
  TitleScene.prototype._closeVolume = function () {
    this._volume = null;
    if (this.game.settings && this.game.settings.saveTitleVolume) this.game.settings.saveTitleVolume();
  };

  /** 窓の四角。高さは中身から決める（見出し・説明・行・閉じるボタン） */
  TitleScene.prototype._volumeRect = function () {
    var V = this.layout.volumeBox || {};
    var p = this.theme.padding || 8;
    var rows = (V.rowHeight || 36) * this._volumeItems().length;
    var h = p + 52 + 12 + rows + 8 + ((V.closeButton || {}).h || 26) + p + 8;
    return { x: V.x, y: V.y, w: V.w, h: h };
  };

  /** 行 i の文字の下の線の y（行の当たりは この線の上 rowHeight-10 〜 下 10） */
  TitleScene.prototype._volumeRowY = function (i) {
    var V = this.layout.volumeBox || {};
    var origin = this.panel.innerOrigin(this._volumeRect());
    return origin.y + 52 + 12 + 26 + (V.rowHeight || 36) * i;
  };

  TitleScene.prototype._volumeRowRect = function (i) {
    var V = this.layout.volumeBox || {};
    var box = this._volumeRect(), rh = V.rowHeight || 36;
    return { x: box.x, y: this._volumeRowY(i) - rh + 10, w: box.w, h: rh };
  };

  /** 値を変える所。設定の画面（SettingsScene._valueZones）と同じ形 */
  TitleScene.prototype._volumeZones = function (i) {
    var V = this.layout.volumeBox || {};
    var box = this._volumeRect(), row = this._volumeRowRect(i);
    var barX = this.panel.innerOrigin(box).x + 18 + (V.labelWidth || 120);
    var barW = V.barWidth || 140, barEnd = barX + barW;
    return {
      barX: barX, barW: barW,
      minus: { x: barX - 24, y: row.y, w: 24, h: row.h },
      bar:   { x: barX, y: row.y, w: barW, h: row.h },
      plus:  { x: barEnd, y: row.y, w: box.x + box.w - barEnd, h: row.h }
    };
  };

  TitleScene.prototype._volumeCloseRect = function () {
    var V = this.layout.volumeBox || {}, B = V.closeButton || { w: 96, h: 26 };
    var box = this._volumeRect(), p = this.theme.padding || 8;
    // 右下。左に操作の案内を置く（窓の外に出すと左下のクレジットとぶつかる）
    return { x: box.x + box.w - p - 4 - B.w, y: box.y + box.h - p - 8 - B.h, w: B.w, h: B.h };
  };

  TitleScene.prototype._setVolume = function (item, value) {
    var S = this.game.settings;
    if (S.get(item.id) === value) return;
    S.set(item.id, value);
    if (this.game.audio) this.game.audio.applyVolume();
  };

  TitleScene.prototype._stepVolume = function (item, direction) {
    this.game.settings.step(item.id, direction);
    if (this.game.audio) this.game.audio.applyVolume();
  };

  TitleScene.prototype._volumeAt = function (item, z, x) {
    var min = item.min === undefined ? 0 : item.min;
    var max = item.max === undefined ? 100 : item.max;
    var step = item.step || 1;
    var ratio = Math.max(0, Math.min(1, (x - z.barX) / z.barW));
    return min + Math.round(ratio * (max - min) / step) * step;
  };

  /**
   * 窓の操作。↑↓ で行（最後は「閉じる」）、←→ で値、決定で「閉じる」、Esc で閉じる。
   * 押す・なぞるは設定の画面と同じ。窓の外を押しても閉じる（指で閉じやすいように）
   */
  TitleScene.prototype._updateVolume = function () {
    var input = this.game.input, V = this._volume;
    var items = this._volumeItems(), count = items.length + 1;   // + 閉じる

    if (input.isPressed("cancel")) { this._closeVolume(); return; }
    if (input.isPressed("up")) V.index = (V.index - 1 + count) % count;
    if (input.isPressed("down")) V.index = (V.index + 1) % count;
    var cur = items[V.index];
    if (cur && input.isPressed("left")) this._stepVolume(cur, -1);
    if (cur && input.isPressed("right")) this._stepVolume(cur, 1);
    if (input.isPressed("confirm") && V.index === items.length) { this._closeVolume(); return; }

    if (!input.getPointer) return;
    var pointer = input.getPointer();
    var pressStart = !!pointer.down && !V.wasDown;
    V.wasDown = !!pointer.down;

    // 棒をつまんでいる間は、横の位置で値を変える（押し始めた行のまま）
    if (V.sliding >= 0) {
      var held = items[V.sliding];
      if (held) this._setVolume(held, this._volumeAt(held, this._volumeZones(V.sliding), pointer.x));
      if (!pointer.down) V.sliding = -1;
      return;
    }
    if (!pointer.inside) return;
    if (!pointer.moved && !pointer.clicked && !pressStart) return;

    if (NS.Panel.containsPoint(this._volumeCloseRect(), pointer)) {
      V.index = items.length;
      if (pointer.clicked) this._closeVolume();
      return;
    }
    for (var i = 0; i < items.length; i++) {
      if (!NS.Panel.containsPoint(this._volumeRowRect(i), pointer)) continue;
      V.index = i;
      var z = this._volumeZones(i);
      if (NS.Panel.containsPoint(z.bar, pointer) && (pressStart || pointer.clicked)) {
        this._setVolume(items[i], this._volumeAt(items[i], z, pointer.x));
        if (pressStart && pointer.down) V.sliding = i;
      } else if (pointer.clicked && NS.Panel.containsPoint(z.minus, pointer)) {
        this._stepVolume(items[i], -1);
      } else if (pointer.clicked && NS.Panel.containsPoint(z.plus, pointer)) {
        this._stepVolume(items[i], 1);
      }
      return;
    }
    if (pointer.clicked && !NS.Panel.containsPoint(this._volumeRect(), pointer)) this._closeVolume();
  };

  TitleScene.prototype._renderVolume = function (ctx) {
    if (!this._volume) return;
    var V = this.layout.volumeBox || {}, t = this.theme;
    var items = this._volumeItems(), S = this.game.settings;
    var box = this._volumeRect();
    var origin = this.panel.innerOrigin(box);

    // 後ろを暗くして、窓は不透明に（説明の窓と同じ）
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    ctx.fillStyle = V.background || "#0d1220";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    this.panel.drawBox(box);

    this.panel.drawText(this.texts.volumeHeading || "", origin.x, origin.y + 22,
      { font: "17px monospace", color: t.cursorColor });
    this.panel.drawText(this.texts.volumeNote || "", origin.x, origin.y + 48,
      { font: t.smallFont, color: t.subTextColor });

    for (var i = 0; i < items.length; i++) {
      var item = items[i], y = this._volumeRowY(i), selected = (i === this._volume.index);
      var color = selected ? t.cursorColor : t.textColor;
      if (selected) this.panel.drawText("▶", origin.x, y, { color: t.cursorColor });
      this.panel.drawText(item.label, origin.x + 18, y, { color: color });

      var z = this._volumeZones(i);
      var min = item.min === undefined ? 0 : item.min, max = item.max === undefined ? 100 : item.max;
      var ratio = max === min ? 0 : Math.max(0, Math.min(1, ((S.get(item.id) || 0) - min) / (max - min)));
      ctx.fillStyle = t.hpBarBg || "#2a3350";
      ctx.fillRect(z.barX, y - 8, z.barW, V.barHeight || 8);
      ctx.fillStyle = selected ? (t.cursorColor || "#ffd75e") : (t.subTextColor || "#9aa4c0");
      ctx.fillRect(z.barX, y - 8, Math.round(z.barW * ratio), V.barHeight || 8);

      var valueText = S.formatValue(item.id);
      this.panel.drawText(valueText, z.barX + z.barW + 12, y, { font: t.smallFont, color: color });

      // ◀ ▶ は全部の行に。選んでいない行は薄く（設定の画面と同じ）
      ctx.save();
      if (!selected) ctx.globalAlpha = (V.faintArrowAlpha === undefined) ? 0.35 : V.faintArrowAlpha;
      var arrowColor = selected ? t.cursorColor : t.subTextColor;
      this.panel.drawText("◀", z.barX - 14, y, { font: t.smallFont, color: arrowColor });
      ctx.font = t.smallFont;
      var vw = ctx.measureText(valueText).width;
      this.panel.drawText("▶", z.barX + z.barW + 12 + vw + 6, y, { font: t.smallFont, color: arrowColor });
      ctx.restore();
    }

    var close = new NS.TextButton(this.panel, this._volumeCloseRect(), this.texts.volumeClose || "");
    close.hovered = (this._volume.index === items.length);
    close.render();

    // 操作の案内は「閉じる」の左（指で遊んでいるときは出さない）
    if (!(NS.isTouchMode && NS.isTouchMode())) {
      var cr = this._volumeCloseRect();
      this.panel.drawText(this.texts.volumeHint || "", origin.x, cr.y + cr.h / 2 + 5,
        { font: t.smallFont, color: t.hintColor });
    }
  };

  /**
   * セーブファイルの選択へ進む。
   *
   * 「続きから」は、どのファイルも空でも開く（v1.3.1）。
   * 書き出したファイルから読み込めるのが、その一覧だけなので
   * （別のパソコンへ移したとき・ブラウザのデータを消したとき）。
   */
  TitleScene.prototype._openSlots = function (mode) {
    this.game.scenes.change(new NS.SaveSlotScene(this.game, this, mode));
  };

  // --- パッチノートを開くボタン（バージョン表記の隣） ---

  /** ボタンの当たり判定。バージョン表記の左に置く */
  TitleScene.prototype._patchRect = function () {
    var p = this.layout.patchButton;
    if (!p) return null;
    return { x: p.x, y: p.y, w: p.size, h: p.size };
  };

  TitleScene.prototype._updatePatchButton = function () {
    var rect = this._patchRect();
    var input = this.game.input;
    this._patchHovered = false;
    if (!rect || !input.getPointer) return;

    var pointer = input.getPointer();
    if (!pointer.inside) return;
    if (!NS.Panel.containsPoint(rect, pointer)) return;

    this._patchHovered = true;
    if (pointer.clicked) {
      this.game.scenes.change(new NS.PatchNoteScene(this.game, this));
    }
  };

  TitleScene.prototype._showNotice = function (text) {
    this.notice.show(text, NOTICE_DURATION);
  };

  // --- 描画 ---

  TitleScene.prototype.render = function (ctx) {
    var w = this.game.canvas.width;
    var h = this.game.canvas.height;

    this._renderBackground(ctx, w, h);
    this._renderAbyss(ctx);
    this._renderLightShaft(ctx, w, h);

    for (var i = 0; i < this.particleLayers.length; i++) {
      this.particleLayers[i].render(ctx);
    }

    this._renderVignette(ctx, w, h);
    this._renderLogo(ctx);
    this._renderOrnament(ctx);
    if ((this.layout.menu || {}).style === "plain") this._renderMenu(ctx);
    else this.menu.render(this.game.clock);

    this._renderNotice(ctx);
    this._renderFooter(ctx, w, h);
    this._renderVolume(ctx);   // 音量の窓（v1.7.0）。いちばん上に重ねる
    this._renderIntro(ctx, w, h);
  };

  /**
   * 画面のふちを暗く落とす。中央の深淵へ視線が向くようにする。
   * 粒子より手前・題字より奥に置くので、題字は暗くならない。
   */
  TitleScene.prototype._renderVignette = function (ctx, w, h) {
    var v = this.layout.vignette;
    if (!v) return;

    var outer = Math.sqrt(w * w + h * h) / 2;
    var gradient = ctx.createRadialGradient(
      w / 2, h / 2, outer * (v.innerRatio || 0),
      w / 2, h / 2, outer);

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, v.color || "#000000");

    ctx.save();
    ctx.globalAlpha = (v.alpha === undefined) ? 1 : v.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 開いたときの明転。真っ暗から徐々に見えてくる */
  TitleScene.prototype._renderIntro = function (ctx, w, h) {
    var progress = this._introProgress();
    if (progress >= 1) return;

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = this.layout.gradientBottom || "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /** 背景のたてグラデーション */
  TitleScene.prototype._renderBackground = function (ctx, w, h) {
    var L = this.layout;
    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, L.gradientTop || "#000000");
    gradient.addColorStop(1, L.gradientBottom || "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  /**
   * 奥へ続く同心円。ゆっくり明滅させながら、外へ広がり続ける。
   *
   * 円は中心から湧いて外へ流れていくので、こちらが落ちていくように見える。
   * 外側の円ほど薄くすることで、下へ行くほど暗くなる深淵らしさを出す。
   * 湧いた直後と消える直前は薄くして、入れ替わりを目立たせない。
   */
  TitleScene.prototype._renderAbyss = function (ctx) {
    var a = this.layout.abyss;
    if (!a) return;

    var rings = a.rings || 0;
    if (rings <= 0) return;

    var minAlpha = a.minAlpha === undefined ? 0.1 : a.minAlpha;
    var maxAlpha = a.maxAlpha === undefined ? 0.4 : a.maxAlpha;
    var center = (minAlpha + maxAlpha) / 2;
    var amplitude = (maxAlpha - minAlpha) / 2;

    // 何個ぶん外へ進んだか（0〜rings を繰り返す）
    var advance = (this.elapsed * (a.expandSpeed || 0)) % rings;

    ctx.save();
    ctx.strokeStyle = a.color || "#223355";
    ctx.lineWidth = a.lineWidth || 1;

    for (var i = 0; i < rings; i++) {
      var slot = (i + advance) % rings;
      var radius = (a.baseRadius || 0) + (a.ringGap || 0) * slot;

      // 円ごとに位相をずらして明滅させる
      var phase = this.elapsed * (a.pulseSpeed || 0) + i * 0.8;
      var fade = 1 - (a.fadePerRing || 0) * slot;
      var edge = Math.min(1, slot, rings - slot);   // 両端で0になる

      ctx.globalAlpha = Math.max(0,
        (center + amplitude * Math.sin(phase)) * fade * edge);
      ctx.beginPath();
      ctx.arc(a.centerX, a.centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * 穴の底から上がる光（v1.4.0 案A）。下の真ん中のぼんやりした明かりと、扇に広がる細い光の筋。
   * 筋はゆっくり揺れる。足し合わせ（lighter）で重ねるので、粒子が通ると少し明るく見える
   */
  TitleScene.prototype._renderLightShaft = function (ctx, w, h) {
    var S = this.layout.lightShaft;
    if (!S) return;
    var progress = this._introProgress();

    ctx.save();
    ctx.globalAlpha = progress;
    var glow = ctx.createRadialGradient(S.x, S.y, 20, S.x, S.y, S.glowRadius || 420);
    glow.addColorStop(0, S.glowColor || "rgba(110,150,255,0.3)");
    glow.addColorStop(1, "rgba(110,150,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = S.rayColor || "#7fa4ff";
    var len = S.rayLength || 700, half = S.rayHalfWidth || 0.03;
    for (var i = 0; i < (S.rays || 0); i++) {
      var a = (S.rayStart || -0.55) + i * (S.rayStep || 0.18) +
        Math.sin(this.elapsed * (S.swaySpeed || 0.0004) + i) * (S.swayAmount || 0.03);
      ctx.globalAlpha = progress * ((S.rayAlpha || 0.022) + (i % 3) * (S.rayAlphaStep || 0.012));
      ctx.beginPath();
      ctx.moveTo(S.x, S.y);
      ctx.lineTo(S.x + Math.sin(a - half) * len, S.y - Math.cos(a - half) * len);
      ctx.lineTo(S.x + Math.sin(a + half) * len, S.y - Math.cos(a + half) * len);
      ctx.fill();
    }
    ctx.restore();
  };

  /** 世界名の両脇の飾り線（外の端に小さなひし形） */
  TitleScene.prototype._renderOrnament = function (ctx) {
    var O = this.layout.ornament, world = this.layout.world || {};
    if (!O) return;
    var config = this.game.data.config || {};
    ctx.save();
    ctx.font = world.font || "14px monospace";
    var half = ctx.measureText("- " + (config.worldName || "") + " -").width / 2 + (O.gap || 16);
    var len = O.length || 80, d = O.diamond || 4, y = O.y;
    ctx.globalAlpha = this._introProgress();
    ctx.strokeStyle = O.lineColor || "#4a6ba8";
    ctx.fillStyle = O.diamondColor || "#8fb0ff";
    ctx.lineWidth = 1;
    [-1, 1].forEach(function (side) {
      var inner = world.x + side * half, outer = inner + side * len;
      ctx.beginPath();
      ctx.moveTo(inner, y);
      ctx.lineTo(outer, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(outer, y - d);
      ctx.lineTo(outer + side * d, y);
      ctx.lineTo(outer, y + d);
      ctx.lineTo(outer - side * d, y);
      ctx.fill();
    });
    ctx.restore();
  };

  /**
   * 枠のないメニュー（layout.menu.style "plain"）。選んでいる項目は大きく光り、両脇に◆。
   * 当たり判定は CommandMenu のまま（_itemRect の行に、文字を真ん中そろえで置く）。
   * その下に前回遊んだファイルの1行
   */
  TitleScene.prototype._renderMenu = function (ctx) {
    var M = this.layout.menu, t = this.theme;
    var items = this.menu.items;
    var cx = M.x + M.w / 2;
    var pulse = 0.75 + 0.25 * Math.sin((this.game.clock || 0) * 0.004);
    var bottom = M.y;
    for (var i = 0; i < items.length; i++) {
      var r = this.menu._itemRect(i);
      var y = r.y + r.h / 2 + 6;
      var on = (i === this.menu.index);
      bottom = r.y + r.h;
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = on ? (M.selectedFont || "20px monospace") : (M.font || "17px monospace");
      ctx.fillStyle = on ? (M.selectedColor || "#ffe9a8") : (M.color || "#8d9bc4");
      if (on) { ctx.shadowColor = M.glowColor || t.cursorColor; ctx.shadowBlur = (M.glowBlur || 14) * pulse; }
      ctx.fillText(items[i].label, cx, y);
      if (on) {
        var mark = (ctx.measureText(items[i].label).width / 2) + (M.markGap || 22);
        ctx.shadowBlur = 0;
        ctx.font = "12px monospace";
        ctx.fillStyle = M.markColor || t.cursorColor || "#ffd75e";
        ctx.fillText("◆", cx - mark, y - 3);
        ctx.fillText("◆", cx + mark, y - 3);
      }
      ctx.restore();
    }

    var last = this._lastPlayed, L = this.layout.lastPlayed;
    if (!last || !L) return;
    var playTime = NS.SaveSlotScene.prototype._playTimeText.call(
      { texts: (this.game.data.messages || {}).saveSlot || {} }, last.playTime);
    var text = (this.texts.lastPlayed || "前回：スロット{slot}  {name}  ・  {time}")
      .replace("{slot}", last.slot)
      .replace("{name}", last.playerName || last.leadName || "")
      .replace("{time}", playTime);
    ctx.save();
    ctx.font = L.font || t.smallFont || "12px monospace";
    ctx.fillStyle = L.color || t.subTextColor;
    ctx.textAlign = "center";
    ctx.fillText(text, cx, bottom + (L.gapBelow || 26));
    ctx.restore();
  };

  /** ゲーム名・世界名・副題 */
  TitleScene.prototype._renderLogo = function (ctx) {
    var L = this.layout;
    var config = this.game.data.config || {};

    // ゲーム名（文字間を空けて重厚に見せる）
    //   ゆっくり浮き沈みし、光のにじみも合わせて増減させる。
    //   開いた直後は少し下から上がってくる
    var logo = L.logo || {};
    var clock = this.game.clock;
    var progress = this._introProgress();
    var rise = (1 - progress) * ((L.intro || {}).riseY || 0);

    ctx.save();
    ctx.font = logo.font || "40px monospace";
    ctx.fillStyle = logo.color || "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = logo.glowColor || "transparent";
    ctx.shadowBlur = Math.max(0,
      NS.Motion.value(logo.glowPulse, clock, 0, logo.glowBlur || 0));
    ctx.globalAlpha = progress;

    drawSpacedText(ctx, config.gameTitle || "",
      logo.x,
      logo.y + rise + NS.Motion.value(logo.float, clock, 0, 0),
      logo.letterSpacing || 0);
    ctx.restore();

    // 世界名
    var world = L.world || {};
    ctx.save();
    ctx.font = world.font || "14px monospace";
    ctx.fillStyle = world.color || "#888888";
    ctx.textAlign = "center";
    ctx.fillText("- " + (config.worldName || "") + " -", world.x, world.y);
    ctx.restore();

    // 副題
    var sub = L.subtitle || {};
    ctx.save();
    ctx.font = sub.font || "12px monospace";
    ctx.fillStyle = sub.color || "#666666";
    ctx.textAlign = "center";
    ctx.fillText(this.texts.subtitle || "", sub.x, sub.y);
    ctx.restore();
  };

  TitleScene.prototype._renderNotice = function (ctx) {
    if (!this.notice.isActive()) return;

    var pos = this.layout.notice || { x: 320, y: 392 };
    ctx.save();
    ctx.globalAlpha = this.notice.getAlpha();
    ctx.font = "13px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "center";
    ctx.fillText(this.notice.getText(), pos.x, pos.y);
    ctx.restore();
  };

  /** 操作説明とバージョン、そしてパッチノートのアイコン */
  TitleScene.prototype._renderFooter = function (ctx, w, h) {
    var L = this.layout;
    var config = this.game.data.config || {};

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.hintColor || "#5b6688";

    var hint = L.hint || { x: w / 2, y: h - 28 };
    ctx.textAlign = "center";
    // 指で遊んでいるときはキーの案内を出さない（v1.7.0）
    if (!(NS.isTouchMode && NS.isTouchMode())) ctx.fillText(this.texts.hint || "", hint.x, hint.y);

    var version = L.version || { x: w - 8, y: h - 8 };
    ctx.textAlign = "right";
    // カーソルが乗っているあいだは、バージョンも一緒に明るくする。
    // アイコンだけ光っても「どこが押せるのか」が伝わりにくいため
    ctx.fillStyle = this._patchHovered
      ? (this.theme.cursorColor || "#ffd75e")
      : (this.theme.hintColor || "#5b6688");
    ctx.fillText("v" + (config.version || "?"), version.x, version.y);
    ctx.restore();

    this._renderCredits(ctx);
    this._renderPatchButton(ctx);
  };

  /**
   * 左下の素材クレジット。data/audio.js の credits をそのまま並べる。
   *
   * ★ 表記が条件の素材を使うときは、ここに出ることが大事。
   *   1件目をいちばん下に置き、増えたぶんは上へ積む
   *   （下端の位置を固定しておけば、件数が変わっても隅から動かない）。
   */
  TitleScene.prototype._renderCredits = function (ctx) {
    var L = this.layout.credit;
    var credits = (this.game.data.audio || {}).credits || [];
    if (!L || credits.length === 0) return;

    var template = this.texts.credit || "{label}：{name} {url}";
    var lineHeight = L.lineHeight || 16;

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.hintColor || "#5b6688";
    ctx.textAlign = "left";
    for (var i = 0; i < credits.length; i++) {
      var c = credits[i];
      var line = template
        .replace("{label}", c.label || "")
        .replace("{name}", c.name || "")
        .replace("{url}", c.url || "");
      ctx.fillText(line.trim(), L.x, L.y - lineHeight * i);
    }
    ctx.restore();
  };

  /**
   * バージョン表記の隣に置く「書」のアイコン。押すとパッチノートが開く。
   *
   * ふだんは薄く、カーソルを乗せるとはっきり出す。
   * 常に濃いと、隅の飾りなのか押せるものなのか分からない。
   */
  TitleScene.prototype._renderPatchButton = function (ctx) {
    var p = this.layout.patchButton;
    if (!p || !this.game.assets) return;

    ctx.save();
    ctx.globalAlpha = this._patchHovered
      ? (p.activeAlpha === undefined ? 1 : p.activeAlpha)
      : (p.idleAlpha === undefined ? 0.55 : p.idleAlpha);
    this.sprites.draw(p.icon || "iconPatchNote", p.x, p.y, p.size, p.size);
    ctx.restore();

    // 何のアイコンかは、乗せたときだけ文字で出す
    if (!this._patchHovered || !p.label) return;

    ctx.save();
    ctx.font = this.theme.smallFont || "12px monospace";
    ctx.fillStyle = this.theme.cursorColor || "#ffd75e";
    ctx.textAlign = "right";
    ctx.fillText(this.texts.patchNote || "", p.label.x, p.label.y);
    ctx.restore();
  };

  /** 文字間を空けて中央揃えで描く */
  function drawSpacedText(ctx, text, centerX, y, spacing) {
    if (!spacing) {
      ctx.fillText(text, centerX, y);
      return;
    }
    // 文字ごとの幅に間隔を足して全体幅を求め、左端から順に描く
    var totalWidth = 0;
    var i;
    for (i = 0; i < text.length; i++) {
      totalWidth += ctx.measureText(text.charAt(i)).width + spacing;
    }
    totalWidth -= spacing;

    var prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    var x = centerX - totalWidth / 2;
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + spacing;
    }
    ctx.textAlign = prevAlign;
  }

  NS.TitleScene = TitleScene;
})(window.MyGame);
