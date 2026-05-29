"use client";

import PageTransition from "@/components/PageTransition";
import { AuthProvider } from "@/lib/auth-context";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <PageTransition>{children}</PageTransition>
    </AuthProvider>
  );
}
