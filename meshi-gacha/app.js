const { createApp, computed, ref } = Vue;

const genres = [
  { id: "any", label: "おまかせ" },
  { id: "izakaya", label: "居酒屋" },
  { id: "ramen", label: "ラーメン" },
  { id: "cafe", label: "カフェ" },
];

const budgets = [
  { id: "cheap", label: "なるべく安く" },
  { id: "moderate", label: "手頃" },
  { id: "any", label: "気にしない" },
];

const appetites = [
  { id: "light", label: "軽めに食べたい" },
  { id: "normal", label: "ふつうに食べたい" },
  { id: "hearty", label: "がっつり食べたい" },
];

const moods = [
  { id: "calm", label: "落ち着いた" },
  { id: "lively", label: "にぎやか" },
];

const cuisines = [
  { id: "chinese", label: "中華" },
  { id: "yakitori", label: "焼き鳥" },
  { id: "seafood", label: "海鮮" },
  { id: "kushikatsu", label: "串揚げ・串カツ" },
  { id: "washoku", label: "和食" },
];

const ranges = [
  { meters: 500, label: "500m" },
  { meters: 1000, label: "1km" },
  { meters: 2000, label: "2km" },
  { meters: 3000, label: "3km" },
];

const budgetLabels = Object.fromEntries(budgets.map(({ id, label }) => [id, label]));
const genreLabels = Object.fromEntries(genres.map(({ id, label }) => [id, label]));
const appetiteLabels = Object.fromEntries(appetites.map(({ id, label }) => [id, label]));
const allowedMoods = new Set(moods.map(({ id }) => id));
const allowedCuisines = new Set(cuisines.map(({ id }) => id));
const allowedAppetites = new Set(appetites.map(({ id }) => id));
const distanceSamples = [280, 620, 910, 1650, 2100, 2800];
const mockShops = genres
  .filter((genre) => genre.id !== "any")
  .flatMap((genre) =>
    budgets
      .filter((budget) => budget.id !== "any")
      .flatMap((budget) =>
        appetites.flatMap((appetite, appetiteIndex) =>
          distanceSamples.map((distanceMeters, distanceIndex) => {
            const cuisine = ["yakitori", "seafood", "washoku", "chinese", "kushikatsu"][
              (distanceIndex + appetiteIndex) % 5
            ];
            const mood = (distanceIndex + appetiteIndex) % 2 === 0 ? "calm" : "lively";

            return {
              id: `${genre.id}-${budget.id}-${appetite.id}-${distanceIndex + 1}`,
              name: `${genre.label}サンプル店 ${distanceIndex + 1}`,
              genreId: genre.id,
              genreLabel: genre.label,
              budgetId: budget.id,
              budgetLabel: budget.id === "cheap" ? "〜3,000円（サンプル）" : "3,000〜5,000円（サンプル）",
              appetiteId: appetite.id,
              appetiteLabel: appetite.label,
              station: "サンプル駅周辺",
              address: "サンプル住所（架空）",
              catch: "画面確認用に用意した架空の店舗データです。",
              distanceMeters,
              cuisine: genre.id === "izakaya" ? cuisine : null,
              mood: genre.id === "izakaya" ? mood : null,
            };
          }),
        ),
      ),
  );

