import { useEffect, useState } from "react";
import {
  buildGudangWorkspaceErrorMessage,
  emptyGudangWorkspaceState,
  fetchGudangProdukWorkspace,
} from "./GudangProdukWorkspaceApi";

const useGudangProdukWorkspace = () => {
  const [state, setState] = useState(emptyGudangWorkspaceState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const nextState = await fetchGudangProdukWorkspace();
      setState(nextState);
      setError("");
      return nextState;
    } catch (fetchError) {
      const message = buildGudangWorkspaceErrorMessage(
        fetchError,
        "Gagal memuat workspace Gudang Produk."
      );
      setError(message);
      throw fetchError;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return {
    state,
    setState,
    isLoading,
    error,
    refresh,
  };
};

export default useGudangProdukWorkspace;
