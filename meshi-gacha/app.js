const searchButton = document.querySelector("#searchButton");
const manualLocationForm = document.querySelector("#manualLocationForm");
const manualLocationInput = document.querySelector("#manualLocationInput");
const manualSearchButton = document.querySelector("#manualSearchButton");
const manualLocationError = document.querySelector("#manualLocationError");
const locationStatus = document.querySelector("#locationStatus");
const apiStatus = document.querySelector("#apiStatus");
const statusDot = document.querySelector("#statusDot");
const questionScreen = document.querySelector("#questionScreen");
const resultsScreen = document.querySelector("#resultsScreen");
const slotMachine = document.querySelector("#slotMachine");
const slotStatus = document.querySelector("#slotStatus");
const backToQuestionsButton = document.querySelector("#backToQuestionsButton");
const previousQuestionButton = document.querySelector("#previousQuestionButton");
const rerollButton = document.querySelector("#rerollButton");
const questionTitle = document.querySelector("#questionTitle");
const questionStepLabel = document.querySelector("#questionStepLabel");
const preferencesTitle = document.querySelector("#preferencesTitle");
const questionSteps = [...document.querySelectorAll("[data-question-step]")];
const stepLights = [...document.querySelectorAll("[data-step-light]")];
const izakayaPreferences = document.querySelector("#izakayaPreferences");
const resultMessage = document.querySelector("#resultMessage");
const resultCount = document.querySelector("#resultCount");
const resultContext = document.querySelector("#resultContext");
const slotReels = document.querySelector("#slotReels");
const shopDetailsSection = document.querySelector("#shopDetailsSection");
const shopGrid = document.querySelector("#shopGrid");
const rangeButtons = [...document.querySelectorAll("[data-range]")];
const genreButtons = [...document.querySelectorAll("[data-genre]")];
const budgetButtons = [...document.querySelectorAll("[data-budget]")];
const moodButtons = [...document.querySelectorAll("[data-mood]")];
const cuisineButtons = [...document.querySelectorAll("[data-cuisine]")];

let apiConfigured = false;
let isLocating = false;
let isSearching = false;
let selectedRange = 3;
let selectedGenre = "izakaya";
let selectedBudget = "under3000";
const selectedMoods = new Set();
const selectedCuisines = new Set();
let currentPosition = null;
let currentQuestionStep = 1;
let candidatePool = [];
let previousDrawIds = new Set();

function updateSearchControls() {
  searchButton.disabled = !apiConfigured || isLocating || isSearching;
  manualSearchButton.disabled = !apiConfigured || isSearching;
  searchButton.querySelector("span").textContent = isLocating
    ? "現在地を確認しています"
    : "めしガチャを回す";
}

function setApiState(configured) {
  apiConfigured = configured;
  apiStatus.textContent = configured ? "API接続済み" : "API未接続";
  statusDot.classList.toggle("is-ready", configured);
  if (!configured) locationStatus.textContent = "サーバー起動時に API キーを設定してください。";
  updateSearchControls();
}

function showScreen(screen) {
  const showResults = screen === "results";
  questionScreen.classList.toggle("is-hidden", showResults);
  resultsScreen.classList.toggle("is-hidden", !showResults);
  window.scrollTo(0, 0);
}

function getQuestionStepCount() {
  return 3;
}

function updateQuestionStep() {
  const stepCount = getQuestionStepCount();
  const isIzakaya = selectedGenre === "izakaya";
  const labels = ["ジャンルを選んで", "予算を決めて", isIzakaya ? "居酒屋の好みは？" : "検索範囲を決めて"];
  const stepNames = ["ジャンル", "予算", isIzakaya ? "好み" : "範囲"];
  const isLastStep = currentQuestionStep === stepCount;

  questionSteps.forEach((step) => {
    step.classList.toggle("is-hidden", Number(step.dataset.questionStep) !== currentQuestionStep);
  });
  questionTitle.textContent = labels[currentQuestionStep - 1];
  questionStepLabel.textContent = `STEP ${currentQuestionStep} / ${stepCount} ・${stepNames[currentQuestionStep - 1]}`;
  preferencesTitle.textContent = isIzakaya ? "どんな居酒屋にする？" : "検索範囲を選んで";
  izakayaPreferences.classList.toggle("is-hidden", !isIzakaya);
  previousQuestionButton.classList.toggle("is-hidden", currentQuestionStep === 1);
  searchButton.classList.toggle("is-hidden", !isLastStep);
  questionScreen.classList.toggle("has-navigation", currentQuestionStep > 1);
  stepLights.forEach((light) => {
    const stepNumber = Number(light.dataset.stepLight);
    light.classList.toggle("is-current", stepNumber === currentQuestionStep);
    light.classList.toggle("is-complete", stepNumber < currentQuestionStep);
    light.classList.toggle("is-hidden", stepNumber > stepCount);
  });
  window.scrollTo(0, 0);
}

