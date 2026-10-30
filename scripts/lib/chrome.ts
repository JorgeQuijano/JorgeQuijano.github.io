import { chromium, type Browser } from "playwright-core";

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
];

export async function launchChrome(): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH;
  if (executablePath) {
    return chromium.launch({
      executablePath,
      headless: true,
      args: CHROME_ARGS,
    });
  }

  return chromium.launch({
    channel: "chrome",
    headless: true,
    args: CHROME_ARGS,
  });
}
