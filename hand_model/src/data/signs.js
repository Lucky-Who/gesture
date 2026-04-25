import { d } from "../utils.js";

export const SIGNS = (() => {
  const DEF_R = { x: 1.25, y: 0, z: 0.6 };

  function kf(
    shape,
    px = 0,
    py = 0,
    pz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    dur = 0.35,
  ) {
    return {
      shape,
      pos: { x: DEF_R.x + px, y: DEF_R.y + py, z: DEF_R.z + pz },
      rot: { rx: d(rx), ry: d(ry), rz: d(rz) },
      dur,
    };
  }

  const signs = {};

  signs.HELLO = {
    hand: "right",
    frames: [
      kf("B", -0.1, 1.0, 0, 0, -20, -30, 0.2),
      kf("B", 0.4, 1.0, 0, 0, 10, 10, 0.4),
    ],
  };

  signs.YES = {
    hand: "right",
    frames: [
      kf("A", 0.1, 0.4, 0, -25, 0, 0, 0.15),
      kf("A", 0.1, 0.2, 0, 25, 0, 0, 0.15),
      kf("A", 0.1, 0.4, 0, -25, 0, 0, 0.15),
      kf("A", 0.1, 0.2, 0, 25, 0, 0, 0.15),
    ],
  };

  signs.NO = {
    hand: "right",
    frames: [
      {
        shape: "U",
        pos: { x: 1.3, y: 0.3, z: 0.7 },
        rot: { rx: 0, ry: d(-30), rz: 0 },
        dur: 0.15,
      },
      {
        shape: "U",
        pos: { x: 1.3, y: 0.3, z: 0.7 },
        rot: { rx: 0, ry: d(30), rz: 0 },
        dur: 0.15,
      },
      {
        shape: "U",
        pos: { x: 1.3, y: 0.3, z: 0.7 },
        rot: { rx: 0, ry: d(-30), rz: 0 },
        dur: 0.15,
      },
    ],
  };

  signs.THANK_YOU = {
    hand: "right",
    frames: [
      kf("B", -0.1, 0.9, 0, 20, 0, 0, 0.2),
      kf("B", 0.1, 0.7, 0.3, 0, 0, 0, 0.4),
    ],
  };

  signs.PLEASE = {
    hand: "right",
    frames: [
      kf("B", 0.0, 0.5, 0, 10, 0, 0, 0.15),
      kf("B", -0.2, 0.4, 0, 10, -15, 0, 0.2),
      kf("B", 0.0, 0.3, 0, 10, 0, 0, 0.15),
      kf("B", 0.2, 0.4, 0, 10, 15, 0, 0.2),
    ],
  };

  signs.SORRY = {
    hand: "right",
    frames: [
      kf("A", 0.0, 0.5, 0, 5, 0, 0, 0.15),
      kf("A", -0.15, 0.4, 0, 5, -10, 0, 0.2),
      kf("A", 0.0, 0.3, 0, 5, 0, 0, 0.15),
      kf("A", 0.15, 0.4, 0, 5, 10, 0, 0.2),
    ],
  };

  signs.HELP = {
    hand: "both",
    framesR: [
      kf("A", 0.0, -0.2, 0, 0, 0, 0, 0.2),
      kf("A", 0.0, 0.4, 0, 0, 0, 0, 0.35),
    ],
    framesL: [
      {
        shape: "B",
        pos: { x: -1.2, y: -0.2, z: 0.7 },
        rot: { rx: d(15), ry: 0, rz: 0 },
        dur: 0.2,
      },
      {
        shape: "B",
        pos: { x: -1.2, y: 0.4, z: 0.7 },
        rot: { rx: d(15), ry: 0, rz: 0 },
        dur: 0.35,
      },
    ],
  };

  signs.LOVE = {
    hand: "both",
    framesR: [
      kf("S", -0.3, 0.6, 0, 0, -20, 0, 0.15),
      kf("S", -0.5, 0.5, 0, 0, -30, 0, 0.4),
    ],
    framesL: [
      {
        shape: "S",
        pos: { x: 1.0, y: 0.6, z: 0.6 },
        rot: { rx: 0, ry: d(20), rz: 0 },
        dur: 0.15,
      },
      {
        shape: "S",
        pos: { x: 0.8, y: 0.5, z: 0.6 },
        rot: { rx: 0, ry: d(30), rz: 0 },
        dur: 0.4,
      },
    ],
  };

  signs.I = {
    hand: "right",
    frames: [
      kf("D", -0.4, 0.4, 0.3, 0, 60, 0, 0.2),
      kf("D", -0.5, 0.4, 0.4, 0, 70, 0, 0.25),
    ],
  };

  signs.YOU = {
    hand: "right",
    frames: [
      kf("D", 0.0, 0.2, 0.5, 0, 0, -10, 0.15),
      kf("D", 0.0, 0.2, 0.8, 0, 0, -10, 0.3),
    ],
  };

  signs.ME = signs.I;

  signs.MY = {
    hand: "right",
    frames: [
      kf("B", -0.3, 0.5, 0, 10, 40, 0, 0.15),
      kf("B", -0.3, 0.4, 0, 10, 40, 0, 0.3),
    ],
  };

  signs.YOUR = {
    hand: "right",
    frames: [
      kf("B", 0.0, 0.2, 0.3, 0, 0, -15, 0.15),
      kf("B", 0.0, 0.2, 0.5, 0, 0, -15, 0.3),
    ],
  };

  signs.WHAT = {
    hand: "both",
    framesR: [
      kf("B", 0.0, -0.1, 0, -20, 0, 0, 0.15),
      kf("B", 0.2, -0.2, 0, -25, 15, 0, 0.3),
    ],
    framesL: [
      {
        shape: "B",
        pos: { x: -1.3, y: -0.1, z: 0.7 },
        rot: { rx: d(-20), ry: 0, rz: 0 },
        dur: 0.15,
      },
      {
        shape: "B",
        pos: { x: -1.5, y: -0.2, z: 0.7 },
        rot: { rx: d(-25), ry: d(-15), rz: 0 },
        dur: 0.3,
      },
    ],
  };

  signs.WHERE = {
    hand: "right",
    frames: [
      kf("D", 0.0, 0.4, 0.3, 0, -20, 0, 0.15),
      kf("D", 0.2, 0.4, 0.3, 0, 0, 0, 0.15),
      kf("D", 0.0, 0.4, 0.3, 0, -20, 0, 0.15),
    ],
  };

  signs.KNOW = {
    hand: "right",
    frames: [
      kf("B", -0.2, 1.1, 0, 30, 30, 0, 0.15),
      kf("B", -0.2, 1.0, 0, 35, 30, 0, 0.2),
    ],
  };

  signs.THINK = {
    hand: "right",
    frames: [
      kf("D", -0.3, 1.1, 0, 0, 45, 0, 0.15),
      kf("D", -0.3, 1.05, 0, 0, 45, 0, 0.3),
    ],
  };

  signs.GOOD = {
    hand: "right",
    frames: [
      kf("B", -0.2, 0.85, 0, 20, 20, 0, 0.2),
      kf("B", 0.1, 0.6, 0.2, 5, 0, 0, 0.35),
    ],
  };

  signs.BAD = {
    hand: "right",
    frames: [
      kf("B", -0.2, 0.85, 0, 20, 20, 0, 0.15),
      kf("B", 0.0, 0.6, 0, 0, 0, 0, 0.2),
      kf("B", 0.1, 0.5, 0.2, -15, 0, 0, 0.25),
    ],
  };

  signs.WANT = {
    hand: "both",
    framesR: [
      kf("C", 0.2, 0.2, 0.3, 0, 0, 0, 0.15),
      kf("C", -0.1, 0.2, 0, 0, 0, 0, 0.35),
    ],
    framesL: [
      {
        shape: "C",
        pos: { x: -1.5, y: 0.2, z: 0.9 },
        rot: { rx: 0, ry: 0, rz: 0 },
        dur: 0.15,
      },
      {
        shape: "C",
        pos: { x: -1.1, y: 0.2, z: 0.6 },
        rot: { rx: 0, ry: 0, rz: 0 },
        dur: 0.35,
      },
    ],
  };

  signs.NEED = {
    hand: "right",
    frames: [
      kf("X", 0.0, 0.1, 0.4, 0, 0, 0, 0.15),
      kf("X", 0.0, -0.1, 0.4, 0, 0, 0, 0.2),
      kf("X", 0.0, 0.1, 0.4, 0, 0, 0, 0.15),
    ],
  };

  signs.UNDERSTAND = {
    hand: "right",
    frames: [
      kf("A", -0.3, 1.0, 0, 0, 30, 0, 0.15),
      kf("D", -0.3, 1.0, 0, 0, 30, 0, 0.2),
    ],
  };

  signs.GO = {
    hand: "both",
    framesR: [
      kf("D", 0.0, 0.2, 0.2, 0, 0, -20, 0.15),
      kf("D", 0.2, 0.0, 0.8, -30, 0, -20, 0.35),
    ],
    framesL: [
      {
        shape: "D",
        pos: { x: -1.3, y: 0.2, z: 0.8 },
        rot: { rx: 0, ry: 0, rz: d(20) },
        dur: 0.15,
      },
      {
        shape: "D",
        pos: { x: -1.5, y: 0.0, z: 1.4 },
        rot: { rx: d(-30), ry: 0, rz: d(20) },
        dur: 0.35,
      },
    ],
  };

  signs.COME = {
    hand: "both",
    framesR: [
      kf("D", 0.2, 0.0, 0.8, -20, 0, -20, 0.15),
      kf("D", 0.0, 0.2, 0.2, 0, 0, -20, 0.35),
    ],
    framesL: [
      {
        shape: "D",
        pos: { x: -1.5, y: 0.0, z: 1.4 },
        rot: { rx: d(-20), ry: 0, rz: d(20) },
        dur: 0.15,
      },
      {
        shape: "D",
        pos: { x: -1.3, y: 0.2, z: 0.8 },
        rot: { rx: 0, ry: 0, rz: d(20) },
        dur: 0.35,
      },
    ],
  };

  signs.NAME = {
    hand: "both",
    framesR: [
      kf("H", 0.0, 0.3, 0.2, 0, -60, 0, 0.15),
      kf("H", 0.0, 0.2, 0.2, 0, -60, 0, 0.2),
      kf("H", 0.0, 0.3, 0.2, 0, -60, 0, 0.15),
    ],
    framesL: [
      {
        shape: "H",
        pos: { x: -1.3, y: 0.2, z: 0.8 },
        rot: { rx: 0, ry: d(60), rz: 0 },
        dur: 0.15,
      },
      {
        shape: "H",
        pos: { x: -1.3, y: 0.1, z: 0.8 },
        rot: { rx: 0, ry: d(60), rz: 0 },
        dur: 0.2,
      },
      {
        shape: "H",
        pos: { x: -1.3, y: 0.2, z: 0.8 },
        rot: { rx: 0, ry: d(60), rz: 0 },
        dur: 0.15,
      },
    ],
  };

  signs.SEE = {
    hand: "right",
    frames: [
      kf("V", -0.4, 1.0, 0, 0, 30, 0, 0.2),
      kf("V", 0.0, 0.5, 0.3, 0, 0, 0, 0.35),
    ],
  };

  signs.STOP = {
    hand: "both",
    framesR: [
      kf("B", 0.2, 0.5, 0.2, 0, -90, 0, 0.15),
      {
        shape: "B",
        pos: { x: 1.1, y: 0.3, z: 0.7 },
        rot: { rx: 0, ry: d(-90), rz: 0 },
        dur: 0.1,
      },
    ],
    framesL: [
      {
        shape: "B",
        pos: { x: -1.3, y: 0.3, z: 0.7 },
        rot: { rx: d(-20), ry: 0, rz: 0 },
        dur: 0.15,
      },
      {
        shape: "B",
        pos: { x: -1.3, y: 0.3, z: 0.7 },
        rot: { rx: d(-20), ry: 0, rz: 0 },
        dur: 0.1,
      },
    ],
  };

  signs.GREAT = {
    hand: "both",
    framesR: [
      kf("B", 0.0, 0.5, 0.0, 0, 0, -10, 0.2),
      kf("B", 0.2, 0.5, 0.4, 0, 0, -10, 0.3),
    ],
    framesL: [
      {
        shape: "B",
        pos: { x: -1.3, y: 0.5, z: 0.6 },
        rot: { rx: 0, ry: 0, rz: d(10) },
        dur: 0.2,
      },
      {
        shape: "B",
        pos: { x: -1.5, y: 0.5, z: 1.0 },
        rot: { rx: 0, ry: 0, rz: d(10) },
        dur: 0.3,
      },
    ],
  };

  return signs;
})();