function startGacha() {
  if (currentPosition) searchAt(currentPosition);
  else requestCurrentLocation(true);
}

async function checkApiStatus() {
  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    apiStatus.textContent = "検索サーバー未接続";
    locationStatus.textContent = window.location.hostname.endsWith(".github.io")
      ? "GitHub Pagesでは店舗検索を利用できません。検索にはローカルサーバーが必要です。"
      : "このページでは店舗検索を利用できません。検索にはローカルサーバーが必要です。";
    updateSearchControls();
    return;
  }

  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const status = await response.json();
    setApiState(Boolean(status.configured));
  } catch {
    apiStatus.textContent = "サーバー未接続";
    locationStatus.textContent = "ローカルサーバーに接続できません。server.ps1 を起動してください。";
    updateSearchControls();
  }
}

function showMessage(message, kind = "info") {
  slotReels.replaceChildren();
  shopGrid.replaceChildren();
  shopDetailsSection.classList.add("is-hidden");
  resultMessage.classList.remove("is-hidden");
  resultMessage.dataset.kind = kind;
  resultMessage.querySelector("p").textContent = message;
  resultCount.textContent = "--";
}

function getDistanceInMeters(shop, origin) {
  const latitude = Number(shop.lat);
  const longitude = Number(shop.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = radians(latitude - origin.latitude);
  const deltaLongitude = radians(longitude - origin.longitude);
  const arc = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(origin.latitude)) * Math.cos(radians(latitude)) *
    Math.sin(deltaLongitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function formatDistance(meters) {
  if (meters === null) return "距離不明";
  return meters < 1000 ? `${Math.round(meters / 10) * 10}m` : `${(meters / 1000).toFixed(1)}km`;
}

const cuisineKeywords = {
  chinese: ["中華", "中国料理", "餃子", "点心"],
  yakitori: ["焼き鳥", "焼鳥", "焼きとり", "鶏料理", "鳥料理"],
  seafood: ["海鮮", "魚介", "鮮魚", "刺身"],
  kushikatsu: ["串揚げ", "串カツ", "串かつ"],
  washoku: ["和食", "割烹", "天ぷら", "おでん"],
};

function isAvailable(value) {
  if (value === true || value === 1) return true;
  return /あり|有り|利用可|営業している/.test(String(value || ""));
}

function getPreferenceScore(shop) {
  if (selectedGenre !== "izakaya") return 0;

  const searchableText = [
    shop.name,
    shop.catch,
    shop.genre?.name,
    shop.genre?.catch,
    shop.sub_genre?.name,
    shop.sub_genre?.catch,
  ].filter(Boolean).join(" ");
  let score = 0;

  for (const cuisine of selectedCuisines) {
    if (cuisineKeywords[cuisine]?.some((keyword) => searchableText.includes(keyword))) score += 5;
  }

  if (selectedMoods.has("calm")) {
    score += [shop.private_room, shop.horigotatsu, shop.tatami, shop.night_view]
      .filter(isAvailable).length * 2;
  }
  if (selectedMoods.has("lively")) {
    if (Number(shop.party_capacity) >= 20) score += 3;
    if (isAvailable(shop.free_drink)) score += 2;
    if (isAvailable(shop.course)) score += 1;
    if (isAvailable(shop.midnight) || isAvailable(shop.midnight_meal)) score += 1;
  }
  return score;
}

function safeImageUrl(shop) {
  const candidate = shop.photo?.pc?.m || shop.photo?.pc?.l || shop.photo?.pc?.s;
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeShopUrl(shop) {
  const candidate = shop.urls?.pc;
  if (!candidate) return "https://www.hotpepper.jp/";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname.endsWith("hotpepper.jp") ? url.href : "https://www.hotpepper.jp/";
  } catch {
    return "https://www.hotpepper.jp/";
  }
}

function addTextLine(container, symbol, text) {
  if (!text) return;
  const line = document.createElement("div");
  line.className = "shop-detail-line";
  const icon = document.createElement("span");
  icon.className = "detail-symbol";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = symbol;
  const value = document.createElement("span");
  value.textContent = text;
  line.append(icon, value);
  container.append(line);
}

function createShopCard(shop, origin, index) {
  const article = document.createElement("article");
  article.className = "shop-card";
  article.style.animationDelay = `${Math.min(index, 8) * 45}ms`;

  const photoWrap = document.createElement("div");
  photoWrap.className = "shop-photo-wrap";
  const photoUrl = safeImageUrl(shop);
  if (photoUrl) {
    const image = document.createElement("img");
    image.className = "shop-photo";
    image.src = photoUrl;
    image.alt = `${shop.name}の店舗写真`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = "PHOTO";
      image.replaceWith(placeholder);
    }, { once: true });
    photoWrap.append(image);
    const credit = document.createElement("span");
    credit.className = "photo-credit";
    credit.textContent = "画像提供：ホットペッパー グルメ";
    photoWrap.append(credit);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "photo-placeholder";
    placeholder.textContent = "NO PHOTO";
    photoWrap.append(placeholder);
  }

  const distance = getDistanceInMeters(shop, origin);
  const distanceBadge = document.createElement("span");
  distanceBadge.className = "distance-badge";
  distanceBadge.textContent = formatDistance(distance);
  photoWrap.append(distanceBadge);

  const body = document.createElement("div");
  body.className = "shop-card-body";

  const meta = document.createElement("div");
  meta.className = "shop-meta";
  const genre = document.createElement("span");
  genre.className = "genre-label";
  genre.textContent = shop.genre?.name || "グルメ";
  const divider = document.createElement("span");
  divider.className = "meta-divider";
  divider.textContent = "/";
  const station = document.createElement("span");
  station.textContent = shop.station_name || "近隣エリア";
  meta.append(genre, divider, station);

  const name = document.createElement("h3");
  name.className = "shop-name";
  name.textContent = shop.name || "店名未掲載";

  const catchCopy = document.createElement("p");
  catchCopy.className = "shop-catch";
  catchCopy.textContent = shop.catch || shop.genre?.catch || shop.address || "詳細は店舗ページをご確認ください。";

  const details = document.createElement("div");
  details.className = "shop-details";
  addTextLine(details, "〒", shop.address);
  addTextLine(details, "￥", shop.budget?.average || shop.budget?.name);
  addTextLine(details, "↗", shop.access);

  const link = document.createElement("a");
  link.className = "shop-link";
  link.href = safeShopUrl(shop);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "お店の詳細";
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  link.append(arrow);

  body.append(meta, name, catchCopy, details, link);
  article.append(photoWrap, body);
  return article;
}

