
# Product Requirements Document (PRD): Udhar Pay

---

## 1. Introduction & Vision

### 1.1 Product Name
Udhar Pay

### 1.2 Vision
To create a seamless, digital, and trustworthy ecosystem for managing credit (udhaar) transactions between local shopkeepers and their customers in India. Our vision is to replace the traditional paper-based "bahi-khata" system with a secure, transparent, and easy-to-use digital ledger, fostering financial clarity and trust within local communities.

### 1.3 Target Audience
*   **Primary:** Small to medium-sized shopkeepers and retail business owners in India who extend informal credit to their customers.
*   **Secondary:** Regular customers of these shops who rely on credit for their daily purchases.

### 1.4 Core Problem
The traditional credit system relies on manual record-keeping, which is prone to errors, disputes, and lack of transparency. This often leads to financial losses for shopkeepers and misunderstandings with customers. Udhar Pay aims to solve this by providing a single, reliable platform for tracking all credit and payment activities.

---

## 2. User Roles & Personas

The platform is designed for three distinct user roles:

### 2.1 Customer
*   **Description:** An individual who purchases goods or services on credit from a connected shopkeeper.
*   **Goals:**
    *   To easily track their outstanding credit (udhaar) with multiple shops.
    *   To make secure digital payments to clear their dues.
    *   To view a clear history of all their transactions.
    *   To request credit from a shopkeeper when needed.

### 2.2 Shopkeeper
*   **Description:** A business owner who sells goods/services and offers credit to their trusted customers.
*   **Goals:**
    *   To digitally manage all customer credit accounts in one place.
    *   To reduce errors and disputes related to credit tracking.
    *   To accept secure digital payments from customers.
    *   To analyze business performance, such as total outstanding credit and payment collections.
    *   To manage credit limits for individual customers.

### 2.3 Owner (Platform Administrator)
*   **Description:** The administrator and manager of the entire Udhar Pay platform.
*   **Goals:**
    *   To have a high-level overview of the platform's health and performance.
    *   To manage platform-wide settings, such as commission rates.
    *   To monitor the ecosystem of users (customers and shopkeepers).
    *   To broadcast important messages to all users.
    *   To manage financial settlements and platform revenue.

---

## 3. Features & Functionalities

### 3.1 Common Features (Available to all roles)
*   **Onboarding/Intro Screens:** A series of introductory screens explaining the app's purpose and benefits.
*   **Role Selection:** A clear entry point for users to choose whether they are signing in as a Customer, Shopkeeper, or (hidden access for) Owner.
*   **Authentication:**
    *   Secure OTP-based login using a mobile number for Customers and Shopkeepers.
    *   Secure Email/Password login for the Platform Owner.
*   **Profile Setup (Onboarding):** A guided process for new users to set up their profile, including name and profile picture.
*   **Profile Management:** Users can edit their name and profile picture after registration.
*   **PIN Lock Security:** Users can set a 4-digit PIN to lock the app for added security.
*   **Helpline Access:** A dedicated page providing support via Call, WhatsApp, and Email.
*   **Policy Pages:** Access to legal documents like Terms & Conditions, Privacy Policy, and Refund Policy.

### 3.2 Customer-Specific Features

#### **Pages:**
1.  **Dashboard (`/customer/dashboard`):**
    *   Displays the user's unique "Customer Code".
    *   Shows the total outstanding credit (Total Udhaar) across all connected shops.
    *   Provides a simple form to connect with a new shopkeeper using their Shopkeeper Code.
    *   Lists all connected shopkeepers in a card format, showing the balance with each.
    *   Displays a notification bell for pending credit requests and owner messages.

2.  **Payment & History Page (`/customer/payment/[shopkeeperId]`):**
    *   Shows the detailed transaction history with a specific shopkeeper.
    *   Displays the current balance (Udhaar or Advance) with that shopkeeper.
    *   Provides an interface to make a payment to the shopkeeper via a payment gateway.

3.  **Transaction Ledger (`/customer/ledger`):**
    *   A consolidated list of all transactions (credit taken and payments made) across all connected shops, sorted by date.

4.  **Scan QR Code (`/customer/scan`):**
    *   Opens the device camera to scan a shopkeeper's QR code.
    *   If not connected, it initiates a connection request.
    *   If already connected, it redirects to the credit request page for that shopkeeper.

5.  **Request Credit (`/customer/request-credit/[shopkeeperId]`):**
    *   Allows a customer to send a formal credit request to a shopkeeper by entering an amount and optional notes.
    *   Shows the real-time status of the sent request (Pending, Approved, Rejected).

