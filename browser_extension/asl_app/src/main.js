import { SHAPES } from "./data/shapes.js";
import { SIGNS } from "./data/signs.js";
import { createGloss } from "./data/gloss.js";
import { HandRig } from "./hand-rig.js";
import { AnimPlayer } from "./anim-player.js";

("use strict");

const THREE = window.THREE;

let userSigns = {};
try {
  userSigns = JSON.parse(localStorage.getItem("asl_user_signs") || "{}");
} catch (e) {
  userSigns = {};
}

const GLOSS = createGloss(() => userSigns);

const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.physicallyCorrectLights = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
camera.position.set(0, 0.5, 6.5);
camera.lookAt(0, 0.3, 0);

const ambient = new THREE.AmbientLight(0xfff7ef, 0.48);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xfffaf2, 0xc4cfdf, 0.42);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff0e2, 2.5);
key.position.set(1.2, 2.8, 3.8);
scene.add(key);

const fillR = new THREE.PointLight(0xf2d5be, 0.8, 8);
fillR.position.set(2.0, 1.2, 1.9);
scene.add(fillR);

const fillL = new THREE.PointLight(0xcfdcff, 0.58, 8);
fillL.position.set(-1.9, 1.1, 2.1);
scene.add(fillL);

const rimLight = new THREE.DirectionalLight(0xfffaf4, 0.68);
rimLight.position.set(-0.55, 0.9, -2.8);
scene.add(rimLight);

const rightHand = new HandRig(scene, true);
const leftHand = new HandRig(scene, false);

function resize() {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const player = new AnimPlayer(rightHand, leftHand, () => userSigns);
player.speed = 1.0;

let prevTime = performance.now();
let camSwayT = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - prevTime) / 1000, 0.05);
  prevTime = now;

  camSwayT += dt * 0.3;
  camera.position.y = 0.5 + Math.sin(camSwayT) * 0.03;
  camera.lookAt(0, 0.3, 0);

  fillR.intensity = 0.78 + Math.sin(now * 0.0012) * 0.05;
  fillL.intensity = 0.56 + Math.sin(now * 0.001 + 1) * 0.04;

  player.update(dt);

  document.getElementById("frameInfo").textContent = `${now.toFixed(0)}ms`;

  renderer.render(scene, camera);
}
animate();

player.onSign = (name, type) => {
  document.getElementById("currentSign").textContent = name;
  document.getElementById("signType").textContent = type;
  document
    .querySelectorAll(".token")
    .forEach((el) => el.classList.remove("token-active"));
  const active = document.querySelector(
    `.token[data-key="${name}"], .token[data-letter="${name}"]`,
  );
  if (active) active.classList.add("token-active");
};

player.onProgress = (pct) => {
  document.getElementById("progressFill").style.width = `${pct}%`;
};

player.onDone = () => {
  document.getElementById("currentSign").textContent = "—";
  document.getElementById("signType").textContent = "DONE";
  document.getElementById("progressFill").style.width = "0%";
  document
    .querySelectorAll(".token")
    .forEach((el) => el.classList.remove("token-active"));
  document.getElementById("queueInfo").textContent = "QUEUE EMPTY";
  document.getElementById("statQueue").textContent = "0";
};

function doTranslate() {
  const text = document.getElementById("textInput").value.trim();
  if (!text) return;
  const tokens = GLOSS.textToGloss(text);
  displayGloss(tokens);
  doSign(tokens);
}

function displayGloss(tokens) {
  const container = document.getElementById("aslOutput");
  container.innerHTML = "";
  if (tokens.length === 0) {
    container.innerHTML =
      '<span style="font-family:var(--font-mono);font-size:9px;color:var(--text3);">NO TRANSLATABLE CONTENT</span>';
    return;
  }

  tokens.forEach((tok) => {
    if (tok.type === "word") {
      const el = document.createElement("span");
      el.className = "token token-word";
      el.textContent = tok.key.replace(/_/g, " ");
      el.dataset.key = tok.key.replace(/_/g, " ");
      el.onclick = () => player.enqueue([tok]);
      container.appendChild(el);
    } else if (tok.type === "fingerspell") {
      const wrapper = document.createElement("span");
      wrapper.style.display = "contents";
      tok.word.split("").forEach((letter) => {
        const el = document.createElement("span");
        el.className = "token token-fs";
        el.textContent = letter;
        el.dataset.letter = letter;
        wrapper.appendChild(el);
      });
      container.appendChild(wrapper);
    }
  });
}

function doSign(tokens) {
  player.stop();
  if (!tokens) return;
  player.enqueue(tokens);
  const count = tokens.reduce(
    (sum, t) => sum + (t.type === "fingerspell" ? t.word.length : 1),
    0,
  );
  document.getElementById("statQueue").textContent = String(count);
  document.getElementById("queueInfo").textContent =
    `SIGNING ${count} TOKEN${count !== 1 ? "S" : ""}`;
}

function signWord(key) {
  player.stop();
  const tok = { type: "word", key, src: key.toLowerCase() };
  displayGloss([tok]);
  doSign([tok]);
}

function signLetter(letter) {
  player.stop();
  const tok = { type: "fingerspell", word: letter, src: letter };
  displayGloss([tok]);
  doSign([tok]);
}

document.getElementById("signBtn").addEventListener("click", doTranslate);

