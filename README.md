<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1K35n8bxi3b_YHY72GzOEn2YyJv6ex2S7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```sh
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (if it's not already set).

3. Run the app:
   ```sh
   npm run dev
   ```

Your app will be available at `http://localhost:5173`.

The recipe import feature now uses the CORS proxy at `https://cors.bivort.de` and no longer requires a local proxy server to be started.
