# OneUI React Onboarding & Installation Guide

This guide describes how to install and integrate the **OneUI React** design system libraries into your web applications.

---

## 📦 Package Overview

Ideally, you only need **two core packages** to get started:
1. **`@jds4/oneui-react`**: The core component library (buttons, cards, forms, surfaces, etc.) carrying the design system behaviors and layout engine.
2. **`@jds4/oneui-icons-jio`**: The default icon package containing Jio's official iconography.

### Additional Packages (Bundler Plugins)
If you want to fetch brand data/themes dynamically from the CDN (required for non-default or dynamically updated brands), you will need to install the companion plugin corresponding to your app's bundler:
- **`@jds4/oneui-vite-plugin`** — For Vite applications (also Remix v2+, Astro).
- **`@jds4/oneui-next-plugin`** — For Next.js (Webpack mode) applications.
- **`@jds4/oneui-webpack-plugin`** — For custom Webpack setups (CRA, Gatsby, etc.).
- **`@jds4/oneui-esbuild-plugin`** — For custom esbuild scripts, Bun, or Remix v1.

---

## 🚀 Installation Methods

You can install the OneUI packages using either **local tarball files (`.tgz`)** or directly from the **private Azure DevOps Artifacts Registry**.

### Method A: Direct Install from Local Tarballs (`.tgz` files)
If you have been provided with the local `.tgz` build tarballs (e.g., all 7 packages), you can install them directly without setting up registry authentication. 

Place the tarballs in a local folder (e.g., `./vendor/` or `./packages/`) and install them using your package manager.

#### 1. Core Installation (Vite/React Web App Example)
Assuming your tarballs are in a folder called `./release/tarballs/`:

```bash
# npm
npm install ./release/tarballs/jds4-oneui-react-0.1.0-alpha.10.tgz ./release/tarballs/jds4-oneui-icons-jio-0.1.0-alpha.10.tgz

# pnpm
pnpm add ./release/tarballs/jds4-oneui-react-0.1.0-alpha.10.tgz ./release/tarballs/jds4-oneui-icons-jio-0.1.0-alpha.10.tgz

# yarn
yarn add ./release/tarballs/jds4-oneui-react-0.1.0-alpha.10.tgz ./release/tarballs/jds4-oneui-icons-jio-0.1.0-alpha.10.tgz
```

#### 2. Installing Bundler Plugins (Development Dependency)
If you are building a Vite app and want to use the Vite plugin to load brands from CDN:

```bash
# npm
npm install -D ./release/tarballs/jds4-oneui-vite-plugin-0.1.0-alpha.10.tgz

# pnpm
pnpm add -D ./release/tarballs/jds4-oneui-vite-plugin-0.1.0-alpha.10.tgz

# yarn
yarn add -D ./release/tarballs/jds4-oneui-vite-plugin-0.1.0-alpha.10.tgz
```

---

### Method B: Install via Azure DevOps Private Registry (Recommended for Teams)
The `@jds4/*` packages are hosted on the private **JioDS** package feed in Azure DevOps. To install them, you must authenticate your package manager.

#### 1. Configure authentication in `.npmrc`
Create a `.npmrc` file in the root of your project (in the same directory as your `package.json`):

```ini
# Route `@jds4` packages to the private JioDS registry
@jds4:registry=https://jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/registry/
always-auth=true

# Add feed credentials
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/registry/:username=JIO-DSP
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/registry/:_password=YOUR_BASE64_ENCODED_PAT
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/registry/:email=npm requires email to be set but doesn't use the value
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/:username=JIO-DSP
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/:_password=YOUR_BASE64_ENCODED_PAT
//jio-dsp.pkgs.visualstudio.com/_packaging/JIO-DS-ONE-UI/npm/:email=npm requires email to be set but doesn't use the value
```

> [!NOTE]
> To generate the Base64-encoded token for your credentials:
> 1. Generate a **Personal Access Token (PAT)** in Azure DevOps with **Packaging read & write** scopes.
> 2. Base64 encode it securely. On your command line, run:
>    ```bash
>    node -e "require('readline').createInterface({input:process.stdin,output:process.stdout,historySize:0}).question('PAT> ',p => { b64=Buffer.from(p.trim()).toString('base64');console.log(b64);process.exit(); })"
>    ```
> 3. Paste your raw PAT and press **Enter**.
> 4. Copy the outputted Base64 string and replace `YOUR_BASE64_ENCODED_PAT` in your `.npmrc` file.

#### 2. Run standard installation
Once authenticated, you can install packages standardly:

```bash
# Install core packages
npm install @jds4/oneui-react @jds4/oneui-icons-jio

# Install the matching bundler plugin
npm install -D @jds4/oneui-vite-plugin
```

---

## ⚙️ Companion Plugin Configuration

