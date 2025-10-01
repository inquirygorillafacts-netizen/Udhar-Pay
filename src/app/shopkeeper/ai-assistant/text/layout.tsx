'use client';

// This special layout ensures that the content of this route
// does not get wrapped by the main shopkeeper layout,
// thus hiding the main navigation bar and allowing for a full-screen experience.
export default function TextAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