function createReelCell(shop, origin, index) {
  const reel = document.createElement("article");
  reel.className = "slot-reel-cell slot-waiting";
  reel.style.animationDelay = `${index * 45}ms`;

  const imageFrame = document.createElement("div");
  imageFrame.className = "reel-image-frame";
  const photoUrl = safeImageUrl(shop);
  if (photoUrl) {
    const image = document.createElement("img");
    image.className = "reel-image";
    image.src = photoUrl;
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      const symbol = document.createElement("span");
      symbol.className = "reel-symbol";
      symbol.textContent = shop.genre?.name?.slice(0, 1) || "店";
      image.replaceWith(symbol);
    }, { once: true });
    imageFrame.append(image);
  } else {
    const symbol = document.createElement("span");
    symbol.className = "reel-symbol";
    symbol.textContent = shop.genre?.name?.slice(0, 1) || "店";
    imageFrame.append(symbol);
  }

  const genre = document.createElement("span");
  genre.className = "reel-genre";
  genre.textContent = shop.genre?.name || "グルメ";

  const name = document.createElement("h2");
  name.className = "reel-shop-name";
  name.textContent = shop.name || "店名未掲載";

  const station = document.createElement("p");
  station.className = "reel-station";
  station.textContent = shop.station_name || "近隣のお店";

  const distance = document.createElement("span");
  distance.className = "reel-distance";
  distance.textContent = formatDistance(getDistanceInMeters(shop, origin));

  reel.append(imageFrame, genre, name, station, distance);
  return reel;
}