async function searchShops(criteria) {
  const validCriteria = criteria
    && ["any", "izakaya", "ramen", "cafe"].includes(criteria.genre)
    && ["cheap", "moderate", "any"].includes(criteria.budget)
    && allowedAppetites.has(criteria.appetite)
    && [500, 1000, 2000, 3000].includes(criteria.rangeMeters)
    && criteria.location
    && ["current", "place"].includes(criteria.location.kind)
    && (criteria.location.kind === "current"
      ? Number.isFinite(criteria.location.latitude) && Number.isFinite(criteria.location.longitude)
      : typeof criteria.location.query === "string" && criteria.location.query.trim().length > 0)
    && Array.isArray(criteria.moods)
    && criteria.moods.every((mood) => allowedMoods.has(mood))
    && Array.isArray(criteria.cuisines)
    && criteria.cuisines.every((cuisine) => allowedCuisines.has(cuisine));

  if (!validCriteria) {
    throw new TypeError("検索条件が正しくありません。選択内容を確認してください。");
  }

  const selectedMoods = new Set(criteria.moods);
  const selectedCuisines = new Set(criteria.cuisines);

  return mockShops
    .filter((shop) => criteria.genre === "any" || shop.genreId === criteria.genre)
    .filter((shop) => criteria.budget === "any" || shop.budgetId === criteria.budget)
    .filter((shop) => shop.appetiteId === criteria.appetite)
    .filter((shop) => shop.distanceMeters <= criteria.rangeMeters)
    .map((shop) => ({
      ...shop,
      preferenceScore: Number(selectedMoods.has(shop.mood))
        + Number(selectedCuisines.has(shop.cuisine)),
    }))
    .sort((first, second) => second.preferenceScore - first.preferenceScore);
}

