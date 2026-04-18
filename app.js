import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/webxr/ARButton.js";

const ROUND_DURATION = 30;
const STORAGE_KEY = "food-archery-ar-leaderboard";
const FOOD_SET = [
  { kind: "apple", type: "normal", points: 10, color: "#ee5f45", label: "Apple" },
  { kind: "orange", type: "normal", points: 10, color: "#ff9f1c", label: "Orange" },
  { kind: "banana", type: "normal", points: 10, color: "#ffd166", label: "Banana" },
  { kind: "watermelon", type: "normal", points: 10, color: "#ff6b6b", label: "Watermelon" },
  { kind: "pineapple", type: "normal", points: 10, color: "#f4b942", label: "Pineapple" },
  { kind: "strawberry", type: "normal", points: 10, color: "#ff4d6d", label: "Strawberry" },
  { kind: "golden-apple", type: "special", points: 50, color: "#ffe066", label: "Golden Fruit" },
  { kind: "burnt", type: "bad", points: -10, color: "#ff655f", label: "Burnt Fruit" },
];

const rewardProfiles = {
  standard: {
    list: [
      "0-49: Thanks for playing",
      "50-99: Free dip or add-on",
      "100-149: Drink unlock on bills above Rs 500",
      "150+: Dessert unlock on bills above Rs 750",
      "Golden hit: Surprise garlic bread voucher",
    ],
    reward(score, goldenHit) {
      if (goldenHit && score >= 60) return "Golden Burger reward: garlic bread voucher unlocked.";
      if (score >= 150) return "Dessert unlock on bills above Rs 750.";
      if (score >= 100) return "Drink unlock on bills above Rs 500.";
      if (score >= 50) return "Free dip or add-on unlocked.";
      return "No reward this round.";
    },
  },
  family: {
    list: [
      "0-39: Thanks for playing",
      "40-89: Kids topping or dip",
      "90-139: Mocktail add-on on bills above Rs 400",
      "140+: Dessert sharing unlock",
      "Golden hit: Surprise party perk",
    ],
    reward(score, goldenHit) {
      if (goldenHit && score >= 50) return "Golden hit reward: surprise family add-on unlocked.";
      if (score >= 140) return "Dessert sharing unlock.";
      if (score >= 90) return "Mocktail add-on on bills above Rs 400.";
      if (score >= 40) return "Kids topping or dip unlocked.";
      return "No reward this round.";
    },
  },
  premium: {
    list: [
      "0-59: Thanks for playing",
      "60-109: Chef dip or amuse bite",
      "110-169: Signature drink unlock on bills above Rs 700",
      "170+: Dessert course unlock on bills above Rs 1000",
      "Golden hit: Limited chef special reveal",
    ],
    reward(score, goldenHit) {
      if (goldenHit && score >= 70) return "Golden hit reward: limited chef special reveal unlocked.";
      if (score >= 170) return "Dessert course unlock on bills above Rs 1000.";
      if (score >= 110) return "Signature drink unlock on bills above Rs 700.";
      if (score >= 60) return "Chef dip or amuse bite unlocked.";
      return "No reward this round.";
    },
  },
};

const ui = {
  introCard: document.getElementById("intro-card"),
  overlay: document.getElementById("overlay-ui"),
  startAr: document.getElementById("start-ar"),
  supportNote: document.getElementById("support-note"),
  playerName: document.getElementById("player-name"),
  tableNumber: document.getElementById("table-number"),
  rewardProfile: document.getElementById("reward-profile"),
  rewardList: document.getElementById("reward-list"),
  hudPlayer: document.getElementById("hud-player"),
  hudTimer: document.getElementById("hud-timer"),
  hudScore: document.getElementById("hud-score"),
  hudCombo: document.getElementById("hud-combo"),
  statusLine: document.getElementById("status-line"),
  detailLine: document.getElementById("detail-line"),
  resultsSheet: document.getElementById("results-sheet"),
  resultsHeading: document.getElementById("results-heading"),
  resultsSummary: document.getElementById("results-summary"),
  finalScore: document.getElementById("final-score"),
  finalAccuracy: document.getElementById("final-accuracy"),
  finalCombo: document.getElementById("final-combo"),
  rewardBanner: document.getElementById("reward-banner"),
  leaderboardList: document.getElementById("leaderboard-list"),
  tableLabel: document.getElementById("table-label"),
  playAgain: document.getElementById("play-again"),
  endSession: document.getElementById("end-session"),
  archeryControls: document.getElementById("archery-controls"),
  bowWidget: document.getElementById("bow-widget"),
  bowString: document.getElementById("bow-string"),
  arrowShaft: document.getElementById("arrow-shaft"),
  drawButton: document.getElementById("draw-button"),
};

