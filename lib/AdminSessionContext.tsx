"use client";

import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export const AdminSessionContext = createContext<Session | null>(null);

export function useAdminSessionContext() {
  return useContext(AdminSessionContext);
}
