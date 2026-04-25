import { d } from "./utils.js";

export class HandRig {
  constructor(scene, isRight = true) {
    this.isRight = isRight;
    this.sign = isRight ? 1 : -1;

    const handColor = 0x8bc8ff;
    const jointColor = 0x55aaff;
    const emissive = 0x001133;

    this.mat = new THREE.MeshPhongMaterial({
      color: handColor,
      emissive,
      emissiveIntensity: 0.4,
      shininess: 80,
      specular: 0x3399ff,
      transparent: true,
      opacity: 0.92,
      side: THREE.FrontSide,
    });

    this.jointMat = new THREE.MeshPhongMaterial({
      color: jointColor,
      emissive: 0x001a44,
      emissiveIntensity: 0.5,
      shininess: 100,
      specular: 0x66bbff,
      transparent: true,
      opacity: 0.95,
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

  _makeBone(name, length, radius = 0.055) {
    const g = new THREE.Group();
    g.name = name;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.35, 10, 8),
      this.jointMat,
    );
    g.add(sphere);

    if (length > 0) {
      const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.78, radius, length, 7),
        this.mat,
      );
      bone.position.y = length / 2;
      g.add(bone);
    }

    return { group: g, length };
  }

  _buildPalm() {
    // Vertical rectangle plate under the four fingers
    const palmPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.86, 0.1),
      this.mat,
    );
    palmPlate.position.set(0, 0.45, -0.12);
    this.wrist.add(palmPlate);

    // Small top ridge near finger roots for smoother transition
    const knuckleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.08, 0.18),
      this.jointMat,
    );
    knuckleBar.position.set(0, 0.87, -0.02);
    this.wrist.add(knuckleBar);

    const wristKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.15, 8),
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