The bundler plugin hooks into your compile step, reads a brand configuration manifest (`oneui.brands.json`), downloads the requested brand CSS/manifest assets from the CDN at build time, caches them locally, and exposes them to the runtime.

### 1. Brand Configuration: `oneui.brands.json`
Create a `oneui.brands.json` file in your project's root directory:

```json
{
  "cdnUrl": "https://myjiostatic.cdn.jio.com/JDS/react",
  "brands": {
    "jio": "latest",
    "reliance": "latest"
  }
}
```

- **`cdnUrl`**: The root URL of the brand tokens CDN (with `/react` at the end).
- **`brands`**: A key-value map of brand names to target versions. Use `"latest"` or a pinned version (e.g. `"1.0.0"`).

### 2. Setup your Bundler Plugin

#### 🔹 Vite App
In your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { oneui } from '@jds4/oneui-vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    oneui(), // Reads oneui.brands.json in the project root
  ],
});
```

#### 🔹 Next.js App
In your `next.config.js`:

```javascript
const { withOneui } = require('@jds4/oneui-next-plugin');

module.exports = withOneui()({
  // Your existing Next.js config
  reactStrictMode: true,
});
```

#### 🔹 Webpack / Create React App (CRA)
In your `webpack.config.js`:

```javascript
const { oneui } = require('@jds4/oneui-webpack-plugin');

module.exports = {
  // ... webpack configuration
  plugins: [
    oneui(),
  ],
};
```

#### 🔹 esbuild
In your compilation script:

```javascript
import { build } from 'esbuild';
import { oneui } from '@jds4/oneui-esbuild-plugin';

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    oneui(),
  ],
});
```

---

## ⚡ Integration & Basic Usage

### 1. Basic Integration
In your app's main entry point (e.g., `main.tsx` or `index.tsx`), import the CSS styles, wrap your application in the `BrandProvider`, and register the Jio icon set:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 1. Import OneUI core CSS (carries layout, reset, and foundation variables)
import '@jds4/oneui-react/styles';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 2. Rendering Components
In your React components, use `BrandProvider` to specify the active brand scope. You can render components like `Button` and `Icon` inside:

```tsx
import { BrandProvider, Button, Icon } from '@jds4/oneui-react';

export default function App() {
  return (
    // 'jio' is the active brand. Renders zero-config fallback CSS when offline/no-plugin
    <BrandProvider brand="jio">
      <div style={{ padding: '2rem' }}>
        <h2>Welcome to OneUI</h2>
        
        {/* Render a button with semantic icon identifier */}
        <Button attention="high">
          <Icon icon="home" /> Go Home
        </Button>
        
        {/* Render an icon directly using catalog name */}
        <Icon icon="IcCarSide" size="md" />
      </div>
    </BrandProvider>
  );
}
```

---

## ⚠️ Crucial Architectural Rules

### 1. The Surface System Rule (CRITICAL)
OneUI uses context-aware **Surfaces** to resolve component styling. **Do not** apply background colors directly to regular container divs (e.g. `<div style={{ background: 'var(--Primary-Bold)' }}>`) containing OneUI components. Doing so prevents child components from adapting to the background, causing readability and contrast failures.

Instead, wrap containers using the `<Surface>` component:

```tsx
import { Surface, Button } from '@jds4/oneui-react';

// ✅ CORRECT: Child components dynamically adapt their colors to the bold surface
<Surface mode="bold">
  <Button attention="high">Adapts perfectly</Button>
  <Button attention="medium">Readable fill/text</Button>
</Surface>

// ❌ WRONG: Breaks accessibility and contrast due to lack of [data-surface] mapping
<div style={{ background: 'var(--Primary-Bold)' }}>
  <Button attention="low">Invisible / unreadable text on dark background</Button>
</div>
```

Available Surface modes: `default` · `ghost` · `minimal` · `subtle` · `moderate` · `bold` · `elevated`.

---

## 🔍 Troubleshooting & Common Issues

### ❌ Dual React Context / "Invalid Hook Call" Errors
If you run into runtime error screens warning about "Duplicate React" or "Invalid Hook Call" after installing, ensure `react` and `react-dom` are configured as peer dependencies.

#### Cause
Starting from version `0.1.0-alpha.10`, `@jds4/oneui-react` treats React as a peer dependency rather than carrying its own copy. If your app package manager hoists React incorrectly or installs duplicate versions, context will break.

#### Verification & Fix
1. Run `npm ls react` (or `pnpm ls react` / `yarn list react`) inside your app's directory.
2. Confirm there is **exactly one** version of React listed.
3. If duplicates exist, make sure `react` and `react-dom` are added as direct dependencies in your app's `package.json` (`"react": "^18 || ^19"`), then clean and reinstall:
   ```bash
   # Remove lockfile and node_modules, then reinstall
   rm -rf node_modules package-lock.json pnpm-lock.yaml yarn.lock
   npm install # or pnpm install / yarn install
   ```