const state = {
  profile: "standard",
  playerName: "Guest Archer",
  tableNumber: "5",
  score: 0,
  combo: 0,
  bestCombo: 0,
  shots: 0,
  hits: 0,
  goldenHit: false,
  placed: false,
  running: false,
  timeLeft: ROUND_DURATION,
  lastTick: 0,
  battlefield: null,
  targets: [],
  reticleVisible: false,
  hitTestSource: null,
  localSpace: null,
  hitTestRequested: false,
  session: null,
  drawing: false,
  drawStart: 0,
  charge: 0,
};

let scene;
let camera;
let renderer;
let controller;
let reticle;
let battleRing;
let placementGlow;
let timerHandle = null;

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.inset = "0";
  document.body.appendChild(renderer.domElement);
}

function createScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);

  const ambient = new THREE.HemisphereLight(0xffffff, 0xbb9980, 1.25);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(0.5, 2, 0.25);
  scene.add(directional);
}

function createReticle() {
  const ring = new THREE.RingGeometry(0.07, 0.09, 40);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffbf69,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  reticle = new THREE.Mesh(ring, material);
  reticle.rotation.x = -Math.PI / 2;
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

function createBattlefield() {
  state.battlefield = new THREE.Group();

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.02, 48),
    new THREE.MeshStandardMaterial({
      color: 0x4a2d16,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    }),
  );
  platform.position.y = 0.01;
  state.battlefield.add(platform);

  battleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.26, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffcf8a,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    }),
  );
  battleRing.rotation.x = -Math.PI / 2;
  battleRing.position.y = 0.022;
  state.battlefield.add(battleRing);

  placementGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 40),
    new THREE.MeshBasicMaterial({
      color: 0xff9f1c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  placementGlow.rotation.x = -Math.PI / 2;
  placementGlow.position.y = 0.021;
  state.battlefield.add(placementGlow);
}

function drawApple(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(98, 140, 42, 0, Math.PI * 2);
  ctx.arc(156, 140, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(96, 118, 62, 52);
  ctx.fillStyle = "#6f3d24";
  ctx.fillRect(121, 54, 10, 34);
  ctx.fillStyle = "#62a85d";
  ctx.beginPath();
  ctx.ellipse(150, 72, 26, 14, -0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrange(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(128, 132, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 3;
  for (let index = 0; index < 6; index += 1) {
    ctx.beginPath();
    ctx.moveTo(128, 132);
    const angle = (Math.PI * 2 * index) / 6;
    ctx.lineTo(128 + Math.cos(angle) * 52, 132 + Math.sin(angle) * 52);
    ctx.stroke();
  }
  ctx.fillStyle = "#6ebf63";
  ctx.beginPath();
  ctx.ellipse(128, 70, 20, 10, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawBanana(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(126, 126, 58, 0.3, 2.5, true);
  ctx.stroke();
  ctx.strokeStyle = "#d3aa2f";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(126, 126, 58, 0.32, 2.48, true);
  ctx.stroke();
}

function drawWatermelon(ctx, color) {
  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.arc(128, 148, 64, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.beginPath();
  ctx.arc(128, 148, 54, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(128, 148, 46, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c1a14";
  [92, 112, 128, 146, 164].forEach((x) => {
    ctx.beginPath();
    ctx.ellipse(x, 132, 4, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPineapple(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(128, 146, 44, 56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b27a19";
  ctx.lineWidth = 4;
  for (let offset = -42; offset <= 42; offset += 16) {
    ctx.beginPath();
    ctx.moveTo(84 + Math.max(0, offset), 102 - Math.min(0, offset));
    ctx.lineTo(172 + Math.min(0, offset), 190 + Math.max(0, offset));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(84 + Math.max(0, offset), 190 + Math.min(0, offset));
    ctx.lineTo(172 + Math.min(0, offset), 102 - Math.max(0, offset));
    ctx.stroke();
  }
  ctx.fillStyle = "#4f9e46";
  [[128, 52], [110, 68], [146, 68], [96, 86], [160, 86]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(128, 96);
    ctx.lineTo(x, y);
    ctx.lineTo(x + (x < 128 ? -8 : 8), y + 24);
    ctx.closePath();
    ctx.fill();
  });
}

function drawStrawberry(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(128, 76);
  ctx.bezierCurveTo(184, 84, 190, 156, 128, 194);
  ctx.bezierCurveTo(66, 156, 72, 84, 128, 76);
  ctx.fill();
  ctx.fillStyle = "#59a857";
  for (let index = 0; index < 6; index += 1) {
    const angle = -0.9 + index * 0.36;
    ctx.beginPath();
    ctx.moveTo(128, 88);
    ctx.lineTo(128 + Math.cos(angle) * 34, 62 + Math.sin(angle) * 16);
    ctx.lineTo(128 + Math.cos(angle + 0.22) * 20, 98 + Math.sin(angle) * 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffd166";
  [[108, 114], [128, 108], [146, 118], [98, 136], [120, 138], [142, 144], [110, 160], [132, 164], [150, 160]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGoldenApple(ctx, color) {
  drawApple(ctx, color);
  ctx.strokeStyle = "#fff5b1";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 136, 64, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBurnt(ctx) {
  ctx.fillStyle = "#2b1f1b";
  ctx.beginPath();
  ctx.arc(128, 132, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a463d";
  ctx.lineWidth = 4;
  for (let index = 0; index < 7; index += 1) {
    ctx.beginPath();
    ctx.moveTo(86 + index * 10, 92);
    ctx.lineTo(98 + index * 11, 176);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ff7b00";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(108, 70);
  ctx.lineTo(120, 48);
  ctx.lineTo(132, 76);
  ctx.lineTo(144, 42);
  ctx.lineTo(154, 72);
  ctx.stroke();
}

function makeLabelTexture(kind, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(24, 15, 9, 0.18)";
  ctx.beginPath();
  ctx.arc(128, 128, 102, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();
  switch (kind) {
    case "apple":
      drawApple(ctx, color);
      break;
    case "orange":
      drawOrange(ctx, color);
      break;
    case "banana":
      drawBanana(ctx, color);
      break;
    case "watermelon":
      drawWatermelon(ctx, color);
      break;
    case "pineapple":
      drawPineapple(ctx, color);
      break;
    case "strawberry":
      drawStrawberry(ctx, color);
      break;
    case "golden-apple":
      drawGoldenApple(ctx, color);
      break;
    default:
      drawBurnt(ctx);
  }
  return new THREE.CanvasTexture(canvas);
}

function createTarget(definition) {
  const texture = makeLabelTexture(definition.kind, definition.color);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.11, 0.11, 0.11);
  sprite.userData = {
    type: definition.type,
    points: definition.points,
    bobOffset: Math.random() * Math.PI * 2,
    orbitRadius: 0.1 + Math.random() * 0.08,
    orbitSpeed: 0.7 + Math.random() * 0.8,
    orbitAngle: Math.random() * Math.PI * 2,
    baseHeight: 0.11 + Math.random() * 0.07,
    label: definition.label,
  };
  state.battlefield.add(sprite);
  state.targets.push(sprite);
  return sprite;
}

function populateTargets() {
  clearTargets();
  for (let index = 0; index < 5; index += 1) {
    createTarget(FOOD_SET[index % 6]);
  }
  createTarget(FOOD_SET[7]);
  maybeSpawnGolden();
}

function clearTargets() {
  state.targets.forEach((target) => {
    if (target.material.map) target.material.map.dispose();
    target.material.dispose();
    state.battlefield.remove(target);
  });
  state.targets = [];
}

function maybeSpawnGolden() {
  if (state.targets.some((target) => target.userData.type === "special")) return;
  if (Math.random() < 0.55) {
    createTarget(FOOD_SET[6]);
  }
}

function updateTargetMotion(elapsed) {
  state.targets.forEach((target, index) => {
    const angle = target.userData.orbitAngle + elapsed * target.userData.orbitSpeed + index * 0.75;
    const radius = target.userData.orbitRadius;
    target.position.set(
      Math.cos(angle) * radius,
      target.userData.baseHeight + Math.sin(elapsed * 2.2 + target.userData.bobOffset) * 0.015,
      Math.sin(angle) * radius * 0.62,
    );
  });

  if (battleRing) {
    battleRing.rotation.z += 0.004;
  }

  if (placementGlow) {
    placementGlow.material.opacity = 0.12 + (Math.sin(elapsed * 2.8) + 1) * 0.06;
  }
}

function updateRewardList() {
  ui.rewardList.innerHTML = "";
  rewardProfiles[state.profile].list.forEach((line) => {
    const li = document.createElement("li");
    const pieces = line.split(":");
    if (pieces.length > 1) {
      li.innerHTML = `<strong>${pieces[0]}:</strong>${pieces.slice(1).join(":")}`;
    } else {
      li.textContent = line;
    }
    ui.rewardList.appendChild(li);
  });
}

function updateHud() {
  ui.hudPlayer.textContent = state.playerName;
  ui.hudTimer.textContent = String(state.timeLeft);
  ui.hudScore.textContent = String(state.score);
  ui.hudCombo.textContent = `x${state.combo}`;
}

function setStatus(line, detail) {
  ui.statusLine.textContent = line;
  ui.detailLine.textContent = detail;
}

function resetRound() {
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.shots = 0;
  state.hits = 0;
  state.goldenHit = false;
  state.timeLeft = ROUND_DURATION;
  state.lastTick = performance.now();
  ui.resultsSheet.classList.add("hidden");
  updateHud();
}

function beginRound() {
  resetRound();
  populateTargets();
  state.running = true;
  setStatus("Round live.", "Hold the draw button to stretch the bow, then release to fire through the center reticle.");
  window.clearInterval(timerHandle);
  timerHandle = window.setInterval(() => {
    if (!state.running) return;
    state.timeLeft -= 1;
    updateHud();
    if (state.timeLeft <= 0) {
      finishRound();
    }
  }, 1000);
}

function finishRound() {
  state.running = false;
  window.clearInterval(timerHandle);
  maybeSpawnGolden();
  const accuracy = state.shots === 0 ? 0 : Math.round((state.hits / state.shots) * 100);
  const reward = rewardProfiles[state.profile].reward(state.score, state.goldenHit);
  ui.resultsHeading.textContent = state.score >= 150 ? "Dessert-tier accuracy." : state.score >= 100 ? "High-value round." : state.score >= 50 ? "Reward unlocked." : "Round complete.";
  ui.resultsSummary.textContent =
    state.score >= 150
      ? "Excellent control. The bow-draw interaction feels more physical while still staying quick enough for a restaurant table."
      : state.score >= 100
        ? "Strong result. The guided AR loop feels tactile, replayable, and still meaningful for upsell."
        : state.score >= 50
          ? "Nice balance. Guests can feel progress quickly and still want another shot."
          : "The session stayed short and understandable, but there is room to improve accuracy.";
  ui.finalScore.textContent = String(state.score);
  ui.finalAccuracy.textContent = `${accuracy}%`;
  ui.finalCombo.textContent = `x${state.bestCombo}`;
  ui.rewardBanner.textContent = reward;
  ui.tableLabel.textContent = `Table ${state.tableNumber}`;
  ui.resultsSheet.classList.remove("hidden");
  saveLeaderboard({ player: state.playerName, table: state.tableNumber, score: state.score });
  renderLeaderboard();
  setStatus("Round complete.", "Tap Play again to start another 30-second AR round on the same table.");
}

function saveLeaderboard(entry) {
  const leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard.slice(0, 8)));
}

function renderLeaderboard() {
  ui.leaderboardList.innerHTML = "";
  const leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (leaderboard.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No scores yet. Start the first AR round.";
    ui.leaderboardList.appendChild(item);
    return;
  }
  leaderboard.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.player} at Table ${entry.table}: ${entry.score} pts`;
    ui.leaderboardList.appendChild(item);
  });
}

function removeTarget(target) {
  state.targets = state.targets.filter((item) => item !== target);
  if (target.material.map) target.material.map.dispose();
  target.material.dispose();
  state.battlefield.remove(target);
}

function scoreTarget(target) {
  const { type, points } = target.userData;
  if (type === "bad") {
    state.combo = 0;
    state.score = Math.max(0, state.score + points);
    setStatus("Burnt food hit.", "That target subtracts points and resets the combo.");
  } else {
    state.combo += 1;
    state.hits += 1;
    if (type === "special") {
      state.goldenHit = true;
      setStatus("Golden fruit hit.", "Special reward trigger secured.");
    } else {
      setStatus(`${target.userData.label} hit.`, "Keep the center ring steady and chain the next target.");
    }

    let total = points;
    if (state.combo > 0 && state.combo % 3 === 0) {
      total += 25;
      setStatus("Combo bonus.", "Three-hit streak adds an extra 25 points.");
    }
    state.score += total;
  }

  state.bestCombo = Math.max(state.bestCombo, state.combo);
  updateHud();
  removeTarget(target);
  if (state.targets.filter((item) => item.userData.type === "normal").length < 4) {
    createTarget(FOOD_SET[Math.floor(Math.random() * 6)]);
  }
  if (!state.targets.some((item) => item.userData.type === "bad")) {
    createTarget(FOOD_SET[7]);
  }
  maybeSpawnGolden();
}

const raycaster = new THREE.Raycaster();

function shoot() {
  if (!state.running || !state.placed) return;

  state.shots += 1;
  releaseBowVisual();
  const xrCamera = renderer.xr.getCamera(camera);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), xrCamera);
  const hits = raycaster.intersectObjects(state.targets, false);

  if (hits.length > 0) {
    scoreTarget(hits[0].object);
    return;
  }

  let bestTarget = null;
  let bestAngle = 0.09;
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  origin.setFromMatrixPosition(xrCamera.matrixWorld);
  xrCamera.getWorldDirection(direction);

  state.targets.forEach((target) => {
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    const toTarget = worldPos.sub(origin).normalize();
    const angle = direction.angleTo(toTarget);
    if (angle < bestAngle) {
      bestAngle = angle;
      bestTarget = target;
    }
  });

  if (bestTarget) {
    scoreTarget(bestTarget);
  } else {
    state.combo = 0;
    updateHud();
    setStatus("Missed shot.", "Let the floating food drift closer to the center before tapping.");
  }
}

function updateBowVisual() {
  const clamped = Math.max(0, Math.min(1, state.charge));
  ui.bowWidget.style.setProperty("--charge-level", clamped.toFixed(2));
  if (clamped > 0.02) {
    ui.bowWidget.classList.add("drawing");
  } else {
    ui.bowWidget.classList.remove("drawing");
  }
}

function releaseBowVisual() {
  ui.bowWidget.classList.remove("drawing");
  ui.bowWidget.classList.remove("firing");
  void ui.bowWidget.offsetWidth;
  ui.bowWidget.classList.add("firing");
  ui.bowWidget.style.setProperty("--charge-level", "0");
  state.charge = 0;
  window.setTimeout(() => {
    ui.bowWidget.classList.remove("firing");
  }, 260);
}

function updateDrawCharge() {
  if (!state.drawing) return;
  const elapsed = performance.now() - state.drawStart;
  state.charge = Math.min(elapsed / 650, 1);
  updateBowVisual();
  window.requestAnimationFrame(updateDrawCharge);
}

function startDraw() {
  if (!state.running || !state.placed || state.drawing) return;
  state.drawing = true;
  state.drawStart = performance.now();
  state.charge = 0.01;
  updateBowVisual();
  updateDrawCharge();
  setStatus("Bow drawn.", "Release the button to shoot with a stretched bow feel.");
}

function endDraw() {
  if (!state.drawing) return;
  state.drawing = false;
  shoot();
}

function placeBattlefield() {
  if (!reticle.visible || state.placed) return;
  state.battlefield.visible = true;
  state.battlefield.position.setFromMatrixPosition(reticle.matrix);
  const rotation = new THREE.Quaternion();
  rotation.setFromRotationMatrix(reticle.matrix);
  state.battlefield.quaternion.copy(rotation);
  state.battlefield.rotateX(-Math.PI / 2);
  state.placed = true;
  beginRound();
}

function onSelect() {
  if (!state.placed) {
    placeBattlefield();
  } else {
    shoot();
  }
}

function setupController() {
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);
}

async function requestHitTestSource(session) {
  if (state.hitTestRequested) return;
  state.hitTestRequested = true;
  const viewerSpace = await session.requestReferenceSpace("viewer");
  state.hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  state.localSpace = await session.requestReferenceSpace("local");

  session.addEventListener("end", () => {
    state.hitTestRequested = false;
    state.hitTestSource = null;
    state.localSpace = null;
    state.session = null;
    state.running = false;
    state.placed = false;
    window.clearInterval(timerHandle);
    clearTargets();
    if (state.battlefield) state.battlefield.visible = false;
    ui.overlay.classList.add("hidden");
    ui.resultsSheet.classList.add("hidden");
    ui.introCard.classList.remove("hidden");
    document.body.classList.remove("xr-active");
    ui.bowWidget.style.setProperty("--charge-level", "0");
    setStatus("Scan the table to find a surface.", "Move the phone slowly. Once the reticle appears, tap to place the battlefield.");
  });
}

function handleHitTest(frame) {
  if (!state.hitTestSource || !state.localSpace) return;
  const hitTestResults = frame.getHitTestResults(state.hitTestSource);

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const pose = hit.getPose(state.localSpace);
    reticle.visible = true;
    reticle.matrix.fromArray(pose.transform.matrix);
    state.reticleVisible = true;
    if (!state.placed) {
      setStatus("Surface found.", "Tap once to place the battlefield on the table.");
    }
  } else {
    reticle.visible = false;
    state.reticleVisible = false;
    if (!state.placed) {
      setStatus("Scanning for table surface.", "Move the phone slowly and keep the camera pointed at the tabletop.");
    }
  }
}

function onSessionStarted() {
  state.session = renderer.xr.getSession();
  document.body.classList.add("xr-active");
  ui.introCard.classList.add("hidden");
  ui.overlay.classList.remove("hidden");
  ui.resultsSheet.classList.add("hidden");
  setStatus("Scan the table to find a surface.", "Move the phone slowly. Once the reticle appears, tap to place the battlefield.");
}

function createArButton() {
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay", "light-estimation"],
    domOverlay: { root: document.body },
  });

  button.id = "ar-launch-helper";
  button.style.display = "none";
  document.body.appendChild(button);
  return button;
}

function initThree() {
  createRenderer();
  createScene();
  createReticle();
  createBattlefield();
  state.battlefield.visible = false;
  scene.add(state.battlefield);
  setupController();

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame && state.session !== renderer.xr.getSession()) {
      state.session = renderer.xr.getSession();
    }

    const session = renderer.xr.getSession();
    if (session) {
      requestHitTestSource(session).catch(() => {
        setStatus("AR permission issue.", "This browser started AR but could not initialize surface hit testing.");
      });
      handleHitTest(frame);
    }

    updateTargetMotion(timestamp * 0.001);
    renderer.render(scene, camera);
  });
}

function checkSupport() {
  if (!navigator.xr) {
    ui.supportNote.textContent = "WebXR is not available in this browser. Use a supported AR-capable mobile browser over HTTPS.";
    ui.startAr.disabled = true;
    return;
  }

  navigator.xr.isSessionSupported("immersive-ar")
    .then((supported) => {
      if (!supported) {
        ui.supportNote.textContent = "This device/browser does not report immersive AR support. Chrome on supported Android devices works best.";
        ui.startAr.disabled = true;
      }
    })
    .catch(() => {
      ui.supportNote.textContent = "Unable to verify AR support in this browser.";
      ui.startAr.disabled = true;
    });
}

function initEvents() {
  const hiddenArButton = createArButton();

  renderer.xr.addEventListener("sessionstart", onSessionStarted);

  ui.rewardProfile.addEventListener("change", () => {
    state.profile = ui.rewardProfile.value;
    updateRewardList();
  });

  ui.startAr.addEventListener("click", () => {
    state.playerName = ui.playerName.value.trim() || "Guest Archer";
    state.tableNumber = ui.tableNumber.value.trim() || "5";
    state.profile = ui.rewardProfile.value;
    updateHud();
    hiddenArButton.click();
  });

  ui.playAgain.addEventListener("click", () => {
    ui.resultsSheet.classList.add("hidden");
    if (state.placed) {
      beginRound();
    }
  });

  ui.endSession.addEventListener("click", () => {
    const session = renderer.xr.getSession();
    if (session) {
      session.end();
    }
  });

  ui.drawButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    ui.drawButton.setPointerCapture(event.pointerId);
    startDraw();
  });

  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach((eventName) => {
    ui.drawButton.addEventListener(eventName, (event) => {
      event.preventDefault();
      endDraw();
    });
  });

  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

renderLeaderboard();
updateRewardList();
initThree();
initEvents();
checkSupport();
