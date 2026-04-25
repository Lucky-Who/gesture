import { SHAPES } from "./data/shapes.js";
import { SIGNS } from "./data/signs.js";
import { clamp, eio } from "./utils.js";

export class AnimPlayer {
  constructor(rightHand, leftHand, getUserSigns) {
    this.R = rightHand;
    this.L = leftHand;
    this.getUserSigns = getUserSigns;
    this.queue = [];
    this.isPlaying = false;
    this.speed = 1.0;

    this._phase = "idle";
    this._elapsed = 0;
    this._frameIdx = 0;
    this._currentToken = null;
    this._frames = [];
    this._framesL = [];
    this._totalFrameTime = 0;
    this._frameStart = 0;

    this.onSign = null;
    this.onDone = null;
    this.onProgress = null;
  }

  enqueue(tokens) {
    const expanded = [];
    tokens.forEach((token) => {
      if (token.type === "word") {
        expanded.push({ kind: "word", key: token.key, src: token.src });
      } else if (token.type === "fingerspell") {
        token.word.split("").forEach((letter) => {
          expanded.push({ kind: "letter", letter, src: letter });
        });
        expanded.push({ kind: "pause", src: "" });
      }
    });
    this.queue = expanded;
    this.isPlaying = true;
    this._advance();
  }

  stop() {
    this.queue = [];
    this.isPlaying = false;
    this._phase = "idle";
    this._currentToken = null;
    if (this.onSign) this.onSign("—", "IDLE");
    if (this.onProgress) this.onProgress(0);
  }

  _advance() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this._phase = "idle";
      if (this.onDone) this.onDone();
      return;
    }

    this._currentToken = this.queue.shift();
    const tok = this._currentToken;

    if (tok.kind === "pause") {
      this._phase = "pause";
      this._elapsed = 0;
      this._totalFrameTime = 0.2 / this.speed;
      return;
    }

    if (tok.kind === "letter") {
      const shape = SHAPES[tok.letter] || SHAPES.rest;
      this._frames = [{ shape, pos: null, rot: null, dur: 0.38 / this.speed }];
      this._framesL = [];
      if (this.onSign) this.onSign(tok.letter, "FINGER-SPELL");
    } else if (tok.kind === "word") {
      const userSigns = this.getUserSigns();
      const userSgn = userSigns[tok.key];
      if (userSgn) {
        const shape = SHAPES[userSgn.shape] || SHAPES.rest;
        this._frames = [
          {
            shape,
            pos: null,
            rot: null,
            dur: (userSgn.dur || 0.5) / this.speed,
          },
        ];
        this._framesL = [];
        if (this.onSign) this.onSign(tok.key, "USER SIGN");
      } else {
        const sign = SIGNS[tok.key];
        if (sign) {
          const makeFrameList = (frs) =>
            frs.map((kf) => ({
              shape: SHAPES[kf.shape] || SHAPES.rest,
              pos: kf.pos,
              rot: kf.rot,
              dur: kf.dur / this.speed,
            }));

          if (sign.hand === "both") {
            this._frames = makeFrameList(sign.framesR);
            this._framesL = makeFrameList(sign.framesL || []);
          } else {
            this._frames = makeFrameList(sign.frames || []);
            this._framesL = [];
          }
          if (this.onSign) this.onSign(tok.key.replace(/_/g, " "), "WORD SIGN");
        } else {
          this._frames = [
            { shape: SHAPES.rest, pos: null, rot: null, dur: 0.2 / this.speed },
          ];
          this._framesL = [];
          if (this.onSign) this.onSign(tok.key, "UNKNOWN");
        }
      }
    }

    this._frameIdx = 0;
    this._elapsed = 0;
    this._frameStart = 0;
    this._totalFrameTime = this._frames.reduce((sum, f) => sum + f.dur, 0);
    this._phase = "playing";
  }

  update(dt) {
    if (!this.isPlaying && this._phase === "idle") {
      const t = 0.035;
      this.R.applyPose(SHAPES.rest, t);
      this.L.applyPose(SHAPES.rest, t);
      this.R.resetTransform(t);
      this.L.resetTransform(t);
      return;
    }

    if (this._phase === "pause") {
      this._elapsed += dt;
      const pct = Math.min(
        this._elapsed / (this.queue.length > 0 ? 0.25 : 0.2),
        1,
      );
      if (this.onProgress) this.onProgress(pct * 100);
      const t = 0.08;
      this.R.applyPose(SHAPES.rest, t);
      this.L.applyPose(SHAPES.rest, t);
      this.R.resetTransform(t);
      this.L.resetTransform(t);
      if (pct >= 1) this._advance();
      return;
    }

    if (this._phase === "playing") {
      if (this._frameIdx >= this._frames.length) {
        this._phase = "between";
        this._elapsed = 0;
        return;
      }

      const frame = this._frames[this._frameIdx];
      const frameL = this._framesL[this._frameIdx];

      this._elapsed += dt;
      const progress = Math.min(this._elapsed / frame.dur, 1);
      const eased = eio(progress);

      this.R.applyPose(frame.shape, eased);
      if (frame.pos)
        this.R.applyTransform(frame.pos, frame.rot, eased * 0.15 + 0.05);
      else this.R.resetTransform(0.08);

      if (frameL) {
        this.L.applyPose(frameL.shape, eased);
        if (frameL.pos)
          this.L.applyTransform(frameL.pos, frameL.rot, eased * 0.15 + 0.05);
        else this.L.resetTransform(0.08);
      } else {
        this.L.applyPose(SHAPES.rest, 0.06);
        this.L.resetTransform(0.06);
      }

      const globalT =
        (this._frameStart + this._elapsed) / (this._totalFrameTime || 1);
      if (this.onProgress) this.onProgress(clamp(globalT * 100, 0, 100));

      if (progress >= 1) {
        this._frameStart += frame.dur;
        this._frameIdx++;
        this._elapsed = 0;
      }
      return;
    }

    if (this._phase === "between") {
      this._elapsed += dt;
      const t = 0.07;
      this.R.applyPose(SHAPES.rest, t);
      this.L.applyPose(SHAPES.rest, t);
      this.R.resetTransform(t);
      this.L.resetTransform(t);
      if (this._elapsed > 0.12) this._advance();
    }
  }
}
