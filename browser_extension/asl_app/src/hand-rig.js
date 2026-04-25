import { d } from "./utils.js";

export class HandRig {
  constructor(scene, isRight = true) {
    this.isRight = isRight;
    this.sign = isRight ? 1 : -1;

    const baseSkin = isRight ? 0xd6a98e : 0xd2a388;
    const jointSkin = isRight ? 0xd1a186 : 0xcc9b7f;
    const nailColor = isRight ? 0xe6c9ba : 0xe1c2b1;

    const skinMaps = this._createSkinMaps(baseSkin);

    this.mat = new THREE.MeshStandardMaterial({
      color: baseSkin,
      map: skinMaps.color,
      roughnessMap: skinMaps.roughness,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.FrontSide,
    });

    this.jointMat = new THREE.MeshStandardMaterial({
      color: jointSkin,
      map: skinMaps.color,
      roughnessMap: skinMaps.roughness,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.FrontSide,
    });

    this.nailMat = new THREE.MeshPhysicalMaterial({
      color: nailColor,
      roughness: 0.64,
      metalness: 0.0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.62,
      reflectivity: 0.12,
      side: THREE.FrontSide,
    });

    this.root = new THREE.Group();
    this.root.name = isRight ? "rightHand" : "leftHand";
    scene.add(this.root);

    this.wrist = new THREE.Group();
    this.wrist.name = "wrist";
    this.root.add(this.wrist);

    this._buildPalm();
    this._buildFingers();

    this.root.position.set(isRight ? 1.25 : -1.25, 0, 0.6);
  }

