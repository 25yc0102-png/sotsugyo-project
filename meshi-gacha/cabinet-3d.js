import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

const symbolGlyphs = ["丼", "麺", "酒", "串", "魚", "餃", "珈", "甘", "飯"];
const symbolTextureCache = new Map();
const motifStyles = {
  丼: { name: "ごはん", accent: "#d99132", illustration: "bowl" },
  麺: { name: "めん", accent: "#e28428", illustration: "noodles" },
  酒: { name: "酒場", accent: "#d94b37", illustration: "sake" },
  串: { name: "やきとり", accent: "#d34b32", illustration: "skewer" },
  魚: { name: "さかな", accent: "#4b8fa4", illustration: "fish" },
  餃: { name: "ぎょうざ", accent: "#d6a33f", illustration: "dumpling" },
  珈: { name: "こーひー", accent: "#a96f43", illustration: "coffee" },
  甘: { name: "あまいもの", accent: "#c66574", illustration: "sweet" },
  揚: { name: "あげもの", accent: "#d98a2f", illustration: "bowl" },
  肴: { name: "和のごはん", accent: "#718c56", illustration: "fish" },
  飯: { name: "ごはん", accent: "#d99132", illustration: "bowl" },
};

function drawBowl(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "#100807";
  context.shadowBlur = 10;
  context.fillStyle = "#201012";
  context.beginPath();
  context.ellipse(0, 3, 83, 22, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#e9c873";
  context.beginPath();
  context.ellipse(0, -6, 79, 24, 0, Math.PI, Math.PI * 2);
  context.fill();
  context.fillStyle = "#8f2630";
  context.beginPath();
  context.moveTo(-72, -3);
  context.quadraticCurveTo(-59, 67, 0, 70);
  context.quadraticCurveTo(59, 67, 72, -3);
  context.quadraticCurveTo(0, 14, -72, -3);
  context.fill();
  context.strokeStyle = "#f3d982";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(-69, 7);
  context.quadraticCurveTo(0, 28, 69, 7);
  context.stroke();
  context.fillStyle = "#f7e6bd";
  context.beginPath();
  context.ellipse(0, -13, 61, 17, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = accent;
  for (const [dotX, dotY] of [[-25, -13], [0, -20], [28, -10]]) {
    context.beginPath();
    context.arc(dotX, dotY, 8, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawFish(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "#100807";
  context.shadowBlur = 10;
  context.fillStyle = "#161318";
  context.beginPath();
  context.ellipse(0, 4, 86, 34, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = accent;
  context.beginPath();
  context.ellipse(-4, -2, 67, 25, -0.08, 0, Math.PI * 2);
  context.fill();
  context.moveTo(55, -1);
  context.lineTo(91, -28);
  context.lineTo(87, 22);
  context.closePath();
  context.fill();
  context.fillStyle = "#f6dda0";
  context.beginPath();
  context.ellipse(-18, -1, 23, 16, -0.14, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#202326";
  context.beginPath();
  context.arc(-28, -3, 3, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#f4d781";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-64, 34);
  context.quadraticCurveTo(-2, 57, 67, 31);
  context.stroke();
  context.restore();
}

function drawSkewer(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.2);
  context.strokeStyle = "#e4c47d";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-69, 42);
  context.lineTo(72, -40);
  context.stroke();
  for (const [pieceX, pieceY, color] of [
    [-43, 26, "#a52e27"],
    [-5, 5, accent],
    [33, -17, "#9d2925"],
  ]) {
    context.fillStyle = "#281013";
    context.beginPath();
    context.arc(pieceX, pieceY, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(pieceX, pieceY, 15, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#f3d77e";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(pieceX - 3, pieceY - 5, 7, Math.PI, Math.PI * 1.8);
    context.stroke();
  }
  context.restore();
}

function drawDumpling(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "#100807";
  context.shadowBlur = 10;
  context.fillStyle = "#f2db9b";
  context.strokeStyle = accent;
  context.lineWidth = 5;
  for (const [dx, dy] of [[-40, 6], [0, -10], [39, 8]]) {
    context.beginPath();
    context.ellipse(dx, dy, 29, 22, -0.08, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = "#b47d39";
    context.lineWidth = 2;
    for (let fold = -1; fold <= 1; fold += 1) {
      context.beginPath();
      context.moveTo(dx + fold * 10, dy - 17);
      context.lineTo(dx + fold * 7, dy - 5);
      context.stroke();
    }
    context.strokeStyle = accent;
    context.lineWidth = 5;
  }
  context.restore();
}

function drawCoffee(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.fillStyle = "#f0d48b";
  context.strokeStyle = accent;
  context.lineWidth = 6;
  context.beginPath();
  context.roundRect(-47, -38, 82, 72, 12);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(40, -3, 21, -Math.PI / 2, Math.PI / 2);
  context.stroke();
  context.fillStyle = "#542821";
  context.beginPath();
  context.ellipse(-6, -34, 39, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#fff0c8";
  context.lineWidth = 4;
  for (const offset of [-22, 0, 22]) {
    context.beginPath();
    context.moveTo(offset, -54);
    context.bezierCurveTo(offset - 12, -68, offset + 13, -71, offset, -84);
    context.stroke();
  }
  context.restore();
}

function drawSweet(context, x, y, accent) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "#100807";
  context.shadowBlur = 10;
  context.fillStyle = "#f2d89b";
  context.beginPath();
  context.ellipse(0, 37, 77, 16, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#c86777";
  context.beginPath();
  context.moveTo(-54, 29);
  context.lineTo(-42, -10);
  context.quadraticCurveTo(0, 8, 42, -10);
  context.lineTo(54, 29);
  context.closePath();
  context.fill();
  context.fillStyle = "#f4e3b6";
  context.beginPath();
  context.ellipse(0, -9, 43, 22, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = accent;
  context.beginPath();
  context.arc(0, -35, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#779450";
  context.beginPath();
  context.ellipse(14, -43, 12, 5, -0.45, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function createSymbolTexture(glyph) {
  if (symbolTextureCache.has(glyph)) return symbolTextureCache.get(glyph);

  const motif = motifStyles[glyph] ?? motifStyles.飯;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  const background = context.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#79251f");
  background.addColorStop(0.52, "#351316");
  background.addColorStop(1, "#171013");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f4ce79";
  context.globalAlpha = 0.12;
  for (let x = -canvas.height; x < canvas.width; x += 38) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 70, 0);
    context.lineTo(x + canvas.height + 70, canvas.height);
    context.lineTo(x + canvas.height, canvas.height);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1;
  context.strokeStyle = "#170d0a";
  context.lineWidth = 22;
  context.strokeRect(7, 7, 498, 242);
  context.strokeStyle = "#eac66e";
  context.lineWidth = 10;
  context.strokeRect(14, 14, 484, 228);
  context.strokeStyle = "#fff0bb";
  context.lineWidth = 2;
  context.strokeRect(23, 23, 466, 210);

  const illustrationX = 124;
  const illustrationY = 130;
  const drawIllustration = {
    bowl: drawBowl,
    noodles: drawBowl,
    sake: drawCoffee,
    skewer: drawSkewer,
    fish: drawFish,
    dumpling: drawDumpling,
    coffee: drawCoffee,
    sweet: drawSweet,
  }[motif.illustration];
  drawIllustration(context, illustrationX, illustrationY, motif.accent);

  context.strokeStyle = "#e9c66e";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(239, 39);
  context.lineTo(239, 217);
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = 'bold 142px "Yu Mincho", "Yu Gothic", "Meiryo", serif';
  context.lineJoin = "round";
  context.lineWidth = 15;
  context.strokeStyle = "#170d0a";
  context.shadowColor = "#ffc24b";
  context.shadowBlur = 20;
  context.strokeText(glyph, 367, 132);
  context.shadowBlur = 0;
  context.fillStyle = "#ffdf83";
  context.fillText(glyph, 367, 126);
  context.fillStyle = "#fff7da";
  context.font = 'bold 23px "Yu Gothic", "Meiryo", sans-serif';
  context.fillText(motif.name, 367, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  symbolTextureCache.set(glyph, texture);
  return texture;
}

function createBrandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 190;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = "#1c1112";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#c6a66c";
  context.lineWidth = 7;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.strokeStyle = "#593b24";
  context.lineWidth = 2;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#f2d88e";
  context.font = 'bold 72px "Yu Gothic", "Meiryo", sans-serif';
  context.fillText("めしガチャ", canvas.width / 2, 96);
  context.fillStyle = "#c6a66c";
  context.font = 'bold 22px "Yu Gothic", "Meiryo", sans-serif';
  context.fillText("本日のおすすめを3つのリールで", canvas.width / 2, 151);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createResultTexture(title, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 120;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");

  context.fillStyle = "#1a1113";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#c6a66c";
  context.lineWidth = 7;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = "#f4dda1";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = 'bold 58px "Yu Gothic", "Meiryo", sans-serif';
  context.fillText(title, canvas.width / 2, 46, canvas.width - 36);
  context.fillStyle = "#d4b674";
  context.font = 'bold 25px "Yu Gothic", "Meiryo", sans-serif';
  context.fillText(subtitle, canvas.width / 2, 92, canvas.width - 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(parent, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addFastener(parent, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addOrnament(parent, x, y, z, material, mirrored = false) {
  const points = [];
  for (let step = 0; step <= 36; step += 1) {
    const angle = (step / 36) * Math.PI * 1.6;
    const radius = 0.08 + (step / 36) * 0.42;
    points.push(new THREE.Vector3(
      x + Math.cos(angle) * radius * (mirrored ? -1 : 1),
      y + Math.sin(angle) * radius,
      z,
    ));
  }
  const ornament = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.028, 6), material);
  parent.add(ornament);
}

function createReel(parent, x, index, drumMaterial) {
  const reel = new THREE.Group();
  reel.position.set(x, 0.55, 1.53);
  parent.add(reel);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 1.56, 48), drumMaterial);
  drum.rotation.z = Math.PI / 2;
  reel.add(drum);

  const tiles = [];
  for (let tileIndex = 0; tileIndex < 8; tileIndex += 1) {
    const glyph = symbolGlyphs[(tileIndex + index * 2) % symbolGlyphs.length];
    const angle = (tileIndex * Math.PI) / 4;
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(1.48, 0.67),
      new THREE.MeshBasicMaterial({
        map: createSymbolTexture(glyph),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    tile.position.set(0, 0.92 * Math.sin(angle), 0.92 * Math.cos(angle));
    tile.rotation.x = -angle;
    reel.add(tile);
    tiles.push(tile);
  }

  return { reel, tiles, glyph: null };
}

export function createCabinetScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#171013");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.setAttribute("tabindex", "-1");
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
  camera.position.set(5.5, 3.8, 24);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight("#fff1d2", 1.8));
  const keyLight = new THREE.DirectionalLight("#fff0d2", 3.8);
  keyLight.position.set(-5, 8, 12);
  scene.add(keyLight);
  const edgeLight = new THREE.PointLight("#e2a947", 42, 18);
  edgeLight.position.set(6, 4, 5);
  scene.add(edgeLight);
  const redLight = new THREE.PointLight("#b83a32", 34, 16);
  redLight.position.set(-5, -1, 5);
  scene.add(redLight);

  const materials = {
    casing: new THREE.MeshStandardMaterial({ color: "#171719", metalness: 0.76, roughness: 0.24 }),
    casingHighlight: new THREE.MeshStandardMaterial({ color: "#302522", metalness: 0.82, roughness: 0.2 }),
    edge: new THREE.MeshStandardMaterial({ color: "#5b4729", metalness: 0.82, roughness: 0.24 }),
    panel: new THREE.MeshStandardMaterial({ color: "#211719", metalness: 0.58, roughness: 0.3 }),
    trim: new THREE.MeshStandardMaterial({ color: "#d1aa58", metalness: 0.82, roughness: 0.22 }),
    trimBright: new THREE.MeshStandardMaterial({
      color: "#ffe0a0",
      metalness: 0.68,
      roughness: 0.18,
      emissive: "#c98223",
      emissiveIntensity: 0.25,
    }),
    drum: new THREE.MeshStandardMaterial({ color: "#281c1d", metalness: 0.58, roughness: 0.3 }),
    red: new THREE.MeshStandardMaterial({ color: "#b83a32", metalness: 0.35, roughness: 0.27 }),
    silver: new THREE.MeshStandardMaterial({ color: "#d0b879", metalness: 0.9, roughness: 0.2 }),
  };

  const cabinet = new THREE.Group();
  cabinet.rotation.y = -0.1;
  scene.add(cabinet);

  addBox(cabinet, 9.45, 10.2, 1.75, 0, -0.05, 0, materials.casing);
  addBox(cabinet, 9.7, 0.48, 2.12, 0, -4.92, 0, materials.edge);
  addBox(cabinet, 8.6, 0.25, 1.95, 0, -5.27, -0.05, materials.panel);
  addBox(cabinet, 8.4, 0.2, 1.8, 0, 4.88, 0, materials.edge);
  addBox(cabinet, 9.17, 9.86, 0.08, 0, -0.05, 0.9, materials.casingHighlight);
  addBox(cabinet, 8.93, 9.6, 0.08, 0, -0.05, 0.96, materials.casing);

  for (const x of [-4.47, 4.47]) {
    addBox(cabinet, 0.1, 9.2, 0.12, x, -0.02, 1.03, materials.trim);
    addBox(cabinet, 0.035, 8.86, 0.1, x + (x < 0 ? 0.1 : -0.1), -0.02, 1.11, materials.trimBright);
  }
  for (const y of [-4.68, 4.58]) {
    addBox(cabinet, 9.15, 0.1, 0.12, 0, y, 1.03, materials.trim);
    addBox(cabinet, 8.84, 0.035, 0.1, 0, y + (y < 0 ? 0.1 : -0.1), 1.11, materials.trimBright);
  }

  addBox(cabinet, 8.15, 8.82, 0.2, 0, -0.03, 0.96, materials.panel);
  addBox(cabinet, 7.65, 1.14, 0.2, 0, 3.52, 1.09, materials.edge);
  addBox(cabinet, 7.46, 0.96, 0.08, 0, 3.52, 1.23, materials.panel);

  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(5.9, 0.74),
    new THREE.MeshBasicMaterial({ map: createBrandTexture(), toneMapped: false }),
  );
  brand.position.set(0, 3.52, 1.29);
  cabinet.add(brand);

  addBox(cabinet, 7.95, 3.3, 0.22, 0, 0.55, 1.1, materials.edge);
  addBox(cabinet, 7.72, 3.07, 0.13, 0, 0.55, 1.25, materials.panel);

  const reels = [-2.46, 0, 2.46].map((x, index) => createReel(cabinet, x, index, materials.drum));

  for (const x of [-3.99, -1.23, 1.23, 3.99]) {
    addBox(cabinet, 0.1, 3.08, 0.16, x, 0.55, 2.27, materials.trim);
    addBox(cabinet, 0.035, 2.86, 0.09, x + (x < 0 ? 0.09 : -0.09), 0.55, 2.35, materials.trimBright);
  }
  for (const y of [-1.03, 2.13]) {
    addBox(cabinet, 8.1, 0.11, 0.2, 0, y, 2.26, materials.trim);
    addBox(cabinet, 7.86, 0.035, 0.1, 0, y + (y < 0 ? 0.1 : -0.1), 2.36, materials.trimBright);
  }

  addBox(cabinet, 7.85, 0.68, 0.2, 0, -1.43, 1.12, materials.edge);
  addBox(cabinet, 7.58, 0.5, 0.1, 0, -1.43, 1.25, materials.panel);
  const resultLabels = reels.map(({ reel }) => {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.36, 0.49),
      new THREE.MeshBasicMaterial({
        map: createResultTexture("候補を抽選中", "停止したリールに店舗が表示されます"),
        toneMapped: false,
      }),
    );
    label.position.set(reel.position.x, -1.43, 1.32);
    cabinet.add(label);
    return { label, title: "", subtitle: "" };
  });

  for (const [x, mirrored] of [[-4.12, false], [4.12, true]]) {
    addOrnament(cabinet, x, 1.75, 2.36, materials.trimBright, mirrored);
    addOrnament(cabinet, x, -0.63, 2.36, materials.trim, mirrored);
  }
  for (const x of [-4.35, 4.35]) {
    for (const y of [4.1, 2.75, -1.55, -3.2, -4.15]) {
      addFastener(cabinet, x, y, 1.16, materials.trimBright);
    }
  }

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 2.9),
    new THREE.MeshPhysicalMaterial({
      color: "#f5d992",
      transparent: true,
      opacity: 0.035,
      roughness: 0.08,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.set(0, 0.55, 2.4);
  cabinet.add(glass);

  const payline = new THREE.Mesh(
    new THREE.PlaneGeometry(7.55, 0.035),
    new THREE.MeshBasicMaterial({ color: "#f4bd45", toneMapped: false }),
  );
  payline.position.set(0, 0.55, 2.48);
  cabinet.add(payline);
  const sweep = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 2.9),
    new THREE.MeshBasicMaterial({
      color: "#fff1bd",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sweep.position.set(-3.75, 0.55, 2.5);
  cabinet.add(sweep);

  const stopEffects = reels.map(({ reel }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.03, 0.042, 10, 64),
      new THREE.MeshBasicMaterial({
        color: "#ffe4a0",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.position.set(reel.position.x, 0.55, 2.49);
    cabinet.add(ring);
    return { ring, elapsed: -1 };
  });

  addBox(cabinet, 7.7, 1.12, 0.34, 0, -2.42, 1.08, materials.edge);
  addBox(cabinet, 7.35, 0.82, 0.12, 0, -2.42, 1.31, materials.panel);

  for (const [x, color] of [[-1.6, materials.red], [1.6, materials.trimBright]]) {
    const buttonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.18, 32), materials.casing);
    buttonBase.rotation.x = Math.PI / 2;
    buttonBase.position.set(x, -2.42, 1.45);
    cabinet.add(buttonBase);
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.17, 32), color);
    button.rotation.x = Math.PI / 2;
    button.position.set(x, -2.42, 1.56);
    cabinet.add(button);
  }
  const startButtonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.2, 36), materials.casing);
  startButtonBase.rotation.x = Math.PI / 2;
  startButtonBase.position.set(0, -2.42, 1.47);
  cabinet.add(startButtonBase);
  const startButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 0.18, 36),
    new THREE.MeshStandardMaterial({
      color: "#c3372e",
      metalness: 0.32,
      roughness: 0.22,
      emissive: "#8f1711",
      emissiveIntensity: 0.38,
    }),
  );
  startButton.rotation.x = Math.PI / 2;
  startButton.position.set(0, -2.42, 1.61);
  cabinet.add(startButton);

  const leverBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.22, 32), materials.trim);
  leverBase.rotation.x = Math.PI / 2;
  leverBase.position.set(3.35, -3.63, 1.35);
  cabinet.add(leverBase);

  const leverPivot = new THREE.Group();
  leverPivot.position.set(3.35, -3.57, 1.48);
  cabinet.add(leverPivot);
  const leverRod = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 1.22, 20), materials.silver);
  leverRod.position.y = 0.6;
  leverPivot.add(leverRod);
  const leverKnob = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 32, 24),
    new THREE.MeshStandardMaterial({
      color: "#bf3028",
      metalness: 0.45,
      roughness: 0.18,
      emissive: "#741713",
      emissiveIntensity: 0.2,
    }),
  );
  leverKnob.position.y = 1.25;
  leverPivot.add(leverKnob);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: "#141113" }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.45;
  scene.add(floor);

  let running = [false, false, false];
  let pulling = false;
  let reducedMotion = false;
  let animationFrame = 0;
  let previousTime = 0;
  let disposed = false;

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const viewHeight = Math.max(12.3, 11.8 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  }

  function animate(time) {
    if (disposed) return;
    animationFrame = 0;
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    reels.forEach(({ reel }, index) => {
      if (running[index] && !reducedMotion) {
        reel.rotation.x += delta * (12 + index * 1.4);
      }
    });

    let effectActive = false;
    stopEffects.forEach(({ ring }, index) => {
      const effect = stopEffects[index];
      if (effect.elapsed < 0 || reducedMotion) {
        ring.material.opacity = 0;
        return;
      }

      effect.elapsed += delta;
      const progress = Math.min(effect.elapsed / 0.64, 1);
      ring.material.opacity = Math.sin(progress * Math.PI) * 0.95;
      ring.scale.setScalar(1 + progress * 0.28);
      if (progress < 1) effectActive = true;
      else effect.elapsed = -1;
    });

    const activeSweep = stopEffects.some(({ elapsed }) => elapsed >= 0);
    if (activeSweep && !reducedMotion) {
      const latestStop = Math.max(...stopEffects.map(({ elapsed }) => elapsed));
      const progress = Math.min(latestStop / 0.54, 1);
      sweep.position.x = -3.75 + progress * 7.5;
      sweep.material.opacity = Math.sin(progress * Math.PI) * 0.9;
      effectActive ||= progress < 1;
    } else {
      sweep.material.opacity = 0;
    }

    leverPivot.rotation.z = reducedMotion
      ? Number(pulling) * 0.52
      : THREE.MathUtils.lerp(leverPivot.rotation.z, pulling ? 0.52 : 0, 0.2);

    renderer.render(scene, camera);
    const leverMoving = Math.abs(leverPivot.rotation.z - (pulling ? 0.52 : 0)) > 0.01;
    if (!reducedMotion && (running.some(Boolean) || pulling || leverMoving || effectActive)) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function requestRender() {
    if (!disposed && animationFrame === 0) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    container.setPointerCapture?.(event.pointerId);
    container.dataset.dragX = String(event.clientX);
  }

  function onPointerMove(event) {
    if (!container.hasPointerCapture?.(event.pointerId)) return;
    const previousX = Number(container.dataset.dragX);
    if (!Number.isFinite(previousX)) return;
    const deltaX = event.clientX - previousX;
    cabinet.rotation.y = THREE.MathUtils.clamp(cabinet.rotation.y + deltaX * 0.006, -0.55, 0.55);
    container.dataset.dragX = String(event.clientX);
    requestRender();
  }

  function onPointerEnd(event) {
    if (container.hasPointerCapture?.(event.pointerId)) container.releasePointerCapture(event.pointerId);
    delete container.dataset.dragX;
    requestRender();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerEnd);
  container.addEventListener("pointercancel", onPointerEnd);
  resize();
  requestRender();

  return {
    update(state) {
      pulling = state.pulling;
      reducedMotion = state.reducedMotion;
      state.shops.forEach((shop, index) => {
        if (!shop?.glyph) return;
        const reel = reels[index];
        if (reel.glyph !== shop.glyph) {
          reel.tiles[0].material.map = createSymbolTexture(shop.glyph);
          reel.tiles[0].material.needsUpdate = true;
          reel.glyph = shop.glyph;
        }
        const title = state.running[index] ? "抽選中…" : shop.name;
        const subtitle = state.running[index]
          ? "まもなく停止"
          : `${shop.genreLabel} ・ ${shop.distanceMeters}m`;
        const resultLabel = resultLabels[index];
        if (resultLabel.title !== title || resultLabel.subtitle !== subtitle) {
          resultLabel.label.material.map?.dispose();
          resultLabel.label.material.map = createResultTexture(title, subtitle);
          resultLabel.label.material.needsUpdate = true;
          resultLabel.title = title;
          resultLabel.subtitle = subtitle;
        }
        if (running[index] && !state.running[index]) {
          reel.reel.rotation.x = 0;
          if (!reducedMotion) stopEffects[index].elapsed = 0;
        }
      });
      running = state.running;
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerEnd);
      container.removeEventListener("pointercancel", onPointerEnd);
      renderer.dispose();

      const geometries = new Set();
      const usedMaterials = new Set();
      const textures = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            usedMaterials.add(material);
            if (material.map) textures.add(material.map);
          }
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of usedMaterials) material.dispose();
      for (const texture of textures) texture.dispose();
      symbolTextureCache.clear();
      container.replaceChildren();
    },
  };
}
