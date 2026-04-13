const normalizeText = (value) => String(value || "").trim().toUpperCase();

export const normalizeLooseText = (value) =>
  normalizeText(value)
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const SERIAL_SKU_AUTO_MATCH_SCORE = 100;
export const SERIAL_SKU_SUGGESTION_SCORE = 25;

const SERIAL_SKU_STOP_WORDS = new Set(["SET", "SKU", "ALL", "SIZE", "ALLSIZE"]);
const SERIAL_SKU_SIZE_TOKENS = new Set(["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]);

const buildTextTokens = (value) =>
  normalizeLooseText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && !SERIAL_SKU_STOP_WORDS.has(item));

const buildFullTokens = (value) =>
  normalizeLooseText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

const areSimilarTokens = (left, right) => {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  return left.includes(right) || right.includes(left) || left.slice(0, 4) === right.slice(0, 4);
};

const countMatchingTokens = (targetTokens, candidateTokens) => {
  const usedTargetIndexes = new Set();

  return candidateTokens.reduce((total, candidateToken) => {
    const matchingIndex = targetTokens.findIndex(
      (targetToken, index) =>
        !usedTargetIndexes.has(index) && areSimilarTokens(targetToken, candidateToken)
    );

    if (matchingIndex === -1) return total;

    usedTargetIndexes.add(matchingIndex);
    return total + 1;
  }, 0);
};

export const getSkuMatchScore = (sku, serialSkuValue) => {
  const target = normalizeText(serialSkuValue);
  const targetLoose = normalizeLooseText(serialSkuValue);
  const targetCompact = targetLoose.replace(/\s+/g, "");

  if (!targetCompact) return 0;

  const targetTokens = buildTextTokens(serialSkuValue);
  const targetFullTokens = buildFullTokens(serialSkuValue);
  let bestScore = 0;

  [sku?.code, sku?.label].forEach((value) => {
    const candidate = normalizeText(value);
    const candidateLoose = normalizeLooseText(value);
    const candidateCompact = candidateLoose.replace(/\s+/g, "");

    if (!candidateCompact) return;

    if (
      candidate === target ||
      candidateLoose === targetLoose ||
      candidateCompact === targetCompact
    ) {
      bestScore = Math.max(bestScore, 100);
      return;
    }

    if (
      targetCompact.length >= 6 &&
      candidateCompact.length >= 6 &&
      (candidateCompact.includes(targetCompact) || targetCompact.includes(candidateCompact))
    ) {
      bestScore = Math.max(bestScore, 85);
    }

    if (!targetTokens.length) return;

    const candidateTokens = buildTextTokens(value);
    const candidateFullTokens = buildFullTokens(value);
    const tokenMatches = countMatchingTokens(targetTokens, candidateTokens);
    const hasSameSizeToken = candidateFullTokens.some(
      (token) => SERIAL_SKU_SIZE_TOKENS.has(token) && targetFullTokens.includes(token)
    );

    if (!tokenMatches && !hasSameSizeToken) return;

    bestScore = Math.max(bestScore, tokenMatches * 25 + (hasSameSizeToken ? 10 : 0));
  });

  return bestScore;
};

export const findBestSerialSkuMatch = (skus, serialSkuValue) =>
  skus
    .map((sku) => ({ sku, score: getSkuMatchScore(sku, serialSkuValue) }))
    .sort((left, right) => right.score - left.score)[0] || null;

export const buildSerialSkuSuggestions = (skus, serialSkuValue) =>
  skus
    .map((sku) => ({ sku, score: getSkuMatchScore(sku, serialSkuValue) }))
    .filter((item) => item.score >= SERIAL_SKU_SUGGESTION_SCORE)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return String(left.sku.label || left.sku.code || "").localeCompare(
        String(right.sku.label || right.sku.code || "")
      );
    })
    .map((item) => item.sku);

export const isSkuSearchMatch = (sku, keyword) => {
  if (!keyword) return true;
  return [sku?.code, sku?.label].some((value) =>
    normalizeLooseText(value).includes(keyword)
  );
};
