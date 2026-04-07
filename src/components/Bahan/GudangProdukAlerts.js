import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const baseOptions = {
  confirmButtonColor: "#3758db",
  cancelButtonColor: "#94a3b8",
  reverseButtons: true,
  allowOutsideClick: true,
  scrollbarPadding: false,
};

export const showGudangSuccess = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    icon: "success",
    title,
    text,
    confirmButtonText: "OK",
  });

export const showGudangError = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    icon: "error",
    title,
    text,
    confirmButtonText: "Tutup",
  });

export const showGudangWarning = (title, text = "") =>
  Swal.fire({
    ...baseOptions,
    icon: "warning",
    title,
    text,
    confirmButtonText: "Mengerti",
  });

export const confirmGudangAction = async ({
  title,
  text = "",
  confirmButtonText = "Ya, lanjutkan",
  cancelButtonText = "Batal",
  icon = "question",
}) => {
  const result = await Swal.fire({
    ...baseOptions,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    focusCancel: true,
  });

  return Boolean(result.isConfirmed);
};
