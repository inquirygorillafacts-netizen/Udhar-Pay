import React from 'react';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Customer-specific layout components can go here, e.g., a header */}
      <main>{children}</main>
    </div>
  );
}
