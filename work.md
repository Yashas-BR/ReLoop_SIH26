# ReLoop Mobile App --- Work Split

## Team Setup

We are converting the existing ReLoop React/Vite web application into a
**React Native + Expo mobile app**.

-   **Integration branch:** `mobile-app`
-   **Mobile project:** `mobile/`
-   **Backend:** Existing hosted Node.js + Express + PostgreSQL backend
-   Each developer should work on a separate feature branch created from
    `mobile-app`.

------------------------------------------------------------------------

## Developer 1 --- Rakshitha

**Branch:** `feat/mobile-collector`

### Responsibilities

#### Shared Foundation

-   Maintain Expo / React Native project structure
-   Expo Router and shared navigation
-   Shared API integration
-   Authentication integration
-   Shared reusable mobile components
-   i18n / language support
-   Landing page polish

#### Collector Flow

-   Collector Login
-   Collector Dashboard
-   Create Lot
-   Price Discovery
-   Matched Recyclers
-   Earnings
-   Traceability
-   Collector Lot Detail

------------------------------------------------------------------------

## Developer 2 --- Teammate

**Branch:** `feat/mobile-recycler`

### Responsibilities

#### Recycler Flow

-   Recycler Login
-   Recycler Dashboard
-   Incoming Lots
-   Recycler Lot Detail
-   Recycler Profile

#### Admin Flow

-   Admin Login
-   Admin screens / heatmap

#### Mobile-Specific Features

-   QR scanning
-   Maps and geolocation
-   Later: offline storage and synchronization

------------------------------------------------------------------------

## Git Workflow

Both developers should start from the latest `mobile-app` branch.

### Rakshitha

``` powershell
git checkout mobile-app
git pull origin mobile-app
git checkout -b feat/mobile-collector
```

### Teammate

``` powershell
git checkout mobile-app
git pull origin mobile-app
git checkout -b feat/mobile-recycler
```

After completing a logical feature:

``` powershell
git add .
git commit -m "feat: describe completed feature"
git push origin <your-branch-name>
```

Create a PR / merge the completed work into:

``` text
mobile-app
```

------------------------------------------------------------------------

## Avoiding Merge Conflicts

Try not to modify shared files at the same time, especially:

``` text
mobile/src/app/_layout.tsx
mobile/api/
mobile/services/
mobile/components/
mobile/i18n/
```

Rakshitha owns the shared architecture initially. If the teammate needs
a shared change, coordinate it first and pull the latest `mobile-app`
changes before continuing.

------------------------------------------------------------------------

## Recommended Development Order

**Rakshitha**

``` text
Landing
   ↓
Collector Login
   ↓
Collector Dashboard
   ↓
Create Lot
   ↓
Price Discovery
   ↓
Matched Recyclers
   ↓
Earnings
   ↓
Traceability
```

**Teammate**

``` text
Recycler Login
   ↓
Recycler Dashboard
   ↓
Incoming Lots
   ↓
Recycler Lot Detail
   ↓
Recycler Profile
   ↓
Admin Flow
   ↓
QR / Maps
```

Once the main online flows are stable, both developers can work together
on **offline storage and synchronization**.

------------------------------------------------------------------------

## Current Mobile Status

Completed before the split:

-   Expo React Native project initialized under `mobile/`
-   `mobile-app` branch created
-   Mobile app connected to the hosted backend
-   Backend health endpoint tested successfully
-   Environment variable setup added
-   Landing page converted to React Native
-   Expo starter Home/Explore navigation removed
-   Expo Router Stack navigation configured
-   App tested on a physical Android device using Expo Go

------------------------------------------------------------------------

## Main Rule

Do **not** develop directly on `mobile-app`.

Use individual feature branches and merge tested work into `mobile-app`.
This keeps `mobile-app` as the integration branch for the complete
mobile application.
