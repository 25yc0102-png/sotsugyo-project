const searchButton = document.querySelector("#searchButton");
const manualLocationForm = document.querySelector("#manualLocationForm");
const manualLocationInput = document.querySelector("#manualLocationInput");
const manualSearchButton = document.querySelector("#manualSearchButton");
const manualLocationError = document.querySelector("#manualLocationError");
const apiStatus = document.querySelector("#apiStatus");
const statusDot = document.querySelector("#statusDot");
const resultMessage = document.querySelector("#resultMessage");
const resultCount = document.querySelector("#resultCount");
const resultContext = document.querySelector("#resultContext");
const shopGrid = document.querySelector("#shopGrid");
const rangeButtons = [...document.querySelectorAll("[data-range]")];

let apiConfigured = false;
let selectedRange = 3;
let currentPosition = null;

function setApiState(configured) {
  apiConfigured = configured;
  searchButton.disabled = !configured;
  manualSearchButton.disabled = !configured;
  apiStatus.textContent = configured ? "API接続済み" : "API未接続";
  statusDot.classList.toggle("is-ready", configured);
  if (!shopGrid.hasChildNodes()) {
    resultMessage.querySelector("p").textContent = configured
      ? "位置情報を取得して、近くのお店を検索できます。"
      : "サーバー起動時にAPIキーを設定すると、検索できます。";
  }
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const status = await response.json();
    setApiState(Boolean(status.configured));
  } catch {
    apiStatus.textContent = "サーバー未接続";
    searchButton.disabled = true;
    manualSearchButton.disabled = true;
    showMessage("ローカルサーバーに接続できません。server.ps1 を起動してください。");
  }
}

function showMessage(message, kind = "info") {
  shopGrid.replaceChildren();
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

async function renderShops(payload, origin) {
  const shops = payload.results?.shop;
  const list = Array.isArray(shops) ? shops : shops ? [shops] : [];
  if (list.length === 0) {
    showMessage("この範囲ではお店が見つかりませんでした。距離を広げてもう一度検索してください。");
    resultCount.textContent = "0";
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach((shop, index) => fragment.append(createShopCard(shop, origin, index)));
  shopGrid.replaceChildren(fragment);
  resultMessage.classList.add("is-hidden");
  resultCount.textContent = String(payload.results.results_returned || list.length);
}

async function searchAt(origin) {
  if (!apiConfigured) {
    showMessage("サーバー起動時にAPIキーを設定してから検索してください。", "error");
    return;
  }

  currentPosition = origin;
  searchButton.disabled = true;
  searchButton.querySelector("span").textContent = "お店を探しています";
  const rangeLabel = rangeButtons.find((button) => Number(button.dataset.range) === selectedRange)?.textContent || "1km";
  resultContext.textContent = `${origin.label || "現在地"}・${rangeLabel}`;
  showMessage("近くのお店を探しています…");

  try {
    const parameters = new URLSearchParams({
      lat: String(origin.latitude),
      lng: String(origin.longitude),
      range: String(selectedRange),
    });
    const response = await fetch(`/api/search?${parameters}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "検索に失敗しました。");
    await renderShops(payload, origin);
  } catch (error) {
    showMessage(error.message || "検索に失敗しました。", "error");
  } finally {
    searchButton.disabled = !apiConfigured;
    searchButton.querySelector("span").textContent = "近くのお店を見る";
  }
}

function requestCurrentLocation() {
  if (!navigator.geolocation) {
    showMessage("このブラウザーでは位置情報を利用できません。", "error");
    return;
  }

  searchButton.disabled = true;
  searchButton.querySelector("span").textContent = "位置情報を取得しています";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      searchButton.querySelector("span").textContent = "近くのお店を見る";
      resultContext.textContent = "現在地の近く";
      searchAt({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    },
    (error) => {
      searchButton.disabled = !apiConfigured;
      searchButton.querySelector("span").textContent = "近くのお店を見る";
      const message = error.code === error.PERMISSION_DENIED
        ? "位置情報の利用が許可されていません。ブラウザーの設定をご確認ください。"
        : "現在地を取得できませんでした。通信環境を確認して再度お試しください。";
      showMessage(message, "error");
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
    await searchAt({ latitude: Number(coordinates[1]), longitude: Number(coordinates[0]), label });
  } catch (error) {
    manualLocationError.textContent = error.message || "場所を検索できませんでした。";
    manualLocationError.hidden = false;
  } finally {
    manualSearchButton.disabled = !apiConfigured;
    manualSearchButton.innerHTML = 'この場所から探す <span aria-hidden="true">↗</span>';
  }
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRange = Number(button.dataset.range);
    rangeButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
    if (currentPosition) searchAt(currentPosition);
  });
});

searchButton.addEventListener("click", requestCurrentLocation);
checkApiStatus();