createApp({
  setup() {
    const step = ref(1);
    const screen = ref("questions");
    const locationMode = ref("current");
    const currentLocation = ref(null);
    const locationQuery = ref("");
    const locationError = ref("");
    const isLocating = ref(false);
    const genre = ref("izakaya");
    const budget = ref("cheap");
    const appetite = ref("normal");
    const rangeMeters = ref(1000);
    const selectedMoods = ref([]);
    const selectedCuisines = ref([]);
    const candidateShops = ref([]);
    const drawnShops = ref([]);
    const reelRunning = ref([false, false, false]);
    const isSearching = ref(false);
    const isSpinning = ref(false);
    const isPulling = ref(false);
    const resultMessage = ref("条件を選んで、ガチャを回してください。");
    const slotStatus = ref("条件に合うお店を探します");
    const errorMessage = ref("");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const isIzakaya = computed(() => genre.value === "izakaya");
    const stepTitle = computed(() => {
      if (step.value === 1) return "お店を探す場所は？";
      if (step.value === 2) return "予算を決めて";
      if (step.value === 3) return "腹具合を教えて";
      if (step.value === 4) return "ジャンルを選んで";
      return "最後に、好みと範囲を選んで";
    });
    const stepName = computed(() => {
      return ["場所", "予算", "腹具合", "ジャンル", "好み・範囲"][step.value - 1];
    });
    const selectedGenreLabel = computed(() => genreLabels[genre.value] ?? "");
    const selectedBudgetLabel = computed(() => budgetLabels[budget.value] ?? "");
    const selectedAppetiteLabel = computed(() => appetiteLabels[appetite.value] ?? "");
    const selectedRangeLabel = computed(
      () => ranges.find((option) => option.meters === rangeMeters.value)?.label ?? "",
    );
    const selectedLocationLabel = computed(() => (
      locationMode.value === "place" ? locationQuery.value.trim() : "現在地"
    ));
    const locationStatus = computed(() => {
      if (locationMode.value === "current" && currentLocation.value) {
        return "現在地を取得しました。位置情報はこの画面を開いている間だけ使います。";
      }
      if (locationMode.value === "place" && locationQuery.value.trim()) {
        return `検索地点：「${locationQuery.value.trim()}」`;
      }
      return "現在地を使うか、駅名・地名を入力してください。";
    });
    const canContinueFromLocation = computed(() => (
      (locationMode.value === "current" && currentLocation.value !== null)
      || (locationMode.value === "place" && locationQuery.value.trim().length > 0)
    ));
    const searchLocation = computed(() => {
      if (locationMode.value === "current" && currentLocation.value) {
        return { kind: "current", ...currentLocation.value };
      }
      if (locationMode.value === "place" && locationQuery.value.trim()) {
        return { kind: "place", query: locationQuery.value.trim() };
      }
      return null;
    });
    const resultContext = computed(
      () => `${selectedLocationLabel.value}・${selectedBudgetLabel.value}・${selectedAppetiteLabel.value}・${selectedGenreLabel.value}・${selectedRangeLabel.value}`,
    );
    const resultCount = computed(() => String(drawnShops.value.length));
    const detailsVisible = computed(() => drawnShops.value.length > 0 && !isSpinning.value);
    const resultMessageVisible = computed(() => drawnShops.value.length === 0);
    const cabinetDescription = computed(() => {
      if (drawnShops.value.length === 0) {
        return `めしガチャの3D筐体。${slotStatus.value}。ドラッグして角度を変えられます。`;
      }

      const results = drawnShops.value.map((shop, index) => (
        reelRunning.value[index]
          ? `${index + 1}本目は抽選中`
          : `${index + 1}本目は${shop.name}`
      ));
      return `めしガチャの3D筐体。${results.join("、")}。ドラッグして角度を変えられます。`;
    });
    const cabinetHost = ref(null);
    const cabinetReady = ref(false);
    const cabinetError = ref("");
    let cabinetScene = null;
    let cabinetModulePromise = null;
    let cabinetGeneration = 0;

    function toggleSelection(selection, value) {
      selection.value = selection.value.includes(value)
        ? selection.value.filter((item) => item !== value)
        : [...selection.value, value];
    }

    function toggleMood(value) {
      toggleSelection(selectedMoods, value);
    }

    function toggleCuisine(value) {
      toggleSelection(selectedCuisines, value);
    }

    function selectManualLocation() {
      locationMode.value = "place";
      currentLocation.value = null;
      locationError.value = "";
    }

    function useCurrentLocation() {
      locationError.value = "";
      if (!navigator.geolocation) {
        locationError.value = "このブラウザーでは位置情報を利用できません。駅名・地名を入力してください。";
        return;
      }

      isLocating.value = true;
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          currentLocation.value = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          locationMode.value = "current";
          locationQuery.value = "";
          isLocating.value = false;
        },
        (error) => {
          locationError.value = error.code === error.PERMISSION_DENIED
            ? "位置情報が許可されませんでした。駅名・地名を入力して検索できます。"
            : "現在地を取得できませんでした。駅名・地名を入力して検索できます。";
          isLocating.value = false;
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      );
    }

    function wait(milliseconds) {
      return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    function shuffle(items) {
      const shuffled = [...items];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return shuffled;
    }

    function getShopSymbol(shop) {
      if (shop.genreId === "ramen") return "麺";
      if (shop.genreId === "cafe") return "珈";
      const cuisineSymbols = {
        chinese: "餃",
        yakitori: "串",
        seafood: "魚",
        kushikatsu: "揚",
        washoku: "肴",
      };
      return cuisineSymbols[shop.cuisine] ?? "酒";
    }

    async function syncCabinet() {
      const generation = cabinetGeneration;
      if (screen.value !== "results") return;

      await Vue.nextTick();
      if (generation !== cabinetGeneration || screen.value !== "results") return;
      const host = cabinetHost.value;
      if (!host) return;

      try {
        if (!cabinetScene) {
          cabinetModulePromise ??= import("./cabinet-3d.js").then((module) => module.createCabinetScene);
          const createCabinetScene = await cabinetModulePromise;
          if (generation !== cabinetGeneration || screen.value !== "results") return;
          if (!cabinetScene) cabinetScene = createCabinetScene(host);
        }

        cabinetScene.update({
          shops: drawnShops.value.map((shop) => ({
            glyph: getShopSymbol(shop),
            name: shop.name,
            genreLabel: shop.genreLabel,
            distanceMeters: shop.distanceMeters,
          })),
          running: reelRunning.value,
          pulling: isPulling.value,
          reducedMotion,
        });
        cabinetReady.value = true;
        cabinetError.value = "";
      } catch (error) {
        console.error("3D筐体の初期化に失敗しました。", error);
        cabinetError.value = "3D筐体を読み込めませんでした。インターネット接続とWebGL対応ブラウザーを確認してください。";
        cabinetReady.value = false;
      }
    }

    Vue.watch(
      [screen, drawnShops, reelRunning, isPulling],
      async ([currentScreen]) => {
        if (currentScreen !== "results") {
          cabinetGeneration += 1;
          cabinetScene?.dispose();
          cabinetScene = null;
          cabinetReady.value = false;
          cabinetError.value = "";
          return;
        }
        await syncCabinet();
      },
      { deep: true, flush: "post" },
    );

    Vue.onBeforeUnmount(() => {
      cabinetGeneration += 1;
      cabinetScene?.dispose();
    });

    async function revealDraw() {
      const previousIds = new Set(drawnShops.value.map((shop) => shop.id));
      const freshCandidates = candidateShops.value.filter((shop) => !previousIds.has(shop.id));
      const pool = freshCandidates.length >= 3 ? freshCandidates : candidateShops.value;
      drawnShops.value = shuffle(pool).slice(0, 3);
      reelRunning.value = drawnShops.value.map(() => true);
      isSpinning.value = true;
      resultMessage.value = "リールを回しています…";
      slotStatus.value = "リールが回転中です";

      for (let index = 0; index < drawnShops.value.length; index += 1) {
        if (!reducedMotion) await wait([760, 600, 600][index]);
        reelRunning.value[index] = false;
      }

      isSpinning.value = false;
      reelRunning.value = [false, false, false];
      slotStatus.value = drawnShops.value.length === 3
        ? "抽選結果がそろいました"
        : `条件に合う候補は${drawnShops.value.length}店でした。範囲を広げてみてください`;
    }

    async function startSearch() {
      if (isSearching.value) return;

      isSearching.value = true;
      errorMessage.value = "";
      screen.value = "results";
      candidateShops.value = [];
      drawnShops.value = [];
      resultMessage.value = "サンプルデータから候補を集めています…";
      slotStatus.value = "候補を集めています…";

      try {
        candidateShops.value = await searchShops({
          location: searchLocation.value,
          genre: genre.value,
          budget: budget.value,
          appetite: appetite.value,
          rangeMeters: rangeMeters.value,
          moods: selectedMoods.value,
          cuisines: selectedCuisines.value,
        });

        if (candidateShops.value.length === 0) {
          resultMessage.value = "条件に合うお店がありません。検索範囲を広げてみてください。";
          slotStatus.value = "候補が見つかりませんでした";
          return;
        }

        await revealDraw();
      } catch (error) {
        errorMessage.value = error instanceof Error
          ? error.message
          : "検索に失敗しました。条件を確認して、もう一度お試しください。";
        resultMessage.value = errorMessage.value;
        slotStatus.value = "検索に失敗しました";
      } finally {
        isSearching.value = false;
      }
    }

    async function reroll() {
      if (isSearching.value || isPulling.value || isSpinning.value || candidateShops.value.length === 0) return;

      isPulling.value = true;
      slotStatus.value = "ガコン！ レバー作動、リール回転中！";
      if (!reducedMotion) await wait(440);
      isPulling.value = false;
      await revealDraw();
    }

    function goBack() {
      step.value = Math.max(1, step.value - 1);
    }

    function changeConditions() {
      step.value = 1;
      screen.value = "questions";
      errorMessage.value = "";
    }

    return {
      appetite,
      appetites,
      budgets,
      candidateShops,
      cabinetDescription,
      cabinetError,
      cabinetHost,
      cabinetReady,
      cuisines,
      canContinueFromLocation,
      detailsVisible,
      drawnShops,
      errorMessage,
      genre,
      genres,
      isIzakaya,
      isLocating,
      isPulling,
      isSearching,
      isSpinning,
      locationError,
      locationQuery,
      locationStatus,
      moods,
      rangeMeters,
      ranges,
      reelRunning,
      resultContext,
      resultCount,
      resultMessage,
      resultMessageVisible,
      screen,
      selectedLocationLabel,
      selectedCuisines,
      selectedMoods,
      slotStatus,
      step,
      stepName,
      stepTitle,
      selectManualLocation,
      startSearch,
      toggleCuisine,
      toggleMood,
      useCurrentLocation,
      goBack,
      changeConditions,
      reroll,
    };
  },
}).mount("#app");
