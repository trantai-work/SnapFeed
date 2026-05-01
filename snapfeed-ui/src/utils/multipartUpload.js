import { uploadPartToS3, videosApi } from "../api/video.api";

const MIN_CHUNK_SIZE = 5 * 1024 * 1024;   // 5MB  — S3 minimum for non-last parts
const MAX_CHUNK_SIZE = 500 * 1024 * 1024; // 500MB — practical upper bound
const TARGET_PARTS = 20;                  // aim for ~20 parts to maximize parallelism
const MAX_CONCURRENT_PARTS = 6;          // browser allows ~6 connections per host

/**
 * Calculate optimal chunk size to produce ~TARGET_PARTS parts,
 * clamped between S3 minimum (5MB) and a practical maximum (500MB).
 */
function getChunkSize(fileSize) {
  const ideal = Math.ceil(fileSize / TARGET_PARTS);
  return Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, ideal));
}

/**
 * Split a File into an array of Blob chunks.
 */
function splitFileIntoChunks(file, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  let offset = 0;
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }
  return chunks;
}

/**
 * Upload a file to S3 using multipart upload.
 *
 * @param {Object} options
 * @param {File}     options.file          - The file to upload
 * @param {Function} options.onProgress    - Called with (percent: number) as upload progresses
 * @param {Object}   options.abortSignal   - AbortSignal to cancel the upload mid-flight
 * @returns {Promise<string>}              - Resolves with the final s3_key
 */
export async function multipartUpload({ file, onProgress, abortSignal }) {
  const fileName = file.name;
  const contentType = file.type || "video/mp4";

  // Step 1: Initiate
  const { uploadId, s3Key } =
    await videosApi.initiateMultipartUpload({ fileName, contentType });

  const chunks = splitFileIntoChunks(file, getChunkSize(file.size));
  const totalParts = chunks.length;
  const concurrency = Math.min(totalParts, MAX_CONCURRENT_PARTS);

  // Track bytes uploaded per part for accurate progress
  const bytesUploadedPerPart = new Array(totalParts).fill(0);

  const reportProgress = () => {
    if (!onProgress) return;
    const totalUploaded = bytesUploadedPerPart.reduce((a, b) => a + b, 0);
    const percent = Math.round((totalUploaded / file.size) * 100);
    onProgress(Math.min(percent, 100));
  };

  const uploadedParts = [];

  try {
    // Step 2: Upload parts with concurrency limit
    let partIndex = 0;

    const uploadNext = async () => {
      while (partIndex < totalParts) {
        if (abortSignal?.aborted) throw new Error("Upload cancelled");

        const currentIndex = partIndex++;
        const partNumber = currentIndex + 1; // S3 part numbers are 1-based
        const chunk = chunks[currentIndex];

        const { presignedUrl } =
          await videosApi.generatePartPresignedUrl({
            s3Key,
            uploadId,
            partNumber,
          });

        if (abortSignal?.aborted) throw new Error("Upload cancelled");

        const etag = await uploadPartToS3({
          presignedUrl,
          chunk,
          onProgress: (loaded) => {
            bytesUploadedPerPart[currentIndex] = loaded;
            reportProgress();
          },
        });

        uploadedParts[currentIndex] = { partNumber, etag };
      }
    };

    // Run up to MAX_CONCURRENT_PARTS workers in parallel
    const workers = Array.from({ length: concurrency }, uploadNext);
    await Promise.all(workers);

    if (abortSignal?.aborted) throw new Error("Upload cancelled");

    // Step 3: Complete
    await videosApi.completeMultipartUpload({ s3Key, uploadId, parts: uploadedParts });

    onProgress?.(100);
    return s3Key;
  } catch (err) {
    // Abort the multipart session on S3 to avoid orphaned parts
    try {
      await videosApi.abortMultipartUpload({ s3Key, uploadId });
    } catch (abortErr) {
      console.error("Failed to abort multipart upload:", abortErr);
    }
    throw err;
  }
}