  _createSkinMaps(baseHex) {
    const size = 256;
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = size;
    colorCanvas.height = size;
    const cctx = colorCanvas.getContext("2d");

    const base = new THREE.Color(baseHex);
    const light = base.clone().offsetHSL(0, 0.02, 0.07);
    const dark = base.clone().offsetHSL(0, -0.01, -0.08);

    const grad = cctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, `#${light.getHexString()}`);
    grad.addColorStop(1, `#${dark.getHexString()}`);
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, size, size);

    // Subtle pore-like noise to avoid plastic flatness.
    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 1.2 + 0.2;
      const alpha = Math.random() * 0.05;
      cctx.fillStyle = `rgba(120,85,70,${alpha.toFixed(3)})`;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    for (let i = 0; i < 2300; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = Math.random() * 9 + 2;
      const h = Math.random() * 0.45 + 0.12;
      cctx.fillStyle = `rgba(95,65,50,${(Math.random() * 0.045).toFixed(3)})`;
      cctx.fillRect(x, y, w, h);
    }

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext("2d");
    rctx.fillStyle = "rgb(210,210,210)";
    rctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = 160 + Math.floor(Math.random() * 70);
      rctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      rctx.fillRect(x, y, 1, 1);
    }

    const colorMap = new THREE.CanvasTexture(colorCanvas);
    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(2.2, 2.2);

    const roughMap = new THREE.CanvasTexture(roughCanvas);
    roughMap.wrapS = THREE.RepeatWrapping;
    roughMap.wrapT = THREE.RepeatWrapping;
    roughMap.repeat.set(2.2, 2.2);

    return { color: colorMap, roughness: roughMap };
  }

  _makeBone(name, length, radius = 0.055) {
    const g = new THREE.Group();
    g.name = name;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.06, 18, 14),
      this.mat,
    );
    sphere.scale.set(1.02, 0.9, 0.98);
    g.add(sphere);

    if (length > 0) {
      const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.9, radius * 0.96, length, 18, 1),
        this.mat,
      );
      bone.position.y = length / 2;
      bone.scale.set(1.02, 1, 0.9);
      g.add(bone);

      const tipCap = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.03, 14, 12),
        this.mat,
      );
      tipCap.position.y = length;
      tipCap.scale.set(0.98, 0.78, 1.08);
      g.add(tipCap);
    }

    return { group: g, length };
  }

  _buildPalm() {
    // Vertical rectangle plate under the four fingers
    const palmPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.92, 0.17, 4, 4, 2),
      this.mat,
    );
    palmPlate.position.set(0, 0.45, -0.12);
    palmPlate.scale.set(1, 1, 0.86);
    this.wrist.add(palmPlate);

    const palmPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 18, 14),
      this.jointMat,
    );
    palmPad.scale.set(1.35, 0.55, 0.65);
    palmPad.position.set(0, 0.2, -0.04);
    this.wrist.add(palmPad);

    const thenarPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      this.jointMat,
    );
    thenarPad.scale.set(1.05, 0.7, 0.82);
    thenarPad.position.set(-0.22 * this.sign, 0.28, 0.04);
    this.wrist.add(thenarPad);

    // Small top ridge near finger roots for smoother transition
    const knuckleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.1, 0.18, 2, 1, 1),
      this.jointMat,
    );
    knuckleBar.position.set(0, 0.87, -0.02);
    this.wrist.add(knuckleBar);

    const wristKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.09, 0.17, 14),
      this.jointMat,
    );
    wristKnob.position.set(0, -0.05, 0);
    this.wrist.add(wristKnob);
  }

  _buildFingers() {
    this.fingerPivots = {};
    this.fingerSegs = {};
    this.thumbPivot = null;
    this.thumbSegs = [];

    const s = this.sign;

    const thumbRoot = new THREE.Group();
    thumbRoot.name = "thumb_pivot";
    thumbRoot.position.set(-0.3 * s, 0.1, 0.28);
    thumbRoot.rotation.z = d(35) * s;
    this.wrist.add(thumbRoot);
    this.thumbPivot = thumbRoot;

    const thumbLens = [0.25, 0.2, 0.16];
    let thumbParent = thumbRoot;
    this.thumbSegs = [];
    thumbLens.forEach((len, i) => {
      const { group } = this._makeBone(`thumb_s${i}`, len, 0.05);
      if (i > 0) group.position.y = thumbLens[i - 1];
      thumbParent.add(group);
      thumbParent = group;
      this.thumbSegs.push(group);
    });

    const thumbNail = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 14, 10),
      this.nailMat,
    );
    thumbNail.position.set(0, thumbLens[2] * 0.9, 0.03);
    thumbNail.scale.set(1.2, 0.28, 0.88);
    this.thumbSegs[2].add(thumbNail);

    const fingerDefs = [
      ["index", -0.21 * s, [0.3, 0.22, 0.15]],
      ["middle", -0.07 * s, [0.34, 0.24, 0.16]],
      ["ring", 0.07 * s, [0.3, 0.21, 0.14]],
      ["pinky", 0.21 * s, [0.23, 0.16, 0.11]],
    ];

    fingerDefs.forEach(([name, x, lens]) => {
      const pivot = new THREE.Group();
      pivot.name = `${name}_pivot`;
      pivot.position.set(x, 0.88, 0);
      this.wrist.add(pivot);
      this.fingerPivots[name] = pivot;

      let parent = pivot;
      this.fingerSegs[name] = [];
      lens.forEach((len, i) => {
        const { group } = this._makeBone(
          `${name}_s${i}`,
          len,
          i === 0 ? 0.055 : 0.048 - i * 0.005,
        );
        if (i > 0) group.position.y = lens[i - 1];
        parent.add(group);
        parent = group;
        this.fingerSegs[name].push(group);
      });

      const nail = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 14, 10),
        this.nailMat,
      );
      nail.position.set(0, lens[2] * 0.9, 0.028);
      nail.scale.set(1.06, 0.26, 0.82);
      this.fingerSegs[name][2].add(nail);
    });
  }

  applyPose(pose, t = 1) {
    const s = this.sign;
    const lrp = (cur, tgt, amt) => cur + (tgt - cur) * amt;

    if (pose.wrist) {
      this.wrist.rotation.x = lrp(this.wrist.rotation.x, d(pose.wrist[0]), t);
      this.wrist.rotation.y = lrp(
        this.wrist.rotation.y,
        d(pose.wrist[1]) * s,
        t,
      );
      this.wrist.rotation.z = lrp(
        this.wrist.rotation.z,
        d(pose.wrist[2]) * s,
        t,
      );
    }

    if (pose.thumb) {
      const tp = pose.thumb;
      this.thumbPivot.rotation.y = lrp(
        this.thumbPivot.rotation.y,
        d(tp[0]) * s,
        t,
      );
      this.thumbPivot.rotation.z = lrp(
        this.thumbPivot.rotation.z,
        d(tp[1]) * s,
        t,
      );
      this.thumbSegs[0].rotation.x = lrp(
        this.thumbSegs[0].rotation.x,
        d(tp[2]),
        t,
      );
      this.thumbSegs[1].rotation.x = lrp(
        this.thumbSegs[1].rotation.x,
        d(tp[3]),
        t,
      );
      this.thumbSegs[2].rotation.x = lrp(
        this.thumbSegs[2].rotation.x,
        d(tp[4]),
        t,
      );
    }

    ["index", "middle", "ring", "pinky"].forEach((name) => {
      const fp = pose[name];
      if (!fp) return;
      const pivot = this.fingerPivots[name];
      const segs = this.fingerSegs[name];
      pivot.rotation.z = lrp(pivot.rotation.z, d(fp[0]) * s, t);
      segs[0].rotation.x = lrp(segs[0].rotation.x, d(fp[1]), t);
      segs[1].rotation.x = lrp(segs[1].rotation.x, d(fp[2]), t);
      segs[2].rotation.x = lrp(segs[2].rotation.x, d(fp[3]), t);
    });
  }

  applyTransform(pos, rot, t = 1) {
    const lrp = (a, b, amt) => a + (b - a) * amt;
    if (pos) {
      this.root.position.x = lrp(this.root.position.x, pos.x, t);
      this.root.position.y = lrp(this.root.position.y, pos.y, t);
      this.root.position.z = lrp(this.root.position.z, pos.z, t);
    }
    if (rot) {
      this.root.rotation.x = lrp(this.root.rotation.x, rot.rx || 0, t);
      this.root.rotation.y = lrp(this.root.rotation.y, rot.ry || 0, t);
      this.root.rotation.z = lrp(this.root.rotation.z, rot.rz || 0, t);
    }
  }

  resetTransform(t = 0.05) {
    const defPos = { x: this.isRight ? 1.25 : -1.25, y: 0, z: 0.6 };
    const defRot = { rx: 0, ry: 0, rz: 0 };
    this.applyTransform(defPos, defRot, t);
  }
}
