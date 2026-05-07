const ROTATION_HOUR = 7;
const PASSWORD_PREFIX = "PK";
const PASSWORD_SALT = "ILOOK_PACKING_ACCESS";

export const PACKING_PASSWORD_MENUS = [
  {
    key: "packing-random",
    label: "Packing Random",
    path: "/packing-random",
    salt: "RANDOM",
  },
  {
    key: "packing-belum-barcode",
    label: "Produk Belum Barcode",
    path: "/packing-belum-barcode",
    salt: "BELUM_BARCODE",
  },
  {
    key: "packing-no-data-ginee",
    label: "No Data Ginee",
    path: "/packing-no-data-ginee",
    salt: "NO_DATA_GINEE",
  },
];

const padNumber = (value) => String(value).padStart(2, "0");

const getRotationStart = (date = new Date()) => {
  const rotationStart = new Date(date);
  rotationStart.setHours(ROTATION_HOUR, 0, 0, 0);

  if (date < rotationStart) {
    rotationStart.setDate(rotationStart.getDate() - 1);
  }

  return rotationStart;
};

const getNextRotation = (date = new Date()) => {
  const nextRotation = getRotationStart(date);
  nextRotation.setDate(nextRotation.getDate() + 1);
  return nextRotation;
};

const getCycleId = (date = new Date()) => {
  const rotationStart = getRotationStart(date);
  const year = rotationStart.getFullYear();
  const month = padNumber(rotationStart.getMonth() + 1);
  const day = padNumber(rotationStart.getDate());

  return `${year}${month}${day}`;
};

const hashPasswordSeed = (seed) => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

const formatDateTime = (date) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const formatActiveDate = (date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

const getMenuConfig = (menuKey) =>
  PACKING_PASSWORD_MENUS.find((menu) => menu.key === menuKey);

export const normalizePackingPassword = (value = "") =>
  String(value).trim().replace(/\s+/g, "").toUpperCase();

export const getPackingPasswordInfo = (menuKey, date = new Date()) => {
  const menu = getMenuConfig(menuKey);

  if (!menu) {
    throw new Error(`Unknown packing password menu: ${menuKey}`);
  }

  const rotationStart = getRotationStart(date);
  const cycleId = getCycleId(date);
  const numericCode = String(
    hashPasswordSeed(`${PASSWORD_SALT}:${menu.salt}:${cycleId}`) % 1000000
  ).padStart(6, "0");

  return {
    key: menu.key,
    label: menu.label,
    path: menu.path,
    password: `${PASSWORD_PREFIX}${numericCode}`,
    cycleId,
    rotationHour: ROTATION_HOUR,
    activeDate: formatActiveDate(rotationStart),
    activeFrom: formatDateTime(rotationStart),
    nextRotation: formatDateTime(getNextRotation(date)),
  };
};

export const getAllPackingPasswords = (date = new Date()) =>
  PACKING_PASSWORD_MENUS.map((menu) => getPackingPasswordInfo(menu.key, date));
