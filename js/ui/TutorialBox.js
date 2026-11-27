/**
 * TutorialBox.js
 * 場面の上に重ねて出す、チュートリアルのふきだし。
 *
 * 出す中身は data/tutorial.js、出すかどうかの判断は TutorialSystem。
 * ここは「見せて、送って、閉じる」だけを持つ。
 *
 * ▼ 使い方（場面の側）
 *   this.tutorial = new NS.TutorialBox(this.panel, game);
 *   this.tutorial.show(game.tutorial.take("battleStart"));
 *   // update の先頭で
 *   if (this.tutorial.isActive()) { this.tutorial.handleInput(input); return; }
 *   // render の最後で
 *   this.tutorial.render();
 *
 * ▼ 出ているあいだは、その場面の操作を止めること
 *   止めないと、説明を読んでいる裏で戦闘が進んでしまう。
 *   上の「return」がその役目。
 *
 * ▼ 枠の高さは行数から決める
 *   説明ごとに行数が違うので、決め打ちにすると余白が空いたりはみ出したりする。
 *
 * ▼ 指で遊んでいるときの文（v1.8.0）
 *   説明に linesTouch があれば、指のときはそちらを出す（キーの名前を出さないため）。
 *
 * ▼ 絵（v1.8.0。作者の指定「チュートリアルに画像を挿入」）
 *   説明に image: { src, w, h } があれば、見出しと本文のあいだに絵を置く。
 *   絵は assets/tutorial/ の PNG（開発用サーバーの撮影の道具で撮って矢印を描いたもの）。
 *   絵があるときは枠が大きくなるので、画面の真ん中に置き、横幅も絵に合わせて広げる。
 *   読み込めなかった絵は場所ごと無かったことにする（文だけで読めるように書いてある）。
 */