document.getElementById("stopBtn").addEventListener("click", () => {
  player.stop();
  document.getElementById("currentSign").textContent = "—";
  document.getElementById("signType").textContent = "IDLE";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("queueInfo").textContent = "QUEUE EMPTY";
  document.getElementById("statQueue").textContent = "0";
});

document.getElementById("textInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) doTranslate();
});

document.getElementById("speedSlider").addEventListener("input", (e) => {
  const v = parseFloat(e.target.value);
  player.speed = v;
  document.getElementById("speedVal").textContent = `${v.toFixed(1)}×`;
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const text = document.getElementById("textInput").value.trim();
  const tokens = GLOSS.textToGloss(text);

  const exportData = {
    version: "1.0",
    format: "ASL_ANIMATION_JSON",
    note: "Convert to GLB using Three.js GLTFExporter with SkinnedMesh",
    input_text: text,
    asl_gloss: tokens.map((t) =>
      t.type === "word" ? t.key : `(FS:${t.word})`,
    ),
    skeleton: {
      bones: [
        "root",
        "wrist",
        "thumb_pivot",
        "thumb_s0",
        "thumb_s1",
        "thumb_s2",
        "index_pivot",
        "index_s0",
        "index_s1",
        "index_s2",
        "middle_pivot",
        "middle_s0",
        "middle_s1",
        "middle_s2",
        "ring_pivot",
        "ring_s0",
        "ring_s1",
        "ring_s2",
        "pinky_pivot",
        "pinky_s0",
        "pinky_s1",
        "pinky_s2",
      ],
    },
    handshapes: Object.fromEntries(
      Object.entries(SHAPES).map(([k, v]) => [k, v]),
    ),
    signs: tokens.map((tok) => {
      if (tok.type === "word") {
        const s = SIGNS[tok.key];
        return {
          type: "word",
          key: tok.key,
          frames: s ? s.frames || s.framesR : null,
        };
      }
      return { type: "fingerspell", word: tok.word };
    }),
    userSigns,
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "asl_animation.json";
  a.click();
  URL.revokeObjectURL(url);
});

const QUICK_WORDS = [
  "HELLO",
  "YES",
  "NO",
  "THANK_YOU",
  "PLEASE",
  "SORRY",
  "HELP",
  "GOOD",
  "BAD",
  "LOVE",
  "GO",
  "COME",
  "STOP",
];

function buildQuickGrid() {
  const grid = document.getElementById("quickGrid");
  grid.innerHTML = "";
  QUICK_WORDS.forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.textContent = key.replace(/_/g, " ");
    btn.onclick = () => signWord(key);
    grid.appendChild(btn);
  });
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const WORD_KEYS = Object.keys(SIGNS);
const USER_KEYS = () => Object.keys(userSigns);

function buildLibrary() {
  const grid = document.getElementById("libraryGrid");
  grid.innerHTML = "";

  ALPHA.forEach((l) => {
    const btn = document.createElement("button");
    btn.className = "lib-btn";
    btn.textContent = l;
    btn.title = `Fingerspell ${l}`;
    btn.onclick = () => signLetter(l);
    grid.appendChild(btn);
  });

  WORD_KEYS.forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "lib-btn";
    btn.textContent = key.replace(/_/g, " ").substring(0, 6);
    btn.title = key.replace(/_/g, " ");
    btn.onclick = () => signWord(key);
    grid.appendChild(btn);
  });

  USER_KEYS().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "lib-btn";
    btn.style.borderColor = "rgba(124,77,255,0.3)";
    btn.style.color = "#b39ddb";
    btn.textContent = key.substring(0, 6);
    btn.title = `${key} (user)`;
    btn.onclick = () => signWord(key);
    grid.appendChild(btn);
  });

  document.getElementById("statSigns").textContent = String(
    WORD_KEYS.length + USER_KEYS().length,
  );
}

buildQuickGrid();
buildLibrary();

document.getElementById("addWordBtn").addEventListener("click", () => {
  document.getElementById("addModal").classList.add("open");
});

document.getElementById("cancelModal").addEventListener("click", () => {
  document.getElementById("addModal").classList.remove("open");
});

document.getElementById("confirmModal").addEventListener("click", () => {
  const word = document.getElementById("newWord").value.trim().toUpperCase();
  const shape = document.getElementById("newShape").value.trim().toUpperCase();
  const note = document.getElementById("newNote").value.trim();

  if (!word || !shape) return;

  const validShape = SHAPES[shape] ? shape : SIGNS[shape] ? shape : "A";
  userSigns[word] = { shape: validShape, dur: 0.5, note };

  try {
    localStorage.setItem("asl_user_signs", JSON.stringify(userSigns));
  } catch (e) {
    // ignore storage failures
  }

  GLOSS.addWordMapping(word, word);
  buildLibrary();

  document.getElementById("addModal").classList.remove("open");
  document.getElementById("newWord").value = "";
  document.getElementById("newShape").value = "";
  document.getElementById("newNote").value = "";
});

document.getElementById("addModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (e.key === " ") {
    e.preventDefault();
    player.stop();
  }
  if (e.key >= "A" && e.key <= "Z" && !e.ctrlKey && !e.metaKey) {
    signLetter(e.key);
  }
});

setInterval(() => {
  const qLen = player.queue.length;
  if (qLen > 0) {
    document.getElementById("queueInfo").textContent =
      `QUEUE: ${qLen} REMAINING`;
    document.getElementById("statQueue").textContent = String(qLen);
  }
}, 200);

