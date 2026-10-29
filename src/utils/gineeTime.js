// Waktu dari Ginee (order_date, pay_time, label_print_time) tersimpan di DB dalam UTC
// tanpa penanda zona, sedangkan kolom lain (created_at, updated_at, ...) sudah WIB.
// Baca sebagai UTC supaya browser menampilkannya dalam waktu lokal (WIB).
export const parseGineeTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(str);
  const date = new Date(hasZone ? str : `${str.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};
