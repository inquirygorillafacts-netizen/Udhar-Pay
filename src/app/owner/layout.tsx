import React from 'react';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Owner-specific layout components can go here, e.g., an admin sidebar */}
      <main>{children}</main>
    </div>
  );
}
