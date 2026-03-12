import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agentic Workflow | Dev Automation Board',
  description: 'AI-powered agentic workflow board for automated software development',
};

export default function AgenticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