(function (NS) {
  "use strict";

  /**
   * @param {MyGame.Panel} panel
   * @param {MyGame.Game} game
   */
  function TutorialBox(panel, game) {
    this.panel = panel;
    this.game = game;

    var ui = game.data.ui || {};
    this.theme = ui.theme || {};
    this.layout = ui.tutorial || {};
    this.texts = (game.data.messages || {}).tutorial || {};

    this.queue = [];   // まだ見せていない説明
    this.current = null;

    /**
     * 「どこを指すか」を教えてもらう係。
     *
     * 説明に pointAt が書いてあると、その名前を渡して四角を返してもらう。
     * ふきだしは画面の中身を知らないので、指し先の場所は場面の側に聞く。
     * 設定していなければ、矢印は出ないだけで他は今までどおり動く。
     */
    this.targetResolver = null;

    // 「これ以降は出さない」ボタン（v1.7.0）。場所は枠の大きさが決まってから（_placeStopButton）
    this.stopButton = new NS.TextButton(panel, { x: 0, y: 0, w: 0, h: 0 }, "");
  }

  /** 読み込んだ絵（src → Image）。説明の画面は何度も作り直すので、絵は全体で1つずつ持つ */
  var imageCache = {};

  function imageOf(src) {
    if (!imageCache[src]) {
      var img = new Image();
      img.onerror = function () { img._failed = true; };
      img.src = src;
      imageCache[src] = img;
    }
    return imageCache[src];
  }

  /** いまの説明の絵（無い・読めなかったときは null） */
  TutorialBox.prototype._image = function () {
    var spec = this.current && this.current.image;
    if (!spec || !spec.src) return null;
    var img = imageOf(spec.src);
    if (img._failed) return null;
    return { img: img, w: spec.w || 400, h: spec.h || 225 };
  };

  /** 絵が使う高さ（絵＋上下のすき間） */
  TutorialBox.prototype._imageHeight = function () {
    var image = this._image();
    return image ? image.h + 12 : 0;
  };

  /** いま出す本文。指のときは linesTouch があればそちら（v1.8.0） */
  TutorialBox.prototype._lines = function () {
    if (!this.current) return [];
    if (this._touch() && this.current.linesTouch) return this.current.linesTouch;
    return this.current.lines || [];
  };

  /** 指で遊んでいるか（v1.7.0）。そのときはキーの名前を出さない */
  TutorialBox.prototype._touch = function () {
    return !!(NS.isTouchMode && NS.isTouchMode());
  };

  /** 「これ以降は出さない」ボタンを枠の右下（操作案内の行）に置く */
  TutorialBox.prototype._placeStopButton = function () {
    var rect = this._rect();
    var B = this.layout.stopButton || { w: 168, h: 22 };
    var origin = this.panel.innerOrigin(rect);
    var hintY = this._hintY(rect);
    var b = this.stopButton;
    b.rect = {
      x: rect.x + rect.w - (origin.x - rect.x) - B.w,   // 右の余白は左と同じ
      y: hintY - Math.round(B.h / 2) - 5,
      w: B.w, h: B.h
    };
    b.label = this._touch() ? (this.texts.stopButton || "") : (this.texts.stopButtonKey || this.texts.stopButton || "");
    return b;
  };

  /** 操作案内の行の y（文字の下の線） */
  TutorialBox.prototype._hintY = function (rect) {
    var L = this.layout;
    var lines = this._lines().length;
    return this.panel.innerOrigin(rect).y + (L.titleHeight || 30) + 8 + this._imageHeight()
         + (L.lineHeight || 22) * lines + (L.hintHeight || 28);
  };

  /** 説明をこれ以降ぜんぶ出さない。設定から戻せる */
  TutorialBox.prototype._stop = function () {
    if (this.game.tutorial) this.game.tutorial.disable();
    this.queue = [];
    this.current = null;
  };

  /**
   * 指し先を教える係を設定する。
   * @param {function(string): object|null} resolver pointAt → { x, y, w, h }
   */
  TutorialBox.prototype.setTargetResolver = function (resolver) {
    this.targetResolver = resolver || null;
  };

  /** いま指している四角（指さない説明のときは null） */
  TutorialBox.prototype._target = function () {
    if (!this.current || !this.current.pointAt || !this.targetResolver) return null;
    return this.targetResolver(this.current.pointAt) || null;
  };

  /**
   * 説明を並べて見せ始める。
   * @param {object[]} steps TutorialSystem.take() が返したもの
   */
  TutorialBox.prototype.show = function (steps) {
    if (!steps || steps.length === 0) return;

    // 出ている最中に別の説明が来たら（レベルアップと絆が同じ戦闘で起きたときなど）後ろに並べる（v1.8.0）
    if (this.current) {
      this.queue = this.queue.concat(steps);
    } else {
      this.queue = steps.slice();
      this.current = this.queue.shift();
    }

    // 絵は先に読み始めておく（めくったときに待たせない）
    var all = [this.current].concat(this.queue);
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].image && all[i].image.src) imageOf(all[i].image.src);
    }
  };

  TutorialBox.prototype.isActive = function () {
    return !!this.current;
  };

  /**
   * 決定で次へ、Esc か「これ以降は出さない」ボタンでこれ以降ぜんぶ出さない。
   * @returns {boolean} まだ出ているか
   */
  TutorialBox.prototype.handleInput = function (input) {
    if (!this.current) return false;

    // 「いつでもやめられる」ようにしておく。設定から戻せる。
    // ボタンは枠の中にあるので、「枠を押したら次へ」より先に見る
    if (input.isPressed("cancel") || this._placeStopButton().handleInput(input)) {
      this._stop();
      return false;
    }

    if (input.isPressed("confirm") || this._clicked(input)) {
      this.current = this.queue.length > 0 ? this.queue.shift() : null;
    }
    return !!this.current;
  };

  /** ふきだしのどこかを押したら「次へ」と同じ扱いにする */
  TutorialBox.prototype._clicked = function (input) {
    if (!input.getPointer) return false;

    var pointer = input.getPointer();
    if (!pointer.clicked) return false;

    return NS.Panel.containsPoint(this._rect(), pointer);
  };

  /** 行数から枠の大きさを決める */
  TutorialBox.prototype._rect = function () {
    var L = this.layout;
    var box = L.box || { x: 180, y: 170, w: 440 };
    var lineHeight = L.lineHeight || 22;
    var lines = this._lines().length;
    var pad = L.padding || 20;

    // 見出し＋（絵）＋本文＋操作案内。padding は上下ぶん
    var height = pad * 2 + (L.titleHeight || 30) + this._imageHeight()
               + lineHeight * lines + (L.hintHeight || 28);

    var image = this._image();
    if (!image) return { x: box.x, y: box.y, w: box.w, h: height };

    // 絵があるときは画面の真ん中。横幅は絵が入るまで広げる
    var cfg = (this.game.data && this.game.data.config) || {};
    var screenW = cfg.canvasWidth || 800, screenH = cfg.canvasHeight || 600;
    var w = Math.max(box.w, image.w + pad * 2);
    return {
      x: Math.round((screenW - w) / 2),
      y: Math.max(8, Math.round((screenH - height) / 2)),
      w: w, h: height
    };
  };

  TutorialBox.prototype.render = function () {
    if (!this.current) return;

    var t = this.theme;
    var L = this.layout;
    var rect = this._rect();

    // ★ 先に不透明で塗りつぶしてから枠を描く。
    //   共通の枠（Panel.drawBox）は半透明なので、そのままだと
    //   後ろの盤面やパーティ表示が透けて、説明が読みにくくなる。
    //   ここは「読ませるための窓」なので、後ろを完全に隠す
    var ctx = this.panel.ctx;
    ctx.fillStyle = L.background || "#0d1220";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    this.panel.drawBox(rect);

    var origin = this.panel.innerOrigin(rect);
    var lineHeight = L.lineHeight || 22;
    var y = origin.y + (L.titleHeight || 30);

    this.panel.drawText(this.current.title || "", origin.x, y,
      { font: L.titleFont || t.font, color: t.cursorColor });
    y += 8;

    // 絵（v1.8.0）。枠の真ん中に置き、細い線で囲む
    var image = this._image();
    if (image) {
      var ix = Math.round(rect.x + (rect.w - image.w) / 2);
      var iy = y + 6;
      if (image.img.complete && image.img.naturalWidth > 0) {
        ctx.drawImage(image.img, ix, iy, image.w, image.h);
      } else {
        ctx.fillStyle = "#000";   // 読み込み中。場所だけ取っておく（枠の大きさを変えない）
        ctx.fillRect(ix, iy, image.w, image.h);
      }
      ctx.strokeStyle = t.panelBorder || "#3a4266";
      ctx.lineWidth = 1;
      ctx.strokeRect(ix + 0.5, iy + 0.5, image.w - 1, image.h - 1);
      y += this._imageHeight();
    }

    var lines = this._lines();
    for (var i = 0; i < lines.length; i++) {
      y += lineHeight;
      this.panel.drawText(lines[i], origin.x, y, { color: t.textColor });
    }

    // 残りの数を出す。何回押せば終わるかが分かるように。指のときはキーの名前を出さない（v1.7.0）
    var touch = this._touch();
    var more = touch ? (this.texts.hintMoreTouch || this.texts.hintMore) : this.texts.hintMore;
    var last = touch ? (this.texts.hintLastTouch || this.texts.hintLast) : this.texts.hintLast;
    var hint = this.queue.length > 0
      ? (more || "").replace("{count}", this.queue.length + 1)
      : (last || "");

    this.panel.drawText(hint, origin.x, this._hintY(rect),
      { font: t.smallFont, color: t.hintColor });

    // 「これ以降は出さない」（v1.7.0）。案内の行の右
    this._placeStopButton().render();

    this._renderPointer(rect);
  };

  /**
   * 説明している項目を四角で囲み、ふきだしから矢印を引く。
   *
   * ★ 囲みと矢印は**ふきだしを描いたあと**に描く。
   *   先に描くと、ふきだしの塗りつぶしで消えてしまう。
   *
   * ★ 矢印はふきだしの角からではなく、いちばん近い辺から出す。
   *   角から出すと、指し先が真下にあるときに斜めに大回りして見える。
   */
  TutorialBox.prototype._renderPointer = function (rect) {
    var target = this._target();
    if (!target) return;

    var P = this.layout.pointer || {};
    var ctx = this.panel.ctx;
    var color = P.color || this.theme.cursorColor || "#ffd75e";

    // 指し先の四角（少し外側に広げて、文字に重ならないようにする）
    var pad = (P.padding === undefined) ? 3 : P.padding;
    var box = {
      x: target.x - pad, y: target.y - pad,
      w: target.w + pad * 2, h: target.h + pad * 2
    };

    // ふきだし側の出発点：指し先に面した辺の真ん中
    var fromX = clamp(box.x + box.w / 2, rect.x + 12, rect.x + rect.w - 12);
    var fromY = (box.y > rect.y + rect.h) ? (rect.y + rect.h) : rect.y;
    // 指し先側の到着点：ふきだしに面した辺の真ん中
    var toX = clamp(rect.x + rect.w / 2, box.x, box.x + box.w);
    var toY = (box.y > rect.y + rect.h) ? box.y : (box.y + box.h);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = P.lineWidth || 2;

    ctx.strokeRect(box.x, box.y, box.w, box.h);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // 矢じり。線の向きに合わせて三角を描く
    var size = P.headSize || 8;
    var angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - 0.4), toY - size * Math.sin(angle - 0.4));
    ctx.lineTo(toX - size * Math.cos(angle + 0.4), toY - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  NS.TutorialBox = TutorialBox;
})(window.MyGame);
