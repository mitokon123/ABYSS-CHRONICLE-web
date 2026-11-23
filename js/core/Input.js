/**
 * Input.js
 * キーボードとマウスの入力を「アクション」に抽象化する。
 * 各シーンはキーコードではなくアクション名（up/down/left/right/confirm/cancel など）で参照する。
 *
 * キー割り当ては data/keys.js から受け取るため、
 * キーを変えたいときはデータファイルを編集するだけでよい（このコードは変更不要）。
 *
 * ▼ マウスについて
 * カーソル位置は「キャンバス上の座標」に直して pointer に入れる。
 * 画面が拡大縮小されていても、data/ui.js に書いた座標とそのまま比べられる。
 *
 *   pointer.x / y   … キャンバス座標
 *   pointer.moved   … このフレームで動いたか（動いたときだけ選択を追わせるため）
 *   pointer.clicked … このフレームで左ボタンを離したか
 *   pointer.down    … 左ボタンを押している最中か（スクロールバーをつまんで動かすのに使う）
 *   pointer.right   … このフレームで右ボタンを押したか（取り消しに使う）
 *   pointer.wheel   … このフレームのホイールの回転量（下向きが正。1回転で±1）
 *   pointer.inside  … カーソルがキャンバスの上にあるか
 *   pointer.touch   … いまの操作が指か（v1.7.0。一覧は1回目のタップで選び、2回目で決定にする）
 *
 * ▼ スマホ（v1.7.0。作者の指定「タップとスワイプ」）
 *   Pointer Events で指もマウスも受ける。指は：
 *     タップ（押して、あまり動かさずに離す） … その場所を「動かして押した」ことにする（moved と clicked）
 *     なぞる（TOUCH_SLOP より動かす）       … 押したことにはせず、縦に動かした分をホイールに直す（SWIPE_STEP ごとに1段）
 *     押している間                          … pointer.down（スクロールバーをつまむのはマウスと同じ）
 *   離したあとは pointer.inside を外す（指はカーソルと違って画面に残らないので、押した所が光り続けないように）。
 *   指で触ったら Input.touchMode が true、キーかマウスを使ったら false（キーの案内を隠すのに使う。NS.isTouchMode）
 *
 * UI部品（CommandMenu / ScrollList）がこれを見て、
 * 「重ねたら選ぶ・押したら決定」を行う。各画面は今までどおりの書き方で動く。
 */
