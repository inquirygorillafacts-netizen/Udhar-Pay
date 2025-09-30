import React from 'react';

export default function ShopkeeperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Shopkeeper-specific layout components can go here, e.g., a shop menu */}
      <main>{children}</main>
    </div>
  );
}
