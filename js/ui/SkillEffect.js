/**
 * SkillEffect.js
 * 技の演出を1つ描く。状態を持たない描画だけの部品。
 *
 * 「いつ・どこで・何色で」は呼び出し側（EffectPlayer）が持ち、
 * ここは「進み具合 0〜1 を渡されたら、その瞬間の絵を描く」だけを行う。
 *
 * 形の種類は data/effects.js の shapes、色は属性の色。
 * 乱数は使わない。粒の向きは番号から決めるので、
 * 何度描いても同じ形になり、ちらつかない。
 *
 * ★ 型を増やすときは SHAPES に関数を1つ足す（他は変更不要）。
 */
(function (NS) {
  "use strict";

  /**
   * 形ごとの描き方。
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} d data/effects.js の1件
   * @param {number} t 進み具合（0〜1）
   * @param {object} p { x, y, color, coreColor, phase }
   *   phase … 0〜1。同じ技を続けて出しても同じ向きにならないためのずらし
   */
  var SHAPES = {
    /** 打つ：輪が広がり、短い線が四方へ散る */
    impact: function (ctx, d, t, p) {
      var alpha = fadeOut(t);
      var radius = (d.radius || 40) * easeOut(t);

      setAlpha(ctx, alpha);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, (d.lineWidth || 3) * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      var rays = d.rays || 6;
      var length = d.rayLength || 18;
      for (var i = 0; i < rays; i++) {
        var angle = turns(i / rays + p.phase);
        var inner = radius * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(angle) * inner, p.y + Math.sin(angle) * inner);
        ctx.lineTo(p.x + Math.cos(angle) * (inner + length * (1 - t)),
                   p.y + Math.sin(angle) * (inner + length * (1 - t)));
        ctx.stroke();
      }

      // 当たった瞬間の芯
      if (t < 0.35) {
        setAlpha(ctx, 1 - t / 0.35);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * (1 - t / 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** 斬る：太い筋が少しずつ遅れて走る */
    slash: function (ctx, d, t, p) {
      var streaks = d.streaks || 3;
      var length = d.length || 90;
      var angle = turns(d.tilt || -0.1);
      var dx = Math.cos(angle);
      var dy = Math.sin(angle);
      // 筋を並べる向き（走る向きと直角）
      var nx = -dy;
      var ny = dx;

      ctx.lineCap = "round";

      for (var i = 0; i < streaks; i++) {
        // 順番に遅れて走らせる
        var sub = span(t, i * 0.16, 0.55);
        if (sub <= 0) continue;

        var offset = (i - (streaks - 1) / 2) * (d.spread || 20);
        var cx = p.x + nx * offset;
        var cy = p.y + ny * offset;

        setAlpha(ctx, fadeOut(sub));
        ctx.strokeStyle = (sub < 0.4) ? p.coreColor : p.color;
        ctx.lineWidth = (d.thickness || 5) * (1 - sub * 0.5);

        // 端から端へ走らせる。前半は伸び、後半は根元が消えていく
        var head = easeOut(Math.min(1, sub * 1.6));
        var tail = Math.max(0, (sub - 0.45) / 0.55);
        ctx.beginPath();
        ctx.moveTo(cx + dx * length * (tail - 0.5), cy + dy * length * (tail - 0.5));
        ctx.lineTo(cx + dx * length * (head - 0.5), cy + dy * length * (head - 0.5));
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /** 弾ける：中心から粒が放射状に飛ぶ */
    burst: function (ctx, d, t, p) {
      var count = d.count || 12;
      var radius = d.radius || 50;
      var reach = radius * easeOut(t);

      setAlpha(ctx, fadeOut(t));
      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        var angle = turns(i / count + p.phase);
        // 粒ごとに飛ぶ距離を変える（そろって見えないように）
        var scatter = 0.65 + wobble(i) * 0.35;
        var size = sizeOf(d, i) * (1 - t * 0.6);
        if (size <= 0) continue;

        ctx.fillRect(p.x + Math.cos(angle) * reach * scatter - size / 2,
                     p.y + Math.sin(angle) * reach * scatter - size / 2,
                     size, size);
      }

      if (t < 0.3) {
        setAlpha(ctx, 1 - t / 0.3);
        ctx.fillStyle = p.coreColor;
        var core = 8 * (1 - t / 0.3);
        ctx.fillRect(p.x - core / 2, p.y - core / 2, core, core);
      }
    },

    /**
     * 閃光：円が一気に広がって、すぐ消える。
     *
     * 他の型と違い、最初から薄れ始める（fadeOut を使わない）。
     * 消えるのが遅いと、ただの濁った円になって相手が見えなくなるため。
     */
    flash: function (ctx, d, t, p) {
      var radius = (d.radius || 60) * easeOut(t);
      var decay = (1 - t) * (1 - t);   // 最初から一気に薄れる

      setAlpha(ctx, decay * (d.alpha === undefined ? 0.45 : d.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // 内側の芯。ここだけは強く光らせて「閃いた」感じを出す
      setAlpha(ctx, Math.max(0, 1 - t * 3));
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    },

    /**
     * 光芒：閃光の一段上。大きく閃いたあと、光の筋が四方へ伸び、輪が外へ抜ける。
     *
     * 閃光（flash）と同じ「最初から薄れる」考え方だが、
     *   ・筋が伸びる（0〜0.7）
     *   ・輪が広がる（0.15〜1）
     *   ・少し遅れてもう一度小さく光る（0.35〜0.65）
     * の3つを重ねて「一発で終わらない」重さを出す。大技の中間くらいの見せ方。
     *   radius / rays / rayLength / ringRadius / alpha は data/effects.js
     */
    radiance: function (ctx, d, t, p) {
      var radius = d.radius || 90;
      var alpha = (d.alpha === undefined) ? 0.5 : d.alpha;

      // 1. 最初の閃き（flash より大きく、少しだけ長く残す）
      var decay = (1 - t) * (1 - t);
      setAlpha(ctx, decay * alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * easeOut(Math.min(1, t * 1.4)), 0, Math.PI * 2);
      ctx.fill();

      setAlpha(ctx, Math.max(0, 1 - t * 2.5));
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.38 * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();

      // 2. 光の筋。ゆっくり回りながら伸び、細くなって消える
      var rays = d.rays || 8;
      var length = d.rayLength || 120;
      var raySub = span(t, 0, 0.7);
      if (raySub > 0) {
        ctx.lineCap = "round";
        for (var i = 0; i < rays; i++) {
          var angle = turns(i / rays + p.phase + t * 0.04);
          // 1本おきに長さを変えて、単調な放射に見せない
          var scale = (i % 2 === 0) ? 1 : 0.62;
          var reach = length * scale * easeOut(raySub);
          setAlpha(ctx, fadeOut(raySub) * 0.9);
          ctx.strokeStyle = (raySub < 0.25) ? p.coreColor : p.color;
          ctx.lineWidth = Math.max(1, (d.rayWidth || 5) * (1 - raySub * 0.7));
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(angle) * radius * 0.2, p.y + Math.sin(angle) * radius * 0.2);
          ctx.lineTo(p.x + Math.cos(angle) * reach, p.y + Math.sin(angle) * reach);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }

      // 3. 外へ抜ける輪
      var ringSub = span(t, 0.15, 0.85);
      if (ringSub > 0) {
        setAlpha(ctx, fadeOut(ringSub) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, (d.ringWidth || 4) * (1 - ringSub));
        ctx.beginPath();
        ctx.arc(p.x, p.y, (d.ringRadius || 130) * easeOut(ringSub), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. 遅れてもう一度、小さく光る（余韻）
      var echo = span(t, 0.35, 0.3);
      if (echo > 0) {
        setAlpha(ctx, (1 - echo) * (1 - echo) * alpha * 0.7);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.55 * easeOut(echo), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 業火（フレイム）：弾ける（burst）の一段上。シャインの radiance と同じ考え方で、
     *   1. 大きく弾ける … 中心が強く光り、火の粉が四方へ飛ぶ
     *   2. 炎の舌 … 相手の足元から、揺れる炎が何本も立ち昇る（3つに1つは accentColor）
     *   3. 外へ抜ける輪と、少し遅れてもう一度小さく弾ける（余韻）
     *   tongues / tongueHeight / tongueWidth … 炎の数・高さ・太さ
     */
    blaze: function (ctx, d, t, p) {
      var radius = d.radius || 80;
      var accent = d.accentColor || p.coreColor;
      var i;

      // 2. 炎の舌（体の下から昇る。先に描いて、弾ける粒を手前に出す）
      var tongues = d.tongues || 7;
      var tongueH = d.tongueHeight || 90;
      var tongueW = d.tongueWidth || 18;
      for (i = 0; i < tongues; i++) {
        var ts = span(t, 0.05 + wobble(i + 3) * 0.25, 0.65);
        if (ts <= 0 || ts >= 1) continue;
        var lane = (i / (tongues - 1 || 1) - 0.5) * radius * 1.3;
        var baseY = p.y + radius * 0.45;
        var h = tongueH * (0.6 + wobble(i + 9) * 0.4) * easeOut(Math.min(1, ts * 1.8)) * (1 - ts * 0.3);
        var w = tongueW * (1 - ts * 0.5);
        var sway = Math.sin((ts * 3 + wobble(i)) * Math.PI * 2) * 6;
        setAlpha(ctx, fadeOut(ts) * 0.8);
        ctx.fillStyle = (i % 3 === 0) ? accent : p.color;
        ctx.beginPath();
        ctx.moveTo(p.x + lane - w / 2, baseY);
        ctx.quadraticCurveTo(p.x + lane - w / 2 + sway, baseY - h * 0.6, p.x + lane + sway * 1.6, baseY - h);
        ctx.quadraticCurveTo(p.x + lane + w / 2 + sway, baseY - h * 0.6, p.x + lane + w / 2, baseY);
        ctx.closePath();
        ctx.fill();
      }

      // 1. 中心の閃き
      if (t < 0.4) {
        var ft = t / 0.4;
        setAlpha(ctx, (1 - ft) * (1 - ft) * 0.6);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.7 * easeOut(ft), 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - ft);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.22 * (1 - ft * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. 四方へ飛ぶ火の粉
      var count = d.count || 26;
      var reach = radius * easeOut(Math.min(1, t * 1.3));
      setAlpha(ctx, fadeOut(t));
      for (i = 0; i < count; i++) {
        var angle = turns(i / count + p.phase);
        var scatter = 0.6 + wobble(i) * 0.4;
        var size = sizeOf(d, i) * (1 - t * 0.6);
        if (size <= 0) continue;
        ctx.fillStyle = (i % 4 === 0) ? accent : p.color;
        ctx.fillRect(p.x + Math.cos(angle) * reach * scatter - size / 2,
                     p.y + Math.sin(angle) * reach * scatter - size / 2 - t * 18, size, size);
      }

      // 3. 外へ抜ける輪
      var ring = span(t, 0.1, 0.7);
      if (ring > 0 && ring < 1) {
        setAlpha(ctx, fadeOut(ring) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, (d.ringWidth || 4) * (1 - ring));
        ctx.beginPath();
        ctx.arc(p.x, p.y, (d.ringRadius || 120) * easeOut(ring), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. 余韻：もう一度小さく弾ける
      var echo = span(t, 0.38, 0.35);
      if (echo > 0 && echo < 1) {
        setAlpha(ctx, (1 - echo) * 0.8);
        ctx.fillStyle = accent;
        for (i = 0; i < 10; i++) {
          var ea = turns(i / 10 + p.phase + 0.05);
          var er = radius * 0.55 * easeOut(echo);
          ctx.fillRect(p.x + Math.cos(ea) * er - 3, p.y + Math.sin(ea) * er - 3, 6, 6);
        }
      }
    },

    /**
     * 大波（ウェーブ）：降りそそぐ（rain）の一段上。
     *   1. 波 … 横から相手へ、白い泡を乗せた弧が打ち寄せる（2枚目が少し遅れて続く）
     *   2. しぶき … 打ち当たったところから、粒が放物線を描いて飛び散る
     *   3. 足元の波紋 … 平たい輪が広がる
     *   waveWidth / waveHeight … 波の幅と高さ   drops … しぶきの数
     */
    surge: function (ctx, d, t, p) {
      var waveW = d.waveWidth || 150;
      var waveH = d.waveHeight || 70;
      var i;

      // 1. 波（2枚）
      ctx.lineCap = "round";
      for (var k = 0; k < 2; k++) {
        var ws = span(t, k * 0.14, 0.55);
        if (ws <= 0 || ws >= 1) continue;
        var dir = (p.phase < 0.5) ? 1 : -1;   // 左右どちらから来るかを、出すたびに変える
        // 相手の手前から、相手を越えるところまで打ち寄せる
        var cx = p.x - dir * waveW * (0.9 - 1.15 * easeOut(ws));
        var top = p.y - waveH * (0.4 + 0.6 * Math.sin(Math.min(1, ws * 1.4) * Math.PI / 2)) + ws * waveH * 0.5;
        var thick = (d.thickness || 12) * (1 - ws * 0.5) * (k === 0 ? 1 : 0.7);
        setAlpha(ctx, fadeOut(ws) * 0.85);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(cx - dir * waveW * 0.5, p.y + waveH * 0.35);
        ctx.quadraticCurveTo(cx - dir * waveW * 0.1, top - waveH * 0.2, cx + dir * waveW * 0.35, top + waveH * 0.15);
        ctx.stroke();
        // 波頭の泡
        setAlpha(ctx, fadeOut(ws));
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = Math.max(1, thick * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx - dir * waveW * 0.05, top - waveH * 0.08);
        ctx.quadraticCurveTo(cx + dir * waveW * 0.15, top - waveH * 0.12, cx + dir * waveW * 0.35, top + waveH * 0.15);
        ctx.stroke();
      }
      ctx.lineCap = "butt";

      // 2. しぶき（波が当たってから）
      var drops = d.drops || 22;
      ctx.fillStyle = p.color;
      for (i = 0; i < drops; i++) {
        var ds = span(t, 0.3 + wobble(i + 5) * 0.15, 0.55);
        if (ds <= 0 || ds >= 1) continue;
        var ang = turns(0.75 + (wobble(i) - 0.5) * 0.45);   // 真上を中心に、扇形に広がる
        var speed = (d.splash || 90) * (0.5 + wobble(i + 11) * 0.5);
        var x = p.x + Math.cos(ang) * speed * ds;
        var y = p.y + Math.sin(ang) * speed * ds + 140 * ds * ds;
        var size = sizeOf(d, i) * (1 - ds * 0.4);
        setAlpha(ctx, fadeOut(ds));
        ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.fillRect(x - size / 2, y - size / 2, size, size * 1.3);
      }

      // 3. 足元の波紋
      var footY = p.y + (d.footY || 30);
      for (i = 0; i < 2; i++) {
        var rs = span(t, 0.3 + i * 0.15, 0.55);
        if (rs <= 0 || rs >= 1) continue;
        var r = (d.rippleRadius || 70) * easeOut(rs);
        setAlpha(ctx, fadeOut(rs) * 0.8);
        ctx.strokeStyle = (rs < 0.25) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, 3 * (1 - rs));
        ctx.beginPath();
        ctx.ellipse(p.x, footY, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    /**
     * 岩の棘（ロックスパイク）：砕ける（shards）の一段上。
     *   1. 棘 … 相手の足元から、尖った岩が何本も突き上がり、しばらく残って崩れる
     *   2. 破片 … 突き上がった勢いで、岩のかけらが飛んで落ちる
     *   3. 土煙 … 足元に平たい輪が広がる
     *   spikes / spikeHeight / spikeWidth … 棘の数・高さ・太さ
     */
    spikes: function (ctx, d, t, p) {
      var footY = p.y + (d.footY || 34);
      var spikes = d.spikes || 5;
      var spikeH = d.spikeHeight || 80;
      var spikeW = d.spikeWidth || 20;
      var i;

      // 3. 土煙（いちばん奥）
      var dust = span(t, 0.05, 0.6);
      if (dust > 0 && dust < 1) {
        setAlpha(ctx, fadeOut(dust) * 0.5);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, (d.dustRadius || 80) * easeOut(dust), 12 * (1 - dust * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. 棘。真ん中ほど高く、外側ほど低く傾く
      for (i = 0; i < spikes; i++) {
        var ss = span(t, Math.abs(i - (spikes - 1) / 2) * 0.05, 0.9);
        if (ss <= 0 || ss >= 1) continue;
        var rel = (i / (spikes - 1 || 1)) - 0.5;
        var h = spikeH * (1 - Math.abs(rel) * 0.8) * (0.85 + wobble(i) * 0.15);
        // 突き上がり（最初の2割）→ 残る → 沈みながら薄れる
        var grow = easeOut(Math.min(1, ss * 5));
        var sink = (ss > 0.6) ? (ss - 0.6) / 0.4 : 0;
        var tipH = h * grow * (1 - sink * 0.6);
        var bx = p.x + rel * (d.spread || 90);
        var lean = rel * 26;
        var w = spikeW * (1 - Math.abs(rel) * 0.3);
        setAlpha(ctx, 1 - sink);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(bx - w / 2, footY);
        ctx.lineTo(bx + lean * grow, footY - tipH);
        ctx.lineTo(bx + w / 2, footY);
        ctx.closePath();
        ctx.fill();
        // 片側を明るくして、岩の面に見せる
        setAlpha(ctx, (1 - sink) * 0.55);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.moveTo(bx - w / 2, footY);
        ctx.lineTo(bx + lean * grow, footY - tipH);
        ctx.lineTo(bx - w / 6, footY);
        ctx.closePath();
        ctx.fill();
      }

      // 2. 破片（突き上がった直後から飛び、落ちる）
      var count = d.count || 16;
      ctx.fillStyle = p.color;
      for (i = 0; i < count; i++) {
        var fs = span(t, 0.08 + wobble(i + 7) * 0.12, 0.7);
        if (fs <= 0 || fs >= 1) continue;
        var ang = turns(0.5 + 0.25 + (wobble(i) - 0.5) * 0.55);   // 上向きに散る
        var speed = (d.radius || 80) * (0.6 + wobble(i + 13) * 0.6);
        var x = p.x + Math.cos(ang) * speed * fs;
        var y = footY - 10 + Math.sin(ang) * speed * fs + (d.gravity || 160) * fs * fs;
        var size = sizeOf(d, i);
        setAlpha(ctx, fadeOut(fs));
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    },

    /** 降りそそぐ：上から粒が落ちてくる */
    rain: function (ctx, d, t, p) {
      var count = d.count || 14;
      var spread = d.spread || 60;
      var height = d.height || 80;

      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        // 1粒ずつ落ち始めをずらす
        var sub = span(t, wobble(i) * 0.45, 0.55);
        if (sub <= 0) continue;

        var lane = (i / (count - 1 || 1)) - 0.5;
        var x = p.x + lane * spread * 2 + wobble(i + 7) * 10 - 5;
        var y = p.y - height + height * easeIn(sub) * 1.6;
        var size = sizeOf(d, i);

        setAlpha(ctx, fadeOut(sub));
        // 落ちるものは少し縦に伸ばす
        ctx.fillRect(x - size / 2, y - size, size, size * 2.2);
      }
    },

    /**
     * 共鳴（RC-1）：技を出した本人のまわりで、力が響き合う。
     *   1. 足元から、平たい響きの輪が何重にも外へ広がる（少しずつ遅れて）
     *   2. 光の粒が本人のまわりを巡りながら、足元から頭の上へ昇る
     *   3. 出した瞬間だけ、体の中心がやわらかく光る
     * 当てる演出ではないので、中心で弾けない。色は技の属性
     *
     * ★ 奥と手前を描き分ける（data/effects.js の layered: true）。
     *   p.layer が "back" のとき … 輪の奥半分と、体の後ろを回っている粒（モンスターより先に描かれる）
     *   p.layer が "front" のとき … 輪の手前半分と、体の前を回っている粒・中心の光
     *   p.layer が無いとき       … 全部（奥と手前を分けない呼び方）
     */
    resonance: function (ctx, d, t, p) {
      var ripples = d.ripples || 3;
      var radius = d.radius || 56;
      var flatten = d.flatten || 0.38;
      var footY = p.y + (d.footY || 26);
      var drawBack = (p.layer !== "front");
      var drawFront = (p.layer !== "back");
      var i;

      // 3. 体の中心のやわらかい光（最初の4割）。体に重なって光るので手前に描く
      var glow = span(t, 0, 0.4);
      if (drawFront && glow > 0 && glow < 1) {
        setAlpha(ctx, 0.35 * (1 - glow));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.45 * (0.6 + 0.4 * easeOut(glow)), 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. 足元から広がる響きの輪
      for (i = 0; i < ripples; i++) {
        var sub = span(t, i * 0.2, 0.55);
        if (sub <= 0 || sub >= 1) continue;
        var r = radius * (0.25 + 0.75 * easeOut(sub));
        setAlpha(ctx, fadeOut(sub) * 0.9);
        ctx.strokeStyle = (sub < 0.2) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, (d.lineWidth || 3) * (1 - sub * 0.6));
        // 楕円の上半分（π〜2π）が奥、下半分（0〜π）が手前
        if (drawBack) {
          ctx.beginPath();
          ctx.ellipse(p.x, footY, r, r * flatten, 0, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        if (drawFront) {
          ctx.beginPath();
          ctx.ellipse(p.x, footY, r, r * flatten, 0, 0, Math.PI);
          ctx.stroke();
        }
      }

      // 2. まわりを巡りながら昇る光の粒
      var motes = d.motes || 8;
      var orbit = d.orbit || 30;
      var rise = d.rise || 34;
      var spin = d.turns || 1;
      ctx.fillStyle = p.color;
      for (i = 0; i < motes; i++) {
        var ms = span(t, (i % 3) * 0.08, 0.84);
        if (ms <= 0 || ms >= 1) continue;
        var angle = turns(i / motes + ms * spin + p.phase);
        // sin が負（楕円の上側）を回っている粒は体の後ろ、正なら体の前
        var behind = Math.sin(angle) < 0;
        if ((behind && !drawBack) || (!behind && !drawFront)) continue;
        var mx = p.x + Math.cos(angle) * orbit;
        var my = footY + Math.sin(angle) * orbit * flatten - rise * 1.6 * easeOut(ms);
        var size = sizeOf(d, i);
        // 出てくるときはふわっと、最後は薄れて消える
        var a = ms < 0.15 ? ms / 0.15 : fadeOut((ms - 0.15) / 0.85);
        setAlpha(ctx, a);
        ctx.fillRect(mx - size / 2, my - size / 2, size, size);
      }
    },

    /**
     * 息：中心で吐き出された煙が、左右へもくもくと広がる（どくのいき・火の息・奈落の息）。
     *
     *   1. 煙の玉 … 中心から左右へ流れながら膨らみ、薄れて消える（3つに1つは accentColor）
     *   2. 粒     … 煙の中から昇る。particle で形を選ぶ
     *                "bubble"（既定）… 輪の泡（毒）／ "spark" … 四角い火の粉（火・闇）
     *   3. 芯     … 吐き出した瞬間だけ、中心が濃く光る
     *   lift … 煙が昇る高さ（火は熱で高く昇る）
     * 並び全体に1回だけ出す型（data/skills.js の effectAt: "center"）。
     */
    miasma: function (ctx, d, t, p) {
      var spread = d.spread || 240;
      var height = d.height || 60;
      var lift = (d.lift === undefined) ? 12 : d.lift;
      var accent = d.accentColor || p.color;
      var particleColor = d.particleColor || accent;
      var i;

      // 1. 煙の玉。左右交互に振り分け、届く距離をばらけさせる
      var puffs = d.count || 16;
      for (i = 0; i < puffs; i++) {
        var sub = span(t, wobble(i) * 0.25, 0.75);
        if (sub <= 0) continue;

        var dir = (i % 2 === 0) ? 1 : -1;
        var reach = spread * (0.1 + wobble(i + 5) * 0.9);
        var x = p.x + dir * reach * easeOut(sub);
        var y = p.y + (wobble(i + 9) - 0.5) * height * easeOut(sub) - sub * lift;
        var r = sizeOf(d, i) * (0.45 + easeOut(sub) * 0.9);

        setAlpha(ctx, fadeOut(sub) * 0.42);
        ctx.fillStyle = (i % 3 === 0) ? accent : p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. 粒。煙が広がってから、あちこちで昇る
      var bubbles = d.bubbles || 12;
      var spark = (d.particle === "spark");
      ctx.strokeStyle = particleColor;
      ctx.fillStyle = particleColor;
      ctx.lineWidth = 1.5;
      for (i = 0; i < bubbles; i++) {
        var bs = span(t, 0.2 + wobble(i + 21) * 0.45, 0.35);
        if (bs <= 0) continue;

        var bx = p.x + (wobble(i + 31) - 0.5) * spread * 1.7;
        var by = p.y + height * 0.35 - easeOut(bs) * height;
        var br = (2 + wobble(i + 41) * 3) * (d.particleScale || 1);

        setAlpha(ctx, fadeOut(bs) * 0.9);
        if (spark) {
          // 火の粉：小さな四角が揺れながら昇り、だんだん小さくなる
          var sz = br * (1 - bs * 0.6);
          var sway = Math.sin((bs + wobble(i + 51)) * Math.PI * 4) * 4;
          ctx.fillRect(bx + sway - sz / 2, by - sz / 2, sz, sz);
        } else {
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 3. 吐き出した瞬間の芯
      if (t < 0.25) {
        setAlpha(ctx, (1 - t / 0.25) * 0.7);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22 * (0.6 + t * 1.6), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 全体の風（ゲイル）：並び全体を、風の筋が左から右へ駆け抜ける。
     *   1. 風の筋 … 少しずつ遅れて横切る、ゆるく曲がった線
     *   2. つむじ風 … 相手ひとりずつの足元から、平たい輪が回りながら昇る
     *   3. 舞う粒 … 筋と一緒に流れながら上下に揺れる
     * 並び全体に1回だけ出す型（data/skills.js の effectAt: "center"）。相手の位置は p.points
     */
    galeSweep: function (ctx, d, t, p) {
      var spread = d.spread || 260;
      var height = d.height || 70;
      var points = pointsOf(p);
      var i, k;

      // 1. 風の筋
      var streaks = d.streaks || 9;
      ctx.lineCap = "round";
      for (i = 0; i < streaks; i++) {
        var sub = span(t, wobble(i) * 0.35, 0.55);
        if (sub <= 0 || sub >= 1) continue;
        var y = p.y + (wobble(i + 13) - 0.5) * height;
        var len = (d.streakLength || 150) * (0.6 + wobble(i + 17) * 0.4);
        var head = -spread - len + (spread * 2 + len * 2) * easeOut(sub);
        var tail = head - len;
        var bend = (wobble(i + 23) - 0.5) * 22;
        setAlpha(ctx, fadeOut(sub) * 0.85);
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, (d.thickness || 4) * (1 - sub * 0.5));
        ctx.beginPath();
        ctx.moveTo(p.x + tail, y);
        ctx.quadraticCurveTo(p.x + (head + tail) / 2, y + bend, p.x + head, y);
        ctx.stroke();
      }

      // 2. つむじ風
      var rings = d.rings || 3;
      for (k = 0; k < points.length; k++) {
        for (i = 0; i < rings; i++) {
          var rs = span(t, 0.12 + k * 0.06 + i * 0.1, 0.6);
          if (rs <= 0 || rs >= 1) continue;
          var r = (d.swirlRadius || 40) * (1 - rs * 0.4) * (1 - i * 0.15);
          var cy = points[k].y + 30 - rs * (d.rise || 60) - i * 14;
          var start = turns(rs * 1.5 + i * 0.3 + p.phase);
          setAlpha(ctx, fadeOut(rs) * 0.9);
          ctx.strokeStyle = (rs < 0.25) ? p.coreColor : p.color;
          ctx.lineWidth = Math.max(1, (d.lineWidth || 3) * (1 - rs * 0.5));
          ctx.beginPath();
          ctx.ellipse(points[k].x, cy, r, r * 0.3, 0, start, start + Math.PI * 1.4);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";

      // 3. 舞う粒
      var count = d.count || 18;
      ctx.fillStyle = p.color;
      for (i = 0; i < count; i++) {
        var ps = span(t, 0.1 + wobble(i + 31) * 0.4, 0.5);
        if (ps <= 0 || ps >= 1) continue;
        var px = p.x - spread + spread * 2 * easeOut(ps) + (wobble(i + 37) - 0.5) * 60;
        var py = p.y + (wobble(i + 41) - 0.5) * height + Math.sin((ps + wobble(i)) * Math.PI * 3) * 10;
        var size = sizeOf(d, i);
        setAlpha(ctx, fadeOut(ps));
        ctx.fillRect(px - size / 2, py - size / 2, size, size * 0.6);
      }
    },

    /**
     * 真空の刃（しんくうは）：相手ひとりずつへ、三日月の風の刃が飛んでいって切る。
     *   1. 刃 … 左から三日月形の刃が滑ってきて、相手の上で消える（相手ごとに stagger ずつ遅れる）
     *   2. 切り口 … 刃が届いたところに、細い斜めの線が走る
     *   3. 吸い込み … 切った跡へ空気が吸い込まれる。輪と粒が外から内へ縮む（真空）
     *   travel … 刃が飛ぶ距離   bladeRadius … 刃の大きさ   pullRadius … 吸い込みの輪の大きさ
     */
    vacuumWave: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var stagger = (d.stagger === undefined) ? 0.08 : d.stagger;
      var travel = d.travel || 220;
      var br = d.bladeRadius || 44;
      var pull = d.pullRadius || 60;
      var i, k;
      ctx.lineCap = "round";

      for (k = 0; k < points.length; k++) {
        var tx = points[k].x, ty = points[k].y;
        var lag = k * stagger;

        // 1. 刃（")" の形。内と外の2本で厚みを出す）
        var bs = span(t, lag, 0.36);
        if (bs > 0 && bs < 1) {
          var bx = tx - travel * (1 - easeOut(bs));
          var by = ty - 10 * (1 - bs);
          var a = (bs > 0.8) ? (1 - bs) / 0.2 : 1;
          var j;
          for (j = 0; j < 3; j++) {
            setAlpha(ctx, a * (j === 0 ? 0.95 : 0.4 - j * 0.12));
            ctx.strokeStyle = (j === 0) ? p.coreColor : p.color;
            ctx.lineWidth = (d.thickness || 7) * (1 - j * 0.3);
            ctx.beginPath();
            // 後ろに残像を2つ引く
            ctx.arc(bx - br * 0.6 - j * 26, by, br * (1 - j * 0.08), -0.95, 0.95);
            ctx.stroke();
          }
        }

        // 2. 切り口
        var cs = span(t, lag + 0.3, 0.3);
        if (cs > 0 && cs < 1) {
          var len = (d.cutLength || 100) * easeOut(Math.min(1, cs * 2));
          setAlpha(ctx, fadeOut(cs));
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = Math.max(1, 4 * (1 - cs));
          ctx.beginPath();
          ctx.moveTo(tx - len * 0.5, ty + len * 0.22);
          ctx.lineTo(tx + len * 0.5, ty - len * 0.22);
          ctx.stroke();
        }

        // 3. 吸い込み（輪が外から内へ縮む）
        for (i = 0; i < 2; i++) {
          var ps = span(t, lag + 0.34 + i * 0.1, 0.36);
          if (ps <= 0 || ps >= 1) continue;
          var r = pull * (1 - easeIn(ps)) + 4;
          setAlpha(ctx, Math.min(1, ps * 4) * (1 - ps) * 0.9);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = d.lineWidth || 3;
          ctx.beginPath();
          ctx.ellipse(tx, ty, r, r * 0.55, -0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
        var count = d.count || 8;
        ctx.fillStyle = p.color;
        for (i = 0; i < count; i++) {
          var qs = span(t, lag + 0.34 + wobble(i + k * 7) * 0.12, 0.4);
          if (qs <= 0 || qs >= 1) continue;
          var ang = turns(wobble(i + k * 11 + 5));
          var dist = pull * 1.3 * (1 - easeIn(qs));
          var size = sizeOf(d, i);
          setAlpha(ctx, fadeOut(qs));
          ctx.fillRect(tx + Math.cos(ang) * dist - size / 2, ty + Math.sin(ang) * dist * 0.6 - size / 2, size, size);
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 稲妻斬り：斜めに一閃 → 切り口へ稲妻が落ちる → 火花が散る。
     *   1. 一閃 … 太い筋が1本、右上から左下へ走る（slash の1本ぶん）
     *   2. 稲妻 … 一閃が走り切ったところで、相手の上から切り口の真ん中へ落ちる（明滅して消える）
     *   3. 火花 … 落ちたところから、短い線が放射状に散る
     *   length / thickness / tilt … 一閃   boltAt … 稲妻が落ち始める時刻（0〜1）   height / jag … 稲妻
     */
    thunderSlash: function (ctx, d, t, p) {
      var i;
      var angle = turns(d.tilt === undefined ? 0.36 : d.tilt);
      var dx = Math.cos(angle), dy = Math.sin(angle);
      var length = d.length || 130;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 1. 一閃
      var ss = span(t, 0, 0.42);
      if (ss > 0 && ss < 1) {
        var head = easeOut(Math.min(1, ss * 1.8));
        var tail = Math.max(0, (ss - 0.4) / 0.6);
        var layers = [[p.color, d.thickness || 10, 0.85], [p.coreColor, (d.thickness || 10) * 0.4, 1]];
        for (i = 0; i < layers.length; i++) {
          setAlpha(ctx, fadeOut(ss) * layers[i][2]);
          ctx.strokeStyle = layers[i][0];
          ctx.lineWidth = layers[i][1] * (1 - ss * 0.4);
          ctx.beginPath();
          ctx.moveTo(p.x + dx * length * (tail - 0.5), p.y + dy * length * (tail - 0.5));
          ctx.lineTo(p.x + dx * length * (head - 0.5), p.y + dy * length * (head - 0.5));
          ctx.stroke();
        }
      }

      // 2. 稲妻
      var boltAt = (d.boltAt === undefined) ? 0.3 : d.boltAt;
      var bs = span(t, boltAt, 0.5);
      if (bs > 0 && bs < 1) {
        var segs = d.segments || 6;
        var jag = d.jag || 26;
        var top = p.y - (d.height || 150);
        var reach = easeOut(Math.min(1, bs * 6));
        var vis = (bs < 0.3) ? 1 : ((Math.floor(bs * 14) % 2 === 0) ? 0.8 : 0.3) * fadeOut(bs);
        var flick = Math.floor(t * 10);
        var path = [];
        for (var s = 0; s <= segs; s++) {
          var f = s / segs;
          if (f > reach) break;
          var off = (s === 0 || s === segs) ? 0 : (wobble(s * 13 + flick * 7) - 0.5) * jag;
          path.push({ x: p.x + off, y: top + (p.y - top) * f });
        }
        if (path.length >= 2) {
          var bl = [[p.color, d.boltWidth || 7, 0.8], [p.coreColor, 2.5, 1]];
          for (i = 0; i < bl.length; i++) {
            setAlpha(ctx, vis * bl[i][2]);
            ctx.strokeStyle = bl[i][0];
            ctx.lineWidth = bl[i][1] * (1 - bs * 0.4);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (var q = 1; q < path.length; q++) ctx.lineTo(path[q].x, path[q].y);
            ctx.stroke();
          }
        }
        // 落ちた瞬間、切り口が丸く光る
        if (reach >= 1) {
          var gl = span(bs, 0.15, 0.5);
          if (gl > 0 && gl < 1) {
            setAlpha(ctx, (1 - gl) * 0.7);
            ctx.fillStyle = p.coreColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (d.glowRadius || 26) * (0.5 + gl * 0.8), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. 火花
      var sparks = d.sparks || 9;
      for (i = 0; i < sparks; i++) {
        var ks = span(t, boltAt + 0.1 + wobble(i + 5) * 0.08, 0.4);
        if (ks <= 0 || ks >= 1) continue;
        var a = turns(wobble(i + 9));
        var r0 = 10 + (d.sparkRadius || 46) * easeOut(ks) * 0.4;
        var r1 = 10 + (d.sparkRadius || 46) * easeOut(ks);
        setAlpha(ctx, fadeOut(ks));
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 2.5 * (1 - ks * 0.6);
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
        ctx.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 全体の闇（ダークネビュラ）：並び全体を、渦を巻く闇の雲が呑み込む。
     *   1. 雲 … 平たい楕円の上を回りながら、外から内へ縮んでいく（呑み込む）
     *   2. 沈む闇 … 相手ひとりずつに、濃い闇の玉が広がって包む
     *   3. 星 … 雲の中で、小さな光が瞬いて消える（星雲）
     *   accentColor … 雲の3つに1つと沈む闇の色（濃い闇色）  starColor … 星の色
     */
    nebula: function (ctx, d, t, p) {
      var spread = d.spread || 260;
      var height = d.height || 90;
      var accent = d.accentColor || p.color;
      var points = pointsOf(p);
      var i, k;

      // 2. 沈む闇（雲より先に描いて、雲の下に沈んで見せる）
      for (k = 0; k < points.length; k++) {
        var ds = span(t, 0.2 + k * 0.05, 0.65);
        if (ds <= 0 || ds >= 1) continue;
        var cr = (d.coreRadius || 38) * easeOut(ds);
        setAlpha(ctx, fadeOut(ds) * 0.55);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(points[k].x, points[k].y, cr, cr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, fadeOut(ds) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3 * (1 - ds));
        ctx.beginPath();
        ctx.ellipse(points[k].x, points[k].y, cr * 1.2, cr * 1.0, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 1. 渦を巻く雲
      var puffs = d.count || 28;
      for (i = 0; i < puffs; i++) {
        var sub = span(t, wobble(i) * 0.2, 0.8);
        if (sub <= 0 || sub >= 1) continue;
        var angle = turns(i / puffs + sub * (d.turns || 0.35) + p.phase);
        var shrink = 1 - easeIn(sub) * 0.45;
        var reach = 0.55 + wobble(i + 5) * 0.45;
        var x = p.x + Math.cos(angle) * spread * reach * shrink;
        var y = p.y + Math.sin(angle) * height * 0.5 * reach * shrink;
        var r = sizeOf(d, i) * (0.5 + easeOut(Math.min(1, sub * 2)) * 0.7);
        var a = (sub < 0.2) ? sub / 0.2 : fadeOut((sub - 0.2) / 0.8);
        // 半分を濃い闇色にして、明るい泡ではなく「暗い雲」に見せる
        var dark = (i % 2 === 0);
        setAlpha(ctx, a * (dark ? 0.5 : 0.28));
        ctx.fillStyle = dark ? accent : p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 星の瞬き（十字の小さな光）
      var stars = d.stars || 16;
      ctx.fillStyle = d.starColor || p.coreColor;
      for (i = 0; i < stars; i++) {
        var ss = span(t, 0.15 + wobble(i + 21) * 0.55, 0.3);
        if (ss <= 0 || ss >= 1) continue;
        var sx = p.x + (wobble(i + 27) - 0.5) * spread * 1.8;
        var sy = p.y + (wobble(i + 33) - 0.5) * height;
        var sz = (3 + wobble(i + 39) * 3) * (1 - Math.abs(ss - 0.5) * 2);
        setAlpha(ctx, 1 - Math.abs(ss - 0.5) * 2);
        ctx.fillRect(sx - sz, sy - 0.75, sz * 2, 1.5);
        ctx.fillRect(sx - 0.75, sy - sz, 1.5, sz * 2);
      }
    },

    /**
     * 全体の雷（ボルト）：相手ひとりずつに稲妻が落ち、並び全体が白く光る。
     *   1. 閃き … 落ちた瞬間、並び全体の帯が光る
     *   2. 稲妻 … 上から相手へ、ジグザグの光が少しずつ遅れて落ち、明滅して消える（枝分かれつき）
     *   3. 火花 … 落ちたところから四方へ散る
     *   height … 稲妻の長さ（相手の上どこから落ちるか）  stagger … 相手ごとの遅れ
     */
    thunderstorm: function (ctx, d, t, p) {
      var spread = d.spread || 260;
      var height = d.height || 170;
      var stagger = (d.stagger === undefined) ? 0.08 : d.stagger;
      var points = pointsOf(p);
      var i, k, s;

      // 1. 並び全体の閃き
      var flash = span(t, 0.04, 0.35);
      if (flash > 0 && flash < 1) {
        // 角のある帯だと箱に見えるので、ふちの柔らかい横長の楕円にする
        var fa = (1 - flash) * (1 - flash) * (d.alpha === undefined ? 0.3 : d.alpha);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, spread);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, fa);
        ctx.fillStyle = grad;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, height * 0.45 / spread);
        ctx.translate(-p.x, -p.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, spread, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. 稲妻
      var segs = d.segments || 7;
      var jag = d.jag || 34;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (k = 0; k < points.length; k++) {
        var bs = span(t, k * stagger, 0.5);
        if (bs <= 0 || bs >= 1) continue;
        // 落ちきるまで（最初の2割）は先端が伸びる。そのあとは明滅しながら消える
        var reach = easeOut(Math.min(1, bs * 5));
        var vis = (bs < 0.3) ? 1 : ((Math.floor(bs * 14) % 2 === 0) ? 0.75 : 0.25) * fadeOut(bs);
        var flick = Math.floor(t * 10);   // 明滅のたびに少し形を変える
        var bx = points[k].x;
        var by = points[k].y;
        var top = by - height;
        var path = [];
        for (s = 0; s <= segs; s++) {
          var f = s / segs;
          if (f > reach) break;
          var off = (s === 0 || s === segs) ? 0 : (wobble(k * 31 + s + flick * 7) - 0.5) * jag;
          path.push({ x: bx + off, y: top + (by - top) * f });
        }
        if (path.length < 2) continue;

        var layers = [
          { color: p.color, width: d.boltWidth || 7, alpha: 0.8 },
          { color: p.coreColor, width: 2.5, alpha: 1 }
        ];
        for (var l = 0; l < layers.length; l++) {
          setAlpha(ctx, vis * layers[l].alpha);
          ctx.strokeStyle = layers[l].color;
          ctx.lineWidth = layers[l].width * (1 - bs * 0.4);
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (s = 1; s < path.length; s++) ctx.lineTo(path[s].x, path[s].y);
          ctx.stroke();
          // 枝分かれ。真ん中あたりから斜めに短く
          var mid = path[Math.min(path.length - 1, Math.floor(segs / 2))];
          if (path.length > segs / 2 + 1) {
            var dir = (wobble(k + 61) < 0.5) ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(mid.x, mid.y);
            ctx.lineTo(mid.x + dir * jag * 0.8, mid.y + height * 0.12);
            ctx.lineTo(mid.x + dir * jag * 1.1, mid.y + height * 0.24);
            ctx.stroke();
          }
        }

        // 3. 火花（落ちきってから）
        var sp = span(bs, 0.2, 0.8);
        if (sp > 0 && sp < 1) {
          var sparks = d.sparks || 8;
          ctx.fillStyle = (sp < 0.3) ? p.coreColor : p.color;
          setAlpha(ctx, fadeOut(sp));
          for (i = 0; i < sparks; i++) {
            var ang = turns(i / sparks + p.phase + k * 0.13);
            var dist = (d.sparkRadius || 40) * easeOut(sp) * (0.6 + wobble(i + k * 5) * 0.4);
            var sz = 4 * (1 - sp * 0.6);
            ctx.fillRect(bx + Math.cos(ang) * dist - sz / 2,
                         by + Math.sin(ang) * dist * 0.6 + sp * sp * 20 - sz / 2, sz, sz);
          }
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * --- 技の大幅追加（2026-10-20）で足した型 ---
     */

    /** 交差する斬撃（二連斬り）：2本の太い筋が × の字に、少しずらして走る。交わったところが光る */
    crossSlash: function (ctx, d, t, p) {
      var length = d.length || 110;
      var thick = d.thickness || 8;
      var tilt = (d.tilt === undefined) ? 0.125 : d.tilt;
      var delay = (d.delay === undefined) ? 0.2 : d.delay;
      ctx.lineCap = "round";
      for (var i = 0; i < 2; i++) {
        var sub = span(t, i * delay, 0.55);
        if (sub <= 0 || sub >= 1) continue;
        var a = turns((i === 0 ? tilt : 0.5 - tilt) + (p.phase - 0.5) * 0.03);
        var dx = Math.cos(a), dy = Math.sin(a);
        // 先端が先に走り、尾があとから追いつく
        var head = -length / 2 + length * easeOut(Math.min(1, sub * 1.7));
        var tail = -length / 2 + length * easeIn(sub);
        var layers = [[p.color, thick], [p.coreColor, thick * 0.35]];
        for (var l = 0; l < layers.length; l++) {
          setAlpha(ctx, fadeOut(sub));
          ctx.strokeStyle = layers[l][0];
          ctx.lineWidth = Math.max(1, layers[l][1] * (1 - sub * 0.6));
          ctx.beginPath();
          ctx.moveTo(p.x + dx * tail, p.y + dy * tail);
          ctx.lineTo(p.x + dx * head, p.y + dy * head);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      // 2本目が交わった瞬間の光
      var f = span(t, delay + 0.12, 0.3);
      if (f > 0 && f < 1) {
        setAlpha(ctx, 1 - f);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + 10 * (1 - f), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 火炎斬り：三日月の太刀筋が右上から左下へ走る。走った跡から炎の舌が立ち昇り、火の粉が舞う
     */
    flameSlash: function (ctx, d, t, p) {
      var radius = d.radius || 92;
      var width = d.width || 22;
      // 円弧の中心は当たる位置の右下。弧の真ん中が相手に重なる
      var cx = p.x + radius * 0.7, cy = p.y + radius * 0.7;
      var from = turns(0.77 + (p.phase - 0.5) * 0.03), to = turns(0.48 + (p.phase - 0.5) * 0.03);
      var i;

      // 1. 炎の舌。太刀筋が通ったところから順に立つ
      var flames = d.flames || 9;
      for (i = 0; i < flames; i++) {
        var fr = (flames > 1) ? i / (flames - 1) : 0.5;
        var fs = span(t, 0.08 + fr * 0.2, 0.62);
        if (fs <= 0 || fs >= 1) continue;
        var fa = from + (to - from) * fr;
        var bx = cx + Math.cos(fa) * radius, by = cy + Math.sin(fa) * radius;
        var h = (d.flameHeight || 48) * (0.6 + wobble(i + 3) * 0.6) * easeOut(Math.min(1, fs * 1.6));
        var w = (11 + wobble(i + 11) * 9) * (1 - fs * 0.55);
        var sway = Math.sin(fs * 7 + i * 1.7) * 7 * fs;
        var lift = 14 * easeIn(fs);
        setAlpha(ctx, fadeOut(fs));
        // 外の炎と、内の明るいところ
        for (var l = 0; l < 2; l++) {
          var scale = (l === 0) ? 1 : 0.5;
          ctx.fillStyle = (l === 0) ? p.color : p.coreColor;
          ctx.beginPath();
          ctx.moveTo(bx - w * scale, by - lift);
          ctx.quadraticCurveTo(bx - w * scale * 0.7, by - lift - h * scale * 0.55, bx + sway, by - lift - h * scale);
          ctx.quadraticCurveTo(bx + w * scale * 0.7, by - lift - h * scale * 0.55, bx + w * scale, by - lift);
          ctx.quadraticCurveTo(bx, by - lift + w * scale * 0.7, bx - w * scale, by - lift);
          ctx.fill();
        }
      }

      // 2. 太刀筋
      var ss = span(t, 0, 0.48);
      if (ss > 0 && ss < 1) {
        var head = easeOut(Math.min(1, ss * 1.7));
        var tail = easeIn(ss);
        crescent(ctx, cx, cy, radius, from + (to - from) * tail, from + (to - from) * head,
                 width * (1 - ss * 0.35), fadeOut(ss), p.color);
        crescent(ctx, cx, cy, radius, from + (to - from) * tail, from + (to - from) * head,
                 width * 0.42 * (1 - ss * 0.35), fadeOut(ss), p.coreColor);
      }

      // 3. 火の粉
      var embers = d.embers || 12;
      ctx.fillStyle = p.color;
      for (i = 0; i < embers; i++) {
        var es = span(t, 0.2 + wobble(i + 5) * 0.25, 0.55);
        if (es <= 0 || es >= 1) continue;
        var ea = from + (to - from) * wobble(i + 17);
        var size = sizeOf(d, i) * (1 - es * 0.5);
        setAlpha(ctx, fadeOut(es));
        ctx.fillRect(cx + Math.cos(ea) * radius + (wobble(i + 23) - 0.5) * 40 * es - size / 2,
                     cy + Math.sin(ea) * radius - 86 * easeOut(es) * (0.5 + wobble(i + 29) * 0.5) - size / 2,
                     size, size);
      }
    },

    /**
     * 流水斬り：水の帯がS字に流れて斬る。薄い帯が2本、少し遅れて同じ道を追いかける。しぶきは飛んでから落ちる
     */
    flowSlash: function (ctx, d, t, p) {
      var length = d.length || 184;
      var amplitude = d.amplitude || 30;
      var width = d.width || 16;
      var angle = turns(0.12 + (p.phase - 0.5) * 0.03);
      var dx = Math.cos(angle), dy = Math.sin(angle);
      var nx = -dy, ny = dx;
      var i, s;

      // 帯の上の点。r は 0〜1（左上から右下へ）
      function at(r, shift) {
        var along = (r - 0.5) * length;
        var side = Math.sin(r * Math.PI * 2) * amplitude + shift;
        return { x: p.x + dx * along + nx * side, y: p.y + dy * along + ny * side };
      }

      var bands = [
        { lag: 0.2,  shift: 18,  scale: 0.45, alpha: 0.55, color: p.color },
        { lag: 0.12, shift: -16, scale: 0.55, alpha: 0.7,  color: p.color },
        { lag: 0,    shift: 0,   scale: 1,    alpha: 1,    color: p.color },
        { lag: 0,    shift: 0,   scale: 0.34, alpha: 1,    color: p.coreColor }
      ];
      var segs = 22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var b = 0; b < bands.length; b++) {
        var band = bands[b];
        var ss = span(t, band.lag, 0.56);
        if (ss <= 0 || ss >= 1) continue;
        var head = easeOut(Math.min(1, ss * 1.5));
        var tail = easeIn(ss);
        setAlpha(ctx, fadeOut(ss) * band.alpha);
        ctx.strokeStyle = band.color;
        // 太さが真ん中でふくらむように、短い線を太さを変えながらつなぐ
        for (s = 0; s < segs; s++) {
          var r0 = tail + (head - tail) * s / segs;
          var r1 = tail + (head - tail) * (s + 1) / segs;
          if (r1 <= r0) continue;
          var a = at(r0, band.shift), c = at(r1, band.shift);
          ctx.lineWidth = Math.max(1, width * band.scale * Math.sin(Math.PI * (s + 0.5) / segs) * (1 - ss * 0.3));
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";

      // しぶき。帯の途中から外へ飛んで、落ちる。丸い雫
      var drops = d.drops || 16;
      for (i = 0; i < drops; i++) {
        var ds = span(t, 0.12 + wobble(i + 7) * 0.26, 0.6);
        if (ds <= 0 || ds >= 1) continue;
        var start = at(0.15 + wobble(i + 13) * 0.7, 0);
        var out = (wobble(i + 19) < 0.5 ? -1 : 1) * (22 + wobble(i + 25) * 52) * easeOut(ds);
        var size = sizeOf(d, i) * (1 - ds * 0.35);
        setAlpha(ctx, fadeOut(ds));
        ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.beginPath();
        ctx.arc(start.x + nx * out, start.y + ny * out - 18 * Math.sin(ds * Math.PI) + (d.gravity || 110) * ds * ds,
                size / 2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 疾風斬り：細く鋭い筋が速く3本走る（向きを変えて右、左、右）。切り口から風の線が横へ流れる
     */
    galeSlash: function (ctx, d, t, p) {
      var length = d.length || 190;
      var width = d.width || 7;
      var strikes = [
        { at: 0,    tilt: 0.09,  shift: -12 },
        { at: 0.13, tilt: 0.41,  shift: 8 },
        { at: 0.26, tilt: 0.03,  shift: 2 }
      ];
      var i;

      // 風の線。少し曲がりながら左から右へ抜ける
      var gusts = d.gusts || 9;
      ctx.lineCap = "round";
      ctx.strokeStyle = p.color;
      for (i = 0; i < gusts; i++) {
        var gs = span(t, 0.08 + wobble(i + 2) * 0.32, 0.5);
        if (gs <= 0 || gs >= 1) continue;
        var y = p.y + (wobble(i + 41) - 0.5) * 118;
        var span0 = 118 + wobble(i + 43) * 60;
        var head = -span0 + span0 * 2 * easeOut(gs);
        var tail = -span0 + span0 * 2 * easeIn(gs);
        setAlpha(ctx, fadeOut(gs) * 0.75);
        ctx.lineWidth = 1.5 + wobble(i + 47) * 2;
        ctx.beginPath();
        ctx.moveTo(p.x + tail, y);
        ctx.quadraticCurveTo(p.x + (head + tail) / 2, y - 14 * (i % 2 === 0 ? 1 : -1), p.x + head, y);
        ctx.stroke();
      }

      // 鋭い筋。両端がとがった形で、一瞬で伸びて消える
      for (i = 0; i < strikes.length; i++) {
        var strike = strikes[i];
        var ss = span(t, strike.at, 0.34);
        if (ss <= 0 || ss >= 1) continue;
        var a = turns(strike.tilt + (p.phase - 0.5) * 0.03);
        var dx = Math.cos(a), dy = Math.sin(a);
        var cx = p.x - dy * strike.shift, cy = p.y + dx * strike.shift;
        var front = (easeOut(Math.min(1, ss * 2)) - 0.5) * length;
        var back = (easeIn(ss) - 0.5) * length;
        var layers = [[p.color, width], [p.coreColor, width * 0.4]];
        setAlpha(ctx, fadeOut(ss));
        for (var l = 0; l < layers.length; l++) {
          var half = layers[l][1] / 2 * (1 - ss * 0.4);
          var mid = (front + back) / 2;
          ctx.fillStyle = layers[l][0];
          ctx.beginPath();
          ctx.moveTo(cx + dx * back, cy + dy * back);
          ctx.lineTo(cx + dx * mid - dy * half, cy + dy * mid + dx * half);
          ctx.lineTo(cx + dx * front, cy + dy * front);
          ctx.lineTo(cx + dx * mid + dy * half, cy + dy * mid - dx * half);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 岩砕斬り：太い一撃が真上から落ちる。当たると ひびが走り、角ばった岩のかけらが飛んで落ちる
     */
    rockSlash: function (ctx, d, t, p) {
      var length = d.length || 170;
      var width = d.width || 30;
      var hitAt = 0.2;
      var i;
      var lean = (p.phase - 0.5) * 0.12;
      var topX = p.x + 18 + lean * length, topY = p.y - length * 0.68;
      var endX = p.x - 8 - lean * length, endY = p.y + length * 0.3;

      // 1. 一撃。上から伸びて、当たったあとは細くなって消える
      var ss = span(t, 0, 0.42);
      if (ss > 0 && ss < 1) {
        var grow = easeIn(Math.min(1, ss / (hitAt / 0.42)));
        var fade = (ss < 0.5) ? 1 : (1 - ss) / 0.5;
        var layers = [[p.color, width], [p.coreColor, width * 0.36]];
        setAlpha(ctx, fade);
        for (var l = 0; l < layers.length; l++) {
          // 上がとがり、下の方がいちばん太い刃の形
          var half = layers[l][1] / 2 * (1 - ss * 0.55);
          var ex = topX + (endX - topX) * grow, ey = topY + (endY - topY) * grow;
          var wideX = topX + (ex - topX) * 0.74, wideY = topY + (ey - topY) * 0.74;
          ctx.fillStyle = layers[l][0];
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(wideX + half, wideY);
          ctx.lineTo(ex, ey);
          ctx.lineTo(wideX - half, wideY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 2. 当たった瞬間の光と、地を打つ輪
      var hs = span(t, hitAt, 0.5);
      if (hs > 0 && hs < 1) {
        setAlpha(ctx, Math.max(0, 1 - hs * 2.5));
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(endX, endY - 8, 26 * (1 - hs * 0.6), 0, Math.PI * 2);
        ctx.fill();

        setAlpha(ctx, fadeOut(hs) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 7 * (1 - hs));
        ctx.beginPath();
        ctx.ellipse(endX, endY, 96 * easeOut(hs), 26 * easeOut(hs), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. ひび。当たったところから折れ線で伸びる
      var cs = span(t, hitAt, 0.7);
      if (cs > 0 && cs < 1) {
        var cracks = d.cracks || 6;
        ctx.strokeStyle = p.color;
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        setAlpha(ctx, (cs > 0.6) ? (1 - cs) / 0.4 : 1);
        for (i = 0; i < cracks; i++) {
          var ang = turns(i / cracks + 0.04 + p.phase * 0.1);
          var len = (d.crackLength || 62) * (0.55 + wobble(i + 9) * 0.45) * easeOut(Math.min(1, cs * 3));
          var bend = (wobble(i + 15) - 0.5) * 0.9;
          ctx.beginPath();
          ctx.moveTo(endX, endY - 10);
          ctx.lineTo(endX + Math.cos(ang) * len * 0.5, endY - 10 + Math.sin(ang) * len * 0.5);
          ctx.lineTo(endX + Math.cos(ang + bend) * len, endY - 10 + Math.sin(ang + bend) * len);
          ctx.stroke();
        }
        ctx.lineJoin = "miter";
      }

      // 4. 岩のかけら。角ばった四角が回りながら飛び、落ちる
      var rocks = d.rocks || 12;
      for (i = 0; i < rocks; i++) {
        var rs = span(t, hitAt + wobble(i + 31) * 0.06, 0.74);
        if (rs <= 0 || rs >= 1) continue;
        var ra = turns(0.5 + (i + 0.5) / rocks * 0.5);   // 上半分へ扇形に飛ぶ
        var speed = 72 + wobble(i + 37) * 76;
        var rx = endX + Math.cos(ra) * speed * easeOut(rs);
        var ry = endY - 8 + Math.sin(ra) * speed * easeOut(rs) + (d.gravity || 170) * rs * rs;
        var size = sizeOf(d, i);
        setAlpha(ctx, (rs > 0.75) ? (1 - rs) / 0.25 : 1);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(rs * 5 * (i % 2 === 0 ? 1 : -1) + i);
        ctx.fillStyle = (i % 4 === 0) ? p.coreColor : p.color;
        ctx.fillRect(-size / 2, -size / 2, size, size * 0.8);
        ctx.restore();
      }
    },

    /**
     * 烈火崩地斬（火と地の混合）：相手ひとりずつに、次の順で出す。並び全体に1回だけ出す型で、相手の位置は p.points。
     *   1. 一閃 … 炎の太い筋が右上から左下へ斬り下ろす
     *   2. 地割れ … 足元からジグザグのひびが左右へ走る（地の色）
     *   3. 噴き上げ … ひびから岩のかけら（地の色）と火の粉（火の色）が昇る。岩は落ちてくる
     */
    blazingRift: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var stagger = (d.stagger === undefined) ? 0.07 : d.stagger;
      var earth = d.earthColor || p.color;
      var length = d.length || 190;
      var thick = d.thickness || 14;
      var angle = turns(d.tilt || 0.17);
      var dx = Math.cos(angle), dy = Math.sin(angle);
      var width = d.crackWidth || 120;
      var rise = d.rise || 96;
      var i, k;

      ctx.lineCap = "round";
      for (k = 0; k < points.length; k++) {
        var tx = points[k].x, ty = points[k].y;
        var groundY = ty + (d.groundY || 48);
        var lag = k * stagger;

        // 1. 一閃（先端が先に走り、尾があとから追いつく）
        var ss = span(t, lag, 0.34);
        if (ss > 0 && ss < 1) {
          var head = length * easeOut(Math.min(1, ss * 1.7)) - length / 2;
          var tail = length * easeIn(ss) - length / 2;
          var layers = [[p.color, thick], [p.coreColor, thick * 0.35]];
          for (i = 0; i < layers.length; i++) {
            setAlpha(ctx, fadeOut(ss));
            ctx.strokeStyle = layers[i][0];
            ctx.lineWidth = Math.max(1, layers[i][1] * (1 - ss * 0.5));
            ctx.beginPath();
            ctx.moveTo(tx - dx * tail, ty + dy * tail);
            ctx.lineTo(tx - dx * head, ty + dy * head);
            ctx.stroke();
          }
        }

        // 2. 地割れ（左右へ折れ線が伸び、あとで薄れる）
        var cs = span(t, lag + 0.2, 0.62);
        if (cs > 0 && cs < 1) {
          var reach = width * easeOut(Math.min(1, cs * 2.2));
          setAlpha(ctx, (cs > 0.65) ? (1 - cs) / 0.35 : 1);
          ctx.strokeStyle = earth;
          ctx.lineWidth = 5;
          for (var side = -1; side <= 1; side += 2) {
            var steps = 5;
            ctx.beginPath();
            ctx.moveTo(tx, groundY);
            for (i = 1; i <= steps; i++) {
              var r = reach * i / steps;
              ctx.lineTo(tx + side * r, groundY + (i % 2 === 0 ? -1 : 1) * (4 + wobble(i + k * 3 + (side > 0 ? 9 : 0)) * 7));
            }
            ctx.stroke();
          }
        }

        // 3. 噴き上げ：岩のかけら（放物線で昇って落ちる）
        var rocks = d.rocks || 8;
        ctx.fillStyle = earth;
        for (i = 0; i < rocks; i++) {
          var rs = span(t, lag + 0.22 + wobble(i + k * 5) * 0.08, 0.6);
          if (rs <= 0 || rs >= 1) continue;
          var rockX = tx + (wobble(i + k * 13 + 2) - 0.5) * width * 1.3 * easeOut(rs);
          var rockY = groundY - rise * (0.6 + wobble(i + 21) * 0.6) * 4 * rs * (1 - rs);
          var rockSize = sizeOf(d, i) * 1.3;
          setAlpha(ctx, (rs > 0.8) ? (1 - rs) / 0.2 : 1);
          ctx.fillRect(rockX - rockSize / 2, rockY - rockSize / 2, rockSize, rockSize);
        }

        // 3. 噴き上げ：火の粉（まっすぐ昇って消える）
        var embers = d.embers || 12;
        ctx.fillStyle = p.color;
        for (i = 0; i < embers; i++) {
          var es = span(t, lag + 0.24 + wobble(i + k * 9 + 4) * 0.2, 0.5);
          if (es <= 0 || es >= 1) continue;
          var emberX = tx + (wobble(i + k * 17 + 6) - 0.5) * width * 1.5;
          var emberY = groundY - rise * 1.5 * easeOut(es) * (0.5 + wobble(i + 31) * 0.5);
          var emberSize = sizeOf(d, i) * (1 - es * 0.5);
          setAlpha(ctx, fadeOut(es));
          ctx.fillRect(emberX - emberSize / 2, emberY - emberSize / 2, emberSize, emberSize);
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 激突（捨て身の体当たり）：打つ（impact）の重い版。
     * 衝撃の輪が2重に広がり、中心からひびが走り、かけらが飛んで落ちる
     */
    crash: function (ctx, d, t, p) {
      var radius = d.radius || 70;
      var i;
      // 衝撃の輪
      for (i = 0; i < 2; i++) {
        var s = span(t, i * 0.12, 0.6);
        if (s <= 0 || s >= 1) continue;
        var r = radius * easeOut(s) * (1 - i * 0.2);
        setAlpha(ctx, fadeOut(s));
        ctx.strokeStyle = (i === 0) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, (d.lineWidth || 6) * (1 - s));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // ひび。中心から折れ曲がりながら伸びる
      var cracks = d.cracks || 7;
      var cs = span(t, 0, 0.35);
      if (cs > 0) {
        setAlpha(ctx, fadeOut(t));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        for (i = 0; i < cracks; i++) {
          var ang = turns(i / cracks + p.phase);
          var len = (d.crackLength || 48) * (0.6 + wobble(i) * 0.4) * easeOut(cs);
          var bend = (wobble(i + 7) - 0.5) * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(ang) * len * 0.5, p.y + Math.sin(ang) * len * 0.5);
          ctx.lineTo(p.x + Math.cos(ang + bend) * len, p.y + Math.sin(ang + bend) * len);
          ctx.stroke();
        }
        ctx.lineJoin = "miter";
      }
      // かけら
      var count = d.count || 14;
      ctx.fillStyle = p.color;
      for (i = 0; i < count; i++) {
        var ps = span(t, 0.05, 0.9);
        var a2 = turns(i / count + p.phase + 0.03);
        var sp = (d.radius || 70) * (0.7 + wobble(i + 13) * 0.5);
        var x = p.x + Math.cos(a2) * sp * easeOut(ps);
        var y = p.y + Math.sin(a2) * sp * easeOut(ps) * 0.6 + (d.gravity || 140) * ps * ps;
        var size = sizeOf(d, i);
        setAlpha(ctx, fadeOut(ps));
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      // 当たった瞬間の大きな芯
      if (t < 0.3) {
        setAlpha(ctx, 1 - t / 0.3);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16 * (1 - t / 0.3) + 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 力をためる（ちからため）：まわりから粒が体の中心へ吸い込まれ、輪がすぼまっていき、
     * 最後に体がどくんと脈打つ
     */
    gather: function (ctx, d, t, p) {
      var radius = d.radius || 84;
      var i;
      // 吸い込まれる粒（尾を引く）
      var count = d.count || 18;
      ctx.lineCap = "round";
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.3, 0.5);
        if (s <= 0 || s >= 1) continue;
        var ang = turns(i / count + p.phase);
        var r = radius * (1 - easeIn(s));
        var r2 = r + 14 * (1 - s);
        setAlpha(ctx, (s < 0.2 ? s / 0.2 : 1) * 0.9);
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.lineWidth = sizeOf(d, i) * 0.7;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ang) * r2, p.y + Math.sin(ang) * r2 * 0.8);
        ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // すぼまる輪
      var rings = d.rings || 3;
      for (i = 0; i < rings; i++) {
        var rs = span(t, i * 0.14, 0.5);
        if (rs <= 0 || rs >= 1) continue;
        var rr = radius * (1 - easeOut(rs)) + 6;
        setAlpha(ctx, rs < 0.3 ? rs / 0.3 : 1 - (rs - 0.3) / 0.7);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 + 2 * rs;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rr, rr * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 脈打つ（ためきった瞬間）
      var pulse = span(t, 0.68, 0.32);
      if (pulse > 0 && pulse < 1) {
        setAlpha(ctx, (1 - pulse) * 0.8);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 + 26 * easeOut(pulse), 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - pulse);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 * (1 - pulse) + 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 守りを砕く（鎧くずし）：相手の前に六角の盾が浮かび、ひびが入って、かけらになって落ちる。
     * 色は下がる能力（防御の青。data/effects.js の statColors）
     */
    shatter: function (ctx, d, t, p) {
      var R = d.radius || 46;
      var sides = 6;
      var i;
      var appear = span(t, 0, 0.28);
      var brk = span(t, 0.32, 0.68);
      // 当たった瞬間の芯
      if (t < 0.22) {
        setAlpha(ctx, 1 - t / 0.22);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 * (1 - t / 0.22) + 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (brk <= 0) {
        // 盾が現れ、ひびが走る
        var scale = 0.8 + 0.2 * easeOut(appear);
        setAlpha(ctx, appear * 0.25);
        ctx.fillStyle = p.color;
        polygonPath(ctx, p.x, p.y, R * scale, sides, 0, 1);
        ctx.fill();
        setAlpha(ctx, appear);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        polygonPath(ctx, p.x, p.y, R * scale, sides, 0, 1);
        ctx.stroke();
        var crack = span(t, 0.16, 0.16);
        if (crack > 0) {
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x - R * 0.5 * crack, p.y - R * 0.7 * crack);
          ctx.lineTo(p.x + 4, p.y - 4);
          ctx.lineTo(p.x - 6, p.y + 8);
          ctx.lineTo(p.x + R * 0.4 * crack, p.y + R * 0.75 * crack);
          ctx.stroke();
        }
        return;
      }
      // かけら。六角を6枚の三角に分けて、外へ飛ばしながら落とす
      for (i = 0; i < sides; i++) {
        var a0 = turns(i / sides), a1 = turns((i + 1) / sides), am = (a0 + a1) / 2;
        var fly = (d.fly || 40) * easeOut(brk) * (0.7 + wobble(i) * 0.6);
        var ox = Math.cos(am) * fly;
        var oy = Math.sin(am) * fly * 0.6 + (d.gravity || 120) * brk * brk;
        var rot = (wobble(i + 5) - 0.5) * 2.4 * brk;
        ctx.save();
        ctx.translate(p.x + ox, p.y + oy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a0) * R * 0.92, Math.sin(a0) * R * 0.92);
        ctx.lineTo(Math.cos(a1) * R * 0.92, Math.sin(a1) * R * 0.92);
        ctx.closePath();
        setAlpha(ctx, fadeOut(brk) * 0.3);
        ctx.fillStyle = p.color;
        ctx.fill();
        setAlpha(ctx, fadeOut(brk));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    },

    /**
     * 針（しびれ針）：細い針が横から突き刺さり、刺さったところから小さな稲妻が散る
     */
    needle: function (ctx, d, t, p) {
      var len = d.length || 70;
      var thrust = span(t, 0, 0.25);
      var i;
      // 針（刺さったら少し残って消える）
      if (t < 0.55) {
        var tipX = p.x - 12 + 12 * easeOut(thrust);
        var tailX = tipX - len * (0.4 + 0.6 * (1 - easeOut(thrust)) * 0.5);
        setAlpha(ctx, t < 0.4 ? 1 : 1 - (t - 0.4) / 0.15);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tailX - len * (1 - easeOut(thrust)), p.y - 4);
        ctx.lineTo(tipX, p.y);
        ctx.stroke();
      }
      // 刺さったところから散る小さな稲妻
      var sparks = d.sparks || 6;
      var ss = span(t, 0.2, 0.8);
      if (ss <= 0) return;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      for (i = 0; i < sparks; i++) {
        var flick = (Math.floor(ss * 12 + i) % 3 === 0) ? 0.3 : 1;
        var ang = turns(i / sparks + p.phase);
        var r0 = 6 + 20 * easeOut(ss);
        var seg = (d.sparkLength || 16) * (1 - ss * 0.5);
        var x0 = p.x + Math.cos(ang) * r0, y0 = p.y + Math.sin(ang) * r0;
        var nx = -Math.sin(ang), ny = Math.cos(ang);
        setAlpha(ctx, fadeOut(ss) * flick);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(ang) * seg * 0.5 + nx * 5, y0 + Math.sin(ang) * seg * 0.5 + ny * 5);
        ctx.lineTo(x0 + Math.cos(ang) * seg * 0.6 - nx * 4, y0 + Math.sin(ang) * seg * 0.6 - ny * 4);
        ctx.lineTo(x0 + Math.cos(ang) * seg, y0 + Math.sin(ang) * seg);
        ctx.stroke();
      }
      ctx.lineJoin = "miter";
    },

    /**
     * 守りの障壁（シールド・堅守の陣）：体のまわりに六角の障壁が立ち上がり、光の帯が斜めに走って、
     * 薄れながら消える
     */
    barrier: function (ctx, d, t, p) {
      var R = d.radius || 52;
      var grow = span(t, 0, 0.3);
      var scale = 0.65 + 0.35 * easeOut(grow);
      var a = (t < 0.3) ? grow : fadeOut((t - 0.3) / 0.7);
      var i;
      // 面（ごく薄く）
      setAlpha(ctx, a * 0.18);
      ctx.fillStyle = p.color;
      polygonPath(ctx, p.x, p.y, R * scale, 6, turns(1 / 12), 1.15);
      ctx.fill();
      // ふち（二重）
      for (i = 0; i < 2; i++) {
        setAlpha(ctx, a * (i === 0 ? 1 : 0.5));
        ctx.strokeStyle = (i === 0) ? p.color : p.coreColor;
        ctx.lineWidth = (i === 0) ? 3 : 1.5;
        polygonPath(ctx, p.x, p.y, R * scale * (1 - i * 0.12), 6, turns(1 / 12), 1.15);
        ctx.stroke();
      }
      // 光の帯（障壁の中を斜めに走る）
      var sweep = span(t, 0.25, 0.4);
      if (sweep > 0 && sweep < 1) {
        ctx.save();
        polygonPath(ctx, p.x, p.y, R * scale, 6, turns(1 / 12), 1.15);
        ctx.clip();
        var sx = p.x - R * 1.4 + R * 2.8 * easeOut(sweep);
        setAlpha(ctx, (1 - sweep) * 0.7);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(sx - 20, p.y + R * 1.3);
        ctx.lineTo(sx + 20, p.y - R * 1.3);
        ctx.stroke();
        ctx.restore();
      }
      // 角に灯る光
      var corner = span(t, 0.2, 0.5);
      if (corner > 0 && corner < 1) {
        ctx.fillStyle = p.coreColor;
        for (i = 0; i < 6; i++) {
          var ang = turns(i / 6 + 1 / 12);
          setAlpha(ctx, (1 - Math.abs(corner - 0.5) * 2) * a);
          ctx.fillRect(p.x + Math.cos(ang) * R * scale - 2.5, p.y + Math.sin(ang) * R * scale * 1.15 - 2.5, 5, 5);
        }
      }
    },

    /**
     * 奮い立つ（ブレイブ・鼓舞の舞）：足元に輪が広がり、矢じりの形（＾）が何列も昇っていく
     */
    rally: function (ctx, d, t, p) {
      var i;
      var rise = d.rise || 70;
      // 足元の輪
      var gs = span(t, 0, 0.5);
      if (gs > 0 && gs < 1) {
        var gr = (d.radius || 40) * easeOut(gs);
        setAlpha(ctx, 1 - gs);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 34, gr, gr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 昇る矢じり
      var count = d.count || 9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 0; i < count; i++) {
        var s = span(t, (i % 3) * 0.1 + Math.floor(i / 3) * 0.16, 0.5);
        if (s <= 0 || s >= 1) continue;
        var lane = ((i % 3) - 1) * (d.laneGap || 22) + (wobble(i) - 0.5) * 6;
        var y = p.y + 30 - rise * easeOut(s);
        var w = (d.chevron || 9) * (1 - s * 0.3);
        setAlpha(ctx, fadeOut(s));
        ctx.strokeStyle = (s < 0.25) ? p.coreColor : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x + lane - w, y + w * 0.8);
        ctx.lineTo(p.x + lane, y);
        ctx.lineTo(p.x + lane + w, y + w * 0.8);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 疾く（ヘイスト）：体のまわりを、横向きの速い筋が右から左へ何本も駆け抜け、足元で輪が回る
     */
    haste: function (ctx, d, t, p) {
      var i;
      var count = d.streaks || 8;
      var width = d.width || 120;
      ctx.lineCap = "round";
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.4, 0.4);
        if (s <= 0 || s >= 1) continue;
        var y = p.y + (wobble(i + 3) - 0.5) * (d.height || 70);
        var len = 30 + wobble(i + 9) * 30;
        var head = p.x + width / 2 - width * easeOut(s);
        setAlpha(ctx, fadeOut(s) * 0.9);
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 2 + wobble(i + 5) * 2;
        ctx.beginPath();
        ctx.moveTo(head, y);
        ctx.lineTo(head + len, y);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 足元で回る輪
      var rs = span(t, 0.1, 0.8);
      if (rs > 0 && rs < 1) {
        var start = turns(rs * 2 + p.phase);
        setAlpha(ctx, fadeOut(rs));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 30, d.radius || 36, (d.radius || 36) * 0.3, 0, start, start + Math.PI * 1.3);
        ctx.stroke();
      }
    },

    /**
     * 咆哮（ハウリング・威圧の咆哮）：中心から、平たい音の輪が何重にも広がる。
     * 輪のふちに小さなとげを付けて、ただの波紋より荒々しく見せる。
     *   radius / flatten … どこまで広がるか・つぶれ具合（威圧の咆哮は並び全体に届くよう大きく）
     */
    roar: function (ctx, d, t, p) {
      var waves = d.waves || 4;
      var radius = d.radius || 80;
      var flatten = (d.flatten === undefined) ? 0.7 : d.flatten;
      var spikes = d.spikes || 14;
      var i, k;
      for (i = 0; i < waves; i++) {
        var s = span(t, i * 0.12, 0.6);
        if (s <= 0 || s >= 1) continue;
        var r = radius * easeOut(s);
        setAlpha(ctx, fadeOut(s) * (1 - i * 0.12));
        ctx.strokeStyle = (s < 0.2) ? p.coreColor : p.color;
        ctx.lineWidth = Math.max(1, (d.lineWidth || 5) * (1 - s * 0.7));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * flatten, 0, 0, Math.PI * 2);
        ctx.stroke();
        // ふちのとげ
        ctx.beginPath();
        for (k = 0; k < spikes; k++) {
          var ang = turns(k / spikes + i * 0.03 + p.phase);
          var cx = Math.cos(ang), cy = Math.sin(ang);
          ctx.moveTo(p.x + cx * r, p.y + cy * r * flatten);
          ctx.lineTo(p.x + cx * (r + 10 * (1 - s)), p.y + cy * (r + 10 * (1 - s)) * flatten);
        }
        ctx.stroke();
      }
    },

    /**
     * エレメントバリア（v1.8.0）：上から光の幕が降りて体を包み、ゆらめいてから粒になって消える。帯と粒が7属性の色。
     * 幕のふちには7色の光の粒が並んで巡る
     */
    elementBarrier: function (ctx, d, t, p) {
      var w = d.width || 70;
      var h = d.height || 96;
      var colors = d.colors || [p.color];
      var strips = d.strips || colors.length;
      var drop = easeOut(span(t, 0, 0.35));
      var a = (t < 0.35) ? drop : fadeOut((t - 0.35) / 0.65);
      var i;
      var top = p.y - h / 2 - 20 * (1 - drop);
      var bottom = top + h * drop;
      for (i = 0; i < strips; i++) {
        var f = strips > 1 ? i / (strips - 1) : 0.5;
        var x = p.x - w / 2 + w * f;
        var sway = Math.sin(turns(t * 1.5 + f * 0.8 + p.phase)) * 5;
        var edge = 1 - Math.abs(f - 0.5) * 1.2;
        setAlpha(ctx, a * 0.45 * edge);
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + sway, (top + bottom) / 2, x - sway * 0.5, bottom);
        ctx.stroke();
        setAlpha(ctx, a * 0.5 * edge);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // 幕のふち（上の弧）と、そこを巡る7色の粒
      setAlpha(ctx, a * 0.9);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, top, w / 2 + 4, 10, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      for (i = 0; i < colors.length; i++) {
        var ang = turns(i / colors.length + t * 0.6 + p.phase);
        setAlpha(ctx, a);
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * (w / 2 + 4), top + Math.sin(ang) * 10, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 消えぎわの粒（7色）
      var count = d.count || 14;
      for (i = 0; i < count; i++) {
        var s = span(t, 0.45 + wobble(i) * 0.25, 0.3);
        if (s <= 0 || s >= 1) continue;
        var px = p.x + (wobble(i + 4) - 0.5) * w;
        var py = p.y + (wobble(i + 8) - 0.5) * h * 0.8 - 24 * s;
        var size = sizeOf(d, i);
        setAlpha(ctx, 1 - s);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    },

    /**
     * リフレクト（v1.8.0）：六角の鏡の板が外から集まって体を球に包む → 光の筋が板の上を斜めに走る → 薄れて消える
     */
    reflectWall: function (ctx, d, t, p) {
      var R = d.radius || 52;
      var n = d.panels || 10;
      var ps = d.panelSize || 15;
      var gather = easeOut(span(t, 0, 0.4));
      var a = (t < 0.4) ? gather : fadeOut((t - 0.4) / 0.6);
      var sweep = span(t, 0.35, 0.4);
      var i, k;
      function hex(x, y, r) {
        ctx.beginPath();
        for (k = 0; k < 6; k++) {
          var q = turns(k / 6 + 1 / 12);
          if (k === 0) ctx.moveTo(x + Math.cos(q) * r, y + Math.sin(q) * r * 0.9);
          else ctx.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r * 0.9);
        }
        ctx.closePath();
      }
      for (i = 0; i < n; i++) {
        var ang = turns(i / n + p.phase * 0.2);
        var dist = R + (1 - gather) * 70;
        var x = p.x + Math.cos(ang) * dist;
        var y = p.y + Math.sin(ang) * dist * 0.85;
        // 光の筋が通っている板は明るい
        var along = (Math.cos(ang) + 1) / 2;
        var lit = (sweep > 0 && sweep < 1) ? Math.max(0, 1 - Math.abs(along - sweep) * 4) : 0;
        setAlpha(ctx, a * (0.35 + 0.4 * lit));
        ctx.fillStyle = p.color;
        hex(x, y, ps);
        ctx.fill();
        setAlpha(ctx, a * (0.7 + 0.3 * lit));
        ctx.strokeStyle = lit > 0.3 ? (d.accentColor || p.coreColor) : p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // 球の輪郭
      setAlpha(ctx, a * 0.5);
      ctx.strokeStyle = d.accentColor || p.coreColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R + ps * 0.6, (R + ps * 0.6) * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    /**
     * リバーサル（v1.8.0）：足元から赤い気が立ち昇る → 体の前で刃のような弧が2本、× に交差して止まる → 外へ棘が光る
     */
    reversal: function (ctx, d, t, p) {
      var R = d.radius || 48;
      var i;
      // 1. 立ち昇る気
      var rise = span(t, 0, 0.6);
      for (i = 0; i < 9; i++) {
        var rs = span(rise, wobble(i + 1800) * 0.4, 0.6);
        if (rs <= 0 || rs >= 1) continue;
        var x = p.x + (wobble(i + 1810) - 0.5) * R * 1.6;
        var y0 = p.y + R * 0.9;
        setAlpha(ctx, (1 - rs) * 0.8);
        ctx.strokeStyle = (i % 3 === 0) ? (d.accentColor || p.coreColor) : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y0 - rs * R * 1.6);
        ctx.lineTo(x, y0 - rs * R * 1.6 + 18);
        ctx.stroke();
      }
      // 2. × に交差する2本の弧
      var cs = span(t, 0.2, 0.45);
      var hold = (t < 0.65) ? 1 : fadeOut((t - 0.65) / 0.35);
      if (cs > 0) {
        var grow = easeOut(Math.min(1, cs));
        ctx.lineCap = "round";
        for (var side = -1; side <= 1; side += 2) {
          var from = turns(side > 0 ? 0.62 : 0.88), to = from + side * turns(0.25) * grow;
          setAlpha(ctx, hold * 0.6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.arc(p.x + side * R * 0.35, p.y, R * 0.9, Math.min(from, to), Math.max(from, to));
          ctx.stroke();
          setAlpha(ctx, hold);
          ctx.strokeStyle = d.accentColor || p.coreColor;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      // 3. 外へ光る棘
      var ss = span(t, 0.45, 0.4);
      if (ss > 0 && ss < 1) {
        var m = d.spikes || 10;
        for (i = 0; i < m; i++) {
          var q = turns(i / m + p.phase * 0.3);
          var r0 = R * (0.9 + 0.2 * easeOut(ss)), r1 = r0 + 14 * (1 - ss);
          setAlpha(ctx, 1 - ss);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(q) * r0, p.y + Math.sin(q) * r0 * 0.85);
          ctx.lineTo(p.x + Math.cos(q) * r1, p.y + Math.sin(q) * r1 * 0.85);
          ctx.stroke();
        }
      }
    },

    /**
     * はね返した瞬間（v1.8.0）：返した側の前で六角の板がはじけて光り、矢じりが撃った側の向き（d の direction）へ飛ぶ
     */
    reflectBounce: function (ctx, d, t, p) {
      var R = d.radius || 40;
      var dir = p.direction || 1;
      var i, k;
      var fs = span(t, 0, 0.5);
      if (fs < 1) {
        setAlpha(ctx, 1 - fs);
        ctx.strokeStyle = d.accentColor || p.coreColor;
        ctx.lineWidth = 4 * (1 - fs) + 1;
        var r = R * (0.6 + 0.6 * easeOut(fs));
        ctx.beginPath();
        for (k = 0; k < 6; k++) {
          var q = turns(k / 6 + 1 / 12);
          if (k === 0) ctx.moveTo(p.x + Math.cos(q) * r, p.y + Math.sin(q) * r);
          else ctx.lineTo(p.x + Math.cos(q) * r, p.y + Math.sin(q) * r);
        }
        ctx.closePath();
        ctx.stroke();
        setAlpha(ctx, (1 - fs) * 0.35);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      var n = d.arrows || 5;
      for (i = 0; i < n; i++) {
        var as = span(t, 0.1 + i * 0.05, 0.6);
        if (as <= 0 || as >= 1) continue;
        var spread = (i - (n - 1) / 2) * 16;
        var ay = p.y - dir * (20 + 90 * easeOut(as));
        var ax = p.x + spread * (1 + as);
        setAlpha(ctx, 1 - as);
        ctx.strokeStyle = (i % 2) ? p.color : (d.accentColor || p.coreColor);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ax - 9, ay + dir * 9);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax + 9, ay + dir * 9);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 封じの輪（サイレス）：体のまわりに印の付いた輪が浮かび、回りながら締まって、× の字で閉じる
     */
    sealRing: function (ctx, d, t, p) {
      var R = d.radius || 58;
      var marks = d.marks || 8;
      var close = span(t, 0, 0.55);
      var r = R * (1 - 0.45 * easeIn(close));
      var a = (t < 0.15) ? t / 0.15 : fadeOut(t);
      var rot = turns(close * 0.5 + p.phase);
      var i;
      setAlpha(ctx, a);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 輪の上の印（小さなひし形）
      ctx.fillStyle = p.coreColor;
      for (i = 0; i < marks; i++) {
        var ang = rot + turns(i / marks);
        var mx = p.x + Math.cos(ang) * r, my = p.y + Math.sin(ang) * r * 0.85;
        ctx.beginPath();
        ctx.moveTo(mx, my - 5);
        ctx.lineTo(mx + 4, my);
        ctx.lineTo(mx, my + 5);
        ctx.lineTo(mx - 4, my);
        ctx.closePath();
        ctx.fill();
      }
      // 締まりきったら × で閉じる
      var x = span(t, 0.5, 0.5);
      if (x > 0 && x < 1) {
        var s = 22 * easeOut(Math.min(1, x * 3));
        setAlpha(ctx, fadeOut(x));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y - s);
        ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s);
        ctx.lineTo(p.x - s, p.y + s);
        ctx.stroke();
        ctx.lineCap = "butt";
      }
    },

    /**
     * 呪いの印（不吉な舞）：頭の上に暗い輪が浮かび、そこから細い影がしたたり落ち、
     * 体のまわりを黒い靄が巻きながら沈んでいく
     */
    hex: function (ctx, d, t, p) {
      var i;
      var accent = d.accentColor || p.color;
      var headY = p.y - (d.headOffset || 46);
      // 頭の上の輪
      var rs = span(t, 0, 0.4);
      var ra = (t < 0.4) ? rs : fadeOut((t - 0.4) / 0.6);
      setAlpha(ctx, ra);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, headY, 22 * (0.6 + 0.4 * easeOut(rs)), 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      // したたる影
      var drips = d.drips || 7;
      for (i = 0; i < drips; i++) {
        var s = span(t, 0.2 + wobble(i) * 0.35, 0.45);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 3) - 0.5) * 36;
        var y = headY + 4 + easeIn(s) * (d.fall || 80);
        setAlpha(ctx, fadeOut(s));
        ctx.fillStyle = (i % 2 === 0) ? p.color : accent;
        ctx.fillRect(x - 2, y - 6, 4, 10);
      }
      // 巻きながら沈む靄
      var puffs = d.count || 12;
      for (i = 0; i < puffs; i++) {
        var ps = span(t, 0.15 + wobble(i + 11) * 0.3, 0.55);
        if (ps <= 0 || ps >= 1) continue;
        var ang = turns(i / puffs + ps * 0.6 + p.phase);
        var px = p.x + Math.cos(ang) * 40;
        var py = p.y - 20 + ps * 50 + Math.sin(ang) * 10;
        setAlpha(ctx, fadeOut(ps) * 0.4);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(px, py, sizeOf(d, i), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 清め（ディンド・リカバー）：やわらかい光がふくらみ、十字のきらめきが体のまわりで瞬きながら昇る
     */
    sparkle: function (ctx, d, t, p) {
      var i;
      var glowS = span(t, 0, 0.6);
      if (glowS > 0 && glowS < 1) {
        var gr = (d.radius || 44) * (0.5 + 0.5 * easeOut(glowS));
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
        grad.addColorStop(0, p.coreColor);
        grad.addColorStop(0.4, p.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - glowS) * (d.alpha || 0.5));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, gr, 0, Math.PI * 2);
        ctx.fill();
      }
      var stars = d.stars || 10;
      for (i = 0; i < stars; i++) {
        var s = span(t, wobble(i) * 0.45, 0.5);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 5) - 0.5) * (d.spread || 70);
        var y = p.y + 24 - (wobble(i + 9) * 30 + 40 * easeOut(s));
        var tw = 1 - Math.abs(s - 0.5) * 2;
        var sz = (3 + wobble(i + 2) * 4) * tw;
        setAlpha(ctx, tw);
        ctx.fillStyle = (i % 2 === 0) ? p.coreColor : p.color;
        ctx.fillRect(x - sz, y - 1, sz * 2, 2);
        ctx.fillRect(x - 1, y - sz, 2, sz * 2);
      }
    },

    /**
     * まとわりつく（足止めの舞）：細い帯が何本も体のまわりを巻きながら締まっていき、
     * 足元へずり落ちて重りのように沈む。足元に重い輪が残る
     *   ribbons … 巻く帯の数   turns … 何周巻くか   radius / height … 巻く大きさ
     */
    entangle: function (ctx, d, t, p) {
      var ribbons = d.ribbons || 3;
      var radius = d.radius || 44;
      var height = d.height || 70;
      var wraps = d.turns || 1.6;
      var steps = 28;
      var i, k;
      ctx.lineCap = "round";
      for (i = 0; i < ribbons; i++) {
        var s = span(t, i * 0.1, 0.75);
        if (s <= 0 || s >= 1) continue;
        // 巻きつく長さが伸び、輪が締まり、全体が下へずり落ちる
        var grow = easeOut(Math.min(1, s * 1.8));
        var tight = 1 - 0.35 * easeIn(s);
        var sink = 18 * easeIn(s);
        var start = turns(i / ribbons + p.phase);
        setAlpha(ctx, fadeOut(s) * 0.9);
        ctx.strokeStyle = (i % 2 === 0) ? p.color : p.coreColor;
        ctx.lineWidth = (i % 2 === 0) ? 4 : 2;
        ctx.beginPath();
        for (k = 0; k <= steps; k++) {
          var f = (k / steps) * grow;
          var ang = start + turns(f * wraps);
          var x = p.x + Math.cos(ang) * radius * tight;
          // 上から下へ巻き下ろす。奥（sin が負）を少し上げて楕円の帯に見せる
          var y = p.y - height / 2 + height * f + Math.sin(ang) * radius * 0.28 * tight + sink;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 足元の重い輪（締まりきったあたりから）
      var g = span(t, 0.45, 0.55);
      if (g > 0 && g < 1) {
        var gr = (d.groundRadius || 40) * (1 - 0.2 * easeOut(g));
        setAlpha(ctx, (1 - g) * 0.9);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * (1 - g * 0.5);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + height / 2 + 6, gr, gr * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // こぼれ落ちる粒
      var count = d.count || 8;
      ctx.fillStyle = p.color;
      for (i = 0; i < count; i++) {
        var ps = span(t, 0.3 + wobble(i) * 0.4, 0.35);
        if (ps <= 0 || ps >= 1) continue;
        var px = p.x + (wobble(i + 3) - 0.5) * radius * 1.6;
        var py = p.y + easeIn(ps) * height * 0.7;
        var size = sizeOf(d, i);
        setAlpha(ctx, 1 - ps);
        ctx.fillRect(px - size / 2, py - size / 2, size, size * 1.6);
      }
    },

    /**
     * 気力を抜かれる（ミステリーダンス）：体の中心から光の玉がいくつも、渦を巻きながら外へ抜け出して消える。
     * 頭の上では小さな星がくるくる回る（目が回る感じ）。玉は色を交互にして、不思議な踊りらしくする
     *   count / radius / turns … 抜ける玉の数・どこまで離れるか・何周回るか   stars … 頭の上の星
     */
    mystery: function (ctx, d, t, p) {
      var count = d.count || 12;
      var radius = d.radius || 70;
      var accent = d.accentColor || p.coreColor;
      var i;
      // 抜け出す玉（尾を引く）
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.35, 0.6);
        if (s <= 0 || s >= 1) continue;
        var dir = (i % 2 === 0) ? 1 : -1;
        var base = turns(i / count + p.phase);
        for (var trail = 2; trail >= 0; trail--) {
          var ts = Math.max(0, s - trail * 0.05);
          var ang = base + dir * turns(ts * (d.turns || 1.2));
          var r = radius * easeOut(ts);
          var x = p.x + Math.cos(ang) * r;
          var y = p.y + Math.sin(ang) * r * 0.7 - ts * 20;
          var size = sizeOf(d, i) * (1 - ts * 0.5) * (1 - trail * 0.25);
          setAlpha(ctx, fadeOut(s) * (1 - trail * 0.35));
          ctx.fillStyle = (i % 3 === 0) ? p.coreColor : ((i % 3 === 1) ? p.color : accent);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 頭の上で回る星
      var ss = span(t, 0.2, 0.8);
      if (ss > 0 && ss < 1) {
        var stars = d.stars || 5;
        var headY = p.y - (d.headOffset || 44);
        ctx.fillStyle = accent;
        for (i = 0; i < stars; i++) {
          var a = turns(i / stars + ss * 1.5);
          var sx = p.x + Math.cos(a) * 22;
          var sy = headY + Math.sin(a) * 6;
          var sz = 4 + (Math.sin(a) + 1) * 1.5;   // 手前ほど大きく
          setAlpha(ctx, fadeOut(ss));
          ctx.fillRect(sx - sz, sy - 1, sz * 2, 2);
          ctx.fillRect(sx - 1, sy - sz, 2, sz * 2);
        }
      }
      // はじめに、体の中心がふっと光る
      if (t < 0.25) {
        setAlpha(ctx, (1 - t / 0.25) * 0.6);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18 + 20 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 死神の鎌（2026-10-21 に作り直した）。当たった瞬間から、次の順に重なって起きる。
     *   1. 刃の軌跡（0〜0.24）… 太い三日月が相手の上から右下へ、体を横切って走る。少し遅れて残像が2枚ついてくる。
     *                            三日月の外側に、ぼやけた太い帯（振りの風圧）が一緒に流れる
     *   2. 閃き（0.08〜0.3）   … 白い芯が一瞬はじけ、すぐ赤黒い光に変わって広がる
     *   3. 裂け目（0.16〜0.62）… 相手の体を斜めに横切る赤い一本線が走り、太くなってから上下に割れて離れていく
     *   4. 魂（0.24〜0.96）    … 青白い魂がいくつも、ゆらゆら揺れながら相手から抜けて昇っていく
     *   5. 黒い粒（0.18〜0.8） … 軌跡に沿って黒い羽根のような粒が舞い、落ちる
     *   6. 波紋（0.32〜0.92）  … 足元から赤黒い輪が、地面を這うように広がって消える
     *   radius … 刃の軌跡の大きさ   width … いちばん太いところ   accentColor … 裂け目・閃き・波紋の色
     *   soulColor … 魂の色   souls … 魂の数
     */
    reap: function (ctx, d, t, p) {
      var R = d.radius || 78;
      var width = d.width || 18;
      var accent = d.accentColor || p.color;
      // 軌跡の円の中心は相手の右上、ちょうど半径ぶん離れたところ。弧の真ん中が相手の体を横切る
      var cx = p.x + R * 0.7, cy = p.y - R * 0.7;
      var a0 = Math.PI * 0.88, a1 = Math.PI * 1.62;   // 左上 → 相手 → 下へ回る角度（真ん中 1.25π が相手）
      var i, k;

      // 三日月を塗りで描く。外側の弧（R + 太さ/2）と内側の弧（R - 太さ/2）で囲み、真ん中ほど太い。
      // progress … 0〜1 のどこまで走ったか（先端だけが伸びていく）
      function crescentPath(progress, widthScale) {
        var steps = 30, s, f, ang, w;
        ctx.beginPath();
        for (s = 0; s <= steps; s++) {
          f = (s / steps) * progress;
          ang = a0 + (a1 - a0) * f;
          w = (width * Math.sin(Math.PI * f) + 1) * widthScale;
          var ox = cx + Math.cos(ang) * (R + w / 2), oy = cy - Math.sin(ang) * (R + w / 2);
          if (s === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        }
        for (s = steps; s >= 0; s--) {
          f = (s / steps) * progress;
          ang = a0 + (a1 - a0) * f;
          w = (width * Math.sin(Math.PI * f) + 1) * widthScale;
          ctx.lineTo(cx + Math.cos(ang) * (R - w / 2), cy - Math.sin(ang) * (R - w / 2));
        }
        ctx.closePath();
      }
      function crescent(progress, alphaScale, widthScale, color) {
        if (progress <= 0) return;
        setAlpha(ctx, alphaScale);
        ctx.fillStyle = color || p.color;
        crescentPath(progress, widthScale);
        ctx.fill();
        // 刃の芯（白く細く）
        if (!color) {
          ctx.fillStyle = p.coreColor;
          crescentPath(progress, widthScale * 0.35);
          ctx.fill();
        }
      }

      // 1. 刃の軌跡：風圧の帯 → 残像2枚 → 本体。
      //    走り終えた三日月は、裂け目が出るまでしばらく残してから薄れる（作者の指定：三日月の時間を長く）
      var holdEnd = (d.crescentHold === undefined) ? 0.4 : d.crescentHold;
      var sweep = easeOut(span(t, 0, 0.2));
      var fade = 1 - span(t, holdEnd, 0.18);
      if (fade > 0) {
        // 風圧の帯（三日月の少し外側を、太く薄く）
        if (sweep > 0) {
          setAlpha(ctx, 0.18 * fade);
          ctx.fillStyle = p.color;
          crescentPath(sweep, 2.8);
          ctx.fill();
        }
        crescent(easeOut(span(t, 0.05, 0.2)) , 0.25 * fade, 0.8, accent);   // 残像（遅れて赤く）
        crescent(easeOut(span(t, 0.025, 0.2)), 0.45 * fade, 0.9);
        crescent(sweep, fade, 1);
      }

      // 2. 閃き：白い芯 → 赤黒い光
      var flash = span(t, 0.08, 0.22);
      if (flash > 0 && flash < 1) {
        var fr = (d.flashRadius || 70) * easeOut(flash);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, fr);
        grad.addColorStop(0, flash < 0.3 ? p.coreColor : accent);
        grad.addColorStop(0.45, accent);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - flash) * 0.85);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 裂け目：体を斜めに横切る線が走り、太くなってから上下に割れて離れる。
      //    三日月が走り終えてから一拍おいて出す（作者の指定：赤い斬撃までの時間を長く。cutAt）
      var cutAt = (d.cutAt === undefined) ? 0.16 : d.cutAt;
      var cut = span(t, cutAt, 0.4);
      if (cut > 0 && cut < 1) {
        var len = (d.cutLength || 90);
        // 刃が相手を通り過ぎた向き（弧の接線。左上 → 右下）に沿って切れる
        var dirX = Math.cos(Math.PI * 0.25), dirY = Math.sin(Math.PI * 0.25);
        var nx = -dirY, ny = dirX;                                           // 線に直角
        var run = easeOut(Math.min(1, cut * 3));                             // 走る（最初の1/3）
        var split = easeIn(span(cut, 0.4, 0.6)) * 9;                         // 割れて離れる
        var thick = 2 + 5 * Math.sin(Math.PI * Math.min(1, cut * 1.6));
        for (k = -1; k <= 1; k += 2) {
          var ox = nx * split * k, oy = ny * split * k;
          setAlpha(ctx, 1 - easeIn(cut));
          ctx.strokeStyle = accent;
          ctx.lineWidth = split > 0.5 ? thick * 0.6 : thick;
          ctx.beginPath();
          ctx.moveTo(p.x - dirX * len / 2 + ox, p.y - dirY * len / 2 + oy);
          ctx.lineTo(p.x - dirX * len / 2 + dirX * len * run + ox, p.y - dirY * len / 2 + dirY * len * run + oy);
          ctx.stroke();
          if (split <= 0.5) break;   // 割れる前は1本だけ
        }
        // 割れ目の芯（白く細く）
        if (cut < 0.45) {
          setAlpha(ctx, 1 - cut * 2);
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - dirX * len / 2, p.y - dirY * len / 2);
          ctx.lineTo(p.x - dirX * len / 2 + dirX * len * run, p.y - dirY * len / 2 + dirY * len * run);
          ctx.stroke();
        }
      }

      // 4. 魂：青白い玉が尾を引きながら、ゆらゆら昇る
      var souls = d.souls || 6;
      var soulColor = d.soulColor || "#bfe0ff";
      for (i = 0; i < souls; i++) {
        // 魂は裂け目が入ってから抜けていく
        var ss = span(t, cutAt + 0.08 + wobble(i + 50) * 0.18, 0.45);
        if (ss <= 0 || ss >= 1) continue;
        var baseX = p.x + (wobble(i + 60) - 0.5) * 50;
        for (k = 0; k < 4; k++) {
          var st = Math.max(0, ss - k * 0.04);
          var sx = baseX + Math.sin((st * 3 + wobble(i)) * Math.PI * 2) * 8;
          var sy = p.y + 10 - st * (d.soulRise || 90);
          var sr = (4.5 - k) * (1 - st * 0.5);
          if (sr <= 0) continue;
          setAlpha(ctx, (1 - st) * (k === 0 ? 0.9 : 0.35));
          ctx.fillStyle = soulColor;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. 黒い粒（羽根）：軌跡に沿って舞い、ひらひら落ちる
      var count = d.count || 18;
      ctx.fillStyle = d.particleColor || "#140812";
      for (i = 0; i < count; i++) {
        var ps = span(t, 0.18 + wobble(i) * 0.2, 0.6);
        if (ps <= 0 || ps >= 1) continue;
        var ang = a0 + (a1 - a0) * wobble(i + 3);
        var px = cx + Math.cos(ang) * R + Math.sin((ps + wobble(i)) * Math.PI * 4) * 6;
        var py = cy - Math.sin(ang) * R + 40 * ps * ps;
        var size = sizeOf(d, i) * (1 - ps * 0.4);
        setAlpha(ctx, 1 - ps);
        ctx.fillRect(px - size / 2, py - size * 0.35, size, size * 0.7);
      }

      // 6. 足元の波紋：赤黒い輪が地面を這って広がる
      var ring = span(t, cutAt + 0.12, 0.45);
      if (ring > 0 && ring < 1) {
        var rr = (d.ringRadius || 110) * easeOut(ring);
        setAlpha(ctx, (1 - ring) * 0.8);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4 * (1 - ring) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 34, rr, rr * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    /**
     * 死神の鎌の前ぶれ（技を出した瞬間、シニガミのまわりに出す。当たるまでの溜めのあいだ続く）。
     *   ・まわりの闇が渦を巻きながら体へ吸い込まれる（黒い煙の玉が外から内へ）
     *   ・目の高さで赤い光が2つ、強く瞬く
     *   ・足元に赤黒い輪が、外から内へ縮んでいく
     *   eyeOffset … 目の高さ（中心から上へ）  eyeGap … 目と目の間
     */
    reapOmen: function (ctx, d, t, p) {
      var R = d.radius || 90;
      var accent = d.accentColor || "#c0102a";
      var i;
      // 吸い込まれる闇
      var count = d.count || 22;
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.4, 0.55);
        if (s <= 0 || s >= 1) continue;
        var ang = turns(i / count + s * 0.35 + p.phase);
        var r = R * (1 - easeIn(s));
        setAlpha(ctx, (s < 0.2 ? s / 0.2 : 1) * 0.55);
        ctx.fillStyle = (i % 3 === 0) ? "#2a1430" : "#05020a";
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.7, sizeOf(d, i) * (1 - s * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      // 縮んでいく輪
      var rs = span(t, 0.1, 0.8);
      if (rs > 0 && rs < 1) {
        var rr = R * 1.1 * (1 - easeOut(rs)) + 12;
        setAlpha(ctx, rs < 0.2 ? rs / 0.2 : 0.8);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 30, rr, rr * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 赤い目の瞬き（溜めの終わりに強く光る）
      var eye = span(t, 0.55, 0.4);
      if (eye > 0 && eye < 1) {
        var ey = p.y - (d.eyeOffset || 14), gap = d.eyeGap || 12;
        var glow = Math.sin(Math.PI * eye);
        for (i = -1; i <= 1; i += 2) {
          var g = ctx.createRadialGradient(p.x + i * gap / 2, ey, 0, p.x + i * gap / 2, ey, 14 * glow + 2);
          g.addColorStop(0, "#ffd0c0");
          g.addColorStop(0.35, accent);
          g.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, glow);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x + i * gap / 2, ey, 14 * glow + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    /** 砕ける：粒が横へ飛び、落ちていく */
    shards: function (ctx, d, t, p) {
      var count = d.count || 12;
      var radius = d.radius || 46;
      var gravity = d.gravity || 90;

      setAlpha(ctx, fadeOut(t));
      ctx.fillStyle = p.color;

      for (var i = 0; i < count; i++) {
        var angle = turns(i / count + p.phase);
        var speed = 0.6 + wobble(i) * 0.4;
        var x = p.x + Math.cos(angle) * radius * speed * easeOut(t);
        // 横に飛びながら落ちる
        var y = p.y + Math.sin(angle) * radius * speed * easeOut(t) * 0.5
                    + gravity * t * t;
        var size = sizeOf(d, i);

        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    },

    // ─────────────────────────────────────────
    // v1.3.0：ほかの技の演出を借りていた技の専用の型（2026-11-03 作者の指定）
    // ─────────────────────────────────────────

    /**
     * 癒やし（キュア・キュアラ）：体がやわらかく光り、十字の光が足元から昇る。
     *   crosses … 十字の数  column: true … 上から光の柱が降りる（キュアラ）
     */
    healing: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 34;
      // 光の柱（キュアラ）
      if (d.column) {
        var cs = span(t, 0, 0.45);
        var ca = (t < 0.45) ? cs : fadeOut((t - 0.45) / 0.55);
        setAlpha(ctx, ca * 0.35);
        ctx.fillStyle = p.color;
        var top = p.y - 150;
        ctx.fillRect(p.x - R * 0.7, top, R * 1.4, (p.y + 40 - top) * easeOut(cs));
        setAlpha(ctx, ca * 0.6);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(p.x - R * 0.18, top, R * 0.36, (p.y + 40 - top) * easeOut(cs));
      }
      // 体のやわらかい光
      var glow = Math.sin(Math.PI * Math.min(1, t * 1.4));
      setAlpha(ctx, glow * 0.28);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R * 1.2, R * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // 昇る十字
      var count = d.crosses || 6;
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.45, 0.55);
        if (s <= 0 || s >= 1) continue;
        var lane = (wobble(i + 7) - 0.5) * R * 2.2;
        var y = p.y + 30 - (d.rise || 70) * easeOut(s) + Math.sin(s * 6 + i) * 2;
        var size = (d.crossSize || 7) * (1 - s * 0.3);
        setAlpha(ctx, fadeOut(s));
        ctx.fillStyle = (s < 0.3) ? p.coreColor : p.color;
        ctx.fillRect(p.x + lane - size, y - size * 0.3, size * 2, size * 0.6);
        ctx.fillRect(p.x + lane - size * 0.3, y - size, size * 0.6, size * 2);
      }
    },

    /**
     * 樹液の膜（ジュエキスライムの絆の技。2026-11-11）：
     *   ① 上から琥珀色の樹液のしずくが落ちてくる
     *   ② 頭の上から体を包むように、透けた琥珀の膜が垂れ下がる（下の縁はしずくの形に波打つ）
     *   ③ 包み終わると膜の上を光が走り、中を小さな泡が昇る。最後に裾から樹液が垂れて消える
     *   radius … 膜の大きさ  deepColor … 縁取りの濃い琥珀
     */
    /**
     * 波さらい（v1.8.0）。
     *   ① 相手のまわりに強化の光（上向きの印）が浮かぶ
     *   ② 左から波がせり上がって相手を横切る。波頭には白い泡
     *   ③ 波に触れた印は、波といっしょに右へ流され、回りながら消える
     *   ④ 波が抜けたあと、しずくが落ちる
     * 色：波は技の属性（水）、印は buffColor、泡は foamColor
     */
    tideSweep: function (ctx, d, t, p) {
      var i;
      var W = d.width || 120, H = d.height || 90;
      var left = p.x - W, right = p.x + W;
      var buff = d.buffColor || "#5fd18c";
      var foam = d.foamColor || "#e8fbff";

      // 波の先頭の位置（0.18〜0.62 で左から右へ抜ける）
      var w = span(t, 0.18, 0.44);
      var front = left + (right - left) * easeIn(w) * 1.15;

      // ① と ③ 強化の印（体のまわりに散らして置く。重ならないよう決まった位置）
      var spots = [[-0.42, -0.05], [-0.15, -0.55], [0.2, -0.2], [0.45, -0.5], [0.05, 0.25]];
      var marks = Math.min(d.marks || 5, spots.length);
      for (i = 0; i < marks; i++) {
        var appear = span(t, i * 0.025, 0.16);
        if (appear <= 0) continue;
        var mx = p.x + spots[i][0] * W * 0.75;
        var my = p.y + spots[i][1] * H - 4 * Math.sin(t * 9 + i) - (1 - appear) * 10;
        var alpha = appear, angle = 0;
        if (w > 0 && front >= mx - 8) {
          // さらわれた：波の先頭について右へ流れ、回って消える
          var swept = Math.min(1, (front - mx + 8) / (W * 0.9));
          mx += (front - mx) * 0.6 + swept * 30;
          my += swept * 14;
          angle = swept * 2.4 * (i % 2 === 0 ? 1 : -1);
          alpha *= 1 - swept;
        }
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        setAlpha(ctx, alpha);
        ctx.strokeStyle = buff;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-6, 4); ctx.lineTo(0, -4); ctx.lineTo(6, 4);
        ctx.moveTo(-6, 10); ctx.lineTo(0, 2); ctx.lineTo(6, 10);
        ctx.stroke();
        ctx.restore();
      }

      // ② 波（先頭が丸く巻いた水の帯）
      if (w > 0 && t < 0.9) {
        var a = (t < 0.7) ? 1 : Math.max(0, 1 - (t - 0.7) / 0.2);
        var top = p.y - H * 0.6, bottom = p.y + H * 0.5;
        var tail = Math.max(left - 20, front - W * 1.1);
        ctx.save();
        setAlpha(ctx, a * 0.55);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(tail, bottom);
        // 背中：うしろほど低い
        for (var k = 0; k <= 10; k++) {
          var x = tail + (front - tail) * k / 10;
          var rise = Math.pow(k / 10, 1.6);
          ctx.lineTo(x, bottom - (bottom - top) * rise + Math.sin(k * 1.3 + t * 12) * 3);
        }
        // 先頭：波頭が前へ巻き、内側へ丸く返ってから、前の面を下りる
        ctx.quadraticCurveTo(front + 34, top - 8, front + 30, top + 18);
        ctx.quadraticCurveTo(front + 18, top + 26, front + 10, top + 16);
        ctx.quadraticCurveTo(front + 2, (top + bottom) / 2, front + 16, bottom);
        ctx.closePath();
        ctx.fill();
        // 波の中の濃い筋
        setAlpha(ctx, a * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(front - W * 0.5, bottom - (bottom - top) * 0.35);
        ctx.quadraticCurveTo(front - W * 0.2, top + 10, front + 12, top + 4);
        ctx.stroke();
        // 波頭の泡
        for (i = 0; i < 7; i++) {
          var fx = front + 26 - i * 9 + Math.sin(t * 20 + i) * 2;
          var fy = top + 2 + i * 2 + wobble(i + 30) * 5;
          setAlpha(ctx, a * (0.9 - i * 0.1));
          ctx.fillStyle = foam;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5 + wobble(i + 40) * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ④ 抜けたあとのしずく
      var after = span(t, 0.55, 0.45);
      if (after > 0) {
        for (i = 0; i < 6; i++) {
          var s = span(after, i * 0.07, 0.6);
          if (s <= 0 || s >= 1) continue;
          var dx = p.x + (wobble(i + 60) - 0.5) * W * 1.2;
          var dy = p.y - H * 0.5 + H * 1.1 * easeIn(s);
          setAlpha(ctx, (1 - s) * 0.9);
          ctx.fillStyle = (i % 2 === 0) ? p.color : foam;
          sapDrop(ctx, dx, dy, 2.5 + wobble(i + 70) * 1.5);
        }
      }
      ctx.lineCap = "butt";
    },

    sapVeil: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 40;
      var rx = R * 1.15, ry = R * 1.45;
      var deep = d.deepColor || "#a86414";

      // ① 落ちてくるしずく
      var drops = d.drops || 4;
      for (i = 0; i < drops; i++) {
        var s = span(t, i * 0.06, 0.28);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (i - (drops - 1) / 2) * R * 0.42 + (wobble(i) - 0.5) * 6;
        var from = p.y - ry - 90;
        var y = from + (p.y - ry + 6 - from) * easeIn(s);
        var size = 4 + wobble(i + 3) * 2.5;
        setAlpha(ctx, 1);
        ctx.fillStyle = deep;
        sapDrop(ctx, x, y, size + 1.5);
        ctx.fillStyle = p.color;
        sapDrop(ctx, x, y, size);
      }

      // ② 膜が頭の上から垂れて、体を包む
      var form = span(t, 0.2, 0.4);
      if (form > 0) {
        var a = (t < 0.78) ? 1 : Math.max(0, 1 - (t - 0.78) / 0.22);
        var bottom = p.y - ry + ry * 2.1 * easeOut(form);
        var sag = Math.sin(Math.PI * Math.min(1, form * 1.1));   // 垂れている途中ほど、裾が大きく波打つ
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x - rx - 6, p.y - ry - 6);
        ctx.lineTo(p.x + rx + 6, p.y - ry - 6);
        // 裾：右から左へ、しずくの丸い垂れを並べる（角が立たないよう曲線でつなぐ）
        var n = 8;
        var prevX = p.x + rx + 6;
        ctx.lineTo(prevX, bottom);
        for (var k = n - 1; k >= 0; k--) {
          var edgeX = p.x - rx - 6 + (rx * 2 + 12) * k / n;
          var midX = (prevX + edgeX) / 2;
          var drip = (k % 2 === 0) ? (6 + wobble(k + 11) * 9) * sag : 1;
          ctx.quadraticCurveTo(midX + 4, bottom, midX + 3, bottom + drip * 0.6);
          ctx.quadraticCurveTo(midX, bottom + drip * 1.6, midX - 3, bottom + drip * 0.6);
          ctx.quadraticCurveTo(edgeX, bottom, edgeX, bottom);
          prevX = edgeX;
        }
        ctx.closePath();
        ctx.clip();

        setAlpha(ctx, a * 0.3);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, a * 0.7);
        ctx.strokeStyle = deep;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx + 2, ry + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        setAlpha(ctx, a * 0.9);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // ③ 膜の上を走る光
        var g = span(t, 0.5, 0.32);
        if (g > 0 && g < 1) {
          setAlpha(ctx, a * Math.sin(Math.PI * g));
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          var start = Math.PI * 1.02 + g * 0.6;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx * 0.84, ry * 0.86, 0, start, start + 0.5);
          ctx.stroke();
          ctx.lineCap = "butt";
        }
        // 中を昇る小さな泡
        for (i = 0; i < 6; i++) {
          var bs = span(t, 0.45 + wobble(i + 40) * 0.25, 0.38);
          if (bs <= 0 || bs >= 1) continue;
          var bx = p.x + (wobble(i + 50) - 0.5) * rx * 1.2 + Math.sin(bs * 5 + i) * 3;
          var by = p.y + ry * 0.6 - ry * 1.1 * bs;
          setAlpha(ctx, a * (1 - bs) * 0.9);
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, 1.5 + wobble(i + 60) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 最後に裾から垂れて消える樹液
      for (i = 0; i < 3; i++) {
        var ds = span(t, 0.7 + i * 0.07, 0.24);
        if (ds <= 0 || ds >= 1) continue;
        setAlpha(ctx, 1 - ds);
        ctx.fillStyle = p.color;
        sapDrop(ctx, p.x + (i - 1) * R * 0.6, p.y + ry + 2 + 20 * easeIn(ds), 3);
      }
    },

    /**
     * 清め（クレンズ）：澄んだ雫が上から降り、体に当たって輪が広がる。最後に小さなきらめき
     */
    cleanse: function (ctx, d, t, p) {
      var i;
      var count = d.count || 7;
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.3, 0.4);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 3) - 0.5) * 60;
        var y = p.y - 90 + 90 * easeIn(s);
        setAlpha(ctx, s < 0.85 ? 1 : (1 - s) / 0.15);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(x, y - 7);
        ctx.quadraticCurveTo(x + 4, y, x, y + 3);
        ctx.quadraticCurveTo(x - 4, y, x, y - 7);
        ctx.fill();
      }
      // 当たって広がる輪
      for (i = 0; i < 2; i++) {
        var rs = span(t, 0.35 + i * 0.12, 0.5);
        if (rs <= 0 || rs >= 1) continue;
        setAlpha(ctx, 1 - rs);
        ctx.strokeStyle = (i === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 10, 14 + 40 * easeOut(rs), (14 + 40 * easeOut(rs)) * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // きらめき
      var ks = span(t, 0.55, 0.45);
      if (ks > 0 && ks < 1) {
        for (i = 0; i < 4; i++) {
          var kx = p.x + (wobble(i + 20) - 0.5) * 70, ky = p.y + (wobble(i + 30) - 0.5) * 60;
          var k = 6 * Math.sin(Math.PI * ks);
          setAlpha(ctx, Math.sin(Math.PI * ks));
          ctx.fillStyle = p.coreColor;
          ctx.fillRect(kx - k, ky - 1, k * 2, 2);
          ctx.fillRect(kx - 1, ky - k, 2, k * 2);
        }
      }
    },

    /**
     * 薬草（主のやくそう）：葉が体のまわりを巡りながら昇り、体が緑に光る
     */
    herbLeaves: function (ctx, d, t, p) {
      var i;
      var count = d.count || 7;
      var glow = Math.sin(Math.PI * t);
      setAlpha(ctx, glow * 0.22);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 44, 52, 0, 0, Math.PI * 2);
      ctx.fill();
      for (i = 0; i < count; i++) {
        var s = span(t, i * 0.06, 0.7);
        if (s <= 0 || s >= 1) continue;
        var ang = turns(i / count + s * 0.8 + p.phase);
        var r = 46 - 12 * s;
        var x = p.x + Math.cos(ang) * r;
        var y = p.y + 34 - 90 * easeOut(s) + Math.sin(ang) * r * 0.25;
        setAlpha(ctx, fadeOut(s));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang + Math.PI / 4);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.restore();
      }
    },

    /**
     * 硬化（こうか）：外から板が集まって体を覆い、閉じた瞬間に輪郭が光る
     */
    hardenShell: function (ctx, d, t, p) {
      var i;
      var plates = d.plates || 6;
      var R = d.radius || 44;
      var close = span(t, 0, 0.4);
      for (i = 0; i < plates; i++) {
        var ang = turns(i / plates + 1 / 12);
        var dist = R * (1.9 - 0.9 * easeOut(close));
        var x = p.x + Math.cos(ang) * dist;
        var y = p.y + Math.sin(ang) * dist * 1.15;
        var a = (t < 0.4) ? close : fadeOut((t - 0.4) / 0.6);
        setAlpha(ctx, a * 0.85);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang + Math.PI / 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-R * 0.48, -4, R * 0.96, 8);
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(-R * 0.48, -4, R * 0.96, 2);
        ctx.restore();
      }
      // 閉じた瞬間の輪郭
      var flash = span(t, 0.38, 0.4);
      if (flash > 0 && flash < 1) {
        setAlpha(ctx, 1 - flash);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 3;
        polygonPath(ctx, p.x, p.y, R * (1 + flash * 0.15), plates, turns(1 / 12), 1.15);
        ctx.stroke();
      }
    },

    /**
     * 力が抜ける（ちからぬき）：体から赤い粒が抜け出て散り、下向きの矢じりが沈んでいく
     */
    drainAway: function (ctx, d, t, p) {
      var i;
      var count = d.count || 12;
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i) * 0.35, 0.6);
        if (s <= 0 || s >= 1) continue;
        var ang = turns(i / count + p.phase);
        var r = 8 + 50 * easeOut(s);
        var x = p.x + Math.cos(ang) * r;
        var y = p.y + Math.sin(ang) * r * 0.7 - 20 * s;
        var size = sizeOf(d, i) * (1 - s * 0.6);
        setAlpha(ctx, fadeOut(s));
        ctx.fillStyle = p.color;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 0; i < 3; i++) {
        var cs = span(t, 0.25 + i * 0.12, 0.5);
        if (cs <= 0 || cs >= 1) continue;
        var cy = p.y - 30 + 60 * easeOut(cs);
        setAlpha(ctx, fadeOut(cs));
        ctx.strokeStyle = (cs < 0.3) ? p.coreColor : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - 10, cy - 8);
        ctx.lineTo(p.x, cy);
        ctx.lineTo(p.x + 10, cy - 8);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 立ち塞がる：足元から石積みの壁がせり上がり、土ぼこりが舞う
     */
    standWall: function (ctx, d, t, p) {
      var i, j;
      var W = d.width || 96, H = d.height || 104;
      var rise = easeOut(span(t, 0, 0.3));
      var a = (t < 0.3) ? 1 : fadeOut((t - 0.3) / 0.7);
      var base = p.y + H * 0.5;
      var top = base - H * rise;
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x - W / 2, top, W, base - top);
      ctx.clip();
      var rows = 6, cols = 4;
      for (j = 0; j < rows; j++) {
        for (i = 0; i < cols + 1; i++) {
          var off = (j % 2) ? -W / cols / 2 : 0;
          var bx = p.x - W / 2 + off + i * W / cols;
          var by = base - (j + 1) * H / rows;
          // 壁の向こうの自分が見えるよう、石は薄く
          setAlpha(ctx, a * 0.28);
          ctx.fillStyle = p.color;
          ctx.fillRect(bx + 1, by + 1, W / cols - 2, H / rows - 2);
          setAlpha(ctx, a * 0.75);
          ctx.fillStyle = p.coreColor;
          ctx.fillRect(bx + 1, by + 1, W / cols - 2, 1.5);
        }
      }
      ctx.restore();
      // 土ぼこり
      for (i = 0; i < 10; i++) {
        var s = span(t, 0.05 + wobble(i) * 0.15, 0.5);
        if (s <= 0 || s >= 1) continue;
        var side = (i % 2) ? 1 : -1;
        var x = p.x + side * (W / 2 + 30 * easeOut(s) * (0.5 + wobble(i + 4)));
        var y = base - 10 * Math.sin(Math.PI * s) - 4;
        setAlpha(ctx, (1 - s) * 0.8);
        ctx.fillStyle = p.color;
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    },

    /**
     * 朧な羽（朧羽）：ぼんやりした羽が揺れながら舞い落ち、もやが相手を包む
     */
    hazyFeathers: function (ctx, d, t, p) {
      var i;
      // もや
      var ms = Math.sin(Math.PI * t);
      for (i = 0; i < 4; i++) {
        setAlpha(ctx, ms * 0.12);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x + (wobble(i) - 0.5) * 40, p.y + (wobble(i + 5) - 0.5) * 30, 40, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      var count = d.count || 6;
      for (i = 0; i < count; i++) {
        var s = span(t, wobble(i + 2) * 0.35, 0.65);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 9) - 0.5) * 90 + Math.sin(s * 7 + i) * 12;
        var y = p.y - 70 + 120 * s;
        var tilt = Math.sin(s * 7 + i) * 0.7;
        setAlpha(ctx, fadeOut(s) * 0.85);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 13);
        ctx.stroke();
        ctx.restore();
      }
    },

    /**
     * 導きの光：上から光の筋が降りて体を照らし、足元から前へ光の跡が流れる
     */
    guidingLight: function (ctx, d, t, p) {
      var i;
      var bs = span(t, 0, 0.35);
      var ba = (t < 0.35) ? bs : fadeOut((t - 0.35) / 0.65);
      var top = p.y - 140;
      var grad = ctx.createLinearGradient(0, top, 0, p.y + 40);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, p.color);
      setAlpha(ctx, ba * 0.5);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p.x - 10, top);
      ctx.lineTo(p.x + 10, top);
      ctx.lineTo(p.x + 40, p.y + 40);
      ctx.lineTo(p.x - 40, p.y + 40);
      ctx.closePath();
      ctx.fill();
      // 光の粒が降りる
      for (i = 0; i < 8; i++) {
        var s = span(t, wobble(i) * 0.4, 0.45);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 6) - 0.5) * 50;
        var y = top + (p.y + 30 - top) * easeOut(s);
        setAlpha(ctx, fadeOut(s));
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      // 足元から前へ流れる光の跡
      ctx.lineCap = "round";
      for (i = 0; i < 4; i++) {
        var ss = span(t, 0.35 + i * 0.08, 0.4);
        if (ss <= 0 || ss >= 1) continue;
        var y2 = p.y + 20 + (i - 1.5) * 9;
        var head = p.x - 30 + 90 * easeOut(ss);
        setAlpha(ctx, fadeOut(ss));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(head - 30, y2);
        ctx.lineTo(head, y2);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /**
     * 王の号令：頭の上に冠の光が立ち、衝撃の輪が二重に広がる
     */
    royalCommand: function (ctx, d, t, p) {
      var i;
      // 衝撃の輪
      for (i = 0; i < 2; i++) {
        var rs = span(t, 0.1 + i * 0.15, 0.6);
        if (rs <= 0 || rs >= 1) continue;
        setAlpha(ctx, 1 - rs);
        ctx.strokeStyle = (i === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 4 * (1 - rs) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 10, 20 + 80 * easeOut(rs), (20 + 80 * easeOut(rs)) * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 冠
      var cs = span(t, 0, 0.35);
      var ca = (t < 0.35) ? cs : fadeOut((t - 0.35) / 0.65);
      var cy = p.y - 50 - 14 * easeOut(cs);
      var w = 34;
      setAlpha(ctx, ca);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x - w, cy + 10);
      for (i = 0; i <= 4; i++) {
        var px = p.x - w + (w * 2) * (i / 4);
        ctx.lineTo(px, cy - ((i % 2 === 0) ? 14 : 4));
        if (i < 4) ctx.lineTo(px + w / 4, cy + 2);
      }
      ctx.lineTo(p.x + w, cy + 10);
      ctx.closePath();
      ctx.fill();
      setAlpha(ctx, ca);
      ctx.fillStyle = p.coreColor;
      for (i = 0; i <= 4; i += 2) ctx.fillRect(p.x - w + (w * 2) * (i / 4) - 2, cy - 16, 4, 4);
      ctx.fillRect(p.x - w, cy + 6, w * 2, 2);
    },

    /**
     * 子守歌（ララバイ）：音符がゆらゆら昇り、最後に「z」が浮かぶ
     */
    lullaby: function (ctx, d, t, p) {
      var i;
      var count = d.count || 5;
      for (i = 0; i < count; i++) {
        var s = span(t, i * 0.1, 0.6);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (i - (count - 1) / 2) * 20 + Math.sin(s * 8 + i) * 8;
        var y = p.y + 20 - 80 * easeOut(s);
        setAlpha(ctx, fadeOut(s));
        ctx.fillStyle = (i % 2) ? p.coreColor : p.color;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, 4.5, 3.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 4, y - 14);
        ctx.lineTo(x + 10, y - 10);
        ctx.stroke();
      }
      // z
      var zs = span(t, 0.5, 0.5);
      if (zs > 0 && zs < 1) {
        for (i = 0; i < 2; i++) {
          var zx = p.x + 18 + i * 12, zy = p.y - 30 - i * 14 - 10 * zs;
          var zz = 5 + i * 2;
          setAlpha(ctx, Math.sin(Math.PI * zs));
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(zx - zz, zy - zz);
          ctx.lineTo(zx + zz, zy - zz);
          ctx.lineTo(zx - zz, zy + zz);
          ctx.lineTo(zx + zz, zy + zz);
          ctx.stroke();
        }
      }
    },

    /**
     * 芽吹き（芽吹きの加護）：足元から双葉が次々に芽を出し、花びらが昇る
     */
    sproutBlessing: function (ctx, d, t, p) {
      var i;
      var count = d.count || 5;
      var base = p.y + 34;
      ctx.lineCap = "round";
      for (i = 0; i < count; i++) {
        var s = span(t, i * 0.08, 0.45);
        if (s <= 0) continue;
        var a = (t < 0.7) ? 1 : 1 - (t - 0.7) / 0.3;
        var x = p.x + (i - (count - 1) / 2) * 18;
        var h = (14 + wobble(i) * 10) * easeOut(s);
        setAlpha(ctx, a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, base - h);
        ctx.stroke();
        var leaf = 6 * easeOut(s);
        ctx.fillStyle = (i % 2) ? p.color : p.coreColor;
        ctx.beginPath();
        ctx.ellipse(x - leaf * 0.8, base - h, leaf, leaf * 0.45, -0.5, 0, Math.PI * 2);
        ctx.ellipse(x + leaf * 0.8, base - h, leaf, leaf * 0.45, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineCap = "butt";
      for (i = 0; i < 8; i++) {
        var ps = span(t, 0.3 + wobble(i) * 0.3, 0.5);
        if (ps <= 0 || ps >= 1) continue;
        var px = p.x + (wobble(i + 4) - 0.5) * 80 + Math.sin(ps * 6 + i) * 6;
        var py = base - 20 - 80 * easeOut(ps);
        setAlpha(ctx, fadeOut(ps));
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.ellipse(px, py, 3, 2, ps * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 落雷（サンダー）：上から稲妻が落ち、2度またたいて、足元に光が弾ける
     */
    thunderBolt: function (ctx, d, t, p) {
      var i;
      var top = p.y - (d.height || 150);
      var strike = span(t, 0, 0.12);
      var flick = (t < 0.5) ? ((Math.floor(t * 20) % 3 === 2) ? 0.35 : 1) : fadeOut((t - 0.5) / 0.5 * 0.45 + 0.55);
      if (strike > 0) {
        var segs = 7;
        var reach = top + (p.y - top) * strike;
        for (var pass = 0; pass < 2; pass++) {
          setAlpha(ctx, flick * (pass === 0 ? 1 : 0.9));
          ctx.strokeStyle = (pass === 0) ? p.color : p.coreColor;
          ctx.lineWidth = (pass === 0) ? 7 : 2.5;
          ctx.lineJoin = "miter";
          ctx.beginPath();
          ctx.moveTo(p.x + 6, top);
          for (i = 1; i <= segs; i++) {
            var y = top + (p.y - top) * (i / segs);
            if (y > reach) break;
            var x = p.x + ((i % 2) ? -1 : 1) * (8 + wobble(i + Math.floor(p.phase * 10)) * 10) * (i === segs ? 0 : 1);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      // 足元に弾ける光
      var bs = span(t, 0.1, 0.6);
      if (bs > 0 && bs < 1) {
        setAlpha(ctx, 1 - bs);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        for (i = 0; i < 8; i++) {
          var ang = turns(i / 8 + p.phase);
          var r0 = 10 + 30 * easeOut(bs);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(ang) * r0, p.y + Math.sin(ang) * r0 * 0.6);
          ctx.lineTo(p.x + Math.cos(ang) * (r0 + 12), p.y + Math.sin(ang) * (r0 + 12) * 0.6);
          ctx.stroke();
        }
        setAlpha(ctx, (1 - bs) * 0.5);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24 * (1 - bs), 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 眼光（青い眼光）：相手の頭の前に、二つの鋭い光がまたたき、横へ筋が走る
     */
    blueGlare: function (ctx, d, t, p) {
      var i;
      var es = span(t, 0, 0.3);
      var ea = (t < 0.3) ? es : fadeOut((t - 0.3) / 0.7);
      var ey = p.y - 18;
      for (i = -1; i <= 1; i += 2) {
        var ex = p.x + i * 16;
        var k = 10 * easeOut(es);
        setAlpha(ctx, ea);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(ex - k * 1.6, ey);
        ctx.lineTo(ex, ey - k * 0.45);
        ctx.lineTo(ex + k * 1.6, ey);
        ctx.lineTo(ex, ey + k * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.coreColor;
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
      // 横へ走る筋
      ctx.lineCap = "round";
      for (i = 0; i < 4; i++) {
        var s = span(t, 0.2 + i * 0.06, 0.45);
        if (s <= 0 || s >= 1) continue;
        var y = ey + (i - 1.5) * 10;
        setAlpha(ctx, 1 - s);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 70 * easeOut(s), y);
        ctx.lineTo(p.x + 70 * easeOut(s), y);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /**
     * まぶしい光（グレア）：細い光の十字が回りながら大きく開き、すぐ閉じる
     */
    glareBeam: function (ctx, d, t, p) {
      var i;
      var open = Math.sin(Math.PI * Math.min(1, t * 1.3));
      var L = (d.length || 90) * open;
      var rot = turns(0.04 * t + p.phase * 0.02);
      setAlpha(ctx, open * 0.35);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34 * open, 0, Math.PI * 2);
      ctx.fill();
      for (i = 0; i < 4; i++) {
        var ang = rot + turns(i / 4);
        var len = (i % 2) ? L * 0.6 : L;
        setAlpha(ctx, open);
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
        ctx.lineTo(p.x + Math.cos(ang + 1.5708) * 4, p.y + Math.sin(ang + 1.5708) * 4);
        ctx.lineTo(p.x - Math.cos(ang + 1.5708) * 4, p.y - Math.sin(ang + 1.5708) * 4);
        ctx.closePath();
        ctx.fill();
      }
      setAlpha(ctx, open);
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * open, 0, Math.PI * 2);
      ctx.fill();
    },

    /**
     * 惑わす瞳（幻惑の瞳）：大きな瞳が開き、そこから渦の輪が何重にも広がる
     */
    dazzleEye: function (ctx, d, t, p) {
      var i;
      var os = span(t, 0, 0.3);
      var oa = (t < 0.3) ? os : fadeOut((t - 0.3) / 0.7);
      var w = 30, h = 14 * easeOut(os);
      setAlpha(ctx, oa);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - w, p.y);
      ctx.quadraticCurveTo(p.x, p.y - h * 2, p.x + w, p.y);
      ctx.quadraticCurveTo(p.x, p.y + h * 2, p.x - w, p.y);
      ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, h * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.coreColor;
      ctx.fillRect(p.x - 2, p.y - 2 - h * 0.3, 4, 4);
      // 渦の輪
      for (i = 0; i < 3; i++) {
        var rs = span(t, 0.25 + i * 0.12, 0.55);
        if (rs <= 0 || rs >= 1) continue;
        var r = 20 + 60 * easeOut(rs);
        setAlpha(ctx, 1 - rs);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.6, rs * 2 + i, 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
    },

    /**
     * 風の刃（ウィンド）：三日月の刃が弧を描いて横切り、渦が残る
     */
    windCutter: function (ctx, d, t, p) {
      var i;
      var count = d.blades || 3;
      for (i = 0; i < count; i++) {
        var s = span(t, i * 0.12, 0.5);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + 80 - 160 * easeOut(s);
        var y = p.y - 20 + i * 18 - Math.sin(Math.PI * s) * 16;
        setAlpha(ctx, s < 0.8 ? 1 : (1 - s) / 0.2);
        ctx.fillStyle = (s < 0.3) ? p.coreColor : p.color;
        ctx.beginPath();
        ctx.arc(x, y, 18, -1.1, 1.1);
        ctx.arc(x + 7, y, 15, 1.0, -1.0, true);
        ctx.closePath();
        ctx.fill();
      }
      // 残る渦
      var ws = span(t, 0.3, 0.7);
      if (ws > 0 && ws < 1) {
        setAlpha(ctx, (1 - ws) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < 2; i++) {
          ctx.beginPath();
          var r = 14 + i * 12 + 10 * ws;
          ctx.arc(p.x, p.y, r, turns(ws * 0.6 + i * 0.3), turns(ws * 0.6 + i * 0.3) + 3.4);
          ctx.stroke();
        }
      }
    },

    /**
     * 牙（吸血・焔牙）：上下の牙が噛み合い、そこから雫（吸血）や炎（焔牙）があふれる
     *   spill: "drops" … 赤い雫が昇っていく（吸った血）  "flames" … 炎の舌が立ち昇る
     */
    fang: function (ctx, d, t, p) {
      var i;
      var bite = easeIn(span(t, 0, 0.22));
      var ba = (t < 0.22) ? 1 : fadeOut((t - 0.22) / 0.4 * 0.45 + 0.55);
      var gap = 40 * (1 - bite) + 4;
      var teeth = 3, w = 60;
      for (var row = -1; row <= 1; row += 2) {
        setAlpha(ctx, ba);
        ctx.fillStyle = p.coreColor;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < teeth; i++) {
          var tx = p.x - w / 2 + (i + 0.5) * (w / teeth);
          var by = p.y + row * gap;
          ctx.beginPath();
          ctx.moveTo(tx - 8, by);
          ctx.lineTo(tx + 8, by);
          ctx.lineTo(tx, by - row * 20);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      var spill = span(t, 0.2, 0.8);
      if (spill <= 0) return;
      var count = d.count || 8;
      for (i = 0; i < count; i++) {
        var s = span(spill, wobble(i) * 0.3, 0.7);
        if (s <= 0 || s >= 1) continue;
        var x = p.x + (wobble(i + 5) - 0.5) * 40;
        if (d.spill === "flames") {
          var fy = p.y + 10 - 60 * easeOut(s);
          var fh = 14 * (1 - s) + 4;
          setAlpha(ctx, fadeOut(s));
          ctx.fillStyle = (s < 0.3) ? p.coreColor : p.color;
          ctx.beginPath();
          ctx.moveTo(x - 5, fy + fh * 0.4);
          ctx.quadraticCurveTo(x - 3, fy - fh * 0.3, x + Math.sin(s * 9 + i) * 3, fy - fh);
          ctx.quadraticCurveTo(x + 3, fy - fh * 0.3, x + 5, fy + fh * 0.4);
          ctx.closePath();
          ctx.fill();
        } else {
          var dy = p.y - 50 * easeOut(s) - 10;
          var dx = x - 30 * s;
          setAlpha(ctx, fadeOut(s));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(dx, dy, 3.2 * (1 - s * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    /**
     * 歯車（歯車投げ）：回る歯車が斜め上から飛んできて当たり、火花が散る
     */
    gearHit: function (ctx, d, t, p) {
      var i;
      var fly = span(t, 0, 0.3);
      var R = d.radius || 16, teeth = 8;
      if (t < 0.55) {
        var gx = p.x + 90 * (1 - easeIn(fly)), gy = p.y - 80 * (1 - easeIn(fly));
        var rot = turns(t * 2.5);
        setAlpha(ctx, t < 0.4 ? 1 : 1 - (t - 0.4) / 0.15);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (i = 0; i < teeth * 2; i++) {
          var ang = rot + turns(i / (teeth * 2));
          var r = (i % 2) ? R : R * 1.3;
          var a0 = ang - 0.18, a1 = ang + 0.18;
          ctx.lineTo(gx + Math.cos(a0) * r, gy + Math.sin(a0) * r);
          ctx.lineTo(gx + Math.cos(a1) * r, gy + Math.sin(a1) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.coreColor;
        ctx.beginPath();
        ctx.arc(gx, gy, R * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2817";
        ctx.beginPath();
        ctx.arc(gx, gy, R * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // 火花
      var ss = span(t, 0.28, 0.6);
      if (ss <= 0 || ss >= 1) return;
      ctx.lineCap = "round";
      for (i = 0; i < 10; i++) {
        var ang2 = turns(i / 10 + p.phase);
        var r0 = 6 + 40 * easeOut(ss) * (0.6 + wobble(i) * 0.4);
        setAlpha(ctx, 1 - ss);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ang2) * r0, p.y + Math.sin(ang2) * r0 + 30 * ss * ss);
        ctx.lineTo(p.x + Math.cos(ang2) * (r0 + 8), p.y + Math.sin(ang2) * (r0 + 8) + 30 * ss * ss);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /**
     * 毒の針（どくばり）：斜めから針が突き刺さり、毒の雫が飛び散る
     */
    poisonSting: function (ctx, d, t, p) {
      var i;
      var thrust = easeOut(span(t, 0, 0.2));
      if (t < 0.5) {
        var ang = turns(-0.08);
        var tipX = p.x + 6 - 40 * (1 - thrust) * Math.cos(ang);
        var tipY = p.y - 40 * (1 - thrust) * Math.sin(ang);
        setAlpha(ctx, t < 0.35 ? 1 : 1 - (t - 0.35) / 0.15);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tipX + 60 * Math.cos(ang), tipY + 60 * Math.sin(ang));
        ctx.lineTo(tipX + 12 * Math.cos(ang), tipY + 12 * Math.sin(ang));
        ctx.stroke();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.lineCap = "butt";
        // 針先
        var nx = -Math.sin(ang), ny = Math.cos(ang);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + 14 * Math.cos(ang) + nx * 4, tipY + 14 * Math.sin(ang) + ny * 4);
        ctx.lineTo(tipX + 14 * Math.cos(ang) - nx * 4, tipY + 14 * Math.sin(ang) - ny * 4);
        ctx.closePath();
        ctx.fill();
      }
      // 毒の雫
      var count = d.count || 9;
      var ss = span(t, 0.18, 0.75);
      if (ss <= 0) return;
      for (i = 0; i < count; i++) {
        var a2 = turns(0.5 + (i / count - 0.5) * 0.6 + p.phase * 0.1);
        var sp = 0.6 + wobble(i) * 0.4;
        var x = p.x + Math.cos(a2) * 45 * sp * easeOut(ss);
        var y = p.y + Math.sin(a2) * 30 * sp * easeOut(ss) + 50 * ss * ss;
        setAlpha(ctx, fadeOut(ss));
        ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.beginPath();
        ctx.arc(x, y, 2.5 + wobble(i + 2) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 影の手（シャドウ）：足元の影から黒い手が何本も伸びて相手を包み、ぎゅっと閉じて消える
     */
    shadowGrasp: function (ctx, d, t, p) {
      var i;
      var count = d.count || 6;
      var grow = easeOut(span(t, 0, 0.4));
      var close = span(t, 0.4, 0.3);
      var a = (t < 0.6) ? 1 : fadeOut((t - 0.6) / 0.4 * 0.45 + 0.55);
      var base = p.y + 36;
      // 足元の影
      setAlpha(ctx, a * 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, base, 46 * grow + 6, 12 * grow + 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "round";
      for (i = 0; i < count; i++) {
        var side = (i % 2) ? 1 : -1;
        var spread = 18 + Math.floor(i / 2) * 14;
        var sx = p.x + side * spread;
        var bend = side * (20 + 10 * wobble(i)) * (1 - close * 0.8);
        var h = (60 + wobble(i + 3) * 30) * grow;
        setAlpha(ctx, a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 6 - Math.floor(i / 2);
        ctx.beginPath();
        ctx.moveTo(sx, base);
        ctx.quadraticCurveTo(sx + bend, base - h * 0.6, p.x + side * (spread * (1 - close)) * 0.6, base - h);
        ctx.stroke();
        setAlpha(ctx, a * 0.8);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    },

    /**
     * 灼熱の息（v1.8.0）。火の息より濃く速い炎の息が広がり、相手ひとりずつの足元から炎の舌が立ち昇る。
     * 炎の上では熱で空気が揺らぐ（波打つ細い線）。並び全体に1回だけ出す型（effectAt: "center"）
     *   flames / flameHeight … 1体あたりの炎の舌の数と高さ   groundY … 足元の位置（体の中心から）
     *   息の部分は miasma と同じ項目（spread・count など）
     */
    scorchBreath: function (ctx, d, t, p) {
      SHAPES.miasma(ctx, d, t, p);
      var points = pointsOf(p);
      var accent = d.accentColor || p.coreColor;
      var flames = d.flames || 4, fh = d.flameHeight || 80;
      var i, k;
      for (k = 0; k < points.length; k++) {
        var gx = points[k].x, gy = points[k].y + (d.groundY || 44);
        // 炎の舌（伸びて、揺れて、縮む）
        for (i = 0; i < flames; i++) {
          var s = span(t, 0.12 + k * 0.05 + wobble(k * 7 + i) * 0.15, 0.6);
          if (s <= 0 || s >= 1) continue;
          var off = (i - (flames - 1) / 2) * 22 + (wobble(i + k * 3 + 50) - 0.5) * 10;
          var grow = Math.sin(s * Math.PI);
          var h = fh * (0.6 + wobble(i + k * 5 + 70) * 0.5) * grow;
          var w = 14 + wobble(i + 90) * 8;
          var sway = Math.sin(t * 30 + i * 1.7 + k) * 7 * grow;
          setAlpha(ctx, 0.7 * grow);
          ctx.fillStyle = p.color;
          flameTongue(ctx, gx + off, gy, w, h, sway);
          setAlpha(ctx, 0.9 * grow);
          ctx.fillStyle = accent;
          flameTongue(ctx, gx + off, gy, w * 0.5, h * 0.6, sway * 0.6);
        }
        // 熱の揺らぎ
        var hz = span(t, 0.3, 0.6);
        if (hz > 0 && hz < 1) {
          setAlpha(ctx, Math.sin(hz * Math.PI) * 0.4);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          for (i = 0; i < 3; i++) {
            var y0 = gy - fh - 6 - i * 12 - hz * 20;
            ctx.beginPath();
            for (var x = -32; x <= 32; x += 4) {
              var yy = y0 + Math.sin(x * 0.2 + t * 25 + i) * 3;
              if (x === -32) ctx.moveTo(gx + x, yy); else ctx.lineTo(gx + x, yy);
            }
            ctx.stroke();
          }
        }
      }
    },

    /**
     * 大渦（v1.8.0）。泡の息が広がったあと、相手ひとりずつの足元に渦が巻く。
     * 平たい渦の腕が回りながら内へ締まり、上へ細くなる水の輪が漏斗の形に重なる。外へしぶきが飛び、最後にほどけて消える
     *   radius / arms / squash … 渦の大きさ・腕の数・縦のつぶれ方   groundY … 渦の中心の高さ（体の中心から）
     *   levels … 漏斗の輪の段の数   drops … しぶきの数   deepColor … 渦の芯の色
     */
    whirlpool: function (ctx, d, t, p) {
      SHAPES.miasma(ctx, d, t, p);
      var points = pointsOf(p);
      var R = d.radius || 62, arms = d.arms || 3, sq = d.squash || 0.4;
      var foam = d.foamColor || p.coreColor;
      var i, j, k;
      ctx.lineCap = "round";
      for (k = 0; k < points.length; k++) {
        var cx = points[k].x, cy = points[k].y + (d.groundY || 30);
        var s = span(t, 0.15 + k * 0.05, 0.8);
        if (s <= 0 || s >= 1) continue;
        var open = Math.sin(s * Math.PI);
        var spin = s * 3.2 + k * 0.3;

        // 渦の芯（暗い穴）
        setAlpha(ctx, 0.45 * open);
        ctx.fillStyle = d.deepColor || "#16305a";
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.3 * open, R * 0.3 * sq * open, 0, 0, Math.PI * 2);
        ctx.fill();

        // 渦の腕（外から内へ巻く）
        for (var a = 0; a < arms; a++) {
          setAlpha(ctx, 0.85 * open);
          ctx.strokeStyle = (a === 0) ? foam : p.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (j = 0; j <= 24; j++) {
            var f = j / 24;
            var ang = turns(spin + a / arms) + f * Math.PI * 2.2;
            var r = R * open * (1 - f * 0.85);
            var px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r * sq;
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // 漏斗：上へ行くほど細い輪が、回りながら昇る
        var levels = d.levels || 3;
        for (var L = 1; L <= levels; L++) {
          var lr = R * open * (1 - L * 0.22);
          var ly = cy - L * 28 * open;
          setAlpha(ctx, 0.85 * open * (1 - L / (levels + 2)));
          ctx.strokeStyle = (L % 2 === 0) ? foam : p.color;
          ctx.lineWidth = 3;
          for (var h2 = 0; h2 < 2; h2++) {
            var start = turns(spin * (1 + L * 0.3) + h2 * 0.5);
            ctx.beginPath();
            ctx.ellipse(cx, ly, Math.max(1, lr), Math.max(1, lr * sq), 0, start, start + Math.PI * 0.7);
            ctx.stroke();
          }
        }

        // しぶき（渦の縁から外へ跳ねる）
        for (i = 0; i < (d.drops || 10); i++) {
          var ds = span(s, 0.15 + wobble(i + k * 11) * 0.5, 0.4);
          if (ds <= 0 || ds >= 1) continue;
          var da = turns(wobble(i + 120 + k));
          var dr = R * (0.8 + ds * 0.7);
          setAlpha(ctx, (1 - ds) * 0.9);
          ctx.fillStyle = foam;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(da) * dr, cy + Math.sin(da) * dr * sq - Math.sin(ds * Math.PI) * 34,
                  2 + wobble(i + 140) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 深淵の息（v1.8.0）。奈落の息より濃い闇が広がり、相手ひとりずつの足元に影がたまって、そこから闇の手が伸びて絡みつく。
     * 手は根元が太く先が細い。縁だけ闇の属性色で光る
     *   tendrils / reach … 1体あたりの手の数と伸びる高さ   groundY … 足元の位置   darkColor … 手と影の色
     */
    deepBreath: function (ctx, d, t, p) {
      SHAPES.miasma(ctx, d, t, p);
      var points = pointsOf(p);
      var dark = d.darkColor || "#1a0f33";
      var n = d.tendrils || 4, reach = d.reach || 90;
      var i, j, k;
      ctx.lineCap = "round";
      for (k = 0; k < points.length; k++) {
        var gx = points[k].x, gy = points[k].y + (d.groundY || 44);
        var s = span(t, 0.18 + k * 0.05, 0.75);
        if (s <= 0 || s >= 1) continue;

        // 足元の影だまり
        setAlpha(ctx, 0.65 * Math.sin(s * Math.PI));
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 60, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        for (i = 0; i < n; i++) {
          var ts = span(s, i * 0.08, 0.72);
          if (ts <= 0 || ts >= 1) continue;
          var grow = easeOut(Math.min(1, ts * 1.8));
          var fade = (ts < 0.7) ? 1 : 1 - (ts - 0.7) / 0.3;
          var bx = gx + (i - (n - 1) / 2) * 26;
          var side = (bx < gx) ? 1 : -1;   // 体のほうへ倒れ込む
          var h = reach * (0.7 + wobble(i + k * 9 + 200) * 0.4) * grow;
          var curl = side * (20 + wobble(i + 210) * 16) * grow;
          var pts = [];
          for (j = 0; j <= 10; j++) {
            var f = j / 10;
            var hook = (f > 0.75) ? (f - 0.75) / 0.25 : 0;   // 先は鉤のように曲がる
            pts.push([bx + Math.sin(f * Math.PI * 1.3 + t * 8 + i) * 6 * f + curl * f * f + side * hook * 14,
                      gy - h * f + hook * hook * 12]);
          }
          // 縁の光 → 闇の本体（根元が太く、先が細い）
          for (var pass = 0; pass < 2; pass++) {
            ctx.strokeStyle = pass === 0 ? p.color : dark;
            for (j = 1; j < pts.length; j++) {
              var wid = 10 * (1 - j / pts.length) + 2;
              setAlpha(ctx, (pass === 0 ? 0.7 : 0.95) * fade);
              ctx.lineWidth = pass === 0 ? wid + 4 : wid;
              ctx.beginPath();
              ctx.moveTo(pts[j - 1][0], pts[j - 1][1]);
              ctx.lineTo(pts[j][0], pts[j][1]);
              ctx.stroke();
            }
          }
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 焦熱地獄（v1.8.0・ブレスの最上位）。吐いた瞬間に並び全体が赤く光り、濃い炎の息のあと、
     * 地面から高い炎が次々に立って炎の海になる。火の粉が昇り、最後に相手ひとりずつの足元へ燻る輪（焦熱）が残る
     *   flames / flameHeight … 炎の海の炎の数と高さ   embers … 火の粉の数   groundY … 地面の位置（中心から）
     *   deepColor … 炎の外側の濃い赤   息の部分は miasma と同じ項目
     */
    scorchingHell: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var accent = d.accentColor || p.coreColor;
      var deep = d.deepColor || "#8a1a08";
      var spread = d.spread || 300;
      var groundY = p.y + (d.groundY || 44);
      var i, k;

      // 0. 吐いた瞬間の閃光
      if (t < 0.22) {
        var fl = t / 0.22;
        var glowR = (spread + 80) * (0.4 + fl * 0.8);
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grad.addColorStop(0, accent);
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - fl) * 0.45);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, glowR, glowR * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // 1. 濃い炎の息
      SHAPES.miasma(ctx, d, t, p);

      // 2. 炎の海（奥の濃い赤 → 属性の色 → 明るい芯）
      var n = d.flames || 22, fh = d.flameHeight || 150;
      for (i = 0; i < n; i++) {
        var s = span(t, 0.1 + wobble(i + 300) * 0.3, 0.6);
        if (s <= 0 || s >= 1) continue;
        var x = p.x - spread + spread * 2 * (i + 0.5) / n + (wobble(i + 310) - 0.5) * 14;
        var grow = Math.sin(s * Math.PI);
        var h = fh * (0.5 + wobble(i + 320) * 0.6) * grow;
        var w = 26 + wobble(i + 330) * 14;
        var sway = Math.sin(t * 26 + i * 1.3) * 10 * grow;
        setAlpha(ctx, 0.5 * grow);
        ctx.fillStyle = deep;
        flameTongue(ctx, x, groundY, w * 1.3, h * 1.1, sway * 1.2);
        setAlpha(ctx, 0.7 * grow);
        ctx.fillStyle = p.color;
        flameTongue(ctx, x, groundY, w, h, sway);
        setAlpha(ctx, 0.9 * grow);
        ctx.fillStyle = accent;
        flameTongue(ctx, x, groundY, w * 0.45, h * 0.55, sway * 0.6);
      }

      // 3. 昇る火の粉
      ctx.fillStyle = accent;
      for (i = 0; i < (d.embers || 30); i++) {
        var es = span(t, 0.2 + wobble(i + 400) * 0.5, 0.4);
        if (es <= 0 || es >= 1) continue;
        var ex = p.x + (wobble(i + 410) - 0.5) * spread * 2 + Math.sin(es * 9 + i) * 8;
        var ey = groundY - easeOut(es) * (fh + 60) * (0.6 + wobble(i + 420) * 0.5);
        var sz = (3 + wobble(i + 430) * 3) * (1 - es * 0.6);
        setAlpha(ctx, (1 - es) * 0.95);
        ctx.fillRect(ex - sz / 2, ey - sz / 2, sz, sz);
      }

      // 4. 焦熱の印：相手ひとりずつの足元に、赤く燻る輪が残る
      var mark = span(t, 0.55, 0.45);
      if (mark > 0) {
        for (k = 0; k < points.length; k++) {
          var mx = points[k].x, my = points[k].y + (d.groundY || 44);
          setAlpha(ctx, (1 - mark) * 0.85);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(mx, my, 48 + mark * 6, 12 + mark * 2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    },

    /**
     * 怒濤海嘯（v1.8.0・ブレスの最上位）。並びより背の高い大波が左から右へ押し寄せ、全員を呑み込んで抜ける。
     * 波は奥の濃い層と手前の層の2枚で、波頭が前へ巻いて泡が立つ。相手ひとりずつの所でしぶきが上がり、抜けたあと水が降る
     *   waveHeight / waveLength … 波の高さと長さ   groundY … 波の底の位置（中心から）   deepColor … 奥の層の色
     */
    tidalBreath: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var foam = d.foamColor || p.coreColor;
      var deep = d.deepColor || "#1d4f8a";
      var spread = d.spread || 300;
      var left = p.x - spread - 160, right = p.x + spread + 200;
      var ground = p.y + (d.groundY || 56);
      var w = span(t, 0.06, 0.5);
      var front = left + (right - left + 120) * w;
      // 抜けたあと、水が引いて低くなりながら消える
      var sink = span(t, 0.56, 0.34);
      var H = (d.waveHeight || 200) * (1 - easeOut(sink) * 0.85);
      var top = ground - H, sc = (d.waveHeight || 200) / 110;
      var a = (sink < 0.6) ? 1 : Math.max(0, 1 - (sink - 0.6) / 0.4);
      var i, k;

      function waveBody(shift, lift) {
        var tail = left - 40;
        var f = front + shift, tp = top - lift;
        ctx.beginPath();
        ctx.moveTo(tail, ground + 12);
        // 背中：うしろも高いまま（並び全体が水に呑まれる）。うねりながら波頭へ上がる
        for (var j = 0; j <= 20; j++) {
          var x = tail + (f - tail) * j / 20;
          var rise = 0.6 + 0.4 * Math.pow(j / 20, 2);
          ctx.lineTo(x, ground - (ground - tp) * rise + Math.sin(j * 1.1 + t * 10 + lift * 0.1) * 9);
        }
        ctx.quadraticCurveTo(f + 34 * sc, tp - 8 * sc, f + 30 * sc, tp + 18 * sc);
        ctx.quadraticCurveTo(f + 18 * sc, tp + 26 * sc, f + 10 * sc, tp + 16 * sc);
        ctx.quadraticCurveTo(f + 2 * sc, (tp + ground) / 2, f + 16 * sc, ground + 12);
        ctx.closePath();
      }

      if (w > 0 && a > 0) {
        // 奥の層（濃い・少し高い・少し遅れる）
        setAlpha(ctx, a * 0.4);
        ctx.fillStyle = deep;
        waveBody(-40, 24);
        ctx.fill();
        // 手前の層（相手が透けて見える濃さ）
        setAlpha(ctx, a * 0.38);
        ctx.fillStyle = p.color;
        waveBody(0, 0);
        ctx.fill();
        // 水の中を右へ流れる泡の筋
        ctx.lineCap = "round";
        ctx.strokeStyle = foam;
        ctx.lineWidth = 2;
        for (i = 0; i < 7; i++) {
          var ly = ground - H * (0.12 + wobble(i + 800) * 0.5);
          var lx = left + ((t * 900 + wobble(i + 810) * 900) % (front - left + 1));
          var len = 40 + wobble(i + 820) * 60;
          if (lx > front - 10) continue;
          setAlpha(ctx, a * 0.5);
          ctx.beginPath();
          ctx.moveTo(lx - len, ly);
          ctx.quadraticCurveTo(lx - len / 2, ly - 5, lx, ly);
          ctx.stroke();
        }
        // 波の中の筋
        ctx.lineCap = "round";
        ctx.strokeStyle = foam;
        for (i = 0; i < 3; i++) {
          setAlpha(ctx, a * (0.6 - i * 0.15));
          ctx.lineWidth = 3 - i * 0.6;
          var by = ground - H * (0.25 + i * 0.2);
          ctx.beginPath();
          ctx.moveTo(front - 260 + i * 40, by + 30);
          ctx.quadraticCurveTo(front - 120 + i * 20, by - 10, front + 6, by - H * 0.15);
          ctx.stroke();
        }
        // 波頭の泡
        ctx.fillStyle = foam;
        for (i = 0; i < 12; i++) {
          var fx = front + 30 * sc - i * 13 + Math.sin(t * 20 + i) * 3;
          var fy = top + 2 + i * 3 + wobble(i + 30) * 8;
          setAlpha(ctx, a * Math.max(0, 0.95 - i * 0.07));
          ctx.beginPath();
          ctx.arc(fx, fy, 3 + wobble(i + 40) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 相手ひとりずつの所で上がるしぶき（波の先頭が通ったとき）
      ctx.fillStyle = foam;
      for (k = 0; k < points.length; k++) {
        var passed = (front - points[k].x) / 260;
        if (passed <= 0 || passed >= 1) continue;
        for (i = 0; i < 10; i++) {
          var ss = span(passed, wobble(i + k * 13 + 500) * 0.3, 0.7);
          if (ss <= 0 || ss >= 1) continue;
          var ang = turns(-0.5 + wobble(i + 510) * 0.5);   // 上向きの半円
          var dist = 30 + wobble(i + 520) * 60;
          var sx = points[k].x + Math.cos(ang) * dist * ss;
          var sy = points[k].y - 10 + Math.sin(ang) * dist * ss + ss * ss * 60;
          setAlpha(ctx, (1 - ss) * 0.9);
          ctx.beginPath();
          ctx.arc(sx, sy, 2 + wobble(i + 530) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 抜けたあとに降る水
      var after = span(t, 0.6, 0.4);
      if (after > 0) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < 18; i++) {
          var rs = span(after, wobble(i + 600) * 0.5, 0.5);
          if (rs <= 0 || rs >= 1) continue;
          var rx = p.x + (wobble(i + 610) - 0.5) * spread * 2;
          var ry = top + 20 + easeIn(rs) * (H + 20);
          setAlpha(ctx, (1 - rs) * 0.8);
          ctx.beginPath();
          ctx.moveTo(rx, ry - 10);
          ctx.lineTo(rx, ry);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 冥府魔道（v1.8.0・ブレスの最上位）。濃い闇の息のあと、並びの上に冥府の門（闇の裂け目）が開き、
     * 相手ひとりずつへ闇の流れが降り注ぐ。相手のまわりを青白い亡者の炎が回りながら昇り、門が閉じて終わる
     *   gateHeight / gateWidth … 門の高さ（中心から上）と横幅   wisps … 1体あたりの亡者の炎の数
     *   darkColor … 門と流れの闇の色   rimColor … 門の縁と亡者の炎の色   息の部分は miasma と同じ項目
     */
    netherBreath: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var dark = d.darkColor || "#12081f";
      var rim = d.rimColor || "#c9b8ff";
      // 敵の並びは画面の上にあるので、門が画面の外へ出ないよう上を止める（gateMinY）
      var gy = Math.max(d.gateMinY || 24, p.y - (d.gateHeight || 130)), gw = d.gateWidth || 280;
      var i, j, k;

      SHAPES.miasma(ctx, d, t, p);

      // 1. 冥府の門（開いて、保って、閉じる）
      var open = (t < 0.22) ? easeOut(t / 0.22) : (t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.2) : 1);
      if (open > 0) {
        setAlpha(ctx, 0.9 * open);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(p.x, gy, gw * open, 34 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        setAlpha(ctx, 0.8 * open);
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 門の中で渦を巻く闇
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < 3; i++) {
          var st = turns(t * 1.5 + i / 3);
          setAlpha(ctx, 0.6 * open);
          ctx.beginPath();
          ctx.ellipse(p.x, gy, gw * open * (0.35 + i * 0.2), 34 * open * (0.35 + i * 0.2), 0, st, st + Math.PI * 0.8);
          ctx.stroke();
        }
      }

      // 2. 門から相手ひとりずつへ降り注ぐ闇の流れ（先が伸びていく帯）
      ctx.lineCap = "round";
      for (k = 0; k < points.length; k++) {
        var tx = points[k].x, ty = points[k].y;
        for (i = 0; i < 3; i++) {
          var s = span(t, 0.2 + k * 0.06 + i * 0.04, 0.5);
          if (s <= 0 || s >= 1) continue;
          var head = easeOut(Math.min(1, s * 1.6));
          var tail = Math.max(0, (s - 0.5) / 0.5);
          var sx = p.x + (tx - p.x) * 0.35 + (i - 1) * 40;
          var cx = (sx + tx) / 2 + (i - 1) * 50, cy = (gy + ty) / 2;
          for (var pass = 0; pass < 2; pass++) {
            setAlpha(ctx, pass === 0 ? 0.6 : 0.9);
            ctx.strokeStyle = pass === 0 ? p.color : dark;
            ctx.lineWidth = pass === 0 ? 20 : 12;
            ctx.beginPath();
            for (j = 0; j <= 12; j++) {
              var f = tail + (head - tail) * j / 12;
              var x = (1 - f) * (1 - f) * sx + 2 * (1 - f) * f * cx + f * f * tx;
              var y = (1 - f) * (1 - f) * gy + 2 * (1 - f) * f * cy + f * f * ty;
              x += Math.sin(f * 8 + t * 14 + i) * 5;
              if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }

        // 3. 亡者の炎（相手のまわりを回りながら昇る）
        for (i = 0; i < (d.wisps || 5); i++) {
          var ws = span(t, 0.4 + k * 0.05 + wobble(i + k * 7 + 700) * 0.2, 0.45);
          if (ws <= 0 || ws >= 1) continue;
          var ang = turns(ws * 1.2 + i / (d.wisps || 5));
          var wx = tx + Math.cos(ang) * 44;
          var wy = ty + 30 - ws * 80 + Math.sin(ang) * 10;
          var ga = Math.sin(ws * Math.PI);
          setAlpha(ctx, 0.5 * ga);
          ctx.fillStyle = p.color;
          flameTongue(ctx, wx, wy, 20, 38, Math.sin(ws * 10 + i) * 5);
          setAlpha(ctx, 0.9 * ga);
          ctx.fillStyle = rim;
          flameTongue(ctx, wx, wy, 10, 20, Math.sin(ws * 10 + i) * 3);
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 千刃旋風（v1.8.0）。風の息の上に、並び全体を巻く旋風を重ねる。
     *   1. 旋風の輪 … 横長の輪が下から上へ重なって回る（上ほど広い）
     *   2. 刃 … 輪に沿って無数の三日月の刃が回る（奥を回るものは薄い）
     *   3. 切り傷 … 相手ごとに斜めの切り傷が次々に走り、赤い線が残る
     *   4. 裂傷のしずく … 切り傷から赤いしずくが落ちる
     */
    bladeStorm: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var spread = d.spread || 280;
      var sh = d.stormHeight || 110;
      var cut = d.cutColor || "#ff6b6b";
      var base = p.y + sh * 0.45;
      var i, k;

      SHAPES.miasma(ctx, d, t, p);

      var wind = (t < 0.15) ? easeOut(t / 0.15) : (t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1);

      // 1. 旋風の輪
      var rings = d.rings || 5;
      ctx.lineCap = "round";
      for (i = 0; i < rings; i++) {
        var f = i / (rings - 1 || 1);
        var ry = base - f * sh * 1.2;
        var rx = spread * (0.5 + f * 0.5) * (0.6 + 0.4 * wind);
        var st = turns(t * 2.2 + i * 0.17);
        setAlpha(ctx, 0.55 * wind);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 3 + (1 - f) * 3;
        ctx.beginPath();
        ctx.ellipse(p.x, ry, rx, rx * 0.12, 0, st, st + Math.PI * 1.3);
        ctx.stroke();
      }

      // 2. 刃
      var blades = d.blades || 40;
      for (i = 0; i < blades; i++) {
        var bs = span(t, wobble(i + 300) * 0.3, 0.6);
        if (bs <= 0 || bs >= 1) continue;
        var lv = wobble(i + 310);
        var ang = turns(wobble(i + 320) + t * (1.6 + lv));
        var rr = spread * (0.5 + lv * 0.5) * (0.6 + 0.4 * wind);
        var bx = p.x + Math.cos(ang) * rr;
        var by = base - lv * sh * 1.2 + Math.sin(ang) * rr * 0.12;
        var size = (d.bladeSize || 12) * (0.7 + wobble(i + 340) * 0.6);
        var depth = (Math.sin(ang) < 0) ? 0.4 : 1;
        setAlpha(ctx, Math.sin(bs * Math.PI) * depth);
        ctx.fillStyle = (i % 3 === 0) ? p.coreColor : (d.bladeColor || "#eef6ff");
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(turns(t * 6 + wobble(i + 330)));
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(0, -size * 0.7, size, 0);
        ctx.quadraticCurveTo(0, -size * 0.1, -size, 0);
        ctx.fill();
        ctx.restore();
      }

      // 3. 切り傷 と 4. 裂傷のしずく
      for (k = 0; k < points.length; k++) {
        var tx = points[k].x, ty = points[k].y;
        for (i = 0; i < (d.cuts || 4); i++) {
          var n = k * 13 + i;
          var cs = span(t, 0.3 + k * 0.05 + i * 0.07, 0.4);
          if (cs <= 0 || cs >= 1) continue;
          var a = turns(0.1 + wobble(n + 400) * 0.3) * ((i % 2) ? 1 : -1);
          var len = 50 + wobble(n + 410) * 26;
          var cx = tx + (wobble(n + 420) - 0.5) * 34;
          var cy = ty + (wobble(n + 430) - 0.5) * 44;
          var draw = easeOut(Math.min(1, cs * 4));
          var ux = Math.cos(a) * len, uy = Math.sin(a) * len;
          var x1 = cx - ux / 2, y1 = cy - uy / 2;
          // 残る赤い線
          setAlpha(ctx, fadeOut(cs) * 0.9);
          ctx.strokeStyle = cut;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + ux * draw, y1 + uy * draw);
          ctx.stroke();
          // 走った瞬間の白い閃き
          if (cs < 0.35) {
            setAlpha(ctx, 1 - cs / 0.35);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + ux * draw, y1 + uy * draw);
            ctx.stroke();
          }
          // しずく
          for (var j = 0; j < 2; j++) {
            var ds = span(t, 0.42 + k * 0.05 + i * 0.07 + j * 0.05, 0.35);
            if (ds <= 0 || ds >= 1) continue;
            var dx = x1 + ux * (0.3 + j * 0.4);
            var dy = y1 + uy * (0.3 + j * 0.4) + ds * ds * 40;
            setAlpha(ctx, 1 - ds);
            ctx.fillStyle = cut;
            sapDrop(ctx, dx, dy, 2.5);
          }
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * 大地崩落（v1.8.0）。砂の息の上に、足元が崩れる絵を重ねる。
     *   1. 穴 … 地割れのあと、足元の地面が抜けて暗い穴が広がる（終わりに閉じる）
     *   2. 地割れ … 並びの真ん中から左右へジグザグに走る。ひびの中が光る
     *   3. 崩れる地面 … 相手ごとに3枚の板が傾きながら穴へ沈む
     *   4. 岩のかけら … 跳ね上がって落ちる
     *   5. 落石 … 相手ごとに上から大きな岩が落ちてくる
     *   6. 土煙 … 穴のふちから立ちのぼる
     */
    earthCollapse: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var spread = d.spread || 300;
      var gy = p.y + (d.groundY || 44);
      var pit = d.pitColor || "#1a120a";
      var i, j, k;

      SHAPES.miasma(ctx, d, t, p);

      var crack = span(t, 0.1, 0.25);
      var hole = span(t, 0.36, 0.3);
      var close = span(t, 0.82, 0.18);

      // 1. 穴
      if (hole > 0 && close < 1) {
        setAlpha(ctx, 0.85 * (1 - close));
        ctx.fillStyle = pit;
        ctx.beginPath();
        ctx.ellipse(p.x, gy + 6, spread * easeOut(hole), 28 * easeOut(hole), 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 0.6 * (1 - close));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 2. 地割れ
      if (crack > 0 && close < 1) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        var segs = 12;
        for (var side = -1; side <= 1; side += 2) {
          var path = [{ x: p.x, y: gy }];
          for (j = 1; j <= segs; j++) {
            var f = j / segs;
            if (f > crack) break;
            path.push({ x: p.x + side * spread * f, y: gy + (wobble(j * 7 + side * 3 + 500) - 0.5) * 16 });
          }
          if (path.length < 2) continue;
          var layers = [[pit, 7, 0.9], [p.coreColor, 2, 0.9]];
          for (var l = 0; l < layers.length; l++) {
            setAlpha(ctx, layers[l][2] * (1 - close));
            ctx.strokeStyle = layers[l][0];
            ctx.lineWidth = layers[l][1];
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            // 枝分かれ
            for (j = 2; j < path.length; j += 3) {
              var up = (wobble(j + side * 11 + 540) < 0.5) ? -1 : 1;
              ctx.moveTo(path[j].x, path[j].y);
              ctx.lineTo(path[j].x + side * 14, path[j].y + up * 14);
              ctx.lineTo(path[j].x + side * 22, path[j].y + up * 22);
            }
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
      }

      for (k = 0; k < points.length; k++) {
        var px = points[k].x, py = points[k].y;

        // 3. 崩れる地面
        for (i = 0; i < 3; i++) {
          var fs = span(t, 0.34 + k * 0.04 + i * 0.03, 0.5);
          if (fs <= 0 || fs >= 1) continue;
          var drop = easeIn(fs) * 70;
          var tilt = ((i - 1) * 0.6 + (wobble(k * 5 + i + 520) - 0.5) * 0.5) * fs;
          setAlpha(ctx, 1 - fs * fs);
          ctx.save();
          ctx.translate(px + (i - 1) * 44, gy + drop);
          ctx.rotate(tilt);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-22, -5); ctx.lineTo(21, -7); ctx.lineTo(17, 12); ctx.lineTo(-18, 14);
          ctx.closePath();
          ctx.fill();
          setAlpha(ctx, (1 - fs * fs) * 0.6);
          ctx.fillStyle = p.coreColor;
          ctx.beginPath();
          ctx.moveTo(-22, -5); ctx.lineTo(21, -7); ctx.lineTo(20, -2); ctx.lineTo(-21, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 5. 落石
        var rs = span(t, 0.48 + k * 0.06, 0.22);
        if (rs > 0 && rs < 1) {
          var ry = (py - 200) + (gy - 10 - (py - 200)) * easeIn(rs);
          setAlpha(ctx, 1);
          ctx.fillStyle = p.color;
          polygonPath(ctx, px + 8, ry, 30, 6, rs * 2, 0.85);
          ctx.fill();
          setAlpha(ctx, 0.5);
          ctx.fillStyle = p.coreColor;
          polygonPath(ctx, px + 2, ry - 8, 13, 5, rs * 2, 0.8);
          ctx.fill();
        }

        // 6. 土煙
        for (i = 0; i < 3; i++) {
          var us = span(t, 0.44 + k * 0.05 + i * 0.07, 0.5);
          if (us <= 0 || us >= 1) continue;
          setAlpha(ctx, fadeOut(us) * 0.4);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(px + (i - 1) * 40, gy - us * 50, 34 + us * 30, 14 + us * 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. 岩のかけら
      var rocks = d.rocks || 24;
      ctx.fillStyle = p.color;
      for (i = 0; i < rocks; i++) {
        var cs = span(t, 0.34 + wobble(i + 560) * 0.25, 0.5);
        if (cs <= 0 || cs >= 1) continue;
        var ox = p.x + (wobble(i + 570) - 0.5) * spread * 1.8;
        var ang = turns(0.75 + (wobble(i + 580) - 0.5) * 0.35);
        var sp = 70 + wobble(i + 590) * 70;
        var x = ox + Math.cos(ang) * sp * cs;
        var y = gy + Math.sin(ang) * sp * cs + 220 * cs * cs;
        setAlpha(ctx, fadeOut(cs));
        polygonPath(ctx, x, y, 3 + wobble(i + 600) * 5, 5, cs * 6 + i, 0.8);
        ctx.fill();
      }
    },

    /**
     * 万雷轟天（v1.8.0）。雷の息の上に、雷雲と無数の雷を重ねる。
     *   1. 雷雲 … 並びの上に暗い雲が広がり、中がちらちら光る（画面の上で止める）
     *   2. 万雷 … 雲から細い雷が並び全体へ次々に落ちる
     *   3. 大きな雷 … 相手ごとにほぼ同時に太い雷が落ち、並び全体が白く光る
     *   4. 体を這う電気 … 相手のまわりを小さなジグザグが走る（麻痺）
     */
    thunderHeaven: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var spread = d.spread || 300;
      var cloudY = Math.max(d.cloudMinY || 18, p.y - (d.cloudHeight || 120));
      var gy = p.y + (d.groundY || 44);
      var flick = Math.floor(t * 12);
      var i, k;

      SHAPES.miasma(ctx, d, t, p);

      // 1. 雷雲
      var cl = (t < 0.18) ? easeOut(t / 0.18) : (t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.18) : 1);
      if (cl > 0) {
        var clouds = 9;
        // 雲は暗く見せたいので、属性の色の光（glow）を消して塗る
        ctx.save();
        ctx.shadowBlur = 0;
        for (i = 0; i < clouds; i++) {
          var cx = p.x + (i / (clouds - 1) - 0.5) * spread * 1.8 + Math.sin(t * 3 + i) * 6;
          var r = 34 + wobble(i + 620) * 22;
          setAlpha(ctx, 0.8 * cl);
          ctx.fillStyle = d.cloudColor || "#262a40";
          ctx.beginPath();
          ctx.ellipse(cx, cloudY + (wobble(i + 630) - 0.5) * 14, r * 1.4 * cl, r * 0.55 * cl, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // 雲の中のちらつき
        if (flick % 3 === 0) {
          // ふちの柔らかい光（雲の中で稲光が走る）
          ctx.save();
          ctx.translate(p.x + (wobble(flick + 640) - 0.5) * spread, cloudY);
          ctx.scale(1, 0.25);
          var lit = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
          lit.addColorStop(0, p.coreColor);
          lit.addColorStop(0.4, p.color);
          lit.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, 0.5 * cl);
          ctx.fillStyle = lit;
          ctx.beginPath();
          ctx.arc(0, 0, 100, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 2. 万雷
      for (i = 0; i < (d.bolts || 16); i++) {
        var bs = span(t, 0.14 + wobble(i + 650) * 0.55, 0.16);
        if (bs <= 0 || bs >= 1) continue;
        var bx = p.x + (wobble(i + 660) - 0.5) * spread * 1.9;
        var reach = easeOut(Math.min(1, bs * 4));
        var vis = (bs < 0.3) ? 1 : 0.7 * (1 - bs);
        setAlpha(ctx, vis * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        zigzagPath(ctx, bx, cloudY + 10, bx + (wobble(i + 670) - 0.5) * 40, gy, 6, 24, i * 17 + flick * 5, reach);
        ctx.stroke();
        setAlpha(ctx, vis);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. 大きな雷と閃光
      var flash = span(t, 0.42, 0.25);
      if (flash > 0 && flash < 1) {
        // 角のある四角だと箱に見えるので、横長の楕円に引き伸ばして塗る
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.45);
        var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, spread * 1.2);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - flash) * (1 - flash) * 0.55);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, spread * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (k = 0; k < points.length; k++) {
        var ks = span(t, 0.4 + k * 0.03, 0.42);
        if (ks <= 0 || ks >= 1) continue;
        var kr = easeOut(Math.min(1, ks * 6));
        var kv = (ks < 0.25) ? 1 : ((Math.floor(ks * 16) % 2 === 0) ? 0.8 : 0.3) * fadeOut(ks);
        var widths = [[p.color, 16, 0.7], [p.coreColor, 7, 0.95], ["#ffffff", 3, 1]];
        for (var l = 0; l < widths.length; l++) {
          setAlpha(ctx, kv * widths[l][2]);
          ctx.strokeStyle = widths[l][0];
          ctx.lineWidth = widths[l][1] * (1 - ks * 0.4);
          zigzagPath(ctx, points[k].x, cloudY + 6, points[k].x, points[k].y + 20, 7, 40, k * 31 + flick * 7, kr);
          ctx.stroke();
        }
        // 落ちたところの火花
        if (ks > 0.15) {
          var ss = (ks - 0.15) / 0.85;
          ctx.fillStyle = p.coreColor;
          for (i = 0; i < 10; i++) {
            var sa = turns(wobble(k * 11 + i + 680));
            var sd = 20 + ss * (40 + wobble(k * 11 + i + 690) * 30);
            setAlpha(ctx, 1 - ss);
            ctx.fillRect(points[k].x + Math.cos(sa) * sd - 2, points[k].y + 20 + Math.sin(sa) * sd * 0.6 - 2, 4, 4);
          }
        }
      }

      // 4. 体を這う電気
      for (k = 0; k < points.length; k++) {
        for (i = 0; i < 4; i++) {
          var es = span(t, 0.55 + i * 0.07 + k * 0.03, 0.22);
          if (es <= 0 || es >= 1) continue;
          var a0 = turns(wobble(k * 7 + i + 700) + flick * 0.13);
          setAlpha(ctx, Math.sin(es * Math.PI));
          ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var s = 0; s <= 6; s++) {
            var aa = a0 + s * 0.22;
            var rr = 40 + (wobble(k * 13 + i * 7 + s + flick * 3 + 710) - 0.5) * 16;
            var ex = points[k].x + Math.cos(aa) * rr;
            var ey = points[k].y + Math.sin(aa) * rr * 0.75;
            if (s === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
          }
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 光芒万丈（v1.8.0）。光の息の上に、光の玉と光の筋・光の柱を重ねる。
     *   1. 光芒 … 光の玉から細長い光の筋が四方へ伸び、ゆっくり回る
     *   2. 光の玉 … 並びの上に昇って輝く（画面の上で止める）
     *   3. 光の柱 … 相手ごとに上から光の柱が降りる
     *   4. 閃光 … 柱が降りたとき、並び全体が白く光る
     *   5. またたく星 … 相手のまわりで十字の星が光る（盲目）
     */
    radiantBreath: function (ctx, d, t, p) {
      var points = pointsOf(p);
      var spread = d.spread || 300;
      var sy = Math.max(d.sunMinY || 34, p.y - (d.sunHeight || 110));
      var i, k;

      SHAPES.miasma(ctx, d, t, p);

      var sun = (t < 0.2) ? easeOut(t / 0.2) : (t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.2) : 1);

      // 1. 光芒（細長い三角。根元が太く、先が細い）
      if (sun > 0) {
        var rays = d.rays || 16;
        var grow = easeOut(span(t, 0.08, 0.35));
        for (i = 0; i < rays; i++) {
          var a = turns(i / rays + t * 0.08);
          var len = (d.rayLength || 420) * grow * (0.55 + wobble(i + 800) * 0.45);
          var w = 0.05 + wobble(i + 810) * 0.03;
          setAlpha(ctx, 0.35 * sun * (0.6 + 0.4 * Math.sin(t * 20 + i)));
          ctx.fillStyle = (i % 2) ? p.color : p.coreColor;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a - w) * 20, sy + Math.sin(a - w) * 20);
          ctx.lineTo(p.x + Math.cos(a) * len, sy + Math.sin(a) * len);
          ctx.lineTo(p.x + Math.cos(a + w) * 20, sy + Math.sin(a + w) * 20);
          ctx.closePath();
          ctx.fill();
        }

        // 2. 光の玉（ぼかした外側と白い芯）
        var r = (d.sunRadius || 30) * sun * (1 + Math.sin(t * 18) * 0.05);
        var halo = ctx.createRadialGradient(p.x, sy, 0, p.x, sy, r * 3);
        halo.addColorStop(0, "#ffffff");
        halo.addColorStop(0.3, p.color);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.8 * sun);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(p.x, sy, r * 3, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, sun);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, sy, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. 光の柱（上が細く、下が広い。真ん中ほど明るい）
      for (k = 0; k < points.length; k++) {
        var cs = span(t, 0.32 + k * 0.04, 0.5);
        if (cs <= 0 || cs >= 1) continue;
        var tx = points[k].x, ty = points[k].y;
        var down = easeOut(Math.min(1, cs * 4));
        var bottom = sy + (ty + 50 - sy) * down;
        var pa = (cs < 0.6) ? 1 : 1 - (cs - 0.6) / 0.4;
        var bw = 46 * (1 - Math.max(0, cs - 0.6));
        var col = ctx.createLinearGradient(tx - bw, 0, tx + bw, 0);
        col.addColorStop(0, "rgba(0,0,0,0)");
        col.addColorStop(0.35, p.color);
        col.addColorStop(0.5, "#ffffff");
        col.addColorStop(0.65, p.color);
        col.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.75 * pa);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(tx - bw * 0.35, sy);
        ctx.lineTo(tx + bw * 0.35, sy);
        ctx.lineTo(tx + bw, bottom);
        ctx.lineTo(tx - bw, bottom);
        ctx.closePath();
        ctx.fill();
        // 足元に広がる光の輪
        if (down >= 1) {
          setAlpha(ctx, 0.7 * pa);
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(tx, ty + 50, bw * (1 + cs * 0.6), 10 + cs * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 4. 閃光（横長の楕円。ふちは柔らかい）
      var flash = span(t, 0.4, 0.25);
      if (flash > 0 && flash < 1) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.45);
        var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, spread * 1.2);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.55, p.color);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - flash) * (1 - flash) * 0.6);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(0, 0, spread * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. またたく星（十字の光）
      for (k = 0; k < points.length; k++) {
        for (i = 0; i < (d.stars || 6); i++) {
          var n = k * 17 + i;
          var ss = span(t, 0.5 + wobble(n + 820) * 0.3, 0.25);
          if (ss <= 0 || ss >= 1) continue;
          var stx = points[k].x + (wobble(n + 830) - 0.5) * 90;
          var sty = points[k].y + (wobble(n + 840) - 0.5) * 80;
          var sr = (8 + wobble(n + 850) * 10) * Math.sin(ss * Math.PI);
          setAlpha(ctx, Math.sin(ss * Math.PI));
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(stx, sty - sr);
          ctx.quadraticCurveTo(stx, sty, stx + sr, sty);
          ctx.quadraticCurveTo(stx, sty, stx, sty + sr);
          ctx.quadraticCurveTo(stx, sty, stx - sr, sty);
          ctx.quadraticCurveTo(stx, sty, stx, sty - sr);
          ctx.fill();
        }
      }
    },

    /**
     * ウォークライ（v1.8.0）。ひとりずつに出す。
     *   1. 声の輪 … 体から、とげとげの輪が3つ続けて広がる
     *   2. 闘気 … 体のまわりから炎のような闘気が立ちのぼる
     *   3. 矢じり … 上がることを見せる矢じりが昇る
     */
    warCry: function (ctx, d, t, p) {
      var i, j;
      var R = d.radius || 78;
      var spikes = d.spikes || 14;
      // 1. 声の輪
      for (i = 0; i < (d.shouts || 3); i++) {
        var s = span(t, i * 0.12, 0.45);
        if (s <= 0 || s >= 1) continue;
        var r = R * easeOut(s);
        setAlpha(ctx, (1 - s) * 0.9);
        ctx.strokeStyle = (i === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 3 * (1 - s * 0.5);
        ctx.beginPath();
        for (j = 0; j <= spikes * 2; j++) {
          var a = turns(j / (spikes * 2) + i * 0.03);
          var rr = r * ((j % 2) ? 0.82 : 1);
          var x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr * 0.8;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // 2. 闘気
      for (i = 0; i < (d.flames || 7); i++) {
        var fs = span(t, 0.15 + wobble(i + 900) * 0.25, 0.55);
        if (fs <= 0 || fs >= 1) continue;
        var fx = p.x + ((i / ((d.flames || 7) - 1)) - 0.5) * 70;
        var fh = (d.flameHeight || 70) * Math.sin(fs * Math.PI) * (0.7 + wobble(i + 910) * 0.5);
        setAlpha(ctx, Math.sin(fs * Math.PI) * 0.55);
        ctx.fillStyle = p.color;
        flameTongue(ctx, fx, p.y + 40 - fs * 20, 22, fh, Math.sin(t * 20 + i) * 6);
        setAlpha(ctx, Math.sin(fs * Math.PI) * 0.7);
        ctx.fillStyle = p.coreColor;
        flameTongue(ctx, fx, p.y + 40 - fs * 20, 9, fh * 0.5, Math.sin(t * 20 + i) * 3);
      }
      // 3. 矢じり
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 0; i < (d.count || 6); i++) {
        var cs = span(t, 0.3 + (i % 3) * 0.08 + Math.floor(i / 3) * 0.15, 0.45);
        if (cs <= 0 || cs >= 1) continue;
        var lx = p.x + ((i % 3) - 1) * 26;
        var ly = p.y + 20 - 80 * easeOut(cs);
        setAlpha(ctx, fadeOut(cs));
        ctx.strokeStyle = (cs < 0.25) ? p.coreColor : p.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(lx - 11, ly + 9);
        ctx.lineTo(lx, ly);
        ctx.lineTo(lx + 11, ly + 9);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * プロテクション（v1.8.0）。ひとりずつに出す。
     *   1. 六角の殻 … 足元の段から上の段へ、六角の板が順に現れて体を包む（奥の板は薄い）
     *   2. 光のなで … 組み上がったあと、明るい帯が下から上へなでる
     *   3. 吸い込み … 最後に殻が少し縮んで体に溶ける
     */
    protection: function (ctx, d, t, p) {
      hexShell(ctx, d, t, p, 0);
    },

    /**
     * クイックル（v1.8.0）。ひとりずつに出す。
     *   1. 足の翼 … 足元の左右に小さな翼が生えて羽ばたく
     *   2. 昇る風 … 緑の風が体を巻きながら昇る
     *   3. 羽根 … 小さな羽根がひらひら舞い上がる
     */
    quickle: function (ctx, d, t, p) {
      var i, side;
      var footY = p.y + 34;
      var w = d.wing || 26;
      // 1. 足の翼
      var ws = span(t, 0.05, 0.85);
      if (ws > 0 && ws < 1) {
        var open = Math.sin(ws * Math.PI);
        var flap = Math.sin(t * 40) * 0.35;
        for (side = -1; side <= 1; side += 2) {
          var bx = p.x + side * 22;
          ctx.save();
          ctx.translate(bx, footY);
          ctx.scale(side, 1);
          ctx.rotate(-0.4 + flap);
          for (i = 0; i < 3; i++) {
            setAlpha(ctx, open * (0.9 - i * 0.2));
            ctx.fillStyle = (i === 0) ? p.coreColor : p.color;
            var fl = w * open * (1 - i * 0.22);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(fl * 0.5, -fl * 0.55 + i * 5, fl, -fl * 0.35 + i * 7);
            ctx.quadraticCurveTo(fl * 0.55, -fl * 0.05 + i * 4, 0, 0);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      // 2. 昇る風
      ctx.lineCap = "round";
      for (i = 0; i < (d.swirls || 3); i++) {
        var ss = span(t, 0.1 + i * 0.12, 0.55);
        if (ss <= 0 || ss >= 1) continue;
        var cy = footY - ss * (d.rise || 80);
        var rad = (d.radius || 40) * (1 - ss * 0.3);
        var st = turns(ss * 1.4 + i * 0.33);
        setAlpha(ctx, fadeOut(ss) * 0.9);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, cy, rad, rad * 0.3, 0, st, st + Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 3. 羽根
      for (i = 0; i < (d.feathers || 6); i++) {
        var fs = span(t, 0.25 + wobble(i + 950) * 0.35, 0.5);
        if (fs <= 0 || fs >= 1) continue;
        var fx = p.x + (wobble(i + 960) - 0.5) * 80 + Math.sin(fs * 9 + i) * 10;
        var fy = footY - 10 - fs * 90;
        setAlpha(ctx, Math.sin(fs * Math.PI));
        ctx.fillStyle = p.coreColor;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(Math.sin(fs * 7 + i) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },

    /**
     * オーバードライブ（v1.8.0）。ひとりに出す。ウォークライの一段上
     *   1. 足元の光 … 足元に光の輪が広がる
     *   2. 闘気の柱 … 太い柱が立ちのぼり、細くなって消える
     *   3. 炎の闘気 … 体を包む大きな炎（赤と金）
     *   4. はじける稲妻 … 体のまわりで小さな稲妻がはじける
     *   5. 火の粉 … 上へ散る
     */
    overdrive: function (ctx, d, t, p) {
      var i;
      var footY = p.y + 40;
      var gold = d.accentColor || "#ffd75e";
      // 1. 足元の光
      var gs = span(t, 0, 0.4);
      if (gs > 0 && gs < 1) {
        setAlpha(ctx, (1 - gs) * 0.9);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, 70 * easeOut(gs), 18 * easeOut(gs), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 2. 闘気の柱
      var ps = span(t, 0.08, 0.6);
      if (ps > 0 && ps < 1) {
        var pw = (d.pillar || 52) * (ps < 0.3 ? easeOut(ps / 0.3) : 1 - (ps - 0.3) / 0.7);
        var ph = (d.pillarHeight || 150) * easeOut(Math.min(1, ps * 3));
        var g = ctx.createLinearGradient(p.x - pw, 0, p.x + pw, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.3, p.color);
        g.addColorStop(0.5, "#ffffff");
        g.addColorStop(0.7, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.7);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - pw, footY - ph, pw * 2, ph);
      }
      // 3. 炎の闘気
      var n = d.flames || 10;
      for (i = 0; i < n; i++) {
        var fs = span(t, 0.12 + wobble(i + 970) * 0.3, 0.6);
        if (fs <= 0 || fs >= 1) continue;
        var fx = p.x + ((i / (n - 1)) - 0.5) * 84;
        var mid = 1 - Math.abs((i / (n - 1)) - 0.5) * 1.2;
        var fh = (d.flameHeight || 96) * mid * Math.sin(fs * Math.PI) * (0.8 + wobble(i + 980) * 0.4);
        var sway = Math.sin(t * 24 + i * 1.7) * 7;
        setAlpha(ctx, Math.sin(fs * Math.PI) * 0.6);
        ctx.fillStyle = p.color;
        flameTongue(ctx, fx, footY, 28, fh, sway);
        setAlpha(ctx, Math.sin(fs * Math.PI) * 0.75);
        ctx.fillStyle = gold;
        flameTongue(ctx, fx, footY, 14, fh * 0.6, sway * 0.6);
      }
      // 4. はじける稲妻
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      var flick = Math.floor(t * 14);
      for (i = 0; i < (d.arcs || 5); i++) {
        var as = span(t, 0.25 + i * 0.1, 0.18);
        if (as <= 0 || as >= 1) continue;
        var a = turns(wobble(i + flick * 3 + 990));
        var ax = p.x + Math.cos(a) * 30, ay = p.y + Math.sin(a) * 34;
        setAlpha(ctx, 1 - as);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.5;
        zigzagPath(ctx, ax, ay, ax + Math.cos(a) * 40, ay + Math.sin(a) * 40, 4, 16, i * 7 + flick, 1);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      // 5. 火の粉
      ctx.fillStyle = gold;
      for (i = 0; i < (d.count || 14); i++) {
        var es = span(t, 0.2 + wobble(i + 1000) * 0.4, 0.45);
        if (es <= 0 || es >= 1) continue;
        var ex = p.x + (wobble(i + 1010) - 0.5) * 90;
        var ey = footY - es * (90 + wobble(i + 1020) * 60);
        setAlpha(ctx, 1 - es);
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
    },

    /**
     * アイギス（v1.8.0）。ひとりに出す。プロテクションの一段上
     *   1. 神盾 … 体の前に丸い盾が大きくなって現れる（縁・内の輪・十字の紋）。光がなでる
     *   2. 殻 … 盾が消えるころ、六角の殻が体を包む（プロテクションと同じ組み方で、金の縁）
     */
    aegis: function (ctx, d, t, p) {
      var gold = d.accentColor || "#fff3c4";
      var R = d.shield || 46;
      // 1. 神盾
      var ss = span(t, 0, 0.6);
      if (ss > 0 && ss < 1) {
        var grow = easeOut(Math.min(1, ss * 3));
        var fade = (ss > 0.7) ? 1 - (ss - 0.7) / 0.3 : 1;
        var r = R * grow * (ss > 0.7 ? 1 + (ss - 0.7) * 0.8 : 1);
        var cy = p.y - 4;
        setAlpha(ctx, 0.45 * fade);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, cy, r, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 0.95 * fade);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, cy, r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        // 十字の紋と、まわりの8つの鋲
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, cy - r * 0.5); ctx.lineTo(p.x, cy + r * 0.5);
        ctx.moveTo(p.x - r * 0.5, cy); ctx.lineTo(p.x + r * 0.5, cy);
        ctx.stroke();
        ctx.fillStyle = gold;
        for (var i = 0; i < 8; i++) {
          var a = turns(i / 8 + 1 / 16);
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // 光がなでる（斜めの明るい帯。盾の丸の中だけ）
        var sw = span(ss, 0.3, 0.4);
        if (sw > 0 && sw < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, cy, r, 0, Math.PI * 2);
          ctx.clip();
          setAlpha(ctx, 0.7 * fade);
          ctx.fillStyle = "#ffffff";
          var sx = p.x - r * 1.5 + r * 3 * sw;
          ctx.beginPath();
          ctx.moveTo(sx - 8, cy - r); ctx.lineTo(sx + 8, cy - r);
          ctx.lineTo(sx - 12, cy + r); ctx.lineTo(sx - 28, cy + r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      // 2. 殻
      hexShell(ctx, d, Math.max(0, (t - 0.45) / 0.55), p, 1);
    },

    /**
     * アクセル（v1.8.0）。ひとりに出す。クイックルの一段上
     *   1. 時計 … 胸の前に時計が現れ、針がどんどん速く回る（残像が増える）
     *   2. 昇る風 … 緑の風が体を巻いて速く昇る
     *   3. はじける筋 … 最後に時計がはじけ、速い筋が四方へ飛ぶ
     */
    accel: function (ctx, d, t, p) {
      var i;
      var R = d.dial || 30;
      var cy = p.y - 6;
      // 1. 時計（0〜0.7）。針の角度は t の3乗で、だんだん速くなる
      var ds = span(t, 0, 0.7);
      if (ds > 0 && ds < 1) {
        var show = Math.min(1, ds * 5) * (ds > 0.85 ? (1 - ds) / 0.15 : 1);
        var ang = turns(ds * ds * ds * 6);
        var speed = 3 * ds * ds * 6;            // 残像の長さに使う
        dial(ctx, p.x, cy, R, ang, Math.min(1.6, speed * 0.08), show, p);
      }
      // 2. 昇る風
      ctx.lineCap = "round";
      for (i = 0; i < (d.swirls || 5); i++) {
        var ss = span(t, 0.08 + i * 0.09, 0.4);
        if (ss <= 0 || ss >= 1) continue;
        var wy = p.y + 36 - easeIn(ss) * (d.rise || 96);
        var rad = (d.radius || 42) * (1 - ss * 0.35);
        var st = turns(ss * 2.4 + i * 0.27);
        setAlpha(ctx, fadeOut(ss) * 0.9);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, wy, rad, rad * 0.3, 0, st, st + Math.PI * 1.3);
        ctx.stroke();
      }
      // 3. はじける筋
      var bs = span(t, 0.62, 0.35);
      if (bs > 0 && bs < 1) {
        for (i = 0; i < (d.burst || 12); i++) {
          var a = turns(i / (d.burst || 12) + 0.02);
          var r1 = R * 0.8 + 70 * easeOut(bs);
          var r0 = r1 - 26 * (1 - bs);
          setAlpha(ctx, 1 - bs);
          ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8);
          ctx.lineTo(p.x + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * クラック（v1.8.0）。ひとりに出す
     *   1. 守りの板 … 体の前に六角の板が現れる
     *   2. ひび … 真ん中から何本もジグザグのひびが走る
     *   3. 割れる … 板が消え、かけらが回りながら落ちる。下向きの矢じりが沈む
     */
    crack: function (ctx, d, t, p) {
      var i;
      var R = d.plate || 40;
      var cy = p.y - 4;
      var breakAt = 0.55;
      // 1. 板とひび
      if (t < breakAt + 0.05) {
        var show = Math.min(1, t * 6);
        var shake = (t > 0.25) ? Math.sin(t * 90) * 2 : 0;
        setAlpha(ctx, 0.4 * show);
        ctx.fillStyle = p.color;
        polygonPath(ctx, p.x + shake, cy, R * easeOut(show), 6, Math.PI / 6, 1);
        ctx.fill();
        setAlpha(ctx, 0.95 * show);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        // 2. ひび
        var cs = span(t, 0.2, 0.3);
        if (cs > 0) {
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          setAlpha(ctx, 1);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          for (i = 0; i < (d.cracks || 6); i++) {
            var a = turns(i / (d.cracks || 6) + wobble(i + 1100) * 0.08);
            zigzagPath(ctx, p.x + shake, cy, p.x + shake + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95,
              4, 12, i * 9 + 1110, Math.min(1, cs * (1 + wobble(i + 1120) * 0.5)));
            ctx.stroke();
          }
          ctx.lineJoin = "miter";
          ctx.lineCap = "butt";
        }
      }
      // 3. かけら（割れたあと、回りながら落ちる）
      var fs = span(t, breakAt, 1 - breakAt);
      if (fs > 0 && fs < 1) {
        for (i = 0; i < (d.shards || 10); i++) {
          var sa = turns(i / (d.shards || 10) + wobble(i + 1130) * 0.1);
          var sp = 30 + wobble(i + 1140) * 40;
          var sx = p.x + Math.cos(sa) * (R * 0.5 + sp * fs);
          var sy = cy + Math.sin(sa) * (R * 0.5 + sp * fs * 0.6) + 120 * fs * fs;
          setAlpha(ctx, 1 - fs);
          ctx.fillStyle = (i % 2) ? p.color : p.coreColor;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(fs * 6 * (wobble(i + 1150) - 0.5) * 2);
          ctx.beginPath();
          ctx.moveTo(-7, -5); ctx.lineTo(8, -3); ctx.lineTo(-2, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        downChevrons(ctx, p, fs, 3, 0);
      }
    },

    /**
     * スロウ（v1.8.0）。ひとりに出す
     *   1. 時計 … 頭の上に時計が現れ、針がだんだん遅くなって止まる
     *   2. 重い沼 … 足元に濃い沼が広がり、ぶくぶくと泡が出る
     *   3. 矢じり … 下向きの矢じりが沈む
     */
    slow: function (ctx, d, t, p) {
      var R = d.dial || 24;
      // 1. 時計。針は easeOut で、だんだん遅くなって止まる
      var ds = span(t, 0, 0.85);
      if (ds > 0 && ds < 1) {
        var show = Math.min(1, ds * 5) * (ds > 0.8 ? (1 - ds) / 0.2 : 1);
        dial(ctx, p.x, p.y - 74, R, turns(easeOut(Math.min(1, ds * 1.3)) * 1.5), 0, show, p);
      }
      // 2. 重い沼
      var ms = span(t, 0.1, 0.85);
      if (ms > 0 && ms < 1) {
        var mr = (d.radius || 46) * easeOut(Math.min(1, ms * 2.5));
        var ma = (ms > 0.7) ? (1 - ms) / 0.3 : 1;
        setAlpha(ctx, 0.6 * ma);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 38, mr, mr * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 0.5 * ma);
        ctx.fillStyle = "#0c1020";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 39, mr * 0.7, mr * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // 泡
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 1.5;
        for (var i = 0; i < 4; i++) {
          var bs = span(ms, 0.15 + i * 0.15, 0.25);
          if (bs <= 0 || bs >= 1) continue;
          setAlpha(ctx, (1 - bs) * ma);
          ctx.beginPath();
          ctx.arc(p.x + (wobble(i + 1160) - 0.5) * mr * 1.2, p.y + 36 - bs * 6, 2 + bs * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 矢じり
      downChevrons(ctx, p, span(t, 0.2, 0.75), d.count || 6, 1);
    },

    /**
     * コラプス（v1.8.0）。ひとりずつに出す（全体）
     *   1. 殻 … プロテクションと同じ六角の殻が組み上がる
     *   2. 崩れる … ひびが入って、板がばらばらに回りながら落ちる。下向きの矢じりが沈む
     */
    collapse: function (ctx, d, t, p) {
      var R = d.radius || 54;
      var rings = d.rings || 4, cells = d.cells || 8, size = d.cellSize || 13;
      var fall = span(t, 0.4, 0.6);
      var shake = (t > 0.28 && t < 0.42) ? Math.sin(t * 120) * 2.5 : 0;
      for (var row = 0; row < rings; row++) {
        var f = row / (rings - 1 || 1);
        var lat = -0.15 + f * 1.05;
        var ry = p.y + 30 - f * (R * 1.5);
        var rr = R * Math.cos(lat * Math.PI / 2.4);
        var appear = span(t, row * 0.05, 0.12);
        if (appear <= 0) continue;
        for (var c = 0; c < cells; c++) {
          var n = row * cells + c;
          var a = turns(c / cells + row * 0.5 / cells);
          var back = Math.sin(a) < 0;
          var cx = p.x + Math.cos(a) * rr + shake;
          var cy = ry + Math.sin(a) * rr * 0.25;
          // 上の段から先に崩れる
          var fs = span(fall, (1 - f) * 0.25 + wobble(n + 1170) * 0.15, 0.6);
          if (fs >= 1) continue;
          var dx = Math.cos(a) * 30 * fs;
          var dy = 150 * fs * fs;
          var sz = size * easeOut(Math.min(1, appear)) * (0.6 + 0.4 * Math.abs(Math.sin(a) * 0.5 + 0.5));
          ctx.save();
          ctx.translate(cx + dx, cy + dy);
          ctx.rotate(fs * 5 * (wobble(n + 1180) - 0.5));
          setAlpha(ctx, (back ? 0.2 : 0.45) * (1 - fs));
          ctx.fillStyle = p.color;
          polygonPath(ctx, 0, 0, sz, 6, Math.PI / 6, 0.85);
          ctx.fill();
          setAlpha(ctx, (back ? 0.35 : 0.9) * (1 - fs));
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // ひび（崩れる前に白い線が入る）
          if (t > 0.28 && !back) {
            ctx.beginPath();
            ctx.moveTo(-sz * 0.6, -sz * 0.2); ctx.lineTo(0, sz * 0.1); ctx.lineTo(sz * 0.5, -sz * 0.4);
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      downChevrons(ctx, p, span(t, 0.5, 0.5), 3, 0);
    },

    /**
     * グラビティ（v1.8.0）。ひとりずつに出す（全体）
     *   1. 重い輪 … 上から輪が何枚も降りてきて、足元へ押しつぶすように縮む
     *   2. へこむ地面 … 足元に暗いくぼみが広がる
     *   3. 引かれる粒 … まわりの粒が下へ強く引かれる
     */
    gravity: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 50;
      var footY = p.y + 38;
      // 2. へこむ地面
      var gs = span(t, 0.15, 0.85);
      if (gs > 0 && gs < 1) {
        var ga = (gs > 0.7) ? (1 - gs) / 0.3 : 1;
        var gr = R * 1.1 * easeOut(Math.min(1, gs * 2));
        setAlpha(ctx, 0.75 * ga);
        ctx.fillStyle = d.darkColor || "#0c1020";
        ctx.beginPath();
        ctx.ellipse(p.x, footY, gr, gr * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 0.8 * ga);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // 1. 重い輪（上から降りて、足元で潰れる）
      for (i = 0; i < (d.rings || 5); i++) {
        var rs = span(t, i * 0.1, 0.4);
        if (rs <= 0 || rs >= 1) continue;
        var y = (p.y - 90) + (footY - (p.y - 90)) * easeIn(rs);
        var r = R * (1 - rs * 0.15);
        var squash = 0.3 - rs * 0.15;
        setAlpha(ctx, Math.sin(rs * Math.PI) * 0.9);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 4 * (1 - rs * 0.4);
        ctx.beginPath();
        ctx.ellipse(p.x, y, r, r * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 3. 引かれる粒
      ctx.fillStyle = p.coreColor;
      for (i = 0; i < (d.count || 14); i++) {
        var ps = span(t, 0.1 + wobble(i + 1190) * 0.5, 0.35);
        if (ps <= 0 || ps >= 1) continue;
        var px = p.x + (wobble(i + 1200) - 0.5) * R * 2.2;
        var py = p.y - 70 + wobble(i + 1210) * 50 + easeIn(ps) * 110;
        setAlpha(ctx, 1 - ps);
        ctx.fillRect(px - 1.5, py - 5, 3, 10);
      }
      downChevrons(ctx, p, span(t, 0.3, 0.7), 3, 0);
    },

    /**
     * シャター（v1.8.0）。ひとりに出す。クラックの一段上
     *   1. 響きの輪 … 外から板へ輪が3つ縮んで集まる
     *   2. 板とひび … 六角の板が現れ、震え、ひびが板いっぱいに走る
     *   3. はじける … 白く光って、かけらが四方へ勢いよく飛ぶ。下向きの矢じりが6つ沈む
     */
    shatterArmor: function (ctx, d, t, p) {
      var i;
      var R = d.plate || 46;
      var cy = p.y - 4;
      var breakAt = 0.55;
      // 1. 響きの輪
      for (i = 0; i < 3; i++) {
        var rs = span(t, i * 0.1, 0.3);
        if (rs <= 0 || rs >= 1) continue;
        setAlpha(ctx, Math.sin(rs * Math.PI) * 0.9);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, cy, R * (2.4 - 1.4 * easeIn(rs)), R * (2.4 - 1.4 * easeIn(rs)) * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 2. 板とひび
      if (t < breakAt) {
        var show = Math.min(1, t * 5);
        var shake = (t > 0.3) ? Math.sin(t * 110) * 3 : 0;
        setAlpha(ctx, 0.45 * show);
        ctx.fillStyle = p.color;
        polygonPath(ctx, p.x + shake, cy, R * easeOut(show), 6, Math.PI / 6, 1);
        ctx.fill();
        setAlpha(ctx, 0.95 * show);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 4;
        ctx.stroke();
        var cs = span(t, 0.28, 0.25);
        if (cs > 0) {
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          setAlpha(ctx, 1);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          for (i = 0; i < (d.cracks || 8); i++) {
            var a = turns(i / (d.cracks || 8) + wobble(i + 1300) * 0.06);
            zigzagPath(ctx, p.x + shake, cy, p.x + shake + Math.cos(a) * R, cy + Math.sin(a) * R,
              5, 12, i * 11 + 1310, Math.min(1, cs * 1.2));
            ctx.stroke();
          }
          ctx.lineJoin = "miter";
          ctx.lineCap = "butt";
        }
      }
      // 3. はじける
      var fs = span(t, breakAt, 1 - breakAt);
      if (fs > 0 && fs < 1) {
        if (fs < 0.25) {
          setAlpha(ctx, (1 - fs / 0.25) * 0.8);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.x, cy, R * (1 + fs * 2), 0, Math.PI * 2);
          ctx.fill();
        }
        for (i = 0; i < (d.shards || 18); i++) {
          var sa = turns(i / (d.shards || 18) + wobble(i + 1320) * 0.05);
          var sp = 60 + wobble(i + 1330) * 70;
          var sx = p.x + Math.cos(sa) * (R * 0.4 + sp * easeOut(fs));
          var sy = cy + Math.sin(sa) * (R * 0.4 + sp * easeOut(fs)) * 0.8 + 60 * fs * fs;
          var sz = 6 + wobble(i + 1340) * 6;
          setAlpha(ctx, 1 - fs);
          ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(fs * 8 * (wobble(i + 1350) - 0.5) * 2);
          ctx.beginPath();
          ctx.moveTo(-sz, -sz * 0.6); ctx.lineTo(sz, -sz * 0.3); ctx.lineTo(-sz * 0.2, sz);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        downChevrons(ctx, p, fs, 6, 0);
      }
    },

    /**
     * バインド（v1.8.0）。ひとりに出す。スロウの一段上
     *   1. 魔法の輪 … 足元に二重の輪と目盛りが描かれて回る
     *   2. 光の鎖 … 体のまわりに鎖が3本、上から順に現れて巻きつき、締まる（奥の輪は薄い）
     *   3. 錠の印 … 締まったところで、体の前に錠の形の印が光る
     */
    bind: function (ctx, d, t, p) {
      var i, k;
      var R = d.radius || 48;
      var footY = p.y + 38;
      var end = (t > 0.85) ? (1 - t) / 0.15 : 1;
      // 1. 魔法の輪
      var ms = span(t, 0, 0.25);
      if (ms > 0) {
        var mr = R * 1.15 * easeOut(ms);
        setAlpha(ctx, 0.85 * end);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, mr, mr * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, mr * 0.8, mr * 0.8 * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (i = 0; i < 16; i++) {
          var a = turns(i / 16 + t * 0.3);
          ctx.moveTo(p.x + Math.cos(a) * mr * 0.8, footY + Math.sin(a) * mr * 0.8 * 0.28);
          ctx.lineTo(p.x + Math.cos(a) * mr, footY + Math.sin(a) * mr * 0.28);
        }
        ctx.stroke();
      }
      // 2. 光の鎖
      var chains = d.chains || 3, links = d.links || 16;
      var tight = easeOut(span(t, 0.35, 0.25));
      for (k = 0; k < chains; k++) {
        var cs = span(t, 0.12 + k * 0.08, 0.25);
        if (cs <= 0) continue;
        var cy = p.y - 26 + k * 28;
        var cr = R * (1.25 - 0.35 * tight) * (k === 1 ? 1 : 0.92);
        var tilt = (k - 1) * 0.12;
        var shown = Math.floor(links * Math.min(1, cs));
        for (i = 0; i < shown; i++) {
          var la = turns(i / links + k * 0.13);
          var lx = p.x + Math.cos(la) * cr;
          var ly = cy + Math.sin(la) * cr * 0.28 + Math.cos(la) * cr * tilt;
          var back = Math.sin(la) < 0;
          setAlpha(ctx, (back ? 0.35 : 1) * end);
          ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
          ctx.lineWidth = back ? 2 : 3;
          ctx.beginPath();
          // 輪は交互に横長・縦長にして、鎖に見せる
          if (i % 2) ctx.ellipse(lx, ly, 3, 6, la, 0, Math.PI * 2);
          else ctx.ellipse(lx, ly, 7, 3.5, la + Math.PI / 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 錠の印
      var ls = span(t, 0.55, 0.3);
      if (ls > 0 && end > 0) {
        var lsz = 14 * (ls < 0.3 ? 1.6 - 0.6 * (ls / 0.3) : 1);
        var lx0 = p.x, ly0 = p.y + 6;
        setAlpha(ctx, Math.min(1, ls * 4) * end);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx0, ly0 - lsz * 0.6, lsz * 0.55, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.fillRect(lx0 - lsz * 0.8, ly0 - lsz * 0.6, lsz * 1.6, lsz * 1.2);
        ctx.strokeRect(lx0 - lsz * 0.8, ly0 - lsz * 0.6, lsz * 1.6, lsz * 1.2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(lx0 - 1.5, ly0 - 3, 3, 7);
      }
    },

    /**
     * キュアリス・キュアリスオール（v1.8.0）。ひとりずつに出す
     *   1. 花の魔法陣 … 足元に輪と花びらの模様が描かれて回る
     *   2. 光の柱 … column のとき、上から降りる
     *   3. 光の花びら … 体のまわりで花びらが開き、回りながら昇る
     *   4. 大きな十字 … bigCross のとき、頭の上に十字が輝いて、光の粒にほどける
     *   5. 昇る十字 … 回復の印
     */
    fullHeal: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 44;
      var footY = p.y + 38;
      var light = d.accentColor || "#e9ffe0";
      var end = (t > 0.8) ? (1 - t) / 0.2 : 1;
      // 1. 花の魔法陣
      var ms = span(t, 0, 0.25);
      if (ms > 0) {
        var mr = R * 1.2 * easeOut(ms);
        setAlpha(ctx, 0.85 * end);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, mr, mr * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = light;
        ctx.lineWidth = 1.5;
        for (i = 0; i < 6; i++) {
          var pa = turns(i / 6 + t * 0.25);
          ctx.beginPath();
          ctx.ellipse(p.x + Math.cos(pa) * mr * 0.45, footY + Math.sin(pa) * mr * 0.45 * 0.28,
            mr * 0.45, mr * 0.45 * 0.28, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 2. 光の柱
      if (d.column) {
        var cs = span(t, 0.12, 0.6);
        if (cs > 0 && cs < 1) {
          var cw = R * 0.9 * (cs < 0.3 ? easeOut(cs / 0.3) : 1 - (cs - 0.3) / 0.7 * 0.6);
          var top = p.y - 160;
          var g = ctx.createLinearGradient(p.x - cw, 0, p.x + cw, 0);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(0.35, p.color);
          g.addColorStop(0.5, light);
          g.addColorStop(0.65, p.color);
          g.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, 0.6 * (cs < 0.7 ? 1 : (1 - cs) / 0.3));
          ctx.fillStyle = g;
          ctx.fillRect(p.x - cw, top, cw * 2, (footY - top) * easeOut(Math.min(1, cs * 3)));
        }
      }
      // 3. 光の花びら
      var petals = d.petals || 8;
      for (i = 0; i < petals; i++) {
        var ps = span(t, 0.2 + i * 0.02, 0.6);
        if (ps <= 0 || ps >= 1) continue;
        var a = turns(i / petals + ps * 0.4);
        var pr = R * (0.6 + 0.5 * easeOut(Math.min(1, ps * 2)));
        var px = p.x + Math.cos(a) * pr;
        var py = footY - 10 - ps * 80 + Math.sin(a) * pr * 0.3;
        var back = Math.sin(a) < 0;
        setAlpha(ctx, Math.sin(ps * Math.PI) * (back ? 0.4 : 0.9));
        ctx.fillStyle = (i % 2) ? light : p.color;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 4. 大きな十字
      if (d.bigCross) {
        var bs = span(t, 0.4, 0.5);
        if (bs > 0 && bs < 1) {
          var bx = p.x, by = p.y - 62;
          var bsz = 18 * (bs < 0.25 ? easeOut(bs / 0.25) : 1);
          if (bs < 0.65) {
            setAlpha(ctx, 0.9);
            ctx.fillStyle = light;
            ctx.fillRect(bx - bsz, by - bsz * 0.28, bsz * 2, bsz * 0.56);
            ctx.fillRect(bx - bsz * 0.28, by - bsz, bsz * 0.56, bsz * 2);
          }
          // ほどける光の粒
          if (bs > 0.5) {
            var us = (bs - 0.5) / 0.5;
            ctx.fillStyle = light;
            for (i = 0; i < 10; i++) {
              var ua = turns(i / 10);
              setAlpha(ctx, 1 - us);
              ctx.fillRect(bx + Math.cos(ua) * 40 * us - 2, by + Math.sin(ua) * 30 * us - 2 + us * 20, 4, 4);
            }
          }
        }
      }
      // 5. 昇る十字
      healCrosses(ctx, d, t, p, R);
    },

    /**
     * リザレクション（v1.8.0）。ひとりに出す
     *   1. 金の羽根 … 上から1枚の羽根がゆれながら舞い降りる
     *   2. 金の柱 … 羽根が触れたところから柱が立つ
     *   3. 光の翼 … 背に左右の翼が開き、ゆっくり羽ばたいて消える
     *   4. 光の輪 … 頭の上に輪が浮かぶ
     *   5. 昇る十字
     */
    resurrection: function (ctx, d, t, p) {
      var i, side;
      var R = d.radius || 44;
      var light = d.accentColor || "#fffbe8";
      var touch = 0.28;
      // 1. 金の羽根
      var fs = span(t, 0, touch);
      if (fs > 0 && fs < 1) {
        var fx = p.x + Math.sin(fs * 9) * 18;
        var fy = (p.y - 140) + 130 * easeOut(fs);
        setAlpha(ctx, 1);
        ctx.fillStyle = light;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(Math.sin(fs * 9) * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(0, 18);
        ctx.stroke();
        ctx.restore();
      }
      // 2. 金の柱（触れたところで光り、上へ伸びる）
      var cs = span(t, touch, 0.55);
      if (cs > 0 && cs < 1) {
        var cw = R * (cs < 0.2 ? easeOut(cs / 0.2) * 1.2 : 1.2 - (cs - 0.2) / 0.8 * 0.8);
        var top = p.y - 170;
        var g = ctx.createLinearGradient(p.x - cw, 0, p.x + cw, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.3, p.color);
        g.addColorStop(0.5, "#ffffff");
        g.addColorStop(0.7, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.7 * (cs < 0.7 ? 1 : (1 - cs) / 0.3));
        ctx.fillStyle = g;
        var h = (p.y + 40 - top) * easeOut(Math.min(1, cs * 4));
        ctx.fillRect(p.x - cw, p.y + 40 - h, cw * 2, h);
        if (cs < 0.2) {
          setAlpha(ctx, 1 - cs / 0.2);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, R * (0.6 + cs * 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 3. 光の翼
      var ws = span(t, touch + 0.08, 0.6);
      if (ws > 0 && ws < 1) {
        var open = easeOut(Math.min(1, ws * 2.5));
        var wa = (ws < 0.7) ? 1 : (1 - ws) / 0.3;
        var flap = Math.sin(ws * Math.PI * 2) * 0.12;
        var W = (d.wing || 70) * open;
        for (side = -1; side <= 1; side += 2) {
          ctx.save();
          ctx.translate(p.x + side * 12, p.y - 14);
          ctx.scale(side, 1);
          ctx.rotate(-0.35 - flap);
          var n = d.feathers || 6;
          for (i = 0; i < n; i++) {
            var f = i / (n - 1);
            var fl = W * (1 - f * 0.45);
            var fa = -0.15 + f * 1.05;
            setAlpha(ctx, wa * (0.75 - f * 0.25));
            ctx.fillStyle = (i % 2) ? light : p.color;
            ctx.save();
            ctx.rotate(fa);
            ctx.beginPath();
            ctx.ellipse(fl * 0.5, 0, fl * 0.5, 6 + (1 - f) * 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
      // 4. 光の輪
      var hs = span(t, touch + 0.12, 0.55);
      if (hs > 0 && hs < 1) {
        setAlpha(ctx, Math.min(1, hs * 4) * (hs < 0.7 ? 1 : (1 - hs) / 0.3));
        ctx.strokeStyle = light;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 58 - hs * 6, 20, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 5. 昇る十字（触れたあとから）
      healCrosses(ctx, d, Math.max(0, (t - touch) / (1 - touch)), p, R);
    },

    /**
     * リフレッシュ（v1.8.0）。ひとりに出す
     *   1. 弱体の印 … 体のまわりに暗い色の下向きの矢じりが浮かぶ
     *   2. 光の渦 … 足元から澄んだ光の帯が巻き上がる
     *   3. 砕ける … 渦が届いたところで印が砕けて消え、きらめきが昇る
     */
    refresh: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 46;
      var mark = d.markColor || "#6b5a8a";
      var sweep = span(t, 0.3, 0.4);          // 渦が下から上へ届く進み
      // 1・3. 印
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 0; i < (d.marks || 6); i++) {
        var a = turns(i / (d.marks || 6) + 0.05);
        var mx = p.x + Math.cos(a) * R * 0.9;
        var my = p.y - 10 + Math.sin(a) * R * 0.6;
        var h = 1 - (my - (p.y - 50)) / 100;   // 上ほど遅く渦が届く
        var hit = sweep > h * 0.9;
        var ms = span(t, i * 0.03, 0.15);
        if (ms <= 0) continue;
        if (!hit) {
          setAlpha(ctx, Math.min(1, ms) * 0.95);
          ctx.strokeStyle = mark;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(mx - 9, my - 7); ctx.lineTo(mx, my); ctx.lineTo(mx + 9, my - 7);
          ctx.stroke();
        } else {
          // 砕けたかけら
          var bs = Math.min(1, (sweep - h * 0.9) * 4);
          if (bs >= 1) continue;
          ctx.fillStyle = mark;
          for (var k = 0; k < 4; k++) {
            var ka = turns(k / 4 + i * 0.1);
            setAlpha(ctx, 1 - bs);
            ctx.fillRect(mx + Math.cos(ka) * 14 * bs - 2, my + Math.sin(ka) * 14 * bs - 2 - bs * 8, 4, 4);
          }
        }
      }
      // 2. 光の渦
      var ws = span(t, 0.2, 0.6);
      if (ws > 0 && ws < 1) {
        for (i = 0; i < 3; i++) {
          var ss = span(ws, i * 0.12, 0.7);
          if (ss <= 0 || ss >= 1) continue;
          var cy = p.y + 38 - easeOut(ss) * 110;
          var st = turns(ss * 1.6 + i / 3);
          setAlpha(ctx, Math.sin(ss * Math.PI) * 0.9);
          ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(p.x, cy, R * (1.1 - ss * 0.3), R * 0.3, 0, st, st + Math.PI * 1.4);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      // きらめき
      for (i = 0; i < (d.stars || 12); i++) {
        var es = span(t, 0.5 + wobble(i + 1500) * 0.3, 0.3);
        if (es <= 0 || es >= 1) continue;
        var ex = p.x + (wobble(i + 1510) - 0.5) * R * 2.2;
        var ey = p.y + 20 - es * 70 - wobble(i + 1520) * 30;
        var r = 6 * Math.sin(es * Math.PI);
        setAlpha(ctx, Math.sin(es * Math.PI));
        ctx.fillStyle = (i % 2) ? "#ffffff" : p.color;
        ctx.beginPath();
        ctx.moveTo(ex, ey - r);
        ctx.quadraticCurveTo(ex, ey, ex + r, ey);
        ctx.quadraticCurveTo(ex, ey, ex, ey + r);
        ctx.quadraticCurveTo(ex, ey, ex - r, ey);
        ctx.quadraticCurveTo(ex, ey, ex, ey - r);
        ctx.fill();
      }
    },

    /**
     * ハッシュ（v1.8.0）。ひとりずつに出す（全体）
     *   1. 音の波 … 相手の左右から「）」の形の波が出て、だんだん平らな線になって消える（静寂）
     *   2. 封印の輪 … 頭の上で輪が閉じ、真ん中に斜めの線が入る
     */
    hush: function (ctx, d, t, p) {
      var i, side;
      var R = d.radius || 40;
      ctx.lineCap = "round";
      // 1. 音の波
      for (side = -1; side <= 1; side += 2) {
        for (i = 0; i < (d.waves || 3); i++) {
          var ws = span(t, i * 0.08, 0.55);
          if (ws <= 0 || ws >= 1) continue;
          var x = p.x + side * (R * 0.7 + i * 14 + ws * 16);
          var bend = 14 * (1 - easeOut(ws));        // 0 で平らな線（音が消える）
          var h = 24 - i * 3;
          setAlpha(ctx, (1 - ws) * 0.95);
          ctx.strokeStyle = (i === 0) ? p.coreColor : p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, p.y - 6 - h);
          ctx.quadraticCurveTo(x + side * bend * 2, p.y - 6, x, p.y - 6 + h);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      // 2. 封印の輪（頭の上で、外から縮んで閉じる）
      var ss = span(t, 0.35, 0.6);
      if (ss > 0 && ss < 1) {
        var close = easeOut(Math.min(1, ss * 2.5));
        var r = 18 + 30 * (1 - close);
        var cy = p.y - 62;
        var a = (ss < 0.75) ? 1 : (1 - ss) / 0.25;
        setAlpha(ctx, 0.9 * a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * close);
        ctx.stroke();
        if (close >= 1) {
          ctx.strokeStyle = p.coreColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x - r * 0.65, cy + r * 0.65);
          ctx.lineTo(p.x + r * 0.65, cy - r * 0.65);
          ctx.stroke();
        }
      }
    },

    /**
     * かばう（v1.8.0）。かばわれる味方に出す
     *   1. 盾 … 横から大きな盾が滑りこんで体の前で止まる（縁と真ん中の筋）
     *   2. ぶつかる輪 … 止まったところで輪が広がる
     *   3. 光 … 盾の上を光がなでて、薄れる
     */
    guardAlly: function (ctx, d, t, p) {
      var S = d.shield || 34;
      var slide = easeOut(Math.min(1, t / 0.3));
      var x = p.x - (d.from || 120) * (1 - slide);
      var y = p.y + 4;
      var a = (t < 0.75) ? 1 : (1 - t) / 0.25;
      // 残像
      if (t < 0.3) {
        setAlpha(ctx, 0.3);
        ctx.fillStyle = p.color;
        shieldPath(ctx, x - 26, y, S);
        ctx.fill();
      }
      // 1. 盾
      setAlpha(ctx, 0.55 * a);
      ctx.fillStyle = p.color;
      shieldPath(ctx, x, y, S);
      ctx.fill();
      setAlpha(ctx, 0.95 * a);
      ctx.strokeStyle = p.coreColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - S * 0.9); ctx.lineTo(x, y + S * 1.05);
      ctx.stroke();
      // 2. ぶつかる輪
      var rs = span(t, 0.28, 0.35);
      if (rs > 0 && rs < 1) {
        setAlpha(ctx, 1 - rs);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, S * (1 + rs * 1.2), S * (1.3 + rs * 1.2), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 3. 光
      var ls = span(t, 0.4, 0.3);
      if (ls > 0 && ls < 1) {
        ctx.save();
        shieldPath(ctx, x, y, S);
        ctx.clip();
        setAlpha(ctx, 0.7 * a);
        ctx.fillStyle = "#ffffff";
        var sy = y - S * 1.4 + S * 2.8 * ls;
        ctx.fillRect(x - S, sy - 5, S * 2, 10);
        ctx.restore();
      }
    },

    /**
     * 分け与え（v1.8.0）。分けられる味方に出す
     *   1. 玉 … 紫の玉が上から弧を描いて降り、体に吸いこまれる
     *   2. 満ちる輪 … 体のまわりの輪が、下から半分まで満ちる
     *   3. 光 … 満ちたところで体がふわっと光る
     */
    sharePp: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 46;
      var light = d.accentColor || "#d9ccff";
      // 1. 玉
      for (i = 0; i < (d.orbs || 7); i++) {
        var os = span(t, i * 0.06, 0.4);
        if (os <= 0 || os >= 1) continue;
        var sx = p.x + (i % 2 ? -1 : 1) * (60 + i * 6);
        var sy = p.y - 110;
        var f = easeIn(os);
        var cx = (sx + p.x) / 2 + (i % 2 ? -1 : 1) * 40, cy = p.y - 90;
        var x = (1 - f) * (1 - f) * sx + 2 * (1 - f) * f * cx + f * f * p.x;
        var y = (1 - f) * (1 - f) * sy + 2 * (1 - f) * f * cy + f * f * p.y;
        setAlpha(ctx, os < 0.9 ? 1 : (1 - os) / 0.1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 2. 満ちる輪（下から時計回りに半分まで）
      var rs = span(t, 0.2, 0.75);
      if (rs > 0 && rs < 1) {
        var a = (rs < 0.75) ? 1 : (1 - rs) / 0.25;
        setAlpha(ctx, 0.35 * a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
        ctx.stroke();
        var fill = Math.PI * easeOut(Math.min(1, rs * 1.6));
        setAlpha(ctx, 0.95 * a);
        ctx.strokeStyle = light;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, Math.PI / 2, Math.PI / 2 + fill);
        ctx.stroke();
        ctx.lineCap = "butt";
      }
      // 3. 光
      var gs = span(t, 0.55, 0.4);
      if (gs > 0 && gs < 1) {
        setAlpha(ctx, Math.sin(gs * Math.PI) * 0.35);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R * 0.9, R * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 先手打ち（v1.8.0）。打たれる相手に出す。短く速い
     *   1. 速い筋 … 左から横向きの筋が相手へ集まる
     *   2. 星 … 当たったところで、細く鋭い4つ角の星がはじける
     *   3. 残像の矢じり … 右へ「＞」が流れて消える
     */
    quickStrike: function (ctx, d, t, p) {
      var i;
      ctx.lineCap = "round";
      // 1. 速い筋
      for (i = 0; i < (d.streaks || 8); i++) {
        var s = span(t, wobble(i + 1600) * 0.15, 0.35);
        if (s <= 0 || s >= 1) continue;
        var y = p.y + (wobble(i + 1610) - 0.5) * 60;
        var head = p.x - 150 + 150 * easeIn(s);
        setAlpha(ctx, 1 - s);
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : p.color;
        ctx.lineWidth = 2 + wobble(i + 1620) * 2;
        ctx.beginPath();
        ctx.moveTo(head - 50, y);
        ctx.lineTo(head, y);
        ctx.stroke();
      }
      // 2. 星
      var ss = span(t, 0.3, 0.45);
      if (ss > 0 && ss < 1) {
        var r = (d.star || 34) * (ss < 0.3 ? easeOut(ss / 0.3) : 1);
        setAlpha(ctx, 1 - easeIn(ss));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r * 0.6, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r * 0.6, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r);
        ctx.fill();
        setAlpha(ctx, (1 - ss) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.5 + ss * 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 3. 残像の矢じり
      ctx.lineJoin = "round";
      for (i = 0; i < 3; i++) {
        var cs = span(t, 0.35 + i * 0.07, 0.4);
        if (cs <= 0 || cs >= 1) continue;
        var cx = p.x + 20 + cs * 70 + i * 12;
        setAlpha(ctx, 1 - cs);
        ctx.strokeStyle = p.coreColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 8, p.y - 12); ctx.lineTo(cx + 4, p.y); ctx.lineTo(cx - 8, p.y + 12);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * 黄昏の風（v1.8.0）。並び全体に1回だけ出す（effectAt: "center"）
     *   1. 強化の印 … 相手ごとに上向きの矢じりが浮かぶ
     *   2. 風の帯 … 夕焼け色から紫へ移る、ふちの柔らかい帯が左から右へ吹き抜ける
     *   3. 吹き飛ぶ … 帯が通ったところから、印が右へ回りながら飛ばされて消える
     *   4. 風の筋 … 細い筋が帯といっしょに流れる
     */
    duskWind: function (ctx, d, t, p) {
      var i, k;
      var points = pointsOf(p);
      var spread = d.spread || 280;
      var H = d.height || 90;
      var left = p.x - spread - 120, right = p.x + spread + 120;
      var front = left + (right - left) * span(t, 0.1, 0.65);
      var buff = d.buffColor || "#5fd18c";
      // 2. 風の帯
      var bs = span(t, 0.15, 0.75);
      if (bs > 0 && bs < 1) {
        var tail = front - 260;
        var g = ctx.createLinearGradient(tail, 0, front, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.5, d.accentColor || "#b88ae0");
        g.addColorStop(0.9, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.45 * (bs < 0.8 ? 1 : (1 - bs) / 0.2));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(tail, p.y - H * 0.5);
        ctx.quadraticCurveTo((tail + front) / 2, p.y - H * 0.8, front, p.y - H * 0.3);
        ctx.lineTo(front, p.y + H * 0.4);
        ctx.quadraticCurveTo((tail + front) / 2, p.y + H * 0.7, tail, p.y + H * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      // 4. 風の筋
      ctx.lineCap = "round";
      for (i = 0; i < (d.streaks || 14); i++) {
        var ss = span(t, 0.15 + wobble(i + 1700) * 0.2, 0.55);
        if (ss <= 0 || ss >= 1) continue;
        var y = p.y + (wobble(i + 1710) - 0.5) * H * 1.2;
        var hx = left + (right - left) * ss;
        setAlpha(ctx, (1 - ss) * 0.9);
        ctx.strokeStyle = (i % 3 === 0) ? p.coreColor : ((i % 3 === 1) ? p.color : (d.accentColor || "#b88ae0"));
        ctx.lineWidth = 2 + wobble(i + 1720) * 2;
        ctx.beginPath();
        ctx.moveTo(hx - 70, y + 4);
        ctx.quadraticCurveTo(hx - 35, y - 6, hx, y);
        ctx.stroke();
      }
      // 1・3. 強化の印
      ctx.lineJoin = "round";
      for (k = 0; k < points.length; k++) {
        for (i = 0; i < (d.marks || 4); i++) {
          var mx = points[k].x + (i - ((d.marks || 4) - 1) / 2) * 22;
          var my = points[k].y - 30 + (i % 2) * 16;
          var appear = Math.min(1, t * 6);
          var blown = (front > mx) ? Math.min(1, (front - mx) / 160) : 0;
          if (blown >= 1) continue;
          var bx = mx + blown * 90, by = my - blown * 30 + Math.sin(blown * 6) * 6;
          setAlpha(ctx, appear * (1 - blown));
          ctx.strokeStyle = buff;
          ctx.lineWidth = 4;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(blown * 4);
          ctx.beginPath();
          ctx.moveTo(-9, 7); ctx.lineTo(0, -2); ctx.lineTo(9, 7);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * ブレイズ（v1.8.0）。フレイムの一段上
     *   1. 炎の渦 … 炎の舌が相手のまわりを回りながら昇り、渦が締まる
     *   2. 白い光 … 渦が締まったところで、真ん中が白く光る
     *   3. 火柱 … 上へ太い炎が立つ
     *   4. 火の粉 … 上と四方へはじける
     */
    blazeVortex: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 50;
      var gold = d.accentColor || "#ffd75e";
      var footY = p.y + 40;
      // 1. 炎の渦
      var n = d.tongues || 10;
      for (i = 0; i < n; i++) {
        var s = span(t, i * 0.008, 0.55);
        if (s <= 0 || s >= 1) continue;
        var a = turns(i / n + s * 1.2);
        var r = R * (1 - easeIn(s) * 0.75);
        var x = p.x + Math.cos(a) * r;
        var y = footY - 10 - s * (d.height || 100) * 0.6 + Math.sin(a) * r * 0.3;
        var back = Math.sin(a) < 0;
        var fa = Math.sin(s * Math.PI) * (back ? 0.5 : 0.9);
        setAlpha(ctx, fa);
        ctx.fillStyle = (i % 3 === 0) ? gold : p.color;
        flameTongue(ctx, x, y, 16, 34, Math.cos(a) * -8);
      }
      // 2. 白い光
      var fs = span(t, 0.45, 0.3);
      if (fs > 0 && fs < 1) {
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 1.3);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.4, gold);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - fs) * 0.9);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R * 1.3 * (0.6 + fs * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      // 3. 火柱
      var ps = span(t, 0.48, 0.45);
      if (ps > 0 && ps < 1) {
        var ph = (d.height || 100) * 1.4 * easeOut(Math.min(1, ps * 3));
        var pw = 30 * (1 - ps * 0.5);
        var fa2 = (ps < 0.6) ? 1 : (1 - ps) / 0.4;
        setAlpha(ctx, 0.8 * fa2);
        ctx.fillStyle = p.color;
        flameTongue(ctx, p.x, footY, pw * 2, ph, Math.sin(t * 30) * 8);
        setAlpha(ctx, 0.9 * fa2);
        ctx.fillStyle = gold;
        flameTongue(ctx, p.x, footY, pw, ph * 0.65, Math.sin(t * 30) * 5);
      }
      // 4. 火の粉
      ctx.fillStyle = gold;
      for (i = 0; i < (d.embers || 18); i++) {
        var es = span(t, 0.48 + wobble(i + 1800) * 0.1, 0.45);
        if (es <= 0 || es >= 1) continue;
        var ea = turns(0.5 + 0.25 + (wobble(i + 1810) - 0.5) * 0.7);
        var sp = 60 + wobble(i + 1820) * 80;
        setAlpha(ctx, 1 - es);
        ctx.fillRect(p.x + Math.cos(ea) * sp * es - 2, p.y + Math.sin(ea) * sp * es + 60 * es * es - 2, 4, 4);
      }
    },

    /**
     * トレント（v1.8.0）。ウェーブの一段上
     *   1. 水流 … 左から太い水の帯がまっすぐ相手へ伸び、細くなって消える（中に白い筋が流れる）
     *   2. しぶき … 当たったところから上と後ろへ飛び散る
     *   3. 吸い取り … 相手から小さな水の粒が左へ流れ戻る
     */
    torrentJet: function (ctx, d, t, p) {
      var i;
      var W = d.width || 34;
      var L = d.length || 260;
      var foam = d.foamColor || "#e8fbff";
      var deep = d.deepColor || "#1d4f8a";
      var start = p.x - L;
      // 1. 水流
      var js = span(t, 0, 0.6);
      if (js > 0 && js < 1) {
        var reach = easeOut(Math.min(1, js * 3));
        var head = start + (L + 10) * reach;
        var w = W * (js < 0.6 ? 1 : 1 - (js - 0.6) / 0.4);
        var layers = [[deep, w, 0.7], [p.color, w * 0.7, 0.85], [foam, w * 0.2, 0.9]];
        for (var l = 0; l < layers.length; l++) {
          setAlpha(ctx, layers[l][2]);
          ctx.fillStyle = layers[l][0];
          ctx.beginPath();
          ctx.moveTo(start, p.y - layers[l][1] * 0.3);
          for (var x = start; x <= head; x += 10) {
            ctx.lineTo(x, p.y - layers[l][1] / 2 + Math.sin(x * 0.08 - t * 40) * 3);
          }
          ctx.lineTo(head, p.y + layers[l][1] / 2);
          for (x = head; x >= start; x -= 10) {
            ctx.lineTo(x, p.y + layers[l][1] / 2 + Math.sin(x * 0.08 - t * 40 + 1) * 3);
          }
          ctx.closePath();
          ctx.fill();
        }
        // 中を流れる白い筋
        ctx.strokeStyle = foam;
        ctx.lineWidth = 2;
        for (i = 0; i < 5; i++) {
          var sx = start + ((t * 900 + i * 60) % (L + 10));
          if (sx > head - 20) continue;
          setAlpha(ctx, 0.8);
          ctx.beginPath();
          ctx.moveTo(sx, p.y + (i - 2) * w * 0.15);
          ctx.lineTo(sx + 20, p.y + (i - 2) * w * 0.15);
          ctx.stroke();
        }
      }
      // 2. しぶき
      for (i = 0; i < (d.drops || 16); i++) {
        var ds = span(t, 0.18 + wobble(i + 1900) * 0.3, 0.4);
        if (ds <= 0 || ds >= 1) continue;
        var a = turns(0.5 + 0.12 + wobble(i + 1910) * 0.5);   // 上と後ろ
        var sp = 50 + wobble(i + 1920) * 60;
        var dx = p.x - 10 + Math.cos(a) * sp * ds * -1;
        var dy = p.y + Math.sin(a) * sp * ds + 90 * ds * ds;
        setAlpha(ctx, 1 - ds);
        ctx.fillStyle = (i % 3 === 0) ? foam : p.color;
        ctx.beginPath();
        ctx.arc(dx, dy, 3 + wobble(i + 1930) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 3. 吸い取り
      for (i = 0; i < (d.drain || 10); i++) {
        var rs = span(t, 0.5 + i * 0.035, 0.35);
        if (rs <= 0 || rs >= 1) continue;
        var rx = p.x - easeIn(rs) * L * 0.8;
        var ry = p.y + (wobble(i + 1940) - 0.5) * 40 - Math.sin(rs * Math.PI) * 30;
        setAlpha(ctx, Math.sin(rs * Math.PI));
        ctx.fillStyle = (i % 2) ? foam : p.color;
        sapDrop(ctx, rx, ry, 3.5);
      }
    },

    /**
     * サイクロン（v1.8.0）。ゲイルの一段上。相手ひとりずつに出す（全体）
     *   1. 竜巻 … 足元から輪が積み上がり、上ほど広く、回りながら揺れる
     *   2. 巻き上がる粒 … 葉と粒が竜巻のまわりを回りながら昇る
     */
    cycloneFunnel: function (ctx, d, t, p) {
      var i;
      var footY = p.y + 40;
      var Hh = d.funnelHeight || 130;
      var grow = easeOut(span(t, 0, 0.3));
      var fade = (t > 0.75) ? (1 - t) / 0.25 : 1;
      ctx.lineCap = "round";
      // 1. 竜巻
      var rings = d.rings || 7;
      for (i = 0; i < rings; i++) {
        var f = i / (rings - 1);
        if (f > grow) break;
        var y = footY - f * Hh;
        var r = 10 + f * 48;
        var sway = Math.sin(t * 12 + f * 3) * 8 * f;
        var st = turns(t * 3 + f * 0.6);
        setAlpha(ctx, 0.85 * fade);
        ctx.strokeStyle = (i % 2) ? p.coreColor : p.color;
        ctx.lineWidth = 3 + (1 - f) * 2;
        ctx.beginPath();
        ctx.ellipse(p.x + sway, y, r, r * 0.25, 0, st, st + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 2. 巻き上がる粒
      for (i = 0; i < (d.debris || 10); i++) {
        var ds = span(t, 0.1 + wobble(i + 2000) * 0.4, 0.5);
        if (ds <= 0 || ds >= 1) continue;
        var fy = ds;
        var a = turns(ds * 2 + wobble(i + 2010));
        var r2 = 14 + fy * 50;
        var x = p.x + Math.cos(a) * r2;
        var y2 = footY - fy * Hh + Math.sin(a) * r2 * 0.25;
        setAlpha(ctx, Math.sin(ds * Math.PI) * (Math.sin(a) < 0 ? 0.5 : 1));
        ctx.fillStyle = (i % 2) ? p.coreColor : p.color;
        ctx.save();
        ctx.translate(x, y2);
        ctx.rotate(ds * 12);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },

    /**
     * ロックバースト（v1.8.0）。ロックスパイクの一段上
     *   1. 集まる岩 … まわりから岩が相手の前へ集まる
     *   2. 大岩 … 集まって大きな岩になり、ひびが光る
     *   3. 炸裂 … 白く光って、かけらが四方へ飛び、足元に土煙の輪が広がる
     */
    rockBurst: function (ctx, d, t, p) {
      var i;
      var B = d.boulder || 30;
      var burstAt = 0.5;
      // 1. 集まる岩
      for (i = 0; i < (d.gather || 9); i++) {
        var gs = span(t, i * 0.02, 0.3);
        if (gs <= 0 || gs >= 1) continue;
        var a = turns(i / (d.gather || 9));
        var dist = 110 * (1 - easeIn(gs));
        setAlpha(ctx, Math.min(1, gs * 4));
        ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
        polygonPath(ctx, p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist * 0.7, 8 + wobble(i + 2100) * 5, 5, gs * 4 + i, 0.85);
        ctx.fill();
      }
      // 2. 大岩
      var bs = span(t, 0.25, burstAt - 0.25);
      if (bs > 0 && t < burstAt) {
        var r = B * easeOut(Math.min(1, bs * 2));
        var shake = (bs > 0.5) ? Math.sin(t * 120) * 2 : 0;
        setAlpha(ctx, 1);
        ctx.fillStyle = p.color;
        polygonPath(ctx, p.x + shake, p.y, r, 7, 0.3, 0.9);
        ctx.fill();
        setAlpha(ctx, 0.5);
        ctx.fillStyle = p.coreColor;
        polygonPath(ctx, p.x + shake - r * 0.25, p.y - r * 0.3, r * 0.4, 5, 0.3, 0.8);
        ctx.fill();
        if (bs > 0.4) {
          ctx.lineJoin = "round";
          setAlpha(ctx, (bs - 0.4) / 0.6);
          ctx.strokeStyle = "#ffe9a8";
          ctx.lineWidth = 2.5;
          for (i = 0; i < 4; i++) {
            var ca = turns(i / 4 + 0.1);
            zigzagPath(ctx, p.x + shake, p.y, p.x + shake + Math.cos(ca) * r * 0.9, p.y + Math.sin(ca) * r * 0.8, 3, 8, i * 5 + 2110, 1);
            ctx.stroke();
          }
          ctx.lineJoin = "miter";
        }
      }
      // 3. 炸裂
      var xs = span(t, burstAt, 1 - burstAt);
      if (xs > 0 && xs < 1) {
        if (xs < 0.25) {
          setAlpha(ctx, (1 - xs / 0.25) * 0.9);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, B * (1 + xs * 3), 0, Math.PI * 2);
          ctx.fill();
        }
        for (i = 0; i < (d.shards || 18); i++) {
          var sa = turns(i / (d.shards || 18) + wobble(i + 2120) * 0.05);
          var sp = 70 + wobble(i + 2130) * 70;
          setAlpha(ctx, 1 - xs);
          ctx.fillStyle = (i % 3 === 0) ? p.coreColor : p.color;
          polygonPath(ctx, p.x + Math.cos(sa) * sp * easeOut(xs), p.y + Math.sin(sa) * sp * easeOut(xs) * 0.8 + 70 * xs * xs,
            4 + wobble(i + 2140) * 6, 5, xs * 8 + i, 0.8);
          ctx.fill();
        }
        setAlpha(ctx, (1 - xs) * 0.5);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 40, 30 + xs * 70, 8 + xs * 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * プリズム（v1.8.0）。シャイン系の3段目
     *   1. 三角柱 … 相手の上に光の三角が現れ、ゆっくり回る（画面の上で止める）
     *   2. 白い光 … 上から三角へ白い光が差しこむ
     *   3. 分かれた光 … 三角の下から6色の光が扇に広がって相手へ降り注ぐ
     *   4. 星 … 当たったところで十字の星がまたたく
     */
    prism: function (ctx, d, t, p) {
      var i;
      var S = d.prismSize || 22;
      var colors = d.colors || ["#ffffff"];
      var py = Math.max(30, p.y - 90);
      var show = Math.min(1, t * 5) * (t > 0.85 ? (1 - t) / 0.15 : 1);
      // 2. 白い光
      var ws = span(t, 0.1, 0.3);
      if (ws > 0 && ws < 1) {
        setAlpha(ctx, Math.sin(ws * Math.PI) * 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(p.x - 3, py - 200); ctx.lineTo(p.x + 3, py - 200);
        ctx.lineTo(p.x + 5, py); ctx.lineTo(p.x - 5, py);
        ctx.closePath();
        ctx.fill();
      }
      // 3. 分かれた光
      var bs = span(t, 0.28, 0.5);
      if (bs > 0 && bs < 1) {
        var reach = easeOut(Math.min(1, bs * 3));
        var ba = (bs < 0.6) ? 1 : (1 - bs) / 0.4;
        for (i = 0; i < colors.length; i++) {
          var f = (i / (colors.length - 1)) - 0.5;
          var tx = p.x + f * 90, ty = p.y + 10;
          var ex = p.x + (tx - p.x) * reach, ey = py + (ty - py) * reach;
          setAlpha(ctx, 0.75 * ba);
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.moveTo(p.x - 2, py + S * 0.4);
          ctx.lineTo(p.x + 2, py + S * 0.4);
          ctx.lineTo(ex + 6, ey);
          ctx.lineTo(ex - 6, ey);
          ctx.closePath();
          ctx.fill();
        }
      }
      // 1. 三角柱
      if (show > 0) {
        setAlpha(ctx, 0.5 * show);
        ctx.fillStyle = p.color;
        polygonPath(ctx, p.x, py, S, 3, -Math.PI / 2 + Math.sin(t * 6) * 0.15, 1);
        ctx.fill();
        setAlpha(ctx, 0.95 * show);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      // 4. 星
      for (i = 0; i < 8; i++) {
        var ss = span(t, 0.45 + wobble(i + 2200) * 0.3, 0.25);
        if (ss <= 0 || ss >= 1) continue;
        var sx = p.x + (wobble(i + 2210) - 0.5) * 100;
        var sy = p.y + (wobble(i + 2220) - 0.5) * 70;
        var r = (6 + wobble(i + 2230) * 8) * Math.sin(ss * Math.PI);
        setAlpha(ctx, Math.sin(ss * Math.PI));
        ctx.fillStyle = colors[i % colors.length];
        fourStar(ctx, sx, sy, r);
      }
    },

    /**
     * アビス（v1.8.0）。闇の3段目
     *   1. 闇の淵 … 足元に暗い淵が開き、中で渦が回る
     *   2. 闇の手 … 淵から手が伸びて相手を囲む
     *   3. 闇の球 … 大きな闇の球が縮みながら相手を呑み、淵へ沈んで消える
     *   4. 鬼火 … 最後に紫の火が昇る
     */
    abyss: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 60;
      var dark = d.darkColor || "#12081f";
      var rim = d.rimColor || "#c9b8ff";
      var footY = p.y + 40;
      var close = (t > 0.85) ? (1 - t) / 0.15 : 1;
      // 1. 闇の淵
      var ps = span(t, 0, 0.25);
      if (ps > 0 && close > 0) {
        var pr = R * easeOut(ps) * close;
        setAlpha(ctx, 0.9);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, pr, pr * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (i = 0; i < 3; i++) {
          var st = turns(t * 2 + i / 3);
          setAlpha(ctx, 0.7);
          ctx.strokeStyle = rim;
          ctx.beginPath();
          ctx.ellipse(p.x, footY, pr * (0.3 + i * 0.22), pr * (0.3 + i * 0.22) * 0.28, 0, st, st + Math.PI);
          ctx.stroke();
        }
      }
      // 2. 闇の手
      ctx.lineCap = "round";
      for (i = 0; i < (d.tendrils || 6); i++) {
        var ts = span(t, 0.15 + i * 0.03, 0.5);
        if (ts <= 0 || ts >= 1) continue;
        var a = turns(i / (d.tendrils || 6));
        var bx = p.x + Math.cos(a) * R * 0.8;
        var by = footY + Math.sin(a) * R * 0.22;
        var reach = easeOut(Math.min(1, ts * 2.5));
        var hx = bx + (p.x - bx) * 0.5 * reach, hy = by - 90 * reach;
        var ta = (ts < 0.7) ? 1 : (1 - ts) / 0.3;
        for (var pass = 0; pass < 2; pass++) {
          setAlpha(ctx, (pass ? 0.95 : 0.6) * ta);
          ctx.strokeStyle = pass ? dark : p.color;
          ctx.lineWidth = pass ? 5 : 9;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + Math.sin(t * 10 + i) * 14, (by + hy) / 2, hx, hy);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      // 3. 闇の球
      var ss = span(t, 0.4, 0.5);
      if (ss > 0 && ss < 1) {
        var sr = R * 1.6 * (1 - easeOut(Math.min(1, ss * 2)) * 0.45);
        var sink = (ss > 0.6) ? (ss - 0.6) / 0.4 : 0;
        var cy = p.y + sink * 40;
        sr *= (1 - sink * 0.8);
        var g = ctx.createRadialGradient(p.x, cy, 0, p.x, cy, sr);
        g.addColorStop(0, dark);
        g.addColorStop(0.75, dark);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.8 * Math.min(1, ss * 4));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, cy, sr, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 0.9 * Math.min(1, ss * 4));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, cy, sr * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 4. 鬼火
      for (i = 0; i < 5; i++) {
        var ws = span(t, 0.7 + i * 0.04, 0.28);
        if (ws <= 0 || ws >= 1) continue;
        var wx = p.x + (i - 2) * 22 + Math.sin(ws * 8 + i) * 6;
        var wy = footY - 10 - ws * 70;
        setAlpha(ctx, Math.sin(ws * Math.PI) * 0.8);
        ctx.fillStyle = p.color;
        flameTongue(ctx, wx, wy, 12, 22, Math.sin(ws * 10) * 3);
        setAlpha(ctx, Math.sin(ws * Math.PI));
        ctx.fillStyle = rim;
        flameTongue(ctx, wx, wy, 6, 11, Math.sin(ws * 10) * 2);
      }
    },

    /**
     * プラズマ（v1.8.0）。雷の3段目。並び全体に1回だけ出す（effectAt: "center"）
     *   1. 電気の球 … 相手ごとに、ふちがバチバチ揺れる光の球
     *   2. つなぐ稲妻 … 球と球のあいだを稲妻が走り、明滅する
     *   3. はじける … 最後に球が輪になってはじけ、火花が散る
     */
    plasma: function (ctx, d, t, p) {
      var i, k, s;
      var points = pointsOf(p);
      var O = d.orb || 34;
      var flick = Math.floor(t * 16);
      var burst = span(t, 0.72, 0.28);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // 2. つなぐ稲妻
      var cs = span(t, 0.2, 0.55);
      if (cs > 0 && cs < 1 && points.length > 1) {
        for (k = 0; k < points.length - 1; k++) {
          var a = points[k], b = points[k + 1];
          var vis = (flick % 2 === 0) ? 1 : 0.4;
          var layers = [[p.color, 7, 0.7], ["#ffffff", 2.5, 1]];
          for (var l = 0; l < layers.length; l++) {
            setAlpha(ctx, vis * layers[l][2] * (cs < 0.85 ? 1 : (1 - cs) / 0.15));
            ctx.strokeStyle = layers[l][0];
            ctx.lineWidth = layers[l][1];
            zigzagPath(ctx, a.x + O * 0.8, a.y, b.x - O * 0.8, b.y, 8, 34, k * 23 + flick * 7, 1);
            ctx.stroke();
          }
        }
      }
      // 1. 電気の球
      for (k = 0; k < points.length; k++) {
        var os = span(t, k * 0.05, 0.75);
        if (os <= 0) continue;
        var x = points[k].x, y = points[k].y;
        var grow = easeOut(Math.min(1, os * 4));
        var r = O * grow * (1 + burst * 1.5);
        var oa = (burst > 0) ? 1 - burst : 1;
        if (oa <= 0) continue;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.45, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.7 * oa);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // バチバチのふち
        setAlpha(ctx, oa);
        ctx.strokeStyle = (flick % 2) ? "#ffffff" : p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (s = 0; s <= 18; s++) {
          var ang = turns(s / 18);
          var rr = r * (0.85 + (wobble(k * 40 + s + flick * 19) - 0.5) * 0.4);
          if (s === 0) ctx.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          else ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        ctx.stroke();
        // 3. はじける火花
        if (burst > 0) {
          ctx.fillStyle = "#ffffff";
          for (i = 0; i < 10; i++) {
            var sa = turns(i / 10 + k * 0.05);
            var sd = O + burst * 60;
            ctx.fillRect(x + Math.cos(sa) * sd - 2, y + Math.sin(sa) * sd - 2, 4, 4);
          }
        }
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    },

    /**
     * インフェルノ（v1.8.0）。火の4段目（最上位）。大きく派手に出す
     *   0. 赤く染まる … 画面全体がうっすら赤黒く染まる
     *   1. 溶岩の魔法陣 … 足元に二重の輪と、外へ走る光るひびが開く
     *   2. 火柱 … 何層もの炎が巨大な柱になって噴き上がる（深い赤・赤・金・白）
     *   3. 閃光と衝撃 … 噴き上がった瞬間に白く光り、足元の輪が大きく広がる
     *   4. 火の玉と火の粉 … 火の玉が弧を描いて四方へ落ち、火の粉が舞い上がる
     *   5. 炎の輪 … 最後に足元をぐるりと炎が燃え残る
     */
    inferno: function (ctx, d, t, p) {
      var i;
      var R = d.radius || 80;
      var gold = d.accentColor || "#ffd75e";
      var deep = d.deepColor || "#5a0a02";
      var footY = p.y + 40;
      var erupt = 0.28;
      // 0. 赤く染まる
      screenTint(ctx, p, deep, 0.35 * ((t < 0.15) ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1)));
      // 1. 溶岩の魔法陣
      var ms = span(t, 0, 0.3);
      var mEnd = (t > 0.85) ? (1 - t) / 0.15 : 1;
      if (ms > 0 && mEnd > 0) {
        var mr = R * 1.3 * easeOut(ms);
        var mg = ctx.createRadialGradient(p.x, footY, 0, p.x, footY, mr);
        mg.addColorStop(0, gold);
        mg.addColorStop(0.5, p.color);
        mg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.translate(p.x, footY);
        ctx.scale(1, 0.28);
        ctx.translate(-p.x, -footY);
        setAlpha(ctx, 0.6 * mEnd);
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(p.x, footY, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        setAlpha(ctx, 0.95 * mEnd);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, mr, mr * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, mr * 0.72, mr * 0.72 * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 外へ走るひび
        ctx.lineJoin = "round";
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        for (i = 0; i < 10; i++) {
          var ca = turns(i / 10 + 0.03);
          var ox = p.x + Math.cos(ca) * mr, oy = footY + Math.sin(ca) * mr * 0.28;
          zigzagPath(ctx, ox, oy, ox + Math.cos(ca) * 60, oy + Math.sin(ca) * 18, 3, 10, i * 7 + 2300, Math.min(1, ms * 1.5));
          ctx.stroke();
        }
        ctx.lineJoin = "miter";
      }
      // 2. 火柱
      var ps = span(t, erupt, 0.62);
      if (ps > 0 && ps < 1) {
        var rise = easeOut(Math.min(1, ps * 4));
        var shrink = (ps > 0.6) ? 1 - (ps - 0.6) / 0.4 : 1;
        var W = d.pillar || 120, PH = (d.pillarHeight || 280);
        var layers = [[deep, 1.15, 1.0, 0.8], [p.color, 0.9, 0.92, 0.85], [gold, 0.6, 0.75, 0.9], ["#ffffff", 0.25, 0.5, 0.95]];
        for (var l = 0; l < layers.length; l++) {
          for (i = -1; i <= 1; i++) {
            var sway = Math.sin(t * 26 + l + i * 2) * 10;
            setAlpha(ctx, layers[l][3] * shrink);
            ctx.fillStyle = layers[l][0];
            flameTongue(ctx, p.x + i * W * 0.22 * layers[l][1], footY + 6,
              W * layers[l][1] * (i === 0 ? 1 : 0.6), PH * layers[l][2] * rise * shrink * (i === 0 ? 1 : 0.7), sway);
          }
        }
      }
      // 3. 閃光と衝撃
      var fs = span(t, erupt, 0.25);
      if (fs > 0 && fs < 1) {
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 220);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.4, gold);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - fs) * (1 - fs) * 0.85);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 220, 0, Math.PI * 2);
        ctx.fill();
      }
      var ws = span(t, erupt, 0.4);
      if (ws > 0 && ws < 1) {
        setAlpha(ctx, (1 - ws) * 0.9);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 6 * (1 - ws) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, 60 + ws * 240, (60 + ws * 240) * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 4. 火の玉
      for (i = 0; i < (d.meteors || 8); i++) {
        var es = span(t, erupt + 0.1 + wobble(i + 2310) * 0.12, 0.4);
        if (es <= 0 || es >= 1) continue;
        var side = (i % 2) ? 1 : -1;
        var dist = (70 + wobble(i + 2320) * 160) * side;
        var mx = p.x + dist * es;
        var my = (p.y - 120) - 120 * Math.sin(es * Math.PI) * (0.6 + wobble(i + 2330) * 0.4) + es * 160;
        setAlpha(ctx, (es < 0.85) ? 1 : (1 - es) / 0.15);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // 火の粉
      ctx.fillStyle = gold;
      for (i = 0; i < (d.embers || 40); i++) {
        var ks = span(t, erupt + wobble(i + 2340) * 0.4, 0.4);
        if (ks <= 0 || ks >= 1) continue;
        var kx = p.x + (wobble(i + 2350) - 0.5) * 200 + Math.sin(ks * 6 + i) * 10;
        var ky = footY - ks * (120 + wobble(i + 2360) * 160);
        setAlpha(ctx, 1 - ks);
        ctx.fillRect(kx - 2, ky - 2, 4, 4);
      }
      // 5. 炎の輪
      var rs = span(t, 0.55, 0.45);
      if (rs > 0 && rs < 1) {
        var n = d.ring || 14;
        var ra = Math.sin(rs * Math.PI);
        for (i = 0; i < n; i++) {
          var a = turns(i / n);
          var fx = p.x + Math.cos(a) * R;
          var fy = footY + Math.sin(a) * R * 0.28;
          var fh = 34 * ra * (0.7 + wobble(i + 2370) * 0.5);
          setAlpha(ctx, ra * (Math.sin(a) < 0 ? 0.55 : 0.95));
          ctx.fillStyle = (i % 3 === 0) ? gold : p.color;
          flameTongue(ctx, fx, fy, 16, fh, Math.sin(t * 30 + i) * 4);
        }
      }
    },

    /**
     * メイルシュトローム（v1.8.0）。水の4段目（最上位）。大きく派手に出す
     *   0. 青く染まる … 画面全体がうっすら深い青に染まる
     *   1. 渦 … 足元に巨大な渦が開き、腕が速く回りながら締まる
     *   2. 水の壁 … 渦から水の壁がせり上がり、回りながら相手を包む（手前は透ける）
     *   3. 崩れる … 水の壁が崩れ、大きなしぶきが四方へ飛ぶ。泡の輪が広がる
     *   4. 吸い取り … 水の粒が3本の流れになって、うねりながら左へ戻る
     */
    maelstrom: function (ctx, d, t, p) {
      var i, k;
      var R = d.radius || 120;
      var foam = d.foamColor || "#e8fbff";
      var deep = d.deepColor || "#0b2a55";
      var footY = p.y + 40;
      var fall = 0.68;
      // 0. 青く染まる
      screenTint(ctx, p, deep, 0.35 * ((t < 0.15) ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1)));
      // 1. 渦
      var vs = span(t, 0, 0.3);
      var vEnd = (t > 0.8) ? (1 - t) / 0.2 : 1;
      if (vs > 0 && vEnd > 0) {
        var vr = R * easeOut(vs) * vEnd;
        setAlpha(ctx, 0.75 * vEnd);
        ctx.fillStyle = deep;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, vr, vr * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineCap = "round";
        for (i = 0; i < (d.arms || 5); i++) {
          var base = turns(i / (d.arms || 5) + t * 1.8);
          setAlpha(ctx, 0.9 * vEnd);
          ctx.strokeStyle = (i % 2) ? foam : p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (k = 0; k <= 16; k++) {
            var f = k / 16;
            var a = base + f * Math.PI * 1.6;
            var r = vr * (1 - f * 0.85);
            var x = p.x + Math.cos(a) * r, y = footY + Math.sin(a) * r * 0.28;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      // 2. 水の壁（筒の形の水の幕。奥の半分を先に、手前の半分を透かして後に描く）
      var ws = span(t, 0.22, fall - 0.22);
      if (ws > 0 && t < fall + 0.05) {
        var up = easeOut(Math.min(1, ws * 1.6));
        var WH = (d.wallHeight || 190) * up;
        var wr = 66 - ws * 10;
        var steps = d.walls || 16;
        // 上の縁の高さ（角度ごとに波打つ）
        var topAt = function (a) {
          return footY + Math.sin(a) * wr * 0.28 - WH * (0.88 + Math.sin(a * 3 + t * 16) * 0.08 + Math.sin(a * 5 - t * 11) * 0.04);
        };
        for (var pass = 0; pass < 2; pass++) {
          var a0 = pass ? 0 : Math.PI;           // 手前は 0〜π（下側）、奥は π〜2π
          ctx.beginPath();
          for (k = 0; k <= steps; k++) {
            var a = a0 + Math.PI * k / steps;
            var x = p.x + Math.cos(a) * wr;
            if (k === 0) ctx.moveTo(x, topAt(a)); else ctx.lineTo(x, topAt(a));
          }
          for (k = steps; k >= 0; k--) {
            var a2 = a0 + Math.PI * k / steps;
            ctx.lineTo(p.x + Math.cos(a2) * wr, footY + Math.sin(a2) * wr * 0.28);
          }
          ctx.closePath();
          var wg = ctx.createLinearGradient(0, footY - WH, 0, footY);
          wg.addColorStop(0, pass ? foam : p.color);
          wg.addColorStop(0.25, p.color);
          wg.addColorStop(1, deep);
          setAlpha(ctx, pass ? 0.38 : 0.7);
          ctx.fillStyle = wg;
          ctx.fill();
          // 泡の縁
          setAlpha(ctx, pass ? 0.95 : 0.6);
          ctx.strokeStyle = foam;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (k = 0; k <= steps; k++) {
            var a3 = a0 + Math.PI * k / steps;
            var x3 = p.x + Math.cos(a3) * wr;
            if (k === 0) ctx.moveTo(x3, topAt(a3)); else ctx.lineTo(x3, topAt(a3));
          }
          ctx.stroke();
        }
        // 手前を昇る水の筋（らせんに回る）
        ctx.lineCap = "round";
        ctx.strokeStyle = foam;
        ctx.lineWidth = 2;
        for (i = 0; i < 10; i++) {
          var sa = turns(i / 10 + t * 0.8);
          if (Math.sin(sa) < 0.15) continue;
          var sxp = p.x + Math.cos(sa) * wr;
          var base = footY + Math.sin(sa) * wr * 0.28;
          var off = ((t * 3 + i * 0.37) % 1) * WH * 0.8;
          setAlpha(ctx, 0.6);
          ctx.beginPath();
          ctx.moveTo(sxp, base - off);
          ctx.lineTo(sxp, base - off - 24);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      // 3. 崩れる
      var cs = span(t, fall, 1 - fall);
      if (cs > 0 && cs < 1) {
        setAlpha(ctx, (1 - cs) * 0.9);
        ctx.strokeStyle = foam;
        ctx.lineWidth = 5 * (1 - cs) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, 60 + cs * 200, (60 + cs * 200) * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (i = 0; i < (d.drops || 30); i++) {
          var sa = turns(0.5 + wobble(i + 2400) * 0.5);   // 上半分
          var sp = 80 + wobble(i + 2410) * 140;
          var sx = p.x + Math.cos(sa) * sp * cs;
          var sy = p.y - 40 + Math.sin(sa) * sp * cs * 1.2 + 260 * cs * cs;
          setAlpha(ctx, 1 - cs);
          ctx.fillStyle = (i % 3 === 0) ? foam : p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 3 + wobble(i + 2420) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 4. 吸い取り
      for (k = 0; k < 3; k++) {
        for (i = 0; i < 8; i++) {
          var ds = span(t, 0.62 + k * 0.04 + i * 0.025, 0.3);
          if (ds <= 0 || ds >= 1) continue;
          var dx = p.x - easeIn(ds) * 320;
          var dy = p.y - 20 + (k - 1) * 26 + Math.sin(ds * 10 + k * 2) * 14;
          setAlpha(ctx, Math.sin(ds * Math.PI));
          ctx.fillStyle = (i % 2) ? foam : p.color;
          sapDrop(ctx, dx, dy, 3.5);
        }
      }
    },

    /**
     * テンペスト（v1.8.0）。風の4段目（最上位・全体）。大きく派手に出す
     *   0. 緑に染まる … 画面全体がうっすら深い緑に染まる
     *   1. 吹き荒れる風 … 画面を横切る長い風の筋が、何本も左から右へ駆け抜ける
     *   2. 竜巻 … 相手ひとりずつの足元から巨大な竜巻が立ち上がって回る。木の葉が巻き上がる
     *   3. 当たる … 竜巻の中で風の刃が相手のまわりを斬り、足元に衝撃の輪
     *   4. 散る … 大きな突風が画面を薙ぎ、竜巻がほどけて広がる
     */
    tempest: function (ctx, d, t, p) {
      var i, j, k;
      var pts = pointsOf(p);
      var pale = d.accentColor || "#effff6";
      var deep = d.deepColor || "#0b2a1d";
      var hit = d.hitAt || 0.35;
      var TH = d.funnelHeight || 210;
      screenTint(ctx, p, deep, 0.4 * ((t < 0.15) ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1)));
      ctx.lineCap = "round";
      // 1. 吹き荒れる風
      for (i = 0; i < (d.streaks || 28); i++) {
        var st = span(t, wobble(i + 2500) * 0.72, 0.24);
        if (st <= 0 || st >= 1) continue;
        var sy = p.y - 80 + wobble(i + 2510) * 230;
        var len = 140 + wobble(i + 2520) * 200;
        var head = p.x - 560 + st * 1120;
        setAlpha(ctx, Math.sin(st * Math.PI) * 0.75);
        ctx.strokeStyle = (i % 3 === 0) ? pale : p.color;
        ctx.lineWidth = 1.5 + wobble(i + 2530) * 3;
        ctx.beginPath();
        ctx.moveTo(head - len, sy + 8);
        ctx.quadraticCurveTo(head - len / 2, sy - 16 * Math.sin(st * 6 + i), head, sy);
        ctx.stroke();
      }
      // 2. 竜巻
      var grow = easeOut(span(t, 0.08, 0.25));
      var fade = (t > 0.78) ? 1 - (t - 0.78) / 0.22 : 1;
      var spread = (t > 0.78) ? (t - 0.78) / 0.22 : 0;
      for (k = 0; k < pts.length; k++) {
        var q = pts[k];
        var footY = q.y + 40;
        if (grow > 0 && fade > 0) {
          var H = TH * grow;
          var levels = d.levels || 14;
          // 渦の幕（うすい漏斗）
          setAlpha(ctx, 0.16 * fade);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(q.x - 10, footY);
          ctx.lineTo(q.x - (10 + H * 0.42) * (1 + spread), footY - H);
          ctx.lineTo(q.x + (10 + H * 0.42) * (1 + spread), footY - H);
          ctx.lineTo(q.x + 10, footY);
          ctx.closePath();
          ctx.fill();
          for (j = 0; j <= levels; j++) {
            var f = j / levels;
            var h = H * f;
            var cx = q.x + Math.sin(t * 9 + f * 4 + k) * 10 * f;
            var rx = (10 + h * 0.42) * (1 + spread * 1.2);
            var ry = rx * 0.22;
            var cy = footY - h;
            var a0 = (t * 22 + j * 0.8 + k) % (Math.PI * 2);
            // 奥の半分（うすく）
            setAlpha(ctx, 0.35 * fade);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
            // 手前を回る流れ
            setAlpha(ctx, 0.85 * fade);
            ctx.strokeStyle = (j % 3 === 0) ? pale : p.color;
            ctx.lineWidth = 2.5 + f * 2.5;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, a0, a0 + Math.PI * 1.1);
            ctx.stroke();
          }
          // 巻き上がる木の葉
          for (i = 0; i < (d.debris || 12); i++) {
            var u = (t * 1.4 + wobble(i + 2540 + k * 31)) % 1;
            var hh = H * u;
            var rr = (10 + hh * 0.42) * (1 + spread);
            var aa = t * 18 + i * 2.1 + k;
            var dx = q.x + Math.cos(aa) * rr;
            var dy = footY - hh + Math.sin(aa) * rr * 0.22;
            setAlpha(ctx, fade * (Math.sin(aa) > 0 ? 1 : 0.4));
            ctx.fillStyle = (i % 3 === 0) ? pale : p.color;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(aa * 1.5);
            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        // 3. 当たる（風の刃が相手のまわりを斬る）
        var hs = span(t, hit, 0.32);
        if (hs > 0 && hs < 1) {
          var sweep = easeOut(Math.min(1, hs * 2.2));
          for (i = 0; i < 3; i++) {
            var from = turns(i / 3 + 0.08 + k * 0.1);
            crescent(ctx, q.x, q.y - 6, 44 + i * 8, from, from + sweep * turns(0.38), 12 - i * 2, (1 - hs) * 0.95, (i === 1) ? p.color : pale);
          }
          var fg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 120);
          fg.addColorStop(0, "#ffffff");
          fg.addColorStop(0.4, p.color);
          fg.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, (1 - hs) * (1 - hs) * 0.7);
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 120, 0, Math.PI * 2);
          ctx.fill();
          setAlpha(ctx, (1 - hs) * 0.9);
          ctx.strokeStyle = pale;
          ctx.lineWidth = 5 * (1 - hs) + 1;
          ctx.beginPath();
          ctx.ellipse(q.x, footY, 30 + hs * 140, (30 + hs * 140) * 0.25, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 4. 突風（画面を薙ぐ太い風）
      var gs = span(t, 0.72, 0.26);
      if (gs > 0 && gs < 1) {
        for (i = 0; i < 6; i++) {
          var gy = p.y - 60 + i * 34;
          var gx = p.x - 700 + easeOut(gs) * 1400 - i * 30;
          setAlpha(ctx, Math.sin(gs * Math.PI) * 0.8);
          ctx.strokeStyle = (i % 2) ? p.color : pale;
          ctx.lineWidth = 7 - Math.abs(i - 2.5);
          ctx.beginPath();
          ctx.moveTo(gx - 420, gy + 20);
          ctx.quadraticCurveTo(gx - 200, gy - 22, gx, gy);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
    },

    /**
     * テラバースト（v1.8.0）。地の4段目（最上位・全体）。大きく派手に出す
     *   0. 茶に染まる … 画面全体がうっすら深い土の色に染まる
     *   1. 割れ目 … 並びの真ん中から左右へ、大地に大きな割れ目が走る。奥からマグマのような光が漏れる
     *   2. 岩の柱 … 相手ひとりずつの足元から、とがった岩の柱が何本も突き上がる（真ん中の柱はすぐ崩れる）
     *   3. 砕ける … 岩の破片が飛び散って落ち、土煙と衝撃の輪
     *   4. ひび … 相手の体に光るひびが残る（受けるダメージが増える）
     */
    terraBurst: function (ctx, d, t, p) {
      var i, k;
      var pts = pointsOf(p);
      var deep = d.deepColor || "#2a1606";
      var magma = d.accentColor || "#ffb347";
      var dark = d.rockColor || "#5a4026";
      var hit = d.hitAt || 0.4;
      var rowY = p.y + 40;
      screenTint(ctx, p, deep, 0.42 * ((t < 0.15) ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1)));
      var minX = pts[0].x, maxX = pts[0].x;
      for (k = 1; k < pts.length; k++) {
        minX = Math.min(minX, pts[k].x);
        maxX = Math.max(maxX, pts[k].x);
      }
      // 1. 割れ目
      var cs = span(t, 0.04, 0.28);
      var cEnd = (t > 0.85) ? (1 - t) / 0.15 : 1;
      if (cs > 0 && cEnd > 0) {
        ctx.lineJoin = "round";
        var pulse = (t > hit) ? 1 : 0.55 + 0.45 * span(t, 0.1, hit - 0.1);
        var widths = [16, 7, 2.5], colors = [deep, magma, "#fff2c8"], alphas = [0.7, 0.9, 1];
        for (var pass = 0; pass < 3; pass++) {
          setAlpha(ctx, alphas[pass] * cEnd);
          ctx.strokeStyle = colors[pass];
          ctx.lineWidth = widths[pass] * (pass ? pulse : 1);
          zigzagPath(ctx, p.x, rowY, minX - 260, rowY + 8, 22, 18, 2600, cs);
          ctx.stroke();
          zigzagPath(ctx, p.x, rowY, maxX + 260, rowY - 4, 22, 18, 2650, cs);
          ctx.stroke();
        }
        // 足元から枝分かれ
        ctx.strokeStyle = magma;
        ctx.lineWidth = 2;
        for (k = 0; k < pts.length; k++) {
          for (i = 0; i < 4; i++) {
            var ba = turns(0.05 + i * 0.25 + wobble(i + k * 9 + 2660) * 0.1);
            setAlpha(ctx, 0.85 * cEnd);
            zigzagPath(ctx, pts[k].x, pts[k].y + 40, pts[k].x + Math.cos(ba) * 80, pts[k].y + 40 + Math.sin(ba) * 22, 4, 10, i * 5 + k * 17 + 2670, cs);
            ctx.stroke();
          }
        }
        ctx.lineJoin = "miter";
      }
      for (k = 0; k < pts.length; k++) {
        var q = pts[k];
        var footY = q.y + 40;
        // 漏れる光（当たる前にだんだん強く）
        var ls = span(t, 0.12, hit - 0.12);
        if (ls > 0 && t < hit + 0.1) {
          var la = (t < hit) ? ls : 1 - (t - hit) / 0.1;
          var lg = ctx.createRadialGradient(q.x, footY, 0, q.x, footY, 90);
          lg.addColorStop(0, "#fff2c8");
          lg.addColorStop(0.35, magma);
          lg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.save();
          ctx.translate(q.x, footY);
          ctx.scale(1, 0.4);
          ctx.translate(-q.x, -footY);
          setAlpha(ctx, 0.75 * la);
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(q.x, footY, 90, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // 2. 岩の柱（奥の列 → 手前の列の順に描く）
        var rs = span(t, hit - 0.03, 0.07);
        var sink = (t > 0.72) ? (t - 0.72) / 0.28 : 0;
        var spikes = d.spikes || 7;
        for (var row = 0; row < 2 && rs > 0; row++) {
          for (i = row; i < spikes; i += 2) {
            var off = (i - (spikes - 1) / 2) / ((spikes - 1) / 2);
            var center = (Math.abs(off) < 0.2);
            // 真ん中の柱は相手を突き上げたらすぐ崩れる（相手が隠れたままにならないように）
            var down = center ? span(t, hit + 0.08, 0.14) : sink;
            if (down >= 1) continue;
            var sx = q.x + off * 78 + (wobble(i + 2700 + k * 13) - 0.5) * 12;
            var sh = (d.spikeHeight || 150) * (center ? 0.95 : (1 - Math.abs(off) * 0.5)) * (0.8 + wobble(i + 2710 + k * 7) * 0.3);
            var sw = center ? 34 : 18 + (1 - Math.abs(off)) * 16;
            var tilt = off * 26;
            var hgt = sh * easeOut(rs) * (1 - easeIn(down));
            var by = footY + (row ? 10 : -4);
            var sg = ctx.createLinearGradient(sx, by - hgt, sx, by);
            sg.addColorStop(0, "#f3dfae");
            sg.addColorStop(0.35, p.color);
            sg.addColorStop(1, dark);
            setAlpha(ctx, 0.97 * (1 - down * 0.5));
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.moveTo(sx - sw / 2, by);
            ctx.lineTo(sx + tilt, by - hgt);
            ctx.lineTo(sx + sw / 2, by);
            ctx.closePath();
            ctx.fill();
            // 影の面
            setAlpha(ctx, 0.4 * (1 - down * 0.5));
            ctx.fillStyle = deep;
            ctx.beginPath();
            ctx.moveTo(sx + sw * 0.08, by);
            ctx.lineTo(sx + tilt, by - hgt);
            ctx.lineTo(sx + sw / 2, by);
            ctx.closePath();
            ctx.fill();
          }
        }
        // 3. 砕ける（破片・土煙・衝撃）
        var es = span(t, hit, 0.5);
        if (es > 0 && es < 1) {
          var fg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 130);
          fg.addColorStop(0, "#fff2c8");
          fg.addColorStop(0.4, magma);
          fg.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, Math.max(0, 1 - es * 3) * 0.8);
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 130, 0, Math.PI * 2);
          ctx.fill();
          for (i = 0; i < 3; i++) {
            var ps = span(es, i * 0.12, 0.7);
            if (ps <= 0 || ps >= 1) continue;
            var pr = 40 + ps * 110;
            var pg = ctx.createRadialGradient(q.x + (i - 1) * 50, footY, 0, q.x + (i - 1) * 50, footY, pr);
            pg.addColorStop(0, "#8a6a44");
            pg.addColorStop(1, "rgba(0,0,0,0)");
            setAlpha(ctx, (1 - ps) * 0.55);
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(q.x + (i - 1) * 50, footY - ps * 20, pr, 0, Math.PI * 2);
            ctx.fill();
          }
          setAlpha(ctx, (1 - es) * 0.9);
          ctx.strokeStyle = magma;
          ctx.lineWidth = 5 * (1 - es) + 1;
          ctx.beginPath();
          ctx.ellipse(q.x, footY, 40 + es * 170, (40 + es * 170) * 0.25, 0, 0, Math.PI * 2);
          ctx.stroke();
          for (i = 0; i < (d.rocks || 14); i++) {
            var vx = (wobble(i + 2720 + k * 5) - 0.5) * 260;
            var vy = 180 + wobble(i + 2730 + k * 3) * 160;
            var rxp = q.x + vx * es;
            var ryp = footY - 20 - vy * es + 420 * es * es;
            var size = 4 + wobble(i + 2740) * 7;
            setAlpha(ctx, (es < 0.8) ? 1 : (1 - es) / 0.2);
            ctx.fillStyle = (i % 3 === 0) ? "#f3dfae" : ((i % 3 === 1) ? p.color : dark);
            polygonPath(ctx, rxp, ryp, size, 5, es * 9 + i, 0.8);
            ctx.fill();
          }
        }
        // 4. ひび（体に残る光るひび）
        var cr = span(t, hit + 0.12, 1 - hit - 0.12);
        if (cr > 0 && cr < 1) {
          ctx.lineJoin = "round";
          for (i = 0; i < 6; i++) {
            var ca = turns(i / 6 + 0.04 + wobble(i + 2750) * 0.06);
            var reach = Math.min(1, cr * 4);
            setAlpha(ctx, (cr < 0.6) ? 1 : (1 - cr) / 0.4);
            ctx.strokeStyle = magma;
            ctx.lineWidth = 3;
            zigzagPath(ctx, q.x, q.y - 4, q.x + Math.cos(ca) * 34, q.y - 4 + Math.sin(ca) * 30, 4, 9, i * 7 + k * 3 + 2760, reach);
            ctx.stroke();
            ctx.strokeStyle = "#fff2c8";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.lineJoin = "miter";
        }
      }
    },

    /**
     * セイントノヴァ（v1.8.0）。光の4段目（最上位・1体）。大きく派手に出す
     *   0. 夜のように暗くなる … 画面が暗い藍に沈む（光が映えるように）
     *   1. 聖なる魔法陣 … 相手に重なって、二重の輪と六芒星が回りながら開く。まわりの光が集まってくる
     *   2. ノヴァ … 魔法陣が1点に縮み、大爆発。画面が白く光り、光芒と大きな十字の星が開く。衝撃の輪が2つ
     *   3. 光の十字架 … 相手に光の十字が立ち、光の粒が降る
     */
    saintNova: function (ctx, d, t, p) {
      var i, k;
      var gold = d.accentColor || "#ffe08a";
      var night = d.deepColor || "#120e2a";
      var hit = d.hitAt || 0.42;
      var R = d.radius || 78;
      // 0. 暗くなり、当たると白く光る
      screenTint(ctx, p, night, 0.48 * ((t < 0.12) ? t / 0.12 : (t > hit ? Math.max(0, 1 - (t - hit) / 0.2) : 1)));
      var ws = span(t, hit, 0.35);
      if (ws > 0 && ws < 1) screenTint(ctx, p, "#fffbe6", 0.6 * (1 - ws) * (1 - ws));
      // 1. 聖なる魔法陣
      var ms = span(t, 0.02, 0.18);
      var shrink = span(t, hit - 0.09, 0.09);
      if (ms > 0 && shrink < 1) {
        var mr = R * easeOut(ms) * (1 - easeIn(shrink));
        var rot = t * 3;
        setAlpha(ctx, 0.95);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, mr * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, mr * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        // 輪のあいだの目盛り
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        for (i = 0; i < 24; i++) {
          var ta = turns(i / 24) + rot;
          var t1 = (i % 3 === 0) ? 0.8 : 0.86;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(ta) * mr * t1, p.y + Math.sin(ta) * mr * t1);
          ctx.lineTo(p.x + Math.cos(ta) * mr * 0.96, p.y + Math.sin(ta) * mr * 0.96);
          ctx.stroke();
        }
        // 六芒星（逆に回る）
        ctx.strokeStyle = "#ffffff";
        polygonPath(ctx, p.x, p.y, mr * 0.78, 3, -rot * 1.4 - Math.PI / 2, 1);
        ctx.stroke();
        polygonPath(ctx, p.x, p.y, mr * 0.78, 3, -rot * 1.4 + Math.PI / 2, 1);
        ctx.stroke();
      }
      // 集まる光
      for (i = 0; i < (d.motes || 28); i++) {
        var gs = span(t, 0.04 + wobble(i + 2800) * 0.18, hit - 0.24);
        if (gs <= 0 || gs >= 1) continue;
        var ga = turns(wobble(i + 2810)) + gs * 1.2;
        var gr = (200 + wobble(i + 2820) * 120) * (1 - easeIn(gs));
        var gx = p.x + Math.cos(ga) * gr, gy = p.y + Math.sin(ga) * gr * 0.8;
        setAlpha(ctx, Math.min(1, gs * 3));
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(p.x + Math.cos(ga - 0.15) * (gr + 26), p.y + Math.sin(ga - 0.15) * (gr + 26) * 0.8);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(gx, gy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 芯（当たるまでふくらむ）
      var cs = span(t, 0.08, hit - 0.08);
      if (cs > 0 && t < hit + 0.05) {
        var cr = 8 + 30 * cs;
        var cg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cr);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.5, gold);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.95);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      // 2. ノヴァ
      var ns = span(t, hit, 0.45);
      if (ns > 0 && ns < 1) {
        var rays = d.rays || 18;
        var rl = (d.rayLength || 380) * easeOut(Math.min(1, ns * 3));
        for (i = 0; i < rays; i++) {
          var ra = turns(i / rays) + ns * 0.25;
          var rw = ((i % 2) ? 5 : 11) * (1 - ns * 0.7);
          var len = rl * ((i % 2) ? 0.65 : 1);
          var rg = ctx.createLinearGradient(p.x, p.y, p.x + Math.cos(ra) * len, p.y + Math.sin(ra) * len);
          rg.addColorStop(0, "#ffffff");
          rg.addColorStop(0.4, gold);
          rg.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, (1 - ns) * 0.9);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(ra + Math.PI / 2) * rw, p.y + Math.sin(ra + Math.PI / 2) * rw);
          ctx.lineTo(p.x + Math.cos(ra) * len, p.y + Math.sin(ra) * len);
          ctx.lineTo(p.x + Math.cos(ra - Math.PI / 2) * rw, p.y + Math.sin(ra - Math.PI / 2) * rw);
          ctx.closePath();
          ctx.fill();
        }
        var bg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 150);
        bg.addColorStop(0, "#ffffff");
        bg.addColorStop(0.35, gold);
        bg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - ns) * (1 - ns));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 150, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - ns);
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, p.x, p.y, (40 + 170 * easeOut(Math.min(1, ns * 2.5))) * (1 - ns * 0.5));
        for (k = 0; k < 2; k++) {
          var rs = span(t, hit + k * 0.07, 0.4);
          if (rs <= 0 || rs >= 1) continue;
          setAlpha(ctx, 1 - rs);
          ctx.strokeStyle = k ? gold : "#ffffff";
          ctx.lineWidth = 8 * (1 - rs) + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 30 + rs * 260, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 光の十字架
      var xs = span(t, hit + 0.08, 0.48);
      if (xs > 0 && xs < 1) {
        var xa = Math.sin(xs * Math.PI) * 0.8;
        var xw = 24 * (1 - xs * 0.5);
        var vg = ctx.createLinearGradient(p.x - xw, 0, p.x + xw, 0);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(0.5, "#ffffff");
        vg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, xa);
        ctx.fillStyle = vg;
        ctx.fillRect(p.x - xw, p.y - 130, xw * 2, 230);
        var hg = ctx.createLinearGradient(0, p.y - 30 - xw * 0.7, 0, p.y - 30 + xw * 0.7);
        hg.addColorStop(0, "rgba(0,0,0,0)");
        hg.addColorStop(0.5, "#ffffff");
        hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(p.x - 70, p.y - 30 - xw * 0.7, 140, xw * 1.4);
      }
      // 降る光の粒
      for (i = 0; i < (d.sparkles || 26); i++) {
        var ss = span(t, hit + 0.05 + wobble(i + 2830) * 0.35, 0.35);
        if (ss <= 0 || ss >= 1) continue;
        var sx = p.x + (wobble(i + 2840) - 0.5) * 320;
        var sy = p.y - 110 + ss * (140 + wobble(i + 2850) * 80);
        var tw = 0.6 + 0.4 * Math.sin(t * 40 + i);
        setAlpha(ctx, (1 - ss) * tw);
        ctx.fillStyle = (i % 3 === 0) ? gold : "#ffffff";
        fourStar(ctx, sx, sy, 3 + wobble(i + 2860) * 4);
      }
    },

    /**
     * グランドネビュラ（v1.8.0）。闇の4段目（最上位・全体）。ダークネビュラの「超進化」として、並び全体に1つの大きな星雲を出す
     * （作者の指定 11-26「3体の場所に出すよりかは、一つの大きなやつ」）
     *   0. 闇に沈む … 画面が深い闇に沈み、遠い星がまたたく
     *   1. 星雲 … 並びの真ん中に、紫と桃色の雲の腕が渦を巻く巨大な星雲が開く。真ん中は明るく光り、中で星が瞬く
     *   2. 呑み込む … 星雲が速く回りながら真ん中へ吸い込まれ、真ん中が黒い穴になる
     *   3. 爆ぜる … 黒い穴が、並び全体を覆う闇の爆発になってはじける。紫の破片と輪が大きく広がる
     *   4. 沈む闇・呪いの靄 … 相手ひとりずつに闇が沈み（ダークネビュラと同じ）、並びからうすい靄が昇る
     */
    grandNebula: function (ctx, d, t, p) {
      var i, j, k;
      var pts = pointsOf(p);
      var pink = d.accentColor || "#e07ad8";
      var deep = d.deepColor || "#06020e";
      var hit = d.hitAt || 0.45;
      var spread = d.spread || 400;
      var flat = d.flatten || 0.34;
      var env = (t < 0.15) ? t / 0.15 : (t > 0.82 ? (1 - t) / 0.18 : 1);
      screenTint(ctx, p, deep, 0.55 * env);
      // 0. 遠い星
      for (i = 0; i < (d.stars || 40); i++) {
        var tw = 0.5 + 0.5 * Math.sin(t * 20 + i * 1.7);
        setAlpha(ctx, tw * env * 0.9);
        ctx.fillStyle = (i % 4 === 0) ? pink : "#ffffff";
        var ssz = 1 + wobble(i + 2915) * 2;
        ctx.fillRect(p.x + (wobble(i + 2900) - 0.5) * 760, p.y - 75 + wobble(i + 2910) * 240, ssz, ssz);
      }
      // 1〜2. 星雲（腕が渦を巻き、終わりは真ん中へ吸い込まれる）
      var open = easeOut(span(t, 0, 0.26));
      var pull = easeIn(span(t, 0.28, hit - 0.28));
      var gone = (t > hit) ? Math.max(0, 1 - (t - hit) / 0.05) : 1;
      var rot = t * 1.6 + pull * 5;
      var shrink = 1 - pull * 0.94;
      if (open > 0 && gone > 0) {
        var cols = [p.color, pink, "#3a2a90", "#2a1650"];
        var arms = d.arms || 3;
        var per = d.puffs || 22;
        // 腕の筋（雲の下に、渦の形が分かる光の帯を引く）
        ctx.lineCap = "round";
        for (k = 0; k < arms; k++) {
          for (j = 0; j < per - 1; j++) {
            var fa = j / per, fb = (j + 1) / per;
            var aa1 = rot + turns(k / arms) + fa * Math.PI * 1.7, aa2 = rot + turns(k / arms) + fb * Math.PI * 1.7;
            var r1 = (30 + fa * spread) * open * shrink, r2 = (30 + fb * spread) * open * shrink;
            setAlpha(ctx, (0.75 - fa * 0.5) * gone);
            ctx.strokeStyle = (k % 2) ? pink : p.color;
            ctx.lineWidth = 12 * (1 - fa * 0.7) * (1 - pull * 0.6);
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(aa1) * r1, p.y + Math.sin(aa1) * r1 * flat);
            ctx.lineTo(p.x + Math.cos(aa2) * r2, p.y + Math.sin(aa2) * r2 * flat);
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
        for (k = 0; k < arms; k++) {
          for (j = 0; j < per; j++) {
            var f = j / per;
            var a = rot + turns(k / arms) + f * Math.PI * 1.7 + (wobble(j + k * 40 + 2970) - 0.5) * 0.3;
            var r = (30 + f * spread) * open * shrink * (0.9 + wobble(j + k * 40 + 2980) * 0.2);
            var x = p.x + Math.cos(a) * r;
            var y = p.y + Math.sin(a) * r * flat;
            var pr = (14 + f * 34) * (0.6 + 0.4 * open) * (1 - pull * 0.5);
            var cg0 = ctx.createRadialGradient(x, y, 0, x, y, pr);
            cg0.addColorStop(0, cols[(j + k) % 4]);
            cg0.addColorStop(1, "rgba(0,0,0,0)");
            setAlpha(ctx, (0.7 - f * 0.3) * gone);
            ctx.fillStyle = cg0;
            ctx.beginPath();
            ctx.arc(x, y, pr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // 雲の中で瞬く星（ダークネビュラと同じ十字の光）
        ctx.fillStyle = d.starColor || "#e6dcff";
        for (i = 0; i < (d.twinkles || 26); i++) {
          var ts = span(t, 0.05 + wobble(i + 2990) * 0.32, 0.22);
          if (ts <= 0 || ts >= 1) continue;
          var ta = turns(wobble(i + 2995)) + rot;
          var trr = (40 + wobble(i + 2998) * spread * 0.9) * shrink;
          var tx = p.x + Math.cos(ta) * trr, ty = p.y + Math.sin(ta) * trr * flat;
          var tz = (3 + wobble(i + 3001) * 4) * (1 - Math.abs(ts - 0.5) * 2);
          setAlpha(ctx, (1 - Math.abs(ts - 0.5) * 2) * gone);
          ctx.fillRect(tx - tz, ty - 0.75, tz * 2, 1.5);
          ctx.fillRect(tx - 0.75, ty - tz, 1.5, tz * 2);
        }
        // 真ん中：はじめは明るい核、吸い込むにつれて黒い穴になる
        var coreR = (46 + 20 * pull) * open;
        var cg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, coreR);
        if (pull < 0.5) {
          cg.addColorStop(0, "#ffffff");
          cg.addColorStop(0.3, pink);
        } else {
          cg.addColorStop(0, "#000000");
          cg.addColorStop(0.45, "#000000");
        }
        cg.addColorStop(0.7, p.color);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.9 * gone);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
        ctx.fill();
        if (pull > 0.4) {
          // 黒い穴のふちを回る光の輪
          setAlpha(ctx, (pull - 0.4) / 0.6 * gone);
          ctx.strokeStyle = pink;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, coreR * 0.75, coreR * 0.75 * 0.45, -0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 爆ぜる（並び全体を覆う闇の爆発）
      var bs = span(t, hit, 0.45);
      if (bs > 0 && bs < 1) {
        screenTint(ctx, p, pink, 0.3 * (1 - bs) * (1 - bs));
        var er = 60 + easeOut(bs) * (spread + 60);
        var eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, er);
        eg.addColorStop(0, "#000000");
        eg.addColorStop(0.5, deep);
        eg.addColorStop(0.75, p.color);
        eg.addColorStop(0.9, pink);
        eg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.42);
        ctx.translate(-p.x, -p.y);
        setAlpha(ctx, (1 - bs) * 0.85);
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        for (k = 0; k < 3; k++) {
          var rs = span(bs, k * 0.12, 0.8);
          if (rs <= 0 || rs >= 1) continue;
          var rr = 50 + rs * (spread + 120);
          setAlpha(ctx, 1 - rs);
          ctx.strokeStyle = (k === 1) ? pink : (k ? "#d8c8ff" : p.color);
          ctx.lineWidth = 7 * (1 - rs) + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rr, rr * 0.36, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 紫の破片
        for (i = 0; i < (d.shards || 28); i++) {
          var sa = turns(i / (d.shards || 28) + wobble(i + 3010) * 0.03);
          var s1 = 40 + easeOut(bs) * (spread * 0.8) * (0.7 + wobble(i + 3015) * 0.5);
          var s2 = s1 + 40 + (1 - bs) * 40;
          setAlpha(ctx, 1 - bs);
          ctx.fillStyle = (i % 2) ? pink : "#d8c8ff";
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(sa + 0.03) * s1, p.y + Math.sin(sa + 0.03) * s1 * 0.45);
          ctx.lineTo(p.x + Math.cos(sa) * s2, p.y + Math.sin(sa) * s2 * 0.45);
          ctx.lineTo(p.x + Math.cos(sa - 0.03) * s1, p.y + Math.sin(sa - 0.03) * s1 * 0.45);
          ctx.closePath();
          ctx.fill();
        }
      }
      // 4. 相手ひとりずつに沈む闇
      for (k = 0; k < pts.length; k++) {
        var ds = span(t, hit + 0.04, 0.4);
        if (ds <= 0 || ds >= 1) continue;
        var cr = 44 * easeOut(ds);
        setAlpha(ctx, fadeOut(ds) * 0.55);
        ctx.fillStyle = "#2a1650";
        ctx.beginPath();
        ctx.ellipse(pts[k].x, pts[k].y, cr, cr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, fadeOut(ds) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3 * (1 - ds));
        ctx.beginPath();
        ctx.ellipse(pts[k].x, pts[k].y, cr * 1.2, cr, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 呪いの靄（並びから昇る）
      var ws = span(t, 0.6, 0.38);
      if (ws > 0 && ws < 1) {
        ctx.lineCap = "round";
        for (i = 0; i < 10; i++) {
          var wx = p.x + (i - 4.5) * (spread * 0.2) + (wobble(i + 3020) - 0.5) * 20;
          var wy = p.y + 20 - ws * (60 + wobble(i + 3025) * 30);
          setAlpha(ctx, Math.sin(ws * Math.PI) * 0.65);
          ctx.strokeStyle = (i % 2) ? pink : p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(wx, wy + 40);
          ctx.bezierCurveTo(wx + 12 * Math.sin(t * 12 + i), wy + 26, wx - 12 * Math.sin(t * 12 + i), wy + 12, wx + 6 * Math.sin(t * 9 + i), wy);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
    },

    /**
     * ジャッジメント（v1.8.0）。雷の4段目（最上位・1体）。大きく派手に出す
     *   0. 闇に沈む … 画面が暗い夜空の色に沈む
     *   1. 天の紋章 … 相手の上（画面の上の端で止める）に雷の紋章が開いて回り、輪の上を小さな稲妻が走る
     *   2. 裁きの雷 … 紋章から光の柱と巨大な稲妻が相手へ落ちる。画面が白く光る
     *   3. 追いの雷 … まわりに小さな稲妻が続けて落ち、足元に稲妻が這い、衝撃の輪
     *   4. 麻痺の名残 … 相手の体のまわりで小さな稲妻がはじける
     */
    judgment: function (ctx, d, t, p) {
      var i, k;
      var pale = d.accentColor || "#fffbe0";
      var deep = d.deepColor || "#090b1c";
      var hit = d.hitAt || 0.45;
      var footY = p.y + 40;
      var sy = Math.max(d.sigilMinY || 22, p.y - 150);
      var SR = d.sigil || 96;
      screenTint(ctx, p, deep, 0.5 * ((t < 0.12) ? t / 0.12 : (t > 0.8 ? (1 - t) / 0.2 : 1)));
      var fs = span(t, hit, 0.25);
      if (fs > 0 && fs < 1) screenTint(ctx, p, pale, 0.6 * (1 - fs) * (1 - fs));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      // 1. 天の紋章
      var ms = span(t, 0.02, 0.2);
      var mEnd = (t > 0.75) ? (1 - t) / 0.25 : 1;
      if (ms > 0 && mEnd > 0) {
        var mr = SR * easeOut(ms);
        var sg = ctx.createRadialGradient(p.x, sy, 0, p.x, sy, mr * 1.2);
        sg.addColorStop(0, pale);
        sg.addColorStop(0.5, p.color);
        sg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.translate(p.x, sy);
        ctx.scale(1, 0.32);
        setAlpha(ctx, 0.35 * mEnd);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(0, 0, mr * 1.2, 0, Math.PI * 2);
        ctx.translate(-p.x, -sy);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(p.x, sy);
        ctx.scale(1, 0.32);
        setAlpha(ctx, 0.95 * mEnd);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, mr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = pale;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, mr * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, mr * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        for (i = 0; i < 12; i++) {
          var sa = turns(i / 12) + t * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * mr * 0.42, Math.sin(sa) * mr * 0.42);
          ctx.lineTo(Math.cos(sa) * mr * 0.82, Math.sin(sa) * mr * 0.82);
          ctx.stroke();
        }
        ctx.fillStyle = p.color;
        for (i = 0; i < 8; i++) {
          var da = turns(i / 8) - t * 3;
          polygonPath(ctx, Math.cos(da) * mr * 0.91, Math.sin(da) * mr * 0.91, 7, 4, 0, 1.6);
          ctx.fill();
        }
        ctx.restore();
        // 輪の上を走る小さな稲妻（溜め）
        var chs = span(t, 0.15, hit - 0.15);
        if (chs > 0 && t < hit) {
          var seed0 = Math.floor(t * 40) * 7;
          ctx.strokeStyle = pale;
          ctx.lineWidth = 1.5;
          for (i = 0; i < 4; i++) {
            var a1 = turns(wobble(seed0 + i + 3000));
            var a2 = a1 + 0.9;
            setAlpha(ctx, 0.85 * chs);
            zigzagPath(ctx, p.x + Math.cos(a1) * mr, sy + Math.sin(a1) * mr * 0.32,
              p.x + Math.cos(a2) * mr, sy + Math.sin(a2) * mr * 0.32, 5, 10, seed0 + i * 3 + 3010, 1);
            ctx.stroke();
          }
        }
      }
      // 2. 裁きの雷
      var bs = span(t, hit, 0.32);
      if (bs > 0 && bs < 1) {
        var cw = (d.column || 70) * (1 - bs * 0.6);
        var cg = ctx.createLinearGradient(p.x - cw, 0, p.x + cw, 0);
        cg.addColorStop(0, "rgba(0,0,0,0)");
        cg.addColorStop(0.3, p.color);
        cg.addColorStop(0.5, "#ffffff");
        cg.addColorStop(0.7, p.color);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.6 * (1 - bs));
        ctx.fillStyle = cg;
        ctx.fillRect(p.x - cw, sy, cw * 2, footY + 10 - sy);
        var seed = 3020 + Math.floor(t * 30) * 11;
        var reach = Math.min(1, bs * 6);
        var lw = [26, 12, 4.5], lc = [p.color, pale, "#ffffff"], la = [0.5, 0.9, 1];
        for (k = 0; k < 3; k++) {
          setAlpha(ctx, la[k] * (1 - bs * 0.7));
          ctx.strokeStyle = lc[k];
          ctx.lineWidth = lw[k] * (1 - bs * 0.5);
          zigzagPath(ctx, p.x, sy, p.x, footY, 10, 44, seed, reach);
          ctx.stroke();
        }
        // 枝
        ctx.strokeStyle = pale;
        ctx.lineWidth = 3 * (1 - bs);
        for (i = 0; i < 4; i++) {
          var by0 = sy + (footY - sy) * (0.25 + i * 0.15);
          var side = (i % 2) ? 1 : -1;
          setAlpha(ctx, 0.9 * (1 - bs));
          zigzagPath(ctx, p.x, by0, p.x + side * (50 + i * 12), by0 + 46, 4, 14, seed + i * 5, reach);
          ctx.stroke();
        }
        // 当たったところの光
        var hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 140);
        hg.addColorStop(0, "#ffffff");
        hg.addColorStop(0.4, p.color);
        hg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - bs) * (1 - bs) * 0.85);
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 140, 0, Math.PI * 2);
        ctx.fill();
      }
      // 3. 追いの雷
      for (i = 0; i < 4; i++) {
        var ls = span(t, hit + 0.06 + i * 0.045, 0.13);
        if (ls <= 0 || ls >= 1) continue;
        var sd = (i % 2) ? 1 : -1;
        var ex = p.x + sd * (70 + i * 26);
        var lseed = 3060 + i * 13 + Math.floor(t * 30) * 3;
        setAlpha(ctx, 1 - ls);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 7;
        zigzagPath(ctx, p.x + sd * (20 + i * 10), sy, ex, footY + 8, 7, 26, lseed, Math.min(1, ls * 5));
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      var gs = span(t, hit + 0.02, 0.35);
      if (gs > 0 && gs < 1) {
        for (i = 0; i < (d.branches || 9); i++) {
          var ga = turns(i / (d.branches || 9) + wobble(i + 3100) * 0.05);
          var gex = p.x + Math.cos(ga) * (120 + wobble(i + 3110) * 80);
          var gey = footY + Math.sin(ga) * (30 + wobble(i + 3120) * 14);
          setAlpha(ctx, 1 - gs);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          zigzagPath(ctx, p.x, footY, gex, gey, 5, 14, i * 13 + 3130 + Math.floor(t * 24) * 3, easeOut(Math.min(1, gs * 2.5)));
          ctx.stroke();
          ctx.strokeStyle = pale;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        setAlpha(ctx, (1 - gs) * 0.9);
        ctx.strokeStyle = pale;
        ctx.lineWidth = 5 * (1 - gs) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, footY, 40 + gs * 200, (40 + gs * 200) * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 4. 麻痺の名残
      var ps = span(t, 0.6, 0.36);
      if (ps > 0 && ps < 1) {
        var fseed = Math.floor(t * 30);
        ctx.strokeStyle = pale;
        ctx.lineWidth = 2;
        for (i = 0; i < 6; i++) {
          if (wobble(fseed * 5 + i + 3200) < 0.4) continue;
          var pa = turns(wobble(fseed * 3 + i + 3210));
          setAlpha(ctx, (1 - ps) * 0.95);
          zigzagPath(ctx, p.x + Math.cos(pa) * 26, p.y + Math.sin(pa) * 26,
            p.x + Math.cos(pa + 0.5) * 46, p.y + Math.sin(pa + 0.5) * 46, 3, 10, fseed + i * 7 + 3220, 1);
          ctx.stroke();
        }
      }
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
    },

    /**
     * 閃光斬り（v1.8.0）。光の斬撃（1段目）
     *   1. 一閃 … 左上から右下へ、白い芯の光の刃がまっすぐ走る
     *   2. 閃き … 切り口で十字の星が光り、横に光の筋が伸びる。光の輪が広がる
     *   3. 欠片 … 小さな光の欠片が刃の両側へ散る
     */
    lightSlash: function (ctx, d, t, p) {
      var i;
      var len = d.length || 170;
      var ang = turns(0.13 + (p.phase - 0.5) * 0.03);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var nx = -dy, ny = dx;
      var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
      var hit = d.hitAt || 0.18;
      // 1. 一閃
      var ss = span(t, 0, 0.42);
      if (ss > 0 && ss < 1) {
        var head = easeOut(Math.min(1, ss * 2.4));
        var tail = easeIn(ss);
        var w = (d.width || 12) * (1 - ss * 0.5);
        setAlpha(ctx, 1 - ss * 0.5);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w * 0.4);
      }
      // 2. 閃き
      var fs = span(t, hit, 0.5);
      if (fs > 0 && fs < 1) {
        var fr = (d.flare || 46) * easeOut(Math.min(1, fs * 3)) * (1 - fs * 0.6);
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, fr * 1.4);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.4, p.color);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - fs) * 0.8);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, fr * 1.4, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - fs);
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, p.x, p.y, fr);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 150 * (1 - fs * 0.3), 2.5 * (1 - fs) + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, (1 - fs) * 0.8);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - fs) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 + fs * 60, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 3. 光の欠片
      for (i = 0; i < (d.shards || 12); i++) {
        var ks = span(t, hit + wobble(i + 3300) * 0.12, 0.5);
        if (ks <= 0 || ks >= 1) continue;
        var along = (wobble(i + 3310) - 0.5) * len * 0.8;
        var side = ((i % 2) ? 1 : -1) * (10 + easeOut(ks) * (30 + wobble(i + 3320) * 40));
        var kx = p.x + dx * along + nx * side, ky = p.y + dy * along + ny * side + 20 * ks * ks;
        setAlpha(ctx, 1 - ks);
        ctx.fillStyle = (i % 3 === 0) ? p.color : "#ffffff";
        polygonPath(ctx, kx, ky, 3 + wobble(i + 3330) * 3, 4, ks * 8 + i, 1.6);
        ctx.fill();
      }
    },

    /**
     * 影斬り（v1.8.0）。闇の斬撃（1段目）
     *   1. 残像 … 右上から左下へ走る刃の前に、うすい影の刃が2本先に走る
     *   2. 刃 … 紫の縁に黒い芯の刃（光の刃の裏返し）
     *   3. 滲む影 … 切り口から黒い煙が滲み出て垂れ、紫の細い影がうねる
     */
    shadowSlash: function (ctx, d, t, p) {
      var i;
      var len = d.length || 170;
      var ang = turns(0.37 + (p.phase - 0.5) * 0.03);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var nx = -dy, ny = dx;
      var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
      var ink = d.accentColor || "#1a0c30";
      var hit = d.hitAt || 0.2;
      // 1〜2. 残像と刃
      var blades = [[0.0, 14, 0.4, ink], [0.04, -12, 0.45, ink], [0.1, 0, 1, null]];
      for (i = 0; i < blades.length; i++) {
        var b = blades[i];
        var ss = span(t, b[0], 0.42);
        if (ss <= 0 || ss >= 1) continue;
        var head = easeOut(Math.min(1, ss * 2.2));
        var tail = easeIn(ss);
        var w = (d.width || 13) * (1 - ss * 0.4);
        var ox = nx * b[1], oy = ny * b[1];
        setAlpha(ctx, b[2] * (1 - ss * 0.5));
        ctx.fillStyle = b[3] || p.color;
        bladeStroke(ctx, x0 + ox, y0 + oy, dx, dy, len, tail, head, w);
        if (!b[3]) {
          ctx.fillStyle = ink;
          bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w * 0.45);
        }
      }
      // 3. 滲む影（光の縁を付けると玉が並んで見えるので、glow を消して重ねる）
      ctx.save();
      ctx.shadowBlur = 0;
      var smokes = d.smoke || 14;
      for (i = 0; i < smokes; i++) {
        var ms = span(t, hit + wobble(i + 3340) * 0.15, 0.55);
        if (ms <= 0 || ms >= 1) continue;
        var along = (wobble(i + 3345) - 0.5) * len * 0.75;
        var mx = p.x + dx * along + (wobble(i + 3350) - 0.5) * 22 * (1 + ms);
        var my = p.y + dy * along + easeOut(ms) * (14 + wobble(i + 3360) * 30);
        var mr = 12 + easeOut(ms) * (14 + wobble(i + 3365) * 12);
        var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        mg.addColorStop(0, (i % 2) ? p.color : ink);
        mg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - ms) * ((i % 2) ? 0.55 : 0.85));
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      var ts = span(t, hit, 0.6);
      if (ts > 0 && ts < 1) {
        ctx.lineCap = "round";
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < 4; i++) {
          var ta = (i / 3 - 0.5) * len * 0.6;
          var bx = p.x + dx * ta, by = p.y + dy * ta;
          var sd = (i % 2) ? 1 : -1;
          var reach = easeOut(Math.min(1, ts * 2)) * 34;
          setAlpha(ctx, (1 - ts) * 0.9);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + nx * sd * reach + Math.sin(t * 14 + i) * 8, by + ny * sd * reach,
            bx + nx * sd * reach * 1.4, by + ny * sd * reach * 1.4 + reach * 0.6);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
    },

    /**
     * 紅蓮斬り（v1.8.0）。火の斬撃（2段目）。火炎斬りより大きく
     *   1. 2本の炎の太刀筋 … 右上→左下、続けて左上→右下の三日月が × の字に走る。走った跡に炎の舌が立つ
     *   2. 爆炎 … 交わったところで炎がはじけ、炎の舌が四方へ噴き出す。衝撃の輪
     *   3. 火の粉 … 舞い上がる
     */
    crimsonSlash: function (ctx, d, t, p) {
      var i, k;
      var gold = d.accentColor || "#ffd75e";
      var deep = d.deepColor || "#b3150a";
      var R = d.radius || 96;
      var hit = d.hitAt || 0.3;
      for (k = 0; k < 2; k++) {
        var cx = p.x + (k ? -1 : 1) * R * 0.7, cy = p.y + R * 0.7;
        var from = k ? turns(0.73) : turns(0.77), to = k ? turns(1.02) : turns(0.48);
        // 炎の舌
        for (i = 0; i < 7; i++) {
          var fr = i / 6;
          var fs = span(t, k * 0.16 + 0.06 + fr * 0.16, 0.5);
          if (fs <= 0 || fs >= 1) continue;
          var fa = from + (to - from) * fr;
          var bx = cx + Math.cos(fa) * R, by = cy + Math.sin(fa) * R;
          var h = (d.flameHeight || 70) * (0.6 + wobble(i + k * 9 + 3400) * 0.6) * easeOut(Math.min(1, fs * 1.6));
          var sway = Math.sin(fs * 7 + i * 1.7) * 7 * fs;
          setAlpha(ctx, fadeOut(fs) * 0.9);
          ctx.fillStyle = deep;
          flameTongue(ctx, bx, by, 22 * (1 - fs * 0.4), h, sway);
          ctx.fillStyle = p.color;
          flameTongue(ctx, bx, by, 15 * (1 - fs * 0.4), h * 0.75, sway);
          ctx.fillStyle = gold;
          flameTongue(ctx, bx, by, 7 * (1 - fs * 0.4), h * 0.45, sway);
        }
        // 太刀筋
        var ss = span(t, k * 0.16, 0.42);
        if (ss > 0 && ss < 1) {
          var head = easeOut(Math.min(1, ss * 1.8));
          var tail = easeIn(ss);
          var a1 = from + (to - from) * tail, a2 = from + (to - from) * head;
          var wd = (d.width || 30) * (1 - ss * 0.35);
          crescent(ctx, cx, cy, R, a1, a2, wd * 1.3, fadeOut(ss) * 0.8, deep);
          crescent(ctx, cx, cy, R, a1, a2, wd, fadeOut(ss), p.color);
          crescent(ctx, cx, cy, R, a1, a2, wd * 0.4, fadeOut(ss), gold);
        }
      }
      // 2. 爆炎
      var es = span(t, hit, 0.5);
      if (es > 0 && es < 1) {
        var eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 110);
        eg.addColorStop(0, "#ffffff");
        eg.addColorStop(0.3, gold);
        eg.addColorStop(0.6, p.color);
        eg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - es) * (1 - es) * 0.9);
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 110, 0, Math.PI * 2);
        ctx.fill();
        for (i = 0; i < (d.burst || 12); i++) {
          var ba = turns(i / (d.burst || 12) + 0.02);
          var bl = (30 + 50 * wobble(i + 3410)) * Math.sin(Math.min(1, es * 2) * Math.PI * 0.5) * (1 - es * 0.5);
          ctx.save();
          ctx.translate(p.x + Math.cos(ba) * (16 + es * 30), p.y + Math.sin(ba) * (16 + es * 30));
          ctx.rotate(ba + Math.PI / 2);
          setAlpha(ctx, (1 - es) * 0.95);
          ctx.fillStyle = (i % 2) ? p.color : deep;
          flameTongue(ctx, 0, 0, 14, bl, 0);
          ctx.fillStyle = gold;
          flameTongue(ctx, 0, 0, 6, bl * 0.55, 0);
          ctx.restore();
        }
        setAlpha(ctx, (1 - es) * 0.9);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 5 * (1 - es) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20 + es * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 3. 火の粉
      ctx.fillStyle = gold;
      for (i = 0; i < (d.embers || 18); i++) {
        var ks = span(t, hit + wobble(i + 3420) * 0.3, 0.45);
        if (ks <= 0 || ks >= 1) continue;
        var kx = p.x + (wobble(i + 3430) - 0.5) * 140 + Math.sin(ks * 6 + i) * 8;
        var ky = p.y + 20 - easeOut(ks) * (60 + wobble(i + 3440) * 80);
        var kz = 2 + wobble(i + 3450) * 3;
        setAlpha(ctx, 1 - ks);
        ctx.fillRect(kx - kz / 2, ky - kz / 2, kz, kz);
      }
    },

    /**
     * 雫断ち（v1.8.0。ウルヴァーグの絆の技）。打たれる相手に出す。短く鋭い
     *   1. 雫 … 相手の頭の上から、雫がひとつ落ちてくる
     *   2. 速い筋 … 左から水色の筋が相手へ集まる（先手打ちと同じ向き）
     *   3. 一閃 … 雫が落ちきる前に、細い水の刃が斜めに走る（濃い水・水・白の3重）
     *   4. 割れる … 雫が二つに割れて左右へ落ち、切り口から細かいしぶきが散る
     */
    dropCleave: function (ctx, d, t, p) {
      var i;
      var deep = d.deepColor || "#1d5fa8", core = d.accentColor || p.coreColor;
      var R = d.drop || 16;
      var cutAt = 0.34;
      // 雫の形（先が上の涙形）
      function tear(x, y, r, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot || 0);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.9);
        ctx.bezierCurveTo(r * 0.5, -r * 0.9, r, -r * 0.2, r, r * 0.25);
        ctx.arc(0, r * 0.25, r, 0, Math.PI);
        ctx.bezierCurveTo(-r, -r * 0.2, -r * 0.5, -r * 0.9, 0, -r * 1.9);
        ctx.fill();
        ctx.restore();
      }
      // 1. 雫（一閃まで落ち続ける。落ちきる前に斬られる）
      var fall = Math.min(1, t / cutAt);
      var dropY = p.y - 120 + 110 * easeIn(fall);
      if (t < cutAt) {
        setAlpha(ctx, Math.min(1, t / 0.08));
        ctx.fillStyle = p.color;
        tear(p.x, dropY, R, 0);
        setAlpha(ctx, 0.9);
        ctx.fillStyle = core;
        tear(p.x - R * 0.3, dropY - R * 0.2, R * 0.35, 0);
      }
      // 2. 速い筋
      ctx.lineCap = "round";
      for (i = 0; i < (d.streaks || 7); i++) {
        var s = span(t, wobble(i + 1700) * 0.12, 0.3);
        if (s <= 0 || s >= 1) continue;
        var y = p.y + (wobble(i + 1710) - 0.5) * 56;
        var head = p.x - 160 + 160 * easeIn(s);
        setAlpha(ctx, 1 - s);
        ctx.strokeStyle = (i % 3 === 0) ? core : p.color;
        ctx.lineWidth = 2 + wobble(i + 1720) * 2;
        ctx.beginPath();
        ctx.moveTo(head - 46, y);
        ctx.lineTo(head, y);
        ctx.stroke();
      }
      // 3. 一閃（左下から右上へ。雫の高さを通る）
      var cs = span(t, cutAt - 0.04, 0.34);
      if (cs > 0 && cs < 1) {
        var L = d.length || 200, W = d.width || 9;
        var ang = -0.32;
        // 斬られる瞬間の雫の高さ（p.y - 10）を通る
        var cx = p.x, cy = p.y - 10;
        var hx = Math.cos(ang), hy = Math.sin(ang);
        var headR = easeOut(Math.min(1, cs * 2.4)), tailR = easeIn(cs);
        var layers = [[deep, 1.6, 0.6], [p.color, 1, 0.95], [core, 0.4, 1]];
        for (var k = 0; k < layers.length; k++) {
          setAlpha(ctx, fadeOut(cs) * layers[k][2]);
          ctx.strokeStyle = layers[k][0];
          ctx.lineWidth = Math.max(1, W * layers[k][1] * (1 - cs * 0.5));
          ctx.beginPath();
          ctx.moveTo(cx + hx * L * (tailR - 0.5), cy + hy * L * (tailR - 0.5));
          ctx.lineTo(cx + hx * L * (headR - 0.5), cy + hy * L * (headR - 0.5));
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      // 4. 割れた雫（左右へ回りながら落ちる）としぶき
      var ps = span(t, cutAt, 0.62);
      if (ps > 0 && ps < 1) {
        var baseY = p.y - 10;
        for (var side = -1; side <= 1; side += 2) {
          setAlpha(ctx, fadeOut(ps));
          ctx.fillStyle = p.color;
          tear(p.x + side * (6 + 46 * easeOut(ps)), baseY - 20 * Math.sin(ps * Math.PI) + 90 * ps * ps,
               R * (0.75 - ps * 0.3), side * ps * 2.4);
        }
        for (i = 0; i < (d.drops || 14); i++) {
          var ds = span(ps, wobble(i + 1730) * 0.25, 0.75);
          if (ds <= 0 || ds >= 1) continue;
          var a = turns(wobble(i + 1740));
          var dist = (18 + wobble(i + 1750) * 50) * easeOut(ds);
          setAlpha(ctx, fadeOut(ds));
          ctx.fillStyle = (i % 3 === 0) ? core : p.color;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * dist, baseY + Math.sin(a) * dist * 0.7 + 60 * ds * ds, sizeOf(d, i) * (1 - ds * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    /**
     * 激流斬り（v1.8.0）。水の斬撃（2段目）。流水斬りより大きく
     *   1. 激流の刃 … 水の刃が相手のまわりを大きく回り込んで、横一文字に薙ぐ（濃い水・水・泡の3重）
     *   2. 噴き出す … 切り口から水が勢いよく噴き出し、しぶきが落ちる。泡の輪
     *   3. 吸い取り … 水の粒が2本の流れになって左へ戻る
     */
    torrentSlash: function (ctx, d, t, p) {
      var i, k, s;
      var foam = d.accentColor || "#e8fbff";
      var deep = d.deepColor || "#1d5fa8";
      var hit = d.hitAt || 0.28;
      var RX = d.radius || 96, RY = RX * 0.34, tilt = -0.22;
      var ct = Math.cos(tilt), st0 = Math.sin(tilt);
      function at(a) {
        var ex = Math.cos(a) * RX, ey = Math.sin(a) * RY;
        return { x: p.x + ex * ct - ey * st0, y: p.y + ex * st0 + ey * ct };
      }
      // 1. 激流の刃（奥の左から、手前を回って右へ）
      var a0 = Math.PI * 1.05, a1 = Math.PI * 2.15;
      var bands = [[0, 1.4, deep, 0.8], [0, 1, p.color, 1], [0.03, 0.4, foam, 1]];
      ctx.lineCap = "round";
      for (k = 0; k < bands.length; k++) {
        var ss = span(t, bands[k][0], 0.45);
        if (ss <= 0 || ss >= 1) continue;
        var head = easeOut(Math.min(1, ss * 1.7));
        var tail = easeIn(ss);
        setAlpha(ctx, fadeOut(ss) * bands[k][3]);
        ctx.strokeStyle = bands[k][2];
        var segs = 24;
        for (s = 0; s < segs; s++) {
          var r0 = tail + (head - tail) * s / segs, r1 = tail + (head - tail) * (s + 1) / segs;
          if (r1 <= r0) continue;
          var pa = at(a0 + (a1 - a0) * r0), pb = at(a0 + (a1 - a0) * r1);
          ctx.lineWidth = Math.max(1, (d.width || 22) * bands[k][1] * Math.sin(Math.PI * (s + 0.5) / segs) * (1 - ss * 0.3));
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
      // 2. 噴き出す
      var js = span(t, hit, 0.55);
      if (js > 0 && js < 1) {
        // 切り口から上へ噴き上がる水の筋（弧を描いて落ちる）
        ctx.lineCap = "round";
        for (i = 0; i < (d.jets || 6); i++) {
          var ja = turns(0.62 + i / ((d.jets || 6) - 1) * 0.26);
          var jv = 230 + wobble(i + 3530) * 80;
          var steps = 10;
          for (k = 0; k < 2; k++) {
            setAlpha(ctx, (1 - js) * (k ? 1 : 0.7));
            ctx.strokeStyle = k ? foam : p.color;
            ctx.lineWidth = (k ? 2.5 : 7) * (1 - js * 0.5);
            ctx.beginPath();
            for (s = 0; s <= steps; s++) {
              var tt = js * (0.35 + 0.65 * s / steps);
              var jx = p.x + Math.cos(ja) * jv * tt;
              var jy = p.y + Math.sin(ja) * jv * tt * 1.2 + 260 * tt * tt;
              if (s === 0) ctx.moveTo(jx, jy); else ctx.lineTo(jx, jy);
            }
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
        setAlpha(ctx, (1 - js) * 0.9);
        ctx.strokeStyle = foam;
        ctx.lineWidth = 4 * (1 - js) + 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 20 + js * 90, (20 + js * 90) * 0.4, tilt, 0, Math.PI * 2);
        ctx.stroke();
        for (i = 0; i < (d.drops || 22); i++) {
          var da = turns(0.55 + wobble(i + 3500) * 0.4);
          var sp = 60 + wobble(i + 3510) * 110;
          var x = p.x + Math.cos(da) * sp * js;
          var y = p.y + Math.sin(da) * sp * js * 1.3 + 200 * js * js;
          setAlpha(ctx, 1 - js);
          ctx.fillStyle = (i % 3 === 0) ? foam : p.color;
          ctx.beginPath();
          ctx.arc(x, y, 3 + wobble(i + 3520) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 3. 吸い取り
      for (k = 0; k < 2; k++) {
        for (i = 0; i < 7; i++) {
          var ds = span(t, 0.55 + k * 0.05 + i * 0.03, 0.32);
          if (ds <= 0 || ds >= 1) continue;
          setAlpha(ctx, Math.sin(ds * Math.PI));
          ctx.fillStyle = (i % 2) ? foam : p.color;
          sapDrop(ctx, p.x - easeIn(ds) * 260, p.y - 10 + (k ? 14 : -14) + Math.sin(ds * 10 + k * 2) * 10, 3);
        }
      }
    },

    /**
     * 旋風斬り（v1.8.0）。風の斬撃（2段目）。疾風斬りより大きく
     *   1. 旋風 … 風の刃が3枚、相手のまわりを速く回りながら輪を縮める。風の輪が回る
     *   2. 斬る … 輪が締まりきった瞬間、× の字に2本の鋭い筋が走る
     *   3. 巻き上がる … 風の筋と木の葉がらせんを描いて上へ抜ける
     */
    whirlSlash: function (ctx, d, t, p) {
      var i;
      var pale = d.accentColor || "#effff6";
      var hit = d.hitAt || 0.32;
      // 1. 旋風
      var os = span(t, 0, hit + 0.04);
      if (os > 0 && os < 1) {
        var orr = (d.radius || 92) - 50 * easeIn(os);
        var al = Math.min(1, os * 4);
        for (i = 0; i < 3; i++) {
          var a = turns(i / 3) + os * turns(1.6);
          crescent(ctx, p.x, p.y, orr, a, a + turns(0.2), 11, al * 0.95, (i % 2) ? pale : p.color);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (i = 0; i < 2; i++) {
          setAlpha(ctx, al * 0.5);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 10 - i * 26, orr * (1.1 - i * 0.2), orr * 0.25, 0, os * 20 + i, os * 20 + i + Math.PI * 1.3);
          ctx.stroke();
        }
      }
      // 2. × の字の筋
      for (i = 0; i < 2; i++) {
        var xs = span(t, hit + i * 0.06, 0.3);
        if (xs <= 0 || xs >= 1) continue;
        var ang = turns(i ? 0.38 : 0.12);
        var dx = Math.cos(ang), dy = Math.sin(ang), len = d.length || 160;
        var head = easeOut(Math.min(1, xs * 3)), tail = easeIn(xs);
        setAlpha(ctx, 1 - xs * 0.6);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, p.x - dx * len / 2, p.y - dy * len / 2, dx, dy, len, tail, head, 7);
        ctx.fillStyle = pale;
        bladeStroke(ctx, p.x - dx * len / 2, p.y - dy * len / 2, dx, dy, len, tail, head, 3);
      }
      // 3. 巻き上がる風と木の葉
      var us = span(t, hit + 0.05, 0.55);
      if (us > 0 && us < 1) {
        ctx.lineCap = "round";
        for (i = 0; i < 5; i++) {
          var ua = turns(i / 5) + us * 6;
          var ur = 30 + us * 60;
          var uy = p.y + 20 - easeOut(us) * 90;
          setAlpha(ctx, (1 - us) * 0.8);
          ctx.strokeStyle = (i % 2) ? pale : p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(p.x, uy + i * 6, ur, ur * 0.22, 0, ua, ua + 1.6);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
        for (i = 0; i < (d.leaves || 10); i++) {
          var la = turns(i / (d.leaves || 10)) + us * 7;
          var lr = 24 + us * (50 + wobble(i + 3600) * 40);
          var lx = p.x + Math.cos(la) * lr, ly = p.y + 10 - easeOut(us) * (70 + wobble(i + 3610) * 50) + Math.sin(la) * lr * 0.25;
          setAlpha(ctx, 1 - us);
          ctx.fillStyle = (i % 3 === 0) ? pale : p.color;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(la * 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },

    /**
     * 大地斬り（v1.8.0）。地の斬撃（2段目）。岩砕斬りより大きく
     *   1. 振り下ろす … 太い刃が真上から足元まで振り下ろされる
     *   2. 割れる … 足元から左右へ大地が割れ、割れ目に沿って小さな岩の柱が順に突き上がる
     *   3. 砕ける … 岩のかけらが飛び散って落ち、土煙が広がる
     */
    earthSlash: function (ctx, d, t, p) {
      var i, k;
      var light = d.accentColor || "#f3dfae";
      var dark = d.rockColor || "#5a4026";
      var hit = d.hitAt || 0.28;
      var footY = p.y + 40;
      // 1. 振り下ろす
      var ss = span(t, 0, 0.4);
      if (ss > 0 && ss < 1) {
        var len = d.length || 190;
        var head = easeOut(Math.min(1, ss * 2.6)), tail = easeIn(ss);
        var ang = turns(0.24);
        var dx = Math.cos(ang), dy = Math.sin(ang);
        var x0 = p.x - dx * len * 0.62, y0 = footY - dy * len;
        setAlpha(ctx, 1 - ss * 0.5);
        ctx.fillStyle = dark;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, (d.width || 22) * 1.25);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, d.width || 22);
        ctx.fillStyle = light;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, (d.width || 22) * 0.35);
      }
      // 2. 割れ目と岩の柱
      var cs = span(t, hit, 0.3);
      var cEnd = (t > 0.8) ? (1 - t) / 0.2 : 1;
      if (cs > 0 && cEnd > 0) {
        ctx.lineJoin = "round";
        for (k = 0; k < 2; k++) {
          setAlpha(ctx, cEnd * (k ? 1 : 0.8));
          ctx.strokeStyle = k ? light : dark;
          ctx.lineWidth = k ? 2 : 7;
          zigzagPath(ctx, p.x, footY, p.x - 150, footY + 6, 8, 12, 3700, cs);
          ctx.stroke();
          zigzagPath(ctx, p.x, footY, p.x + 150, footY - 4, 8, 12, 3720, cs);
          ctx.stroke();
        }
        ctx.lineJoin = "miter";
      }
      var spikes = d.spikes || 6;
      for (i = 0; i < spikes; i++) {
        var side = (i % 2) ? 1 : -1;
        var order = Math.floor(i / 2);
        var rs = span(t, hit + 0.03 + order * 0.06, 0.08);
        var sink = span(t, 0.62 + order * 0.04, 0.2);
        if (rs <= 0 || sink >= 1) continue;
        var sx = p.x + side * (38 + order * 40);
        var sh = (d.spikeHeight || 70) * (1 - order * 0.22) * easeOut(rs) * (1 - easeIn(sink));
        var sw = 22 - order * 3;
        var by = footY + (order === 1 ? 4 : -2);
        var sg = ctx.createLinearGradient(sx, by - sh, sx, by);
        sg.addColorStop(0, light);
        sg.addColorStop(0.4, p.color);
        sg.addColorStop(1, dark);
        setAlpha(ctx, 1 - sink * 0.5);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(sx - sw / 2, by);
        ctx.lineTo(sx + side * 8, by - sh);
        ctx.lineTo(sx + sw / 2, by);
        ctx.closePath();
        ctx.fill();
      }
      // 3. 砕ける
      var es = span(t, hit, 0.55);
      if (es > 0 && es < 1) {
        var fg = ctx.createRadialGradient(p.x, footY, 0, p.x, footY, 90);
        fg.addColorStop(0, light);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, Math.max(0, 1 - es * 3) * 0.8);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, footY, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.shadowBlur = 0;
        for (i = 0; i < 3; i++) {
          var ds = span(es, i * 0.1, 0.8);
          if (ds <= 0 || ds >= 1) continue;
          var dr = 30 + ds * 70;
          var dxp = p.x + (i - 1) * 46;
          var dg = ctx.createRadialGradient(dxp, footY - ds * 14, 0, dxp, footY - ds * 14, dr);
          dg.addColorStop(0, "#8a6a44");
          dg.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, (1 - ds) * 0.55);
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.arc(dxp, footY - ds * 14, dr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        for (i = 0; i < (d.rocks || 14); i++) {
          var vx = (wobble(i + 3740) - 0.5) * 220;
          var vy = 160 + wobble(i + 3750) * 140;
          setAlpha(ctx, (es < 0.8) ? 1 : (1 - es) / 0.2);
          ctx.fillStyle = (i % 3 === 0) ? light : ((i % 3 === 1) ? p.color : dark);
          polygonPath(ctx, p.x + vx * es, footY - 10 - vy * es + 400 * es * es, 3 + wobble(i + 3760) * 6, 5, es * 9 + i, 0.8);
          ctx.fill();
        }
      }
    },

    /**
     * 雷神斬り（v1.8.0）。雷の斬撃（2段目）。稲妻斬りより大きく
     *   1. 雷をまとう刃 … 左上から右下へ太い刃が走り、刃のまわりを稲妻がはい回る
     *   2. 落雷 … 切り口へ上から太い稲妻が落ちて、大きく光る
     *   3. 放電 … 当たったところから四方へ稲妻が走り、火花が散る。最後は体のまわりで小さな稲妻がはじける
     */
    raijinSlash: function (ctx, d, t, p) {
      var i;
      var pale = d.accentColor || "#fffbe0";
      var hit = d.hitAt || 0.3;
      var len = d.length || 180;
      var ang = turns(0.12);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      // 1. 雷をまとう刃
      var ss = span(t, 0, 0.42);
      if (ss > 0 && ss < 1) {
        var head = easeOut(Math.min(1, ss * 2.4)), tail = easeIn(ss);
        var w = (d.width || 14) * (1 - ss * 0.4);
        setAlpha(ctx, 1 - ss * 0.5);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w * 0.4);
        var seed = Math.floor(t * 40) * 5;
        ctx.strokeStyle = pale;
        ctx.lineWidth = 2;
        for (var k = -1; k <= 1; k += 2) {
          setAlpha(ctx, (1 - ss) * 0.9);
          zigzagPath(ctx, x0 + dx * len * tail - dy * k * 12, y0 + dy * len * tail + dx * k * 12,
            x0 + dx * len * head - dy * k * 12, y0 + dy * len * head + dx * k * 12, 8, 14, seed + k * 3 + 3800, 1);
          ctx.stroke();
        }
      }
      // 2. 落雷
      var bs = span(t, hit - 0.04, 0.3);
      if (bs > 0 && bs < 1) {
        var top = Math.max(d.topMinY || 8, p.y - 170);
        var reach = Math.min(1, bs * 6);
        var bseed = 3820 + Math.floor(t * 30) * 7;
        var lw = [18, 8, 3], lc = [p.color, pale, "#ffffff"];
        for (i = 0; i < 3; i++) {
          setAlpha(ctx, (1 - bs) * (i ? 1 : 0.6));
          ctx.strokeStyle = lc[i];
          ctx.lineWidth = lw[i] * (1 - bs * 0.5);
          zigzagPath(ctx, p.x + 10, top, p.x, p.y, 8, 34, bseed, reach);
          ctx.stroke();
        }
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.4, p.color);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - bs) * (1 - bs) * 0.85);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 120, 0, Math.PI * 2);
        ctx.fill();
      }
      // 3. 放電
      var es = span(t, hit, 0.35);
      if (es > 0 && es < 1) {
        var eseed = Math.floor(t * 30) * 3;
        for (i = 0; i < (d.arcs || 8); i++) {
          var a = turns(i / (d.arcs || 8) + wobble(i + 3840) * 0.06);
          var r = 60 + wobble(i + 3850) * 50;
          setAlpha(ctx, 1 - es);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4;
          zigzagPath(ctx, p.x, p.y, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 5, 16, eseed + i * 9 + 3860, easeOut(Math.min(1, es * 3)));
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.fillStyle = pale;
        for (i = 0; i < 14; i++) {
          var sa = turns(wobble(i + 3870));
          var sr = 20 + es * (60 + wobble(i + 3880) * 60);
          setAlpha(ctx, 1 - es);
          ctx.fillRect(p.x + Math.cos(sa) * sr - 1.5, p.y + Math.sin(sa) * sr + 40 * es * es - 1.5, 3, 3);
        }
      }
      var ps = span(t, 0.62, 0.36);
      if (ps > 0 && ps < 1) {
        var fseed = Math.floor(t * 30);
        ctx.strokeStyle = pale;
        ctx.lineWidth = 2;
        for (i = 0; i < 4; i++) {
          if (wobble(fseed * 5 + i + 3890) < 0.4) continue;
          var pa = turns(wobble(fseed * 3 + i + 3900));
          setAlpha(ctx, (1 - ps) * 0.9);
          zigzagPath(ctx, p.x + Math.cos(pa) * 24, p.y + Math.sin(pa) * 24,
            p.x + Math.cos(pa + 0.5) * 42, p.y + Math.sin(pa + 0.5) * 42, 3, 9, fseed + i * 7 + 3910, 1);
          ctx.stroke();
        }
      }
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
    },

    /**
     * 聖光斬り（v1.8.0）。光の斬撃（2段目）。閃光斬りより大きく
     *   1. 十字に斬る … 縦に一閃、続けて横に一閃。光の十字が残る
     *   2. 聖なる光 … 十字が強く光り、光の柱が立つ。輪が広がって目がくらむほど白く光る
     *   3. 光の羽 … 金の羽根がひらひら舞い落ちる
     */
    holySlash: function (ctx, d, t, p) {
      var i, k;
      var gold = d.accentColor || "#ffe08a";
      var hit = d.hitAt || 0.32;
      var len = d.length || 170;
      var cy = p.y - 8;
      // 1. 十字に斬る（縦 → 横）
      var cuts = [[0, turns(0.25), p.x, cy - len / 2], [0.14, 0, p.x - len * 0.4, cy]];
      for (k = 0; k < 2; k++) {
        var ss = span(t, cuts[k][0], 0.36);
        if (ss <= 0 || ss >= 1) continue;
        var dx = Math.cos(cuts[k][1]), dy = Math.sin(cuts[k][1]);
        var L = k ? len * 0.8 : len;
        var head = easeOut(Math.min(1, ss * 2.6)), tail = easeIn(ss) * 0.7;
        setAlpha(ctx, 1 - ss * 0.4);
        ctx.fillStyle = gold;
        bladeStroke(ctx, cuts[k][2], cuts[k][3], dx, dy, L, tail, head, 11);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, cuts[k][2], cuts[k][3], dx, dy, L, tail, head, 4.5);
      }
      // 2. 聖なる光
      var hs = span(t, hit, 0.5);
      if (hs > 0 && hs < 1) {
        var xa = (1 - hs);
        var vg = ctx.createLinearGradient(p.x - 22, 0, p.x + 22, 0);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(0.5, "#ffffff");
        vg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, xa * 0.75);
        ctx.fillStyle = vg;
        ctx.fillRect(p.x - 22, p.y - 200, 44, 250);
        setAlpha(ctx, xa);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.x - 4 * xa - 1, cy - len * 0.5, 8 * xa + 2, len);
        ctx.fillRect(p.x - len * 0.4, cy - 4 * xa - 1, len * 0.8, 8 * xa + 2);
        var fg = ctx.createRadialGradient(p.x, cy, 0, p.x, cy, 130);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.35, gold);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, xa * xa * 0.85);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, cy, 130, 0, Math.PI * 2);
        ctx.fill();
        for (k = 0; k < 2; k++) {
          var rs = span(hs, k * 0.15, 0.85);
          if (rs <= 0 || rs >= 1) continue;
          setAlpha(ctx, 1 - rs);
          ctx.strokeStyle = k ? gold : "#ffffff";
          ctx.lineWidth = 5 * (1 - rs) + 1;
          ctx.beginPath();
          ctx.arc(p.x, cy, 20 + rs * 110, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 光の羽
      for (i = 0; i < (d.feathers || 8); i++) {
        var fs = span(t, hit + 0.06 + wobble(i + 3950) * 0.2, 0.5);
        if (fs <= 0 || fs >= 1) continue;
        var fx = p.x + (wobble(i + 3960) - 0.5) * 160 + Math.sin(fs * 6 + i) * 12;
        var fy = p.y - 70 + fs * (80 + wobble(i + 3970) * 40);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(Math.sin(fs * 5 + i) * 0.6);
        setAlpha(ctx, Math.sin(fs * Math.PI));
        ctx.fillStyle = (i % 2) ? gold : "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },

    /**
     * 黒影斬り（v1.8.0）。闇の斬撃（2段目）。影斬りより大きく
     *   1. 残像の連撃 … 右下から左上へ切り上げる刃が、黒い残像を4枚引き連れて走る
     *   2. 裂け目 … 切り口が黒い裂け目になって開き、ふちが紫に光って脈打つ
     *   3. 影の手 … 裂け目から影の手が伸びて相手をつかみ、呪いの紫の粒が沈んでいく
     */
    darkShadowSlash: function (ctx, d, t, p) {
      var i, k;
      var ink = d.accentColor || "#1a0c30";
      var pink = d.pinkColor || "#e07ad8";
      var hit = d.hitAt || 0.3;
      var len = d.length || 190;
      var ang = turns(0.62);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var nx = -dy, ny = dx;
      var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
      // 1. 残像の連撃
      for (k = 0; k < 5; k++) {
        var main = (k === 4);
        var ss = span(t, k * 0.035, 0.4);
        if (ss <= 0 || ss >= 1) continue;
        var off = (2 - k) * 9 * (main ? 0 : 1);
        var head = easeOut(Math.min(1, ss * 2.4)), tail = easeIn(ss);
        setAlpha(ctx, (main ? 1 : 0.35) * (1 - ss * 0.5));
        ctx.fillStyle = main ? p.color : ink;
        bladeStroke(ctx, x0 + nx * off, y0 + ny * off, dx, dy, len, tail, head, main ? 15 : 12);
        if (main) {
          ctx.fillStyle = ink;
          bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, 6);
        }
      }
      // 2. 裂け目
      var rs = span(t, hit, 0.6);
      if (rs > 0 && rs < 1) {
        var open = Math.sin(Math.min(1, rs * 1.6) * Math.PI * 0.5) * (1 - easeIn(rs));
        var rl = len * 0.75, rw = 16 * open + 2;
        var pulse = 0.7 + 0.3 * Math.sin(t * 40);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        setAlpha(ctx, 0.9 * pulse);
        ctx.fillStyle = pink;
        ctx.beginPath();
        ctx.ellipse(0, 0, rl / 2 + 6, rw + 5, 0, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, rl / 2 + 2, rw + 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(0, 0, rl / 2, rw, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 3. 影の手
      var gs = span(t, hit + 0.06, 0.5);
      if (gs > 0 && gs < 1) {
        ctx.lineCap = "round";
        for (i = 0; i < 4; i++) {
          var along = (i / 3 - 0.5) * len * 0.5;
          var bx = p.x + dx * along, by = p.y + dy * along;
          var sd = (i % 2) ? 1 : -1;
          var reach = Math.sin(Math.min(1, gs * 1.5) * Math.PI * 0.5) * (1 - easeIn(gs)) * 74;
          var tx = bx + nx * sd * reach, ty = by + ny * sd * reach;
          setAlpha(ctx, 0.9 * (1 - gs * 0.6));
          ctx.strokeStyle = ink;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + nx * sd * reach * 0.5 + Math.sin(t * 16 + i) * 10, by + ny * sd * reach * 0.5, tx, ty);
          ctx.stroke();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          // 指（3本の短い爪）
          for (k = -1; k <= 1; k++) {
            var fa = Math.atan2(ty - by, tx - bx) + k * 0.5;
            ctx.strokeStyle = ink;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + Math.cos(fa) * 12, ty + Math.sin(fa) * 12,
              tx + Math.cos(fa + 0.5) * 20, ty + Math.sin(fa + 0.5) * 20);
            ctx.stroke();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
      }
      ctx.fillStyle = pink;
      for (i = 0; i < 12; i++) {
        var ks = span(t, hit + 0.1 + wobble(i + 4000) * 0.3, 0.45);
        if (ks <= 0 || ks >= 1) continue;
        var kx = p.x + (wobble(i + 4010) - 0.5) * 110;
        var ky = p.y - 50 + easeIn(ks) * 100;
        setAlpha(ctx, Math.sin(ks * Math.PI) * 0.9);
        ctx.fillStyle = (i % 2) ? pink : p.color;
        ctx.beginPath();
        ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /**
     * 乱れ斬り（v1.8.0）。1回当たるごとに出る、短い斬撃（3〜4回）
     *   1. 2本の筋 … 毎回ちがう向きに、鋭い筋が2本すばやく走る（向きは出した時刻で変わる）
     *   2. 火花 … 交わったところで白い火花が散る
     */
    wildSlash: function (ctx, d, t, p) {
      var i, k;
      var len = d.length || 150;
      var base = p.phase * Math.PI * 2;
      for (k = 0; k < 2; k++) {
        var ss = span(t, k * 0.14, 0.5);
        if (ss <= 0 || ss >= 1) continue;
        var ang = base + k * (1.1 + wobble(Math.floor(p.phase * 997) + 4100) * 0.8);
        var dx = Math.cos(ang), dy = Math.sin(ang);
        var head = easeOut(Math.min(1, ss * 2.8)), tail = easeIn(ss);
        var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
        setAlpha(ctx, 1 - ss * 0.5);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, 7);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, 2.5);
      }
      var fs = span(t, d.hitAt || 0.2, 0.5);
      if (fs > 0 && fs < 1) {
        setAlpha(ctx, 1 - fs);
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, p.x, p.y, 22 * (1 - fs * 0.6));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (i = 0; i < 8; i++) {
          var sa = turns(i / 8 + p.phase);
          var r0 = 10 + fs * 30, r1 = r0 + 14 * (1 - fs);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(sa) * r0, p.y + Math.sin(sa) * r0);
          ctx.lineTo(p.x + Math.cos(sa) * r1, p.y + Math.sin(sa) * r1);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
    },

    /**
     * 会心斬り（v1.8.0）。急所だけを狙う斬撃
     *   1. 狙う … 相手の急所に赤い照準が縮みながら合わさり、きらりと光る
     *   2. 一閃 … 細く鋭い筋が、照準を貫いて一瞬で走る
     *   3. 会心 … 照準のところで赤と金の星がはじけ、鋭い線が四方へ飛ぶ
     */
    criticalSlash: function (ctx, d, t, p) {
      var i;
      var gold = d.accentColor || "#fff3c4";
      var hit = d.hitAt || 0.42;
      var tx = p.x + 8, ty = p.y - 10;
      // 1. 照準
      var as = span(t, 0, hit);
      if (as > 0 && t < hit + 0.08) {
        var ar = 70 - 48 * easeOut(as);
        var aa = (t < hit) ? Math.min(1, as * 3) : 1 - (t - hit) / 0.08;
        setAlpha(ctx, aa);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty, ar, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        for (i = 0; i < 4; i++) {
          var ca = turns(i / 4) + (1 - as) * 1.2;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(ca) * (ar + 10), ty + Math.sin(ca) * (ar + 10));
          ctx.lineTo(tx + Math.cos(ca) * (ar - 6), ty + Math.sin(ca) * (ar - 6));
          ctx.stroke();
        }
        // 合わさった瞬間のきらめき
        var gl = span(t, hit - 0.1, 0.1);
        if (gl > 0) {
          setAlpha(ctx, Math.sin(gl * Math.PI) * aa);
          ctx.fillStyle = gold;
          fourStar(ctx, tx, ty, 14 * Math.sin(gl * Math.PI) + 2);
        }
      }
      // 2. 一閃
      var ss = span(t, hit - 0.04, 0.2);
      if (ss > 0 && ss < 1) {
        var len = d.length || 220;
        var ang = turns(0.1);
        var dx = Math.cos(ang), dy = Math.sin(ang);
        var head = easeOut(Math.min(1, ss * 4)), tail = easeIn(ss);
        setAlpha(ctx, 1 - ss * 0.3);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, tx - dx * len / 2, ty - dy * len / 2, dx, dy, len, tail, head, 7);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, tx - dx * len / 2, ty - dy * len / 2, dx, dy, len, tail, head, 2.8);
      }
      // 3. 会心
      var cs = span(t, hit, 0.5);
      if (cs > 0 && cs < 1) {
        var cg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 90);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.3, gold);
        cg.addColorStop(0.6, p.color);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - cs) * (1 - cs) * 0.85);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(tx, ty, 90, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - cs);
        ctx.fillStyle = p.color;
        fourStar(ctx, tx, ty, 54 * (1 - cs * 0.5));
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, tx, ty, 30 * (1 - cs * 0.5));
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        for (i = 0; i < 12; i++) {
          var la = turns(i / 12 + 0.04);
          var r0 = 20 + easeOut(cs) * 60, r1 = r0 + 26 * (1 - cs);
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(la) * r0, ty + Math.sin(la) * r0);
          ctx.lineTo(tx + Math.cos(la) * r1, ty + Math.sin(la) * r1);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
    },

    /**
     * 薙ぎ払い（v1.8.0）。全体の斬撃。並び全体に1回だけ出す（effectAt: "center"）
     *   1. 薙ぐ … 並びの右から左へ、並び全体より広い大きな三日月の刃が横に走る。風の筋が後を追う
     *   2. 斬る … 刃の先が通り過ぎた相手ごとに、斜めの切り傷と火花が出る
     */
    sweepSlash: function (ctx, d, t, p) {
      var i, k;
      var pts = pointsOf(p);
      var RX = d.spread || 400, RY = d.height || 70;
      var cy = p.y - RY * 0.6;
      var a0 = turns(0.03), a1 = turns(0.47);   // 右の端から手前を通って左の端へ
      var ss = span(t, 0, 0.6);
      var head = easeOut(Math.min(1, ss * 1.6)), tail = easeIn(ss);
      function at(f) {
        var a = a0 + (a1 - a0) * f;
        return { x: p.x + Math.cos(a) * RX, y: cy + Math.sin(a) * RY };
      }
      // 1. 薙ぐ刃
      if (ss > 0 && ss < 1) {
        var segs = 30;
        var layers = [[28, p.color, 0.85], [10, "#ffffff", 1]];
        ctx.lineCap = "round";
        for (k = 0; k < layers.length; k++) {
          setAlpha(ctx, layers[k][2] * fadeOut(ss));
          ctx.strokeStyle = layers[k][1];
          for (i = 0; i < segs; i++) {
            var f0 = tail + (head - tail) * i / segs, f1 = tail + (head - tail) * (i + 1) / segs;
            if (f1 <= f0) continue;
            var q0 = at(f0), q1 = at(f1);
            ctx.lineWidth = Math.max(1, layers[k][0] * Math.sin(Math.PI * (i + 0.5) / segs));
            ctx.beginPath();
            ctx.moveTo(q0.x, q0.y);
            ctx.lineTo(q1.x, q1.y);
            ctx.stroke();
          }
        }
        // 後を追う風の筋
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        for (k = 1; k <= 2; k++) {
          var hf = Math.max(tail, head - 0.12 * k);
          setAlpha(ctx, 0.5 * fadeOut(ss));
          ctx.beginPath();
          for (i = 0; i <= 12; i++) {
            var ff = tail + (hf - tail) * i / 12;
            var a = a0 + (a1 - a0) * ff;
            var x = p.x + Math.cos(a) * (RX - k * 16), y = cy + Math.sin(a) * (RY - k * 10) + k * 6;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      // 2. 相手ごとの切り傷（刃の先が通り過ぎたとき）
      for (k = 0; k < pts.length; k++) {
        var q = pts[k];
        // 刃の先がこの相手の横の位置に来る時刻
        var cosA = Math.max(-1, Math.min(1, (q.x - p.x) / RX));
        var fa = (Math.acos(cosA) - a0) / (a1 - a0);
        var passAt = Math.max(0, Math.min(1, fa));
        // head = easeOut(ss*1.6) が passAt になる ss を出して、全体の t に直す
        var sNeed = (1 - Math.sqrt(Math.max(0, 1 - passAt))) / 1.6;
        var cs = span(t, sNeed * 0.6, 0.4);
        if (cs <= 0 || cs >= 1) continue;
        var ang = turns(0.42);
        var dx = Math.cos(ang), dy = Math.sin(ang), len = 110;
        setAlpha(ctx, 1 - cs);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, q.x - dx * len / 2, q.y - dy * len / 2, dx, dy, len, easeIn(cs) * 0.5, easeOut(Math.min(1, cs * 4)), 4);
        ctx.fillStyle = p.color;
        fourStar(ctx, q.x, q.y, 16 * (1 - cs));
      }
    },

    /**
     * 渾身斬り（v1.8.0）。いちばん重い斬撃（×1.8）
     *   1. 溜め … 相手のまわりに橙の力の輪が何重にも縮み、空気が震える
     *   2. 振り下ろす … とても太い刃が右上から左下へ、重く一気に走る（3重）
     *   3. 衝撃 … 白く光り、横に大きな衝撃波が2つ広がる。切り口が光ったまま残り、ちぎれた空気の線が飛ぶ
     */
    allOutSlash: function (ctx, d, t, p) {
      var i, k;
      var power = d.accentColor || "#ff8a3c";
      var hit = d.hitAt || 0.45;
      var len = d.length || 240;
      var ang = turns(0.36);
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var x0 = p.x - dx * len / 2, y0 = p.y - dy * len / 2;
      // 1. 溜め
      for (k = 0; k < 3; k++) {
        var rs = span(t, k * 0.1, 0.25);
        if (rs <= 0 || rs >= 1) continue;
        setAlpha(ctx, Math.sin(rs * Math.PI) * 0.8);
        ctx.strokeStyle = power;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 110 - rs * 80, 0, Math.PI * 2);
        ctx.stroke();
      }
      var vs = span(t, 0.05, hit - 0.1);
      if (vs > 0 && vs < 1) {
        ctx.strokeStyle = power;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (i = 0; i < 10; i++) {
          var va = turns(i / 10) + Math.sin(t * 50 + i) * 0.05;
          var vr = 80 - vs * 40 + Math.sin(t * 60 + i * 2) * 4;
          setAlpha(ctx, 0.6 * Math.min(1, vs * 3));
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(va) * vr, p.y + Math.sin(va) * vr);
          ctx.lineTo(p.x + Math.cos(va) * (vr + 16), p.y + Math.sin(va) * (vr + 16));
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      // 2. 振り下ろす
      var ss = span(t, hit - 0.08, 0.36);
      if (ss > 0 && ss < 1) {
        var head = easeOut(Math.min(1, ss * 4)), tail = easeIn(ss);
        var w = (d.width || 24) * (1 - ss * 0.3);
        setAlpha(ctx, 0.8 * (1 - ss * 0.4));
        ctx.fillStyle = power;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w * 1.4);
        setAlpha(ctx, 1 - ss * 0.4);
        ctx.fillStyle = p.color;
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, x0, y0, dx, dy, len, tail, head, w * 0.4);
      }
      // 3. 衝撃
      var es = span(t, hit, 0.5);
      if (es > 0 && es < 1) {
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 150);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.35, power);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - es) * (1 - es) * 0.85);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 150, 0, Math.PI * 2);
        ctx.fill();
        for (k = 0; k < 2; k++) {
          var ws = span(es, k * 0.15, 0.85);
          if (ws <= 0 || ws >= 1) continue;
          setAlpha(ctx, 1 - ws);
          ctx.strokeStyle = k ? power : "#ffffff";
          ctx.lineWidth = 7 * (1 - ws) + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 10, 40 + ws * 220, (40 + ws * 220) * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 光ったまま残る切り口
        setAlpha(ctx, (1 - es) * 0.9);
        ctx.fillStyle = "#ffffff";
        bladeStroke(ctx, x0, y0, dx, dy, len, 0.08, 0.92, 3 * (1 - es) + 0.5);
        // ちぎれた空気の線
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        var nx = -dy, ny = dx;
        for (i = 0; i < 10; i++) {
          var along = (wobble(i + 4200) - 0.5) * len * 0.8;
          var side = ((i % 2) ? 1 : -1) * (14 + easeOut(es) * (50 + wobble(i + 4210) * 40));
          var bx = p.x + dx * along + nx * side, by = p.y + dy * along + ny * side;
          setAlpha(ctx, 1 - es);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + nx * ((i % 2) ? 1 : -1) * 18 * (1 - es), by + ny * ((i % 2) ? 1 : -1) * 18 * (1 - es));
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
    },

    /**
     * つるぎの舞（v1.8.0）。1回当たるごとに出る、舞う刃（3〜6回）
     *   1. 舞う刃 … 細い刃が3枚、桃色のリボンの跡を引きながら相手のまわりを回り、輪を縮める（回る向きは毎回変わる）
     *   2. 斬る … 輪の真ん中で刃が交わって、花びらのような光が散る
     */
    swordDance: function (ctx, d, t, p) {
      var i;
      var ribbon = d.accentColor || "#ff9ad5";
      var hit = d.hitAt || 0.4;
      var dir = (p.phase < 0.5) ? 1 : -1;
      var base = p.phase * Math.PI * 2;
      var os = span(t, 0, hit + 0.05);
      if (os > 0 && os < 1) {
        var r = 70 - 52 * easeIn(os);
        var al = Math.min(1, os * 4);
        for (i = 0; i < 3; i++) {
          var a = base + turns(i / 3) + dir * os * turns(1.2);
          // リボンの跡
          crescent(ctx, p.x, p.y, r + 4, a - dir * turns(0.22), a, 6, al * 0.55, ribbon);
          // 刃（回る向きに沿った細い刃）
          var bx = p.x + Math.cos(a) * r, by = p.y + Math.sin(a) * r;
          var ta = a + dir * Math.PI / 2;
          var tdx = Math.cos(ta), tdy = Math.sin(ta);
          setAlpha(ctx, al);
          ctx.fillStyle = p.color;
          bladeStroke(ctx, bx - tdx * 16, by - tdy * 16, tdx, tdy, 32, 0, 1, 4);
          ctx.fillStyle = "#ffffff";
          bladeStroke(ctx, bx - tdx * 16, by - tdy * 16, tdx, tdy, 32, 0, 1, 1.5);
        }
      }
      var hs = span(t, hit, 0.55);
      if (hs > 0 && hs < 1) {
        setAlpha(ctx, 1 - hs);
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, p.x, p.y, 20 * (1 - hs * 0.5));
        for (i = 0; i < 8; i++) {
          var pa = turns(i / 8) + base;
          var pr = 8 + easeOut(hs) * 40;
          ctx.save();
          ctx.translate(p.x + Math.cos(pa) * pr, p.y + Math.sin(pa) * pr + 14 * hs * hs);
          ctx.rotate(pa + hs * 3);
          setAlpha(ctx, 1 - hs);
          ctx.fillStyle = (i % 2) ? ribbon : p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },

    /**
     * ばくれつけん（v1.8.0）。1回当たるごとに出る、すばやい拳（4回）
     *   1. 連打 … 相手の体の3か所に、すばやく続けて拳が当たる（橙の丸い衝撃と白い芯）。当たるところは毎回変わる
     *   2. 速さの線 … 当たったところへ向かって、短い線が集まる
     */
    burstFist: function (ctx, d, t, p) {
      var i, k;
      var base = Math.floor(p.phase * 997);
      for (k = 0; k < 3; k++) {
        var hs = span(t, k * 0.14, 0.5);
        if (hs <= 0 || hs >= 1) continue;
        var hx = p.x + (wobble(base + k * 3 + 4300) - 0.5) * 66;
        var hy = p.y + (wobble(base + k * 3 + 4310) - 0.5) * 56;
        // 速さの線（当たる前の一瞬）
        if (hs < 0.35) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          for (i = 0; i < 5; i++) {
            var la = turns(i / 5 + wobble(base + k + i + 4320) * 0.1);
            var r1 = 50 * (1 - hs / 0.35) + 14;
            setAlpha(ctx, 0.8);
            ctx.beginPath();
            ctx.moveTo(hx + Math.cos(la) * r1, hy + Math.sin(la) * r1);
            ctx.lineTo(hx + Math.cos(la) * (r1 + 18), hy + Math.sin(la) * (r1 + 18));
            ctx.stroke();
          }
          ctx.lineCap = "butt";
        }
        // 丸い衝撃
        var r = 10 + easeOut(hs) * 34;
        setAlpha(ctx, (1 - hs) * 0.8);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - hs);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - hs) + 1;
        ctx.beginPath();
        ctx.arc(hx, hy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    /**
     * 陽炎の舞（v1.8.0）。味方ひとりずつに出る、回避率を上げる舞
     *   1. 陽炎 … 足元から、ゆらゆら揺れる熱の筋が何本も立ち昇る
     *   2. 揺らめく姿 … 体の左右に、うすい影の姿が2つずれて揺れ、本体と重なったり離れたりする
     *   3. 熱の粒 … 金色の小さな粒が揺れながら昇る
     */
    heatHaze: function (ctx, d, t, p) {
      var i, k, s;
      var gold = d.accentColor || "#ffe08a";
      var footY = p.y + 36;
      var env = (t < 0.2) ? t / 0.2 : fadeOut(t);
      // 1. 陽炎
      ctx.lineCap = "round";
      // 短い揺らぎが、足元から上へ昇って消える（垂れた線に見えないよう、一部分だけを動かす）
      var waves = d.waves || 10;
      for (i = 0; i < waves; i++) {
        var wx = p.x + (wobble(i + 4405) - 0.5) * 84;
        var hs = span(t, wobble(i + 4400) * 0.45, 0.5);
        if (hs <= 0 || hs >= 1) continue;
        var H = (d.height || 110) * (0.7 + wobble(i + 4408) * 0.4);
        var top = hs * 1.3, bottom = Math.max(0, top - 0.35);
        setAlpha(ctx, Math.sin(hs * Math.PI) * 0.6);
        ctx.strokeStyle = (i % 3 === 0) ? gold : p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (s = 0; s <= 8; s++) {
          var f = Math.min(1, bottom + (top - bottom) * s / 8);
          var x = wx + Math.sin(f * 10 - t * 26 + i) * 6;
          var y = footY - H * f;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      // 2. 揺らめく姿（体の形の影が左右にずれて揺れる）
      var gs = span(t, 0.15, 0.8);
      if (gs > 0 && gs < 1) {
        var sway = Math.sin(gs * Math.PI * 3) * (d.shift || 26) * Math.sin(gs * Math.PI);
        for (k = -1; k <= 1; k += 2) {
          var gx = p.x + k * Math.abs(sway) + k * 6;
          var gg = ctx.createRadialGradient(gx, p.y, 0, gx, p.y, 40);
          gg.addColorStop(0, gold);
          gg.addColorStop(0.6, p.color);
          gg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.save();
          ctx.translate(gx, p.y);
          ctx.scale(0.75, 1);
          ctx.translate(-gx, -p.y);
          setAlpha(ctx, 0.3 * Math.sin(gs * Math.PI));
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(gx, p.y, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          setAlpha(ctx, 0.6 * Math.sin(gs * Math.PI));
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(gx, p.y, 26, 34, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 3. 熱の粒
      ctx.fillStyle = gold;
      for (i = 0; i < (d.motes || 14); i++) {
        var ms = span(t, 0.1 + wobble(i + 4410) * 0.5, 0.45);
        if (ms <= 0 || ms >= 1) continue;
        var mx = p.x + (wobble(i + 4420) - 0.5) * 80 + Math.sin(ms * 8 + i) * 6;
        var my = footY - ms * (90 + wobble(i + 4430) * 40);
        setAlpha(ctx, Math.sin(ms * Math.PI) * env);
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    },

    /**
     * ハッスルダンス（v1.8.0）。1回回復するごとに出る、陽気な回復（3〜6回）
     *   1. 弾む音符 … 音符が2つ、跳ねながら飛び出す
     *   2. 回復の十字 … 緑の十字がぽんと膨らんで、色とりどりの紙吹雪が散る
     */
    hustleDance: function (ctx, d, t, p) {
      var i;
      var colors = d.confetti || ["#ffd75e", "#ff8ad8", "#7fd9ff", "#5fd18c"];
      var hit = d.hitAt || 0.3;
      var base = Math.floor(p.phase * 997);
      // 1. 弾む音符
      for (i = 0; i < 2; i++) {
        var ns = span(t, i * 0.1, 0.7);
        if (ns <= 0 || ns >= 1) continue;
        var side = (i ? 1 : -1) * (p.phase < 0.5 ? 1 : -1);
        var nx = p.x + side * (20 + ns * 40);
        var ny = p.y - 20 - Math.abs(Math.sin(ns * Math.PI * 2)) * 30 - ns * 30;
        setAlpha(ctx, (ns < 0.8) ? 1 : (1 - ns) / 0.2);
        ctx.fillStyle = colors[(base + i) % colors.length];
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 5, 3.8, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(nx + 4.5, ny - 1);
        ctx.lineTo(nx + 4.5, ny - 18);
        ctx.quadraticCurveTo(nx + 10, ny - 14, nx + 11, ny - 9);
        ctx.stroke();
      }
      // 2. 回復の十字
      var cs = span(t, hit, 0.6);
      if (cs > 0 && cs < 1) {
        var pop = (cs < 0.25) ? easeOut(cs / 0.25) * 1.25 : 1.25 - 0.25 * span(cs, 0.25, 0.2);
        var s = 14 * pop;
        setAlpha(ctx, (cs < 0.7) ? 1 : (1 - cs) / 0.3);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - s * 0.35, p.y - 8 - s, s * 0.7, s * 2);
        ctx.fillRect(p.x - s, p.y - 8 - s * 0.35, s * 2, s * 0.7);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.x - s * 0.15, p.y - 8 - s * 0.8, s * 0.3, s * 1.6);
        ctx.fillRect(p.x - s * 0.8, p.y - 8 - s * 0.15, s * 1.6, s * 0.3);
        setAlpha(ctx, 1 - cs);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - cs) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 8, 16 + cs * 40, 0, Math.PI * 2);
        ctx.stroke();
        for (i = 0; i < (d.pieces || 14); i++) {
          var ca = turns(i / (d.pieces || 14) + wobble(base + i + 4500) * 0.05);
          var cr = 10 + easeOut(cs) * (40 + wobble(i + 4510) * 30);
          ctx.save();
          ctx.translate(p.x + Math.cos(ca) * cr, p.y - 8 + Math.sin(ca) * cr * 0.8 + 50 * cs * cs);
          ctx.rotate(cs * 10 + i);
          setAlpha(ctx, 1 - cs);
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(-3, -1.5, 6, 3);
          ctx.restore();
        }
      }
    },

    /**
     * 彗星のサンバ（v1.8.0）。1回当たるごとに出る、彗星の一撃（4回）
     *   1. 彗星 … 画面の上の左か右から、光の尾を引いた彗星が斜めに飛んできて相手に落ちる（向きは毎回変わる）
     *   2. はじける … 当たったところで星がはじけ、小さな星のかけらと輪が散る
     */
    cometSamba: function (ctx, d, t, p) {
      var i;
      var hit = d.hitAt || 0.45;
      var side = (p.phase < 0.5) ? -1 : 1;
      var sx = p.x + side * (d.reach || 200), sy = Math.max(d.topMinY || 6, p.y - (d.drop || 150));
      // 1. 彗星
      var fs = span(t, 0, hit);
      if (fs > 0 && t < hit + 0.04) {
        var e = easeIn(fs);
        var cx = sx + (p.x - sx) * e, cy = sy + (p.y - sy) * e;
        var tl = 70 + 50 * e;
        var dxn = (p.x - sx), dyn = (p.y - sy);
        var dl = Math.sqrt(dxn * dxn + dyn * dyn);
        dxn /= dl;
        dyn /= dl;
        var tg = ctx.createLinearGradient(cx, cy, cx - dxn * tl, cy - dyn * tl);
        tg.addColorStop(0, "#ffffff");
        tg.addColorStop(0.3, p.color);
        tg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, 0.95);
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(cx - dyn * 9, cy + dxn * 9);
        ctx.lineTo(cx - dxn * tl, cy - dyn * tl);
        ctx.lineTo(cx + dyn * 9, cy - dxn * 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        // 尾からこぼれる星
        ctx.fillStyle = d.accentColor || "#ffe08a";
        for (i = 0; i < 6; i++) {
          var bt = Math.max(0, e - 0.08 * (i + 1));
          var bx = sx + (p.x - sx) * bt + (wobble(i + 4600) - 0.5) * 16, by = sy + (p.y - sy) * bt + (wobble(i + 4610) - 0.5) * 16;
          setAlpha(ctx, 0.8 * (1 - i / 6));
          fourStar(ctx, bx, by, 4);
        }
      }
      // 2. はじける
      var hs = span(t, hit, 0.55);
      if (hs > 0 && hs < 1) {
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.4, p.color);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - hs) * (1 - hs) * 0.9);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
        ctx.fill();
        setAlpha(ctx, 1 - hs);
        ctx.fillStyle = "#ffffff";
        fourStar(ctx, p.x, p.y, 30 * (1 - hs * 0.5));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - hs) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14 + hs * 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = d.accentColor || "#ffe08a";
        for (i = 0; i < 8; i++) {
          var sa = turns(i / 8 + p.phase);
          var sr = 10 + easeOut(hs) * 46;
          setAlpha(ctx, 1 - hs);
          fourStar(ctx, p.x + Math.cos(sa) * sr, p.y + Math.sin(sa) * sr, 5 * (1 - hs) + 1);
        }
      }
    },

    /**
     * 不動のボレロ（v1.8.0）。1回当たるごとに出る、重い一撃（4回）
     *   1. 構え … 相手の上に、青い四角の紋章が回りながら降りてくる
     *   2. 押しつぶす … 紋章が相手にどしんと落ち、地面に四角い衝撃と土ぼこりが広がる
     */
    steadyBolero: function (ctx, d, t, p) {
      var i, k;
      var pale = d.accentColor || "#d8f2ff";
      var hit = d.hitAt || 0.4;
      var footY = p.y + 36;
      var S = d.size || 34;
      // 1. 降りてくる紋章
      var ds = span(t, 0, hit);
      if (ds > 0 && t < hit + 0.06) {
        var y = (p.y - 120) + (p.y - (p.y - 120)) * easeIn(ds);
        var rot = (1 - ds) * 2;
        var al = Math.min(1, ds * 4) * ((t < hit) ? 1 : 1 - (t - hit) / 0.06);
        ctx.save();
        ctx.translate(p.x, y);
        ctx.rotate(rot);
        setAlpha(ctx, al * 0.35);
        ctx.fillStyle = p.color;
        ctx.fillRect(-S, -S, S * 2, S * 2);
        setAlpha(ctx, al);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(-S, -S, S * 2, S * 2);
        ctx.strokeStyle = pale;
        ctx.lineWidth = 2;
        ctx.strokeRect(-S * 0.6, -S * 0.6, S * 1.2, S * 1.2);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-S * 0.42, -S * 0.42, S * 0.84, S * 0.84);
        ctx.restore();
      }
      // 2. 押しつぶす
      var hs = span(t, hit, 0.55);
      if (hs > 0 && hs < 1) {
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 80);
        fg.addColorStop(0, "#ffffff");
        fg.addColorStop(0.4, p.color);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        setAlpha(ctx, (1 - hs) * (1 - hs) * 0.8);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 80, 0, Math.PI * 2);
        ctx.fill();
        // 地面の四角い衝撃（ひし形に見える平たい四角が2つ広がる）
        for (k = 0; k < 2; k++) {
          var ws = span(hs, k * 0.15, 0.85);
          if (ws <= 0 || ws >= 1) continue;
          var r = 30 + ws * 110;
          setAlpha(ctx, 1 - ws);
          ctx.strokeStyle = k ? pale : p.color;
          ctx.lineWidth = 5 * (1 - ws) + 1;
          ctx.beginPath();
          ctx.moveTo(p.x, footY - r * 0.3);
          ctx.lineTo(p.x + r, footY);
          ctx.lineTo(p.x, footY + r * 0.3);
          ctx.lineTo(p.x - r, footY);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.save();
        ctx.shadowBlur = 0;
        for (i = 0; i < 2; i++) {
          var px = p.x + (i ? 1 : -1) * (24 + hs * 40);
          var pr = 14 + hs * 22;
          var pg = ctx.createRadialGradient(px, footY - hs * 8, 0, px, footY - hs * 8, pr);
          pg.addColorStop(0, "#8a7a6a");
          pg.addColorStop(1, "rgba(0,0,0,0)");
          setAlpha(ctx, (1 - hs) * 0.6);
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(px, footY - hs * 8, pr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };

  var SkillEffect = {
    /**
     * 演出を1つ描く。
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} definition data/effects.js の shapes の1件
     * @param {number} progress 進み具合（0〜1）。範囲外なら何も描かない
     * @param {object} params { x, y, color, coreColor, phase }
     */
    draw: function (ctx, definition, progress, params) {
      if (!definition || progress < 0 || progress >= 1) return;

      var shape = SHAPES[definition.shape];
      if (!shape) return;

      // 設定「エフェクトの濃さ」。0 なら何も描かない
      intensity = (params.intensity === undefined) ? 1 : params.intensity;
      if (intensity <= 0) return;

      ctx.save();

      // にじみ。暗い背景では、これが無いと色つきの粒が沈んで見えない。
      // 色は演出の色そのものなので、属性ごとにその色で光る
      if (definition.glow) {
        ctx.shadowColor = params.color || "#ffffff";
        ctx.shadowBlur = definition.glow * intensity;
      }

      shape(ctx, definition, progress, {
        x: params.x,
        y: params.y,
        color: params.color || "#ffffff",
        coreColor: params.coreColor || "#ffffff",
        phase: params.phase || 0,
        // 上下の向き。1 が既定で、-1 なら逆さまに出す（弱体の演出に使う）
        direction: (params.direction === -1) ? -1 : 1,
        // "back" / "front" … 奥と手前を描き分ける型（layered）のとき、どちらの層か。null なら全部描く
        layer: params.layer || null,
        // 並び全体に出す型で、相手ひとりずつの位置（[{x, y}]）。無ければ pointsOf が決める
        points: params.points || null
      });
      ctx.restore();
    },

    /** その形が描けるか（データの書き間違いを早く気づけるように） */
    has: function (shapeName) {
      return !!SHAPES[shapeName];
    }
  };

  // --- 補助（すべて決まった値を返す。乱数は使わない） ---

  /**
   * いま描いている演出の濃さ（設定の effectLevel）。
   *
   * 形の関数はどれも ctx.globalAlpha を自分で設定するので、
   * 外から掛けても上書きされてしまう。そこで setAlpha を通し、
   * ここで濃さを掛けてから設定する。draw のあいだだけ使う値。
   */
  var intensity = 1;

  /** 濃さの設定を掛けてから、描く濃さを決める */
  function setAlpha(ctx, value) {
    ctx.globalAlpha = Math.max(0, Math.min(1, value * intensity));
  }

  /** 回転数をラジアンに直す */
  function turns(value) { return value * Math.PI * 2; }

  /** 上がとがったしずく（樹液の膜）。(x, y) はふくらみの中心、size は半径 */
  function sapDrop(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 1.7);
    ctx.quadraticCurveTo(x + size * 1.15, y - size * 0.1, x, y + size);
    ctx.quadraticCurveTo(x - size * 1.15, y - size * 0.1, x, y - size * 1.7);
    ctx.fill();
  }

  /** 円弧の三日月（両端がとがり、真ん中が width の太さ）を塗る。外側がふくらむ */
  function crescent(ctx, cx, cy, radius, from, to, width, alpha, color) {
    if (from === to) return;
    var steps = 18;
    var i, r, a;
    setAlpha(ctx, alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      a = from + (to - from) * i / steps;
      r = radius + width / 2 * Math.sin(Math.PI * i / steps);
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    for (i = steps; i >= 0; i--) {
      a = from + (to - from) * i / steps;
      r = radius - width / 2 * Math.sin(Math.PI * i / steps);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** だんだん遅くなる */
  function easeOut(x) { return 1 - (1 - x) * (1 - x); }

  /** だんだん速くなる */
  function easeIn(x) { return x * x; }

  /** 終わりに向かって薄くなる（後半だけ効かせる） */
  function fadeOut(t) {
    if (t < 0.55) return 1;
    return Math.max(0, 1 - (t - 0.55) / 0.45);
  }

  /**
   * 全体の進み具合から、1本ぶんの進み具合を切り出す。
   * @param {number} t 全体（0〜1）
   * @param {number} start 始まる時点（0〜1）
   * @param {number} length 長さ（0〜1）
   * @returns {number} 0以下ならまだ始まっていない
   */
  function span(t, start, length) {
    if (length <= 0) return 0;
    var sub = (t - start) / length;
    if (sub <= 0) return 0;
    return Math.min(1, sub);
  }

  /** 番号から 0〜1 のばらつきを作る（同じ番号なら必ず同じ値） */
  function wobble(index) {
    var value = Math.sin(index * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  /**
   * 並び全体に出す型で使う、相手ひとりずつの位置。
   * 画面が渡してくれればそれ（p.points）、無ければ中心と左右 210 の3か所（3体並んだときの位置）
   */
  function pointsOf(p) {
    if (p.points && p.points.length) return p.points;
    return [{ x: p.x - 210, y: p.y }, { x: p.x, y: p.y }, { x: p.x + 210, y: p.y }];
  }

  /**
   * 正多角形の道筋を作る（盾・障壁の六角）。
   *   rotation … 回す量（ラジアン）  stretchY … 縦の伸ばし具合（1 で正多角形）
   */
  function polygonPath(ctx, x, y, r, sides, rotation, stretchY) {
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = (rotation || 0) + (i / sides) * Math.PI * 2;
      var px = x + Math.cos(a) * r;
      var py = y + Math.sin(a) * r * (stretchY || 1);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** 炎の舌（下が丸く、上がとがる）。x, y は根元の真ん中。sway は先の揺れ（灼熱の息。v1.8.0） */
  function flameTongue(ctx, x, y, w, h, sway) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.5, x + sway, y - h);
    ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.5, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
  }

  /** 十字の星（細い4つ角。プリズム。v1.8.0） */
  function fourStar(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  /**
   * 画面を色で染める（最上位の共鳴。v1.8.0）。相手を真ん中に、画面より広い四角を塗る。
   * 光（glow）は消して塗る
   */
  function screenTint(ctx, p, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.shadowBlur = 0;
    setAlpha(ctx, alpha);
    ctx.fillStyle = color;
    ctx.fillRect(p.x - 900, p.y - 700, 1800, 1400);
    ctx.restore();
  }

  /** 盾の形（上が平ら、下がとがる。かばう。v1.8.0）。x, y は真ん中、s は半分の幅 */
  function shieldPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.quadraticCurveTo(x, y - s * 1.3, x + s, y - s);
    ctx.lineTo(x + s, y + s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.9, x, y + s * 1.3);
    ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.9, x - s, y + s * 0.2);
    ctx.closePath();
  }

  /**
   * 昇る十字（回復の印。キュアリス・リザレクション。v1.8.0）。t は 0〜1
   */
  function healCrosses(ctx, d, t, p, R) {
    if (t <= 0 || t >= 1) return;
    for (var i = 0; i < (d.crosses || 8); i++) {
      var s = span(t, 0.15 + wobble(i + 1400) * 0.45, 0.45);
      if (s <= 0 || s >= 1) continue;
      var lane = (wobble(i + 1410) - 0.5) * R * 2.2;
      var y = p.y + 30 - (d.rise || 90) * easeOut(s);
      var size = 8 * (1 - s * 0.3);
      setAlpha(ctx, fadeOut(s));
      ctx.fillStyle = (s < 0.3) ? (d.accentColor || p.coreColor) : p.color;
      ctx.fillRect(p.x + lane - size, y - size * 0.3, size * 2, size * 0.6);
      ctx.fillRect(p.x + lane - size * 0.3, y - size, size * 0.6, size * 2);
    }
  }

  /**
   * 時計（アクセル・スロウ。v1.8.0）。丸い文字盤と12の目盛り、針1本。
   *   angle … 針の向き（ラジアン。0 で真上）   trail … 針の残像の長さ（ラジアン。0 で無し）   alpha … 濃さ
   */
  function dial(ctx, x, y, r, angle, trail, alpha, p) {
    var i;
    setAlpha(ctx, 0.35 * alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    setAlpha(ctx, 0.95 * alpha);
    ctx.strokeStyle = p.coreColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (i = 0; i < 12; i++) {
      var a = turns(i / 12);
      var r0 = (i % 3 === 0) ? r * 0.7 : r * 0.8;
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    }
    ctx.stroke();
    var hand = angle - Math.PI / 2;
    if (trail > 0) {
      setAlpha(ctx, 0.45 * alpha);
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r * 0.8, hand - trail, hand);
      ctx.closePath();
      ctx.fill();
    }
    setAlpha(ctx, alpha);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(hand) * r * 0.8, y + Math.sin(hand) * r * 0.8);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  /**
   * 下向きの矢じり（弱体の印。v1.8.0）。s は 0〜1。
   *   count … 数（3つずつ横に並ぶ）   start … 体の上（0）か頭の上（1）から沈み始めるか
   */
  function downChevrons(ctx, p, s, count, start) {
    if (s <= 0 || s >= 1) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 0; i < count; i++) {
      var cs = span(s, Math.floor(i / 3) * 0.2 + (i % 3) * 0.06, 0.6);
      if (cs <= 0 || cs >= 1) continue;
      var lx = p.x + ((i % 3) - 1) * 26;
      var ly = p.y - 40 - start * 10 + 70 * easeOut(cs);
      setAlpha(ctx, fadeOut(cs));
      ctx.strokeStyle = (cs < 0.25) ? p.coreColor : p.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lx - 11, ly - 9);
      ctx.lineTo(lx, ly);
      ctx.lineTo(lx + 11, ly - 9);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  }

  /**
   * 六角の殻（プロテクション・アイギス。v1.8.0）。t は 0〜1。
   *   足元の段から上の段へ六角の板が順に現れて体を包み、光の帯が下から上へなで、最後に少し縮んで薄れる。
   *   奥の板（楕円の上半分）は薄く描く。gold が 1 なら板の縁を accentColor にする
   */
  function hexShell(ctx, d, t, p, gold) {
    if (t <= 0 || t >= 1) return;
    var R = d.radius || 54;
    var rings = d.rings || 4;
    var cells = d.cells || 8;
    var size = d.cellSize || 13;
    var shrink = (t > 0.75) ? 1 - (t - 0.75) / 0.25 * 0.25 : 1;
    var fade = (t > 0.75) ? 1 - (t - 0.75) / 0.25 : 1;
    var sweep = span(t, 0.45, 0.3);
    var edge = gold ? (d.accentColor || "#fff3c4") : p.coreColor;
    for (var row = 0; row < rings; row++) {
      var f = row / (rings - 1 || 1);             // 0 足元 → 1 頭の上
      var lat = -0.15 + f * 1.05;                  // 球の緯度のようなもの（0 で真横）
      var ry = p.y + 30 - f * (R * 1.5);
      var rr = R * Math.cos(lat * Math.PI / 2.4) * shrink;
      var appear = span(t, row * 0.08, 0.2);
      if (appear <= 0) continue;
      for (var c = 0; c < cells; c++) {
        var a = turns(c / cells + row * 0.5 / cells + t * 0.1);
        var back = Math.sin(a) < 0;
        var cx = p.x + Math.cos(a) * rr;
        var cy = ry + Math.sin(a) * rr * 0.25;
        var sz = size * easeOut(Math.min(1, appear)) * shrink * (0.6 + 0.4 * Math.abs(Math.sin(a) * 0.5 + 0.5));
        var lit = (sweep > 0 && sweep < 1 && Math.abs((1 - f) - (1 - sweep)) < 0.2) ? 1 : 0;
        setAlpha(ctx, (back ? 0.2 : 0.45) * fade + lit * 0.3);
        ctx.fillStyle = lit ? "#ffffff" : p.color;
        polygonPath(ctx, cx, cy, sz, 6, Math.PI / 6, 0.85);
        ctx.fill();
        setAlpha(ctx, (back ? 0.35 : 0.9) * fade);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  /**
   * (x1, y1) から (x2, y2) へのジグザグの道筋（万雷轟天。v1.8.0）。
   *   segs … 折れる回数   jag … 横へのずれ   seed … 形の番号   reach … どこまで伸びたか（0〜1）
   */
  function zigzagPath(ctx, x1, y1, x2, y2, segs, jag, seed, reach) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var end = (reach === undefined) ? 1 : reach;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (var s = 1; s <= segs; s++) {
      var f = s / segs;
      if (f > end + 1e-6) break;
      var off = (s === segs) ? 0 : (wobble(seed + s) - 0.5) * jag;
      ctx.lineTo(x1 + dx * f - dy / len * off, y1 + dy * f + dx / len * off);
    }
  }

  /**
   * まっすぐな太刀筋（両端がとがり、真ん中がふくらむ）を塗る（v1.8.0 の斬撃）。
   *   x0, y0 … 筋の始まり   dx, dy … 向き（長さ1）   len … 長さ
   *   from / to … 塗る範囲（0〜1）   w … 真ん中の太さの半分
   */
  function bladeStroke(ctx, x0, y0, dx, dy, len, from, to, w) {
    if (to <= from) return;
    var nx = -dy, ny = dx;
    var tx = x0 + dx * len * from, ty = y0 + dy * len * from;
    var hx = x0 + dx * len * to, hy = y0 + dy * len * to;
    var mx = (tx + hx) / 2, my = (ty + hy) / 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx + nx * w * 2, my + ny * w * 2, hx, hy);
    ctx.quadraticCurveTo(mx - nx * w * 2, my - ny * w * 2, tx, ty);
    ctx.fill();
  }

  /** 粒の大きさ。番号ごとに変える */
  function sizeOf(d, index) {
    var min = (d.minSize === undefined) ? 2 : d.minSize;
    var max = (d.maxSize === undefined) ? min : d.maxSize;
    return min + (max - min) * wobble(index + 3);
  }

  NS.SkillEffect = SkillEffect;
})(window.MyGame);
