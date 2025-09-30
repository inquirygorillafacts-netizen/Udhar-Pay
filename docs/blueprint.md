# **App Name**: Offline First

## Core Features:

- Manifest Creation: Generates manifest.json to define app name, icons, and display properties for installation and native-like appearance.
- Service Worker Implementation: Implements sw.js for background operation, including caching resources (HTML, CSS, JS, images) for offline functionality.
- Offline Data Storage: Utilizes IndexedDB to store user data locally, enabling offline functionality and background synchronization upon reconnection.
- Background Sync: The service worker uses BackgroundSync to sync offline changes with the server when the user reconnects to the internet. Uses a tool that detects connectivity.
- Responsive Design: Utilizes CSS to ensure the app adapts to various screen sizes across platforms, including Android, iOS, laptops, and desktops.
- HTTPS Enforcement: Enforces HTTPS to secure the app and enable advanced PWA features like service workers and push notifications.

## Style Guidelines:

- Primary color: Soft sky blue (#87CEEB) to evoke a sense of calm and reliability, suitable for an application that emphasizes offline access and dependability.
- Background color: Very light gray (#F0F0F0) to provide a clean, neutral backdrop that emphasizes content readability.
- Accent color: Muted teal (#468499) to highlight interactive elements and call-to-actions, balancing visibility with subtlety.
- Body and headline font: 'PT Sans' for clear and accessible typography suitable for a wide range of devices and user scenarios.
- Fluid grid layout to responsively adapt to different screen sizes.
- Simple, minimalist icons to represent common actions and states.