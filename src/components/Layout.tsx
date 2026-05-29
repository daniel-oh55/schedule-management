import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import type { AppPage } from "../App";

interface LayoutProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopNav currentPage={currentPage} onNavigate={onNavigate} />
      <main className="px-3 py-3">{children}</main>
    </div>
  );
}