function drawThreeShops() {
  const drawPool = candidatePool.length > 3
    ? candidatePool.filter(({ id }) => !previousDrawIds.has(id))
    : candidatePool;
  const available = drawPool.length >= 3 ? drawPool : candidatePool;
  const remaining = [...available];
  const drawn = [];

  while (remaining.length && drawn.length < 3) {
    const weights = remaining.map(({ score }) => 1 + Math.min(score, 12) * 0.5);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = Math.random() * totalWeight;
    let selectedIndex = remaining.length - 1;
    for (let index = 0; index < weights.length; index++) {
      pick -= weights[index];
      if (pick < 0) {
        selectedIndex = index;
        break;
      }
    }
    drawn.push(remaining.splice(selectedIndex, 1)[0]);
  }

  previousDrawIds = new Set(drawn.map(({ id }) => id));
  return drawn;
}

async function revealDraw(origin) {
  const drawn = drawThreeShops();
  if (!drawn.length) return;

  resultCount.textContent = String(drawn.length);
  resultMessage.classList.remove("is-hidden");
  resultMessage.querySelector("p").textContent = "777 がそろうまで…";
  slotStatus.textContent = "リール停止中！ 目を離さないで";
  slotMachine.classList.add("is-spinning");
  rerollButton.disabled = true;

  const reels = drawn.map(({ shop }, index) => createReelCell(shop, origin, index));
  const detailCards = drawn.map(({ shop }, index) => createShopCard(shop, origin, index));
  slotReels.replaceChildren(...reels);
  shopGrid.replaceChildren(...detailCards);
  shopDetailsSection.classList.add("is-hidden");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealInterval = reducedMotion ? 0 : 460;
  await Promise.all(reels.map((reel, index) => new Promise((resolve) => {
    window.setTimeout(() => {
      reel.classList.remove("slot-waiting");
      reel.classList.add("slot-stop");
      if (index === 0) resultMessage.classList.add("is-hidden");
      resolve();
    }, revealInterval * index);
  })));
  if (!reducedMotion) await new Promise((resolve) => window.setTimeout(resolve, 480));
  shopDetailsSection.classList.remove("is-hidden");
  slotMachine.classList.remove("is-spinning");
  slotStatus.textContent = "大当たり！ 次の一軒が決まりました";
  rerollButton.disabled = false;
}

async function renderShops(payload, origin) {
  const shops = payload.results?.shop;
  const list = Array.isArray(shops) ? shops : shops ? [shops] : [];
  if (list.length === 0) {
    showMessage("この範囲ではお店が見つかりませんでした。距離を広げてもう一度検索してください。");
    resultCount.textContent = "0";
    slotMachine.classList.remove("is-spinning");
    slotStatus.textContent = "ハズレ… 条件を変えて再チャレンジ";
    rerollButton.disabled = true;
    return;
  }

  candidatePool = list
    .map((shop, index) => ({ shop, index, id: shop.id || `${shop.name || "shop"}-${index}`, score: getPreferenceScore(shop) }))
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, 40);
  previousDrawIds = new Set();
  await revealDraw(origin);
}

