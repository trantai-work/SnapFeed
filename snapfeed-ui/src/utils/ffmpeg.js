import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg = null;

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Add log listener to print FFmpeg outputs to console
  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg log]", message);
  });
  
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  
  return ffmpeg;
}

function resolveMusicUrl(url) {
  if (!url) return "";
  let resolvedUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    try {
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      const urlObj = new URL(apiBase);
      resolvedUrl = `${urlObj.protocol}//${urlObj.host}${url}`;
    } catch (e) {
      console.error("Failed to parse VITE_API_URL, fallback to window.location.origin", e);
      resolvedUrl = window.location.origin + url;
    }
  }
  
  // Resilient fallback: rewrite global S3 endpoints to regional ap-southeast-1 endpoints
  // to avoid 307 Redirects which block browser CORS requests
  if (resolvedUrl.includes(".s3.amazonaws.com")) {
    resolvedUrl = resolvedUrl.replace(".s3.amazonaws.com", ".s3.ap-southeast-1.amazonaws.com");
  }
  
  return resolvedUrl;
}

export async function mergeVideoAndMusic(videoFile, musicUrl) {
  const ff = await getFFmpeg();
  
  // Detect actual file container format by checking first 4 bytes
  let inputExt = "mp4";
  try {
    const headerBuffer = await videoFile.slice(0, 4).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    if (headerBytes[0] === 0x1a && headerBytes[1] === 0x45 && headerBytes[2] === 0xdf && headerBytes[3] === 0xa3) {
      inputExt = "webm";
    }
  } catch (e) {
    console.warn("Failed to sniff video file header:", e);
  }

  const videoName = `input.${inputExt}`;
  const outputName = "output.mp4";
  
  console.log("Loading file into FFmpeg.wasm filesystem...", {
    video: videoFile.name,
    sniffedExt: inputExt,
    music: musicUrl || "none (remuxing)"
  });

  // Write video file
  await ff.writeFile(videoName, await fetchFile(videoFile));

  let musicName = "";
  if (musicUrl) {
    const musicExt = musicUrl.split("?")[0].split(".").pop() || "mp3";
    musicName = `music.${musicExt}`;
    const absoluteMusicUrl = resolveMusicUrl(musicUrl);
    await ff.writeFile(musicName, await fetchFile(absoluteMusicUrl));
    
    console.log("Running FFmpeg processing (merge video and music)...");
    await ff.exec([
      "-i", videoName,
      "-i", musicName,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      outputName
    ]);
  } else {
    console.log("Running FFmpeg processing (remuxing raw video)...");
    await ff.exec([
      "-i", videoName,
      "-c:v", "copy",
      "-c:a", "aac",
      "-map", "0:v:0",
      "-map", "0:a?",
      outputName
    ]);
  }
  
  console.log("FFmpeg processing done, reading output file...");
  // Read output
  const data = await ff.readFile(outputName);
  
  // Cleanup virtual filesystem
  try {
    await ff.deleteFile(videoName);
    if (musicName) {
      await ff.deleteFile(musicName);
    }
    await ff.deleteFile(outputName);
  } catch (err) {
    console.error("Cleanup error in virtual files:", err);
  }
  
  // Return file
  return new File([data.buffer], videoFile.name || "recorded-video.mp4", {
    type: "video/mp4"
  });
}
