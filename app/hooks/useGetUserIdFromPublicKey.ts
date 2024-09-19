import { useState, useCallback } from "react";
import type { User } from "../types";
import { getUserIdFromPublicKey } from "../lib/utils";

type AsyncActionStatus = "idle" | "pending" | "success" | "error";

interface UseGetUserIdFromPublicKeyResult {
  getUser: (publicKeyFileContent: string) => Promise<void>;
  status: AsyncActionStatus;
  user: User | null;
  error: Error | null;
}

export function useGetUserIdFromPublicKey(): UseGetUserIdFromPublicKeyResult {
  const [status, setStatus] = useState<AsyncActionStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const getUser = useCallback(async (publicKeyFileContent: string) => {
    setStatus("pending");
    setUser(null);
    setError(null);

    try {
      const result = await getUserIdFromPublicKey(publicKeyFileContent);
      if (result) {
        const [name, email] = result[0].split(" <");
        setUser({
          name,
          id: email.substring(0, email.length - 1),
        });
        setStatus("success");
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An unknown error occurred"));
      setStatus("error");
    }
  }, []);

  return { getUser, status, user, error };
}
