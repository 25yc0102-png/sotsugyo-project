const { createApp, computed, ref } = Vue;

const genres = [
  { id: "izakaya", label: "居酒屋" },
  { id: "ramen", label: "ラーメン" },
  { id: "cafe", label: "カフェ" },
];

const budgets = [
  { id: "under3000", label: "3,000円以下" },
  { id: "3001to5000", label: "3,001〜5,000円" },
  { id: "5001to7000", label: "5,001〜7,000円" },
  { id: "any", label: "こだわらない" },
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

const secondaryGenres = genres.filter((option) => option.id !== "izakaya");
const budgetLabels = Object.fromEntries(budgets.map(({ id, label }) => [id, label]));
const genreLabels = Object.fromEntries(genres.map(({ id, label }) => [id, label]));
const allowedMoods = new Set(moods.map(({ id }) => id));
const allowedCuisines = new Set(cuisines.map(({ id }) => id));
const distanceSamples = [280, 620, 910, 1650];
const reelSymbols = ["丼", "麺", "酒", "串", "魚", "餃", "珈", "甘", "七", "飯"];

const mockShops = genres.flatMap((genre) =>
  budgets
    .filter((budget) => budget.id !== "any")
    .flatMap((budget) =>
      distanceSamples.map((distanceMeters, index) => ({
        id: `${genre.id}-${budget.id}-${index + 1}`,
        name: `${genre.label}サンプル店 ${index + 1}（${budget.label}）`,
        genreId: genre.id,
        genreLabel: genre.label,
        budgetId: budget.id,
        budgetLabel: budget.label,
        station: "東京駅周辺",
        address: "東京都千代田区（サンプル）",
        catch: "画面確認用に用意した架空の店舗データです。",
        distanceMeters,
        cuisine: genre.id === "izakaya"
          ? ["yakitori", "seafood", "washoku", "chinese"][index]
          : null,
        mood: genre.id === "izakaya"
          ? ["calm", "lively", "calm", "lively"][index]
          : null,
      })),
    ),
);

async function searchShops(criteria) {
  const validCriteria = criteria
    && ["izakaya", "ramen", "cafe"].includes(criteria.genre)
    && ["under3000", "3001to5000", "5001to7000", "any"].includes(criteria.budget)
    && [500, 1000, 2000, 3000].includes(criteria.rangeMeters)
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
    .filter((shop) => shop.genreId === criteria.genre)
    .filter((shop) => criteria.budget === "any" || shop.budgetId === criteria.budget)
    .filter((shop) => shop.distanceMeters <= criteria.rangeMeters)
    .map((shop) => ({
      ...shop,
      preferenceScore:
        Number(selectedMoods.has(shop.mood))
        + Number(selectedCuisines.has(shop.cuisine)),
    }))
    .sort((first, second) => second.preferenceScore - first.preferenceScore);
}

createApp({
  setup() {
    const step = ref(1);
    const screen = ref("questions");
    const genre = ref("izakaya");
    const budget = ref("under3000");
    const rangeMeters = ref(1000);
    const selectedMoods = ref([]);
    const selectedCuisines = ref([]);
    const candidateShops = ref([]);
    const drawnShops = ref([]);
    const reelStrips = ref([[], [], []]);
    const reelRunning = ref([false, false, false]);
    const isSearching = ref(false);
    const isSpinning = ref(false);
    const isPulling = ref(false);
    const stoppedReelCount = ref(0);
    const resultMessage = ref("条件を選んで、ガチャを回してください。");
    const slotStatus = ref("条件に合うお店を探します");
    const errorMessage = ref("");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isIzakaya = computed(() => genre.value === "izakaya");
    const stepTitle = computed(() => {
      if (step.value === 1) return "ジャンルを選んで";
      if (step.value === 2) return "予算を決めて";
      return isIzakaya.value ? "居酒屋の好みは？" : "検索範囲を決めて";
    });
    const stepName = computed(() => {
      if (step.value === 1) return "ジャンル";
      if (step.value === 2) return "予算";
      return isIzakaya.value ? "好み" : "範囲";
    });
    const selectedGenreLabel = computed(() => genreLabels[genre.value] ?? "");
    const selectedBudgetLabel = computed(() => budgetLabels[budget.value] ?? "");
    const selectedRangeLabel = computed(
      () => ranges.find((option) => option.meters === rangeMeters.value)?.label ?? "",
    );
    const resultContext = computed(
      () => `サンプルエリア（東京駅周辺）・${selectedGenreLabel.value}・${selectedBudgetLabel.value}・${selectedRangeLabel.value}`,
    );
    const resultCount = computed(() => String(drawnShops.value.length));
    const detailsVisible = computed(() => drawnShops.value.length > 0 && !isSpinning.value);
    const resultMessageVisible = computed(() => drawnShops.value.length === 0);

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

    function randomSymbol() {
      return { glyph: reelSymbols[Math.floor(Math.random() * reelSymbols.length)] };
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

    async function revealDraw() {
      const previousIds = new Set(drawnShops.value.map((shop) => shop.id));
      const freshCandidates = candidateShops.value.filter((shop) => !previousIds.has(shop.id));
      const pool = freshCandidates.length >= 3 ? freshCandidates : candidateShops.value;
      drawnShops.value = shuffle(pool).slice(0, 3);
      stoppedReelCount.value = 0;
      reelStrips.value = drawnShops.value.map(() =>
        Array.from({ length: 12 }, randomSymbol),
      );
      reelRunning.value = drawnShops.value.map(() => true);
      isSpinning.value = true;
      resultMessage.value = "リールを回しています…";
      slotStatus.value = "リールが回転中です";

      for (let index = 0; index < drawnShops.value.length; index += 1) {
        if (!reducedMotion) await wait([760, 600, 600][index]);
        reelStrips.value[index] = [
          randomSymbol(),
          { glyph: getShopSymbol(drawnShops.value[index]) },
          randomSymbol(),
        ];
        reelRunning.value[index] = false;
        stoppedReelCount.value = index + 1;
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
          genre: genre.value,
          budget: budget.value,
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
      budgets,
      candidateShops,
      cuisines,
      detailsVisible,
      drawnShops,
      errorMessage,
      genre,
      isIzakaya,
      isPulling,
      isSearching,
      isSpinning,
      moods,
      rangeMeters,
      ranges,
      reelRunning,
      reelStrips,
      resultContext,
      resultCount,
      resultMessage,
      resultMessageVisible,
      screen,
      secondaryGenres,
      selectedCuisines,
      selectedMoods,
      slotStatus,
      step,
      stepName,
      stepTitle,
      stoppedReelCount,
      startSearch,
      toggleCuisine,
      toggleMood,
      goBack,
      changeConditions,
      reroll,
    };
  },
}).mount("#app");
