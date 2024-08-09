const { chromium } = require("playwright");
const fs = require("fs").promises;
const path = require("path");
const colors = require("colors");
const express = require("express");

console.log("Starting...".bgYellow.black.bold);

// const storageStatePath = path.join(__dirname, "storageState.json");

// async function saveStorage(context) {
//   await context.storageState({ path: storageStatePath });
//   console.log(`Session saved to ${storageStatePath}`);
// }

// async function loadStorage(context) {
//   try {
//     await fs.access(storageStatePath);
//     const storageState = await fs.readFile(storageStatePath, "utf8");
//     await context.addInitScript(() => {
//       localStorage.setItem("key", JSON.parse(storageState));
//     });
//     console.log(`Session loaded from ${storageStatePath}`);
//     return true;
//   } catch (error) {
//     console.error("No saved session found, starting fresh.");
//     return false;
//   }
// }

// async function loadStorage(context) {
//   try {
//     await fs.access(storageStatePath);
//     await context.addCookies(JSON.parse(await fs.readFile(storageStatePath)));
//     console.log(`Session loaded from ${storageStatePath}`);
//     return true;
//   } catch (error) {
//     console.error(`Failed to load session: ${error.message}`);
//     return false;
//   }
// }

//

// Create an instance of an Express application
const app = express();

// Define a port to listen on
const port = 3000;

// Define a route handler for the default home page
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`.red.italic);
});

const FACEBOOK_URL = "https://www.facebook.com";
const USERNAME = "0638209788";
const PASSWORD = "c3Sj58Gt@J0N!#5y";
const PAGE_URL = "https://www.facebook.com/profile.php?id=61563816428554";
const VIDEO_DIR = "./videos";

async function login(page) {
  console.log("Navigating to Facebook.com".italic.grey);
  await page.goto(FACEBOOK_URL);
  console.log("Filling form".italic.grey);

  await page.fill("#email", USERNAME);
  await page.fill("#pass", PASSWORD);

  await page.click('button[name="login"]');
  console.log("Logged in successfully".bgGreen);
}

async function postVideo(page, videoFile, caption) {
  console.log("Clicking 'Photo/video' button...".blue);
  await page.click('text="Photo/video"');
  console.log("'Photo/video' button clicked.".green);

  console.log("Clicking 'Add Photos/Videos' button...".blue);
  await page.click('text="Add Photos/Videos"');
  console.log("'Add Photos/Videos' button clicked.".green);

  console.log("Locating the correct file input element...".blue);
  const inputFile = page.locator(
    'input[type="file"][accept="image/*,image/heif,image/heic,video/*,video/mp4,video/x-m4v,video/x-matroska,.mkv"]'
  );
  console.log("File input element located.".green);

  console.log(`Setting input file to ${videoFile}...`.blue);
  await inputFile.setInputFiles(videoFile);
  console.log(`Input file ${videoFile} set successfully.`.green);

  console.log("Waiting for 5 seconds to ensure the video is loaded...".blue);
  await page.waitForTimeout(10000);
  console.log("Wait completed.".green);

  console.log("Locating caption box...".blue);
  const captionBox = page.locator('div[aria-label="What\'s on your mind?"]');
  console.log("Caption box located.".green);

  console.log(`Filling caption: "${caption}"`);
  await captionBox.fill(caption);
  console.log(caption.Yellow);
  console.log("Caption filled.".green);

  console.log("Clicking 'Post' button...".blue);
  await page.click('text="Post"');
  console.log("Post submitted successfully.".green);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ["notifications"],
  });
  const page = await context.newPage();

  // const isStorageLoaded = await loadStorage(context);
  await login(page);

  // if (!isStorageLoaded) {
  // await saveStorage(context);
  // }

  await page.waitForSelector('span:has-text("What\'s on your mind, Klazi?")');

  console.log("Navigating to Page".underline.white.bgGreen);

  await page.goto(PAGE_URL);

  const buttonSelector = 'text="Switch Now"';
  const buttonExists = await page.$(buttonSelector);

  if (buttonExists) {
    await buttonExists.click();
    const anotherSelector = 'text="What\'s on your mind?"';
    await page.waitForSelector(anotherSelector);
    if (await page.$(anotherSelector)) {
      console.log("Navigated to the page".green);
    } else {
      console.log("Unable to navigate to page".red);
    }
  }

  async function loadVideoData() {
    const data = await fs.readFile("videoPosts.json", "utf8");
    return JSON.parse(data);
  }

  async function saveVideoData(data) {
    await fs.writeFile("videoPosts.json", JSON.stringify(data, null, 2));
  }

  const videoData = await loadVideoData();
  const videoFiles = videoData.videos.map((video) => video.videoFile);
  let videoIndex = videoData.lastPostedIndex;

  try {
    while (true) {
      const video = videoData.videos[videoIndex];
      video.count += 1;
      const caption = `التذكير للمرة ${video.count} بهدف ${video.scorer} في الدقيقة ${video.minute} في مرمى المنتخب المصري`;

      try {
        await postVideo(page, path.join(VIDEO_DIR, video.videoFile), caption);
        video.captions.push(caption);
        videoData.lastPostedIndex = (videoIndex + 1) % videoFiles.length;
        await saveVideoData(videoData);

        console.log(
          `Successfully posted ${video.videoFile}. Moving to next video.`
            .bgGreen.yellow.italic.bold
        );

        await page.goto(PAGE_URL);

        console.log("Reloaded Page".italic.grey);
        //
      } catch (error) {
        console.error(`Error posting video: ${error.message}`.red);
      }

      videoIndex = videoData.lastPostedIndex;

      await new Promise((resolve) => setTimeout(resolve, 3600000)); // 1 hour in milliseconds 3600000
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