6.  **AI Voice Assistant (`/customer/ai-assistant/voice`):**
    *   A full-screen, voice-first conversational AI to help users with queries.
    *   Supports both Hindi and English.
    *   Provides text-based chat as an alternative.

7.  **Profile & Settings (`/customer/profile`):**
    *   Allows editing of name and profile photo.
    *   Manages app security settings, like enabling/disabling the PIN lock.
    *   Provides an option to enroll as a Shopkeeper.

### 3.3 Shopkeeper-Specific Features

#### **Pages:**
1.  **Dashboard (`/shopkeeper/dashboard`):**
    *   The central hub for giving credit (Udhaar). Features a calculator-like interface to enter amounts.
    *   Allows the shopkeeper to select a customer and send a credit request for their approval.
    *   Shows the real-time status of the credit request.
    *   Displays the shopkeeper's unique code and a QR code for customers to scan.
    *   Shows a notification bell for pending connection requests from new customers.

2.  **Customers List (`/shopkeeper/customers`):**
    *   Lists all connected customers.
    *   Each customer card displays their current outstanding balance and credit limit.
    *   Provides a search bar to find customers by name or code.
    *   Clicking on a customer navigates to their detailed transaction history.

3.  **Customer Transaction History (`/shopkeeper/customer/[customerId]`):**
    *   Shows a complete ledger of all transactions (credit given, payments received) for a specific customer.
    *   Displays the customer's total outstanding balance.

4.  **Analysis Page (`/shopkeeper/analysis`):**
    *   Provides key business insights:
        *   Total number of customers.
        *   Number of customers currently on credit.
        *   Total outstanding credit in the market.
        *   Total payments received to date.

5.  **Wallet & Payments (`/shopkeeper/wallet`):**
    *   Explains the payment settlement process (e.g., weekly settlements).
    *   Provides an interface to set up or update the payment QR code and a security PIN for updating it.
    *   Contains information on how to request an early settlement if needed.

6.  **Credit Control Room (`/shopkeeper/control-room`):**
    *   Allows the shopkeeper to set a "Default Credit Limit" for all new customers.
    *   Provides a list of all customers, allowing the shopkeeper to:
        *   Set a custom (manual) credit limit for specific individuals.
        *   Enable or disable the credit facility for any customer.

7.  **Profile & Settings (`/shopkeeper/profile`):**
    *   Allows editing of shop name and photo.
    *   Manages app security settings (PIN lock).
    *   Provides an option to enroll as a Customer.

### 3.4 Owner-Specific Features

#### **Pages:**
1.  **Dashboard (`/owner/dashboard`):**
    *   A high-level overview of the platform's health.
    *   Key metrics: Total Customers, Total Shopkeepers, Total Outstanding Credit on the platform, and Total Platform Profit.
    *   Shows recent platform-wide transactions.

2.  **Ecosystem Management (`/owner/ecosystem`):**
    *   Lists all registered shopkeepers on the platform.
    *   Allows the owner to search for a specific shopkeeper.
    *   Provides quick actions like viewing a shopkeeper's QR code or contacting them via WhatsApp.
    *   Clicking on a shopkeeper navigates to their detailed "Jeevan Kundli" page.

3.  **Shopkeeper "Jeevan Kundli" (`/owner/shopkeeper/[shopkeeperId]`):**
    *   A detailed 360-degree view of a single shopkeeper, including:
        *   Profile information.
        *   Financials: Live pending settlement amount and total outstanding credit given by them.
        *   Customer Analytics: Total connected customers, customers on credit, etc.
        *   Security details: Status of their app lock PIN and QR update PIN.

4.  **Platform Control (`/owner/control`):**
    *   Allows the owner to set and update the platform-wide commission rate.
    *   Displays detailed analytics on commission revenue (total earned, pending, earned in last 24h/30d).

5.  **Settlements/Wallet (`/owner/wallet`):**
    *   Displays the total pending settlement amount to be paid to all shopkeepers.
    *   Lists each shopkeeper with a pending settlement and the amount.
    *   Provides an interface to record a settlement (e.g., marking a payment as made via UPI, Bank Transfer, or Cash) and update the system.

6.  **Notifications (`/owner/notifications`):**
    *   A tool to broadcast messages to all Customers, all Shopkeepers, or both.
    *   Shows a history of all previously sent messages and allows for their deletion.

7.  **Loan Applications (`/owner/loan-applications`):**
    *   Lists all loan applications submitted by users (customers and shopkeepers).
    *   Allows the owner to view application details (amount, purpose, tenure) and approve or reject them.

8.  **Settings (`/owner/settings`):**
    *   Allows the owner to manage their own account security, such as enabling or changing the 8-digit login PIN.
    *   Contains the sign-out option.