async function searchAt(origin) {
  if (!apiConfigured) {
    showMessage("サーバー起動時にAPIキーを設定してから検索してください。", "error");
    return;
  }

  currentPosition = origin;
  isSearching = true;
  rerollButton.disabled = true;
  slotMachine.classList.add("is-spinning");
  slotStatus.textContent = "候補を集めています…";
  updateSearchControls();
  showScreen("results");
  const rangeLabel = rangeButtons.find((button) => Number(button.dataset.range) === selectedRange)?.textContent || "1km";
  const selectedPreferenceLabels = [
    ...moodButtons.filter((button) => selectedMoods.has(button.dataset.mood)).map((button) => button.textContent),
    ...cuisineButtons.filter((button) => selectedCuisines.has(button.dataset.cuisine)).map((button) => button.textContent),
  ];
  resultContext.textContent = [origin.label || "現在地", rangeLabel, ...selectedPreferenceLabels].join("・");
  showMessage("近くのお店を探しています…");

  try {
    const parameters = new URLSearchParams({
      lat: String(origin.latitude),
      lng: String(origin.longitude),
      range: String(selectedRange),
      genre: selectedGenre,
      budget: selectedBudget,
    });
    const response = await fetch(`/api/search?${parameters}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "検索に失敗しました。");
    await renderShops(payload, origin);
  } catch (error) {
    showMessage(error.message || "検索に失敗しました。", "error");
    slotMachine.classList.remove("is-spinning");
    slotStatus.textContent = "エラー発生。条件を確認してください";
    rerollButton.disabled = true;
  } finally {
    isSearching = false;
    updateSearchControls();
  }
}

function requestCurrentLocation(searchWhenReady = false) {
  if (!navigator.geolocation) {
    locationStatus.textContent = "このブラウザーでは位置情報を利用できません。住所や駅名で検索してください。";
    return;
  }

  isLocating = true;
  locationStatus.textContent = "現在地を確認しています…";
  updateSearchControls();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude, label: "現在地" };
      isLocating = false;
      locationStatus.textContent = "現在地を取得しました。";
      updateSearchControls();
      if (searchWhenReady) searchAt(currentPosition);
    },
    (error) => {
      isLocating = false;
      const message = error.code === error.PERMISSION_DENIED
        ? "位置情報が許可されていません。住所や駅名から検索できます。"
        : "現在地を取得できませんでした。住所や駅名から検索できます。";
      locationStatus.textContent = message;
      updateSearchControls();
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
  );
}

manualLocationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  manualLocationError.hidden = true;
  manualSearchButton.disabled = true;
  manualSearchButton.textContent = "場所を検索しています…";

  try {
    const query = manualLocationInput.value.trim();
    const parameters = new URLSearchParams({ q: query, limit: "1" });
    const response = await fetch(`https://photon.komoot.io/api/?${parameters}`, { cache: "no-store" });
    if (!response.ok) throw new Error("場所を検索できませんでした。少し時間をおいて再度お試しください。");
    const payload = await response.json();
    const feature = payload.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error("場所が見つかりませんでした。駅名や市区町村名でお試しください。");
    }

    const properties = feature.properties || {};
    const label = [properties.name, properties.city, properties.state]
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .join("・") || query;
    currentPosition = { latitude: Number(coordinates[1]), longitude: Number(coordinates[0]), label };
    locationStatus.textContent = `${label} を検索地点に設定しました。`;
  } catch (error) {
    manualLocationError.textContent = error.message || "場所を検索できませんでした。";
    manualLocationError.hidden = false;
  } finally {
    manualSearchButton.textContent = "この場所を使う";
    updateSearchControls();
  }
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRange = Number(button.dataset.range);
    rangeButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
  });
});

genreButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedGenre = button.dataset.genre;
    genreButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
    currentQuestionStep = 2;
    updateQuestionStep();
  });
});

budgetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedBudget = button.dataset.budget;
    budgetButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
    currentQuestionStep = 3;
    updateQuestionStep();
  });
});

function togglePreference(button, selectedSet, valueKey) {
  const value = button.dataset[valueKey];
  if (selectedSet.has(value)) selectedSet.delete(value);
  else selectedSet.add(value);
  button.setAttribute("aria-pressed", String(selectedSet.has(value)));
}

moodButtons.forEach((button) => button.addEventListener("click", () => {
  togglePreference(button, selectedMoods, "mood");
}));

cuisineButtons.forEach((button) => button.addEventListener("click", () => {
  togglePreference(button, selectedCuisines, "cuisine");
}));

previousQuestionButton.addEventListener("click", () => {
  currentQuestionStep = Math.max(currentQuestionStep - 1, 1);
  updateQuestionStep();
});
searchButton.addEventListener("click", startGacha);
rerollButton.addEventListener("click", async () => {
  if (!candidatePool.length || isSearching) return;
  rerollButton.disabled = true;
  rerollButton.classList.add("is-pulling");
  slotMachine.classList.add("is-spinning");
  slotStatus.textContent = "ガコン！ レバー作動、リール回転中！";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 440));
  rerollButton.classList.remove("is-pulling");
  await revealDraw(currentPosition);
});
backToQuestionsButton.addEventListener("click", () => {
  currentQuestionStep = 1;
  updateQuestionStep();
  showScreen("questions");
});
updateQuestionStep();
checkApiStatus().then(() => {
  if (apiConfigured) requestCurrentLocation();
});