(function (NS) {
  "use strict";

  /**
   * @param {object} keyConfig data/keys.js の内容（bindings / preventDefault）
   * @param {HTMLCanvasElement} [canvas] マウス操作を受け取る画面
   * @param {MyGame.SettingsManager} [settings] ホイールの速さを設定から読むため
   */
  function Input(keyConfig, canvas, settings) {
    this.config = keyConfig || {};
    this.settings = settings || null;
    this._keyMap = buildKeyMap(this.config.bindings);
    this._preventDefault = toLookup(this.config.preventDefault);

    this._down = {};           // 押下中のアクション
    this._pressed = {};        // 「このフレームで押した瞬間」のアクション
    this._pressedBuffer = {};  // 次回 update で確定させる押下バッファ

    this.canvas = canvas || null;
    this.pointer = {
      x: -1, y: -1, moved: false, clicked: false, down: false, right: false, wheel: 0, inside: false
    };
    this._pointerBuffer = { moved: false, clicked: false, right: false, wheel: 0, touchWheel: 0 };
    this._touch = null;          // 触っている指（{ id, startX, startY, lastY, acc, dragged }）
    this._touchReleased = false; // 指を離した（このフレームのあとで inside を外す）
    // 最初の操作のときに呼ぶ（音を鳴らせるようにする。スマホは操作の最中に呼ばないと音が出ない。Game が入れる）
    this.onGesture = null;

    this._bind();
    if (this.canvas) this._bindPointer();
  }

  Input.prototype._bind = function () {
    var self = this;

    window.addEventListener("keydown", function (e) {
      // 名前の入力欄（js/ui/NameInput.js）に打っているキーは、ゲームの操作にしない。
      // Z や矢印が「決定」「移動」として働いたり、preventDefault で文字が打てなくなったりするため
      if (isTextField(e.target)) return;
      var action = self._keyMap[e.code];
      if (!action) return;
      Input.touchMode = false;   // キーを使ったらキーの案内を出す（v1.7.0）
      self._gesture();
      // 押されていない状態からの遷移だけを「押した瞬間」として記録
      if (!self._down[action]) self._pressedBuffer[action] = true;
      self._down[action] = true;
      if (self._preventDefault[e.code]) e.preventDefault();
    });

    window.addEventListener("keyup", function (e) {
      var action = self._keyMap[e.code];
      if (!action) return;
      self._down[action] = false;
    });
  };

  Input.prototype._bindPointer = function () {
    // 指でも触れるよう Pointer Events で受ける（v1.7.0）。無い古いブラウザだけ今までのマウスのまま
    if (window.PointerEvent) { this._bindPointerEvents(); return; }
    var self = this;
    var canvas = this.canvas;

    canvas.addEventListener("mousemove", function (e) {
      self._updatePointerPosition(e);
      self._pointerBuffer.moved = true;
    });

    canvas.addEventListener("mousedown", function (e) {
      self._updatePointerPosition(e);
      if (e.button === 2) self._pointerBuffer.right = true;
      if (e.button === 0) self.pointer.down = true;
    });

    // 「押して離す」で決定にする（押しっぱなしで連続決定しないように）
    canvas.addEventListener("mouseup", function (e) {
      self._updatePointerPosition(e);
      if (e.button === 0) {
        self._pointerBuffer.clicked = true;
        self.pointer.down = false;
      }
    });

    // 画面の外で離されると mouseup が来ないので、window でも見て押しっぱなしを解く
    window.addEventListener("mouseup", function (e) {
      if (e.button === 0) self.pointer.down = false;
    });

    // ホイール。回した量ではなく「何段回したか」に直して扱う
    canvas.addEventListener("wheel", function (e) {
      self._updatePointerPosition(e);
      self._pointerBuffer.wheel += (e.deltaY > 0 ? 1 : -1);
      e.preventDefault();   // ページごとスクロールしないように
    }, { passive: false });

    canvas.addEventListener("mouseleave", function () {
      self.pointer.inside = false;
    });

    // 右クリックのメニューは出さない（取り消しとして使うため）
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  // 指の決まり（v1.7.0）。どちらもキャンバスの座標で
  var TOUCH_SLOP = 12;    // これより動かしたら「なぞった」ことにする（タップにしない）
  var SWIPE_STEP = 22;    // なぞってこれだけ動かすごとに、ホイール1段

  /** マウスと指を Pointer Events で受ける（v1.7.0） */
  Input.prototype._bindPointerEvents = function () {
    var self = this;
    var canvas = this.canvas;
    var buffer = this._pointerBuffer;
    var isMouse = function (e) { return e.pointerType === "mouse"; };

    canvas.addEventListener("pointermove", function (e) {
      if (isMouse(e)) {
        Input.touchMode = false;
        self.pointer.touch = false;
        self._updatePointerPosition(e);
        buffer.moved = true;
        return;
      }
      var t = self._touch;
      if (!t || e.pointerId !== t.id) return;
      self._updatePointerPosition(e);
      var dx = self.pointer.x - t.startX, dy = self.pointer.y - t.startY;
      if (!t.dragged && dx * dx + dy * dy > TOUCH_SLOP * TOUCH_SLOP) {
        t.dragged = true;
        t.lastY = t.startY;   // 押した所から数える（なぞり始めの分も中身を動かす）
      }
      if (t.dragged) {
        // 指を上へ動かすと中身が上へ流れる（ホイールを下へ回したのと同じ）
        t.acc += t.lastY - self.pointer.y;
        while (t.acc >= SWIPE_STEP) { buffer.touchWheel += 1; t.acc -= SWIPE_STEP; }
        while (t.acc <= -SWIPE_STEP) { buffer.touchWheel -= 1; t.acc += SWIPE_STEP; }
      }
      t.lastY = self.pointer.y;
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointerdown", function (e) {
      if (isMouse(e)) {
        self.pointer.touch = false;
        self._updatePointerPosition(e);
        if (e.button === 2) buffer.right = true;
        if (e.button === 0) self.pointer.down = true;
        return;
      }
      Input.touchMode = true;
      if (self._touch) return;   // 2本目の指は見ない
      self._updatePointerPosition(e);
      self._touch = { id: e.pointerId, startX: self.pointer.x, startY: self.pointer.y,
                      lastY: self.pointer.y, acc: 0, dragged: false };
      self.pointer.touch = true;
      self.pointer.down = true;
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 無くてもよい */ } }
      e.preventDefault();
    }, { passive: false });

    // 「押して離す」で決定にする（押しっぱなしで連続決定しないように）
    canvas.addEventListener("pointerup", function (e) {
      if (isMouse(e)) {
        self._updatePointerPosition(e);
        if (e.button === 0) {
          buffer.clicked = true;
          self.pointer.down = false;
        }
        self._gesture();
        return;
      }
      var t = self._touch;
      if (!t || e.pointerId !== t.id) return;
      self._updatePointerPosition(e);
      self.pointer.down = false;
      if (!t.dragged) {
        buffer.moved = true;
        buffer.clicked = true;
      }
      self._touch = null;
      self._touchReleased = true;
      self._gesture();
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointercancel", function (e) {
      if (isMouse(e) || !self._touch || e.pointerId !== self._touch.id) return;
      self.pointer.down = false;
      self._touch = null;
      self._touchReleased = true;
    });

    // 画面の外で離されると pointerup が来ないので、window でも見て押しっぱなしを解く
    window.addEventListener("pointerup", function (e) {
      if (isMouse(e) && e.button === 0) self.pointer.down = false;
    });

    // ホイール。回した量ではなく「何段回したか」に直して扱う
    canvas.addEventListener("wheel", function (e) {
      self._updatePointerPosition(e);
      buffer.wheel += (e.deltaY > 0 ? 1 : -1);
      e.preventDefault();   // ページごとスクロールしないように
    }, { passive: false });

    // 指は離すと pointerleave が来るが、そのフレームの「押した」を消さないよう、マウスのときだけ外す
    canvas.addEventListener("pointerleave", function (e) {
      if (isMouse(e)) self.pointer.inside = false;
    });

    // 右クリック・長押しのメニューは出さない（右クリックは取り消しとして使うため）
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  /** 最初の操作を知らせる（音。Game が onGesture を入れる） */
  Input.prototype._gesture = function () {
    if (this.onGesture) this.onGesture();
  };

  /** 画面上の位置を、キャンバス座標へ直す（拡大縮小されていても合うように） */
  Input.prototype._updatePointerPosition = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this.pointer.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    this.pointer.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    this.pointer.inside = true;
  };

  // フレーム開始時に呼ぶ：押下バッファを「押した瞬間」として確定する
  Input.prototype.update = function () {
    this._pressed = this._pressedBuffer;
    this._pressedBuffer = {};

    this.pointer.moved = this._pointerBuffer.moved;
    this.pointer.clicked = this._pointerBuffer.clicked;
    this.pointer.right = this._pointerBuffer.right;
    // 1段あたり何行動かすかは設定に従う（設定画面の「スクロール速度」）
    // 指でなぞった分は指に合わせて動かしたいので、設定のスクロール速度は掛けない（v1.7.0）
    this.pointer.wheel = this._pointerBuffer.wheel * this.getScrollSpeed() + (this._pointerBuffer.touchWheel || 0);
  };

  /** ホイールを1段回したときに動く行数（設定が無ければ1行） */
  Input.prototype.getScrollSpeed = function () {
    if (!this.settings) return 1;

    var speed = this.settings.get("scrollSpeed");
    return (typeof speed === "number" && speed > 0) ? speed : 1;
  };

  // フレーム終了時に呼ぶ：1フレームだけの印を消す
  Input.prototype.lateUpdate = function () {
    this._pointerBuffer.moved = false;
    this._pointerBuffer.clicked = false;
    this._pointerBuffer.right = false;
    this._pointerBuffer.wheel = 0;
    this._pointerBuffer.touchWheel = 0;
    // 指を離したフレームが済んだら、押した所の光を消す（v1.7.0）
    if (this._touchReleased && !this._touch) {
      this.pointer.inside = false;
      this._touchReleased = false;
    }
  };

  Input.prototype.isDown = function (action) { return !!this._down[action]; };

  /**
   * そのアクションを「今押したか」。
   * 取り消しは右クリックでも行えるようにしてある。
   */
  Input.prototype.isPressed = function (action) {
    if (action === "cancel" && this.pointer.right) return true;
    return !!this._pressed[action];
  };

  /**
   * このフレームで何か操作されたか（どのアクションでも、クリックでも）。
   *
   * 音を鳴らし始めてよいかの判断に使う。ブラウザは
   * 「一度も触られていない画面」では音を鳴らさないため、
   * その1回目を捕まえる必要がある。
   */
  Input.prototype.isAnyPressed = function () {
    for (var action in this._pressed) {
      if (this._pressed[action]) return true;
    }
    return !!(this.pointer && (this.pointer.clicked || this.pointer.right));
  };

  /** カーソルの位置（キャンバス座標） */
  Input.prototype.getPointer = function () { return this.pointer; };

  /**
   * アクションに割り当てられたキーの表示名を返す（設定画面での確認用）。
   * @param {string} action
   * @returns {string[]}
   */
  Input.prototype.getKeyLabels = function (action) {
    var codes = (this.config.bindings || {})[action] || [];
    var labels = this.config.keyLabels || {};
    var result = [];
    for (var i = 0; i < codes.length; i++) {
      result.push(labels[codes[i]] || codes[i]);
    }
    return result;
  };

  // --- 内部ヘルパ ---

  // { アクション: [キーコード] } を { キーコード: アクション } に変換する
  function buildKeyMap(bindings) {
    var map = {};
    bindings = bindings || {};
    for (var action in bindings) {
      if (!Object.prototype.hasOwnProperty.call(bindings, action)) continue;
      var codes = bindings[action] || [];
      for (var i = 0; i < codes.length; i++) map[codes[i]] = action;
    }
    return map;
  }

  /** 文字を打つ欄か（input / textarea / 編集できる要素） */
  function isTextField(target) {
    if (!target) return false;
    var tag = (target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable === true;
  }

  // 配列を { 値: true } の形にする（存在チェックを速くするため）
  function toLookup(list) {
    var lookup = {};
    for (var i = 0; i < (list || []).length; i++) lookup[list[i]] = true;
    return lookup;
  }

  /**
   * 指で遊んでいるか（v1.7.0）。最初は端末の種類で決め（指だけの端末なら true）、
   * そのあとは最後に使ったもの（指 → true、キー・マウス → false）。キーの案内を隠すのに使う
   */
  Input.touchMode = !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  NS.isTouchMode = function () { return Input.touchMode; };

  NS.Input = Input;
})(window.MyGame);
