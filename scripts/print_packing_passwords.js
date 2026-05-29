#!/usr/bin/env node
const ROTATION_HOUR = 7;
const PASSWORD_PREFIX = "PK";
const PASSWORD_SALT = "ILOOK_PACKING_ACCESS";

const PACKING_PASSWORD_MENUS = [
  { key: "packing-random", label: "Packing Random", salt: "RANDOM" },
  { key: "packing-pendingan", label: "Packing Pendingan", salt: "PENDINGAN" },
  { key: "packing-belum-barcode", label: "Produk Belum Barcode", salt: "BELUM_BARCODE" },
  { key: "packing-no-data-ginee", label: "No Data Ginee", salt: "NO_DATA_GINEE" },
];

const padNumber = (v) => String(v).padStart(2, "0");

const getRotationStart = (date = new Date()) => {
  const rotationStart = new Date(date);
  rotationStart.setHours(ROTATION_HOUR, 0, 0, 0);
  if (date < rotationStart) rotationStart.setDate(rotationStart.getDate() - 1);
  return rotationStart;
};

const getNextRotation = (date = new Date()) => {
  const nextRotation = getRotationStart(date);
  nextRotation.setDate(nextRotation.getDate() + 1);
  return nextRotation;
};

const getCycleId = (date = new Date()) => {
  const r = getRotationStart(date);
  return `${r.getFullYear()}${padNumber(r.getMonth() + 1)}${padNumber(r.getDate())}`;
};

const hashPasswordSeed = (seed) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
};

const getPackingPasswordInfo = (menu, date = new Date()) => {
  const rotationStart = getRotationStart(date);
  const cycleId = getCycleId(date);
  const numericCode = String(
    hashPasswordSeed(`${PASSWORD_SALT}:${menu.salt}:${cycleId}`) % 1000000
  ).padStart(6, "0");

  return {
    key: menu.key,
    label: menu.label,
    password: `${PASSWORD_PREFIX}${numericCode}`,
    cycleId,
    activeFrom: rotationStart.toISOString(),
    nextRotation: getNextRotation(date).toISOString(),
  };
};

const argv = process.argv.slice(2);
const dateArg = argv[0] ? new Date(argv[0]) : new Date();

console.log(`Using date: ${dateArg.toISOString()}`);
PACKING_PASSWORD_MENUS.forEach((m) => {
  const info = getPackingPasswordInfo(m, dateArg);
  console.log(`${info.label} (${info.key}): ${info.password} — activeFrom=${info.activeFrom} nextRotation=${info.nextRotation} cycleId=${info.cycleId}`);
});
