const https = require("https");

const DEFAULT_RANDOM_IMAGE_ENDPOINT = "https://nekos.moe/api/v1/random/image?nsfw=false";
const DEFAULT_IMAGE_BASE_URL = "https://nekos.moe/image/";
const DEFAULT_USER_AGENT = "KawaiiVSCodeColor (https://github.com/EmmiiChan/kawaii-vscode-color)";
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_REDIRECT_LIMIT = 3;
const DEFAULT_JSON_MAX_BYTES = 1024 * 1024;
const DEFAULT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

function createRandomNekoImageFetcher(options = {}) {
  const endpoint = options.endpoint || DEFAULT_RANDOM_IMAGE_ENDPOINT;
  const imageBaseUrl = options.imageBaseUrl || DEFAULT_IMAGE_BASE_URL;
  const imageMaxBytes = options.imageMaxBytes || DEFAULT_IMAGE_MAX_BYTES;
  const redirectLimit = typeof options.redirectLimit === "number" ? options.redirectLimit : DEFAULT_REDIRECT_LIMIT;
  const requestJsonImpl = options.requestJson || ((url, redirectsRemaining) => requestJson(url, redirectsRemaining, options));
  const requestBufferImpl = options.requestBuffer || ((url, maxBytes, redirectsRemaining) => requestBuffer(url, maxBytes, redirectsRemaining, options));

  return async function fetchRandomNekoImage() {
    const payload = await requestJsonImpl(endpoint, redirectLimit);
    const image = getRandomNekoImageFromPayload(payload);
    const imageUrl = getRandomNekoImageUrl(image, imageBaseUrl);
    const response = await requestBufferImpl(imageUrl, imageMaxBytes, redirectLimit);
    const extension = getImageExtensionFromResponse(response.contentType, imageUrl, options);
    const mimeType = getMimeType(extension, options);
    const originalName = `nekos.moe_${image.id}.${extension}`;

    return {
      imageBuffer: response.body,
      extension,
      originalName,
      mimeType
    };
  };
}

function getRandomNekoImageFromPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.images) || payload.images.length === 0) {
    throw new Error("Nekos.moe returned no images.");
  }

  const image = payload.images[0];

  if (!image || typeof image !== "object" || typeof image.id !== "string" || !image.id) {
    throw new Error("Nekos.moe returned an image without a valid id.");
  }

  return image;
}

function getRandomNekoImageUrl(image, imageBaseUrl = DEFAULT_IMAGE_BASE_URL) {
  if (typeof image.image_url === "string" && image.image_url.startsWith("https://nekos.moe/")) {
    return image.image_url;
  }

  return `${imageBaseUrl}${encodeURIComponent(image.id)}`;
}

async function requestJson(url, redirectsRemaining, options = {}) {
  const maxBytes = options.jsonMaxBytes || DEFAULT_JSON_MAX_BYTES;
  const response = await requestBuffer(url, maxBytes, redirectsRemaining, options);

  try {
    return JSON.parse(response.body.toString("utf8"));
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${url}: ${getErrorMessage(error)}`);
  }
}

function requestBuffer(url, maxBytes, redirectsRemaining, options = {}) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    return Promise.reject(new Error(`Unsupported request protocol: ${parsedUrl.protocol}`));
  }

  return new Promise(function createRequest(resolve, reject) {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": options.userAgent || DEFAULT_USER_AGENT
        },
        timeout: options.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS
      },
      function handleResponse(response) {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();

          if (redirectsRemaining <= 0) {
            reject(new Error(`Too many redirects while requesting ${url}.`));
            return;
          }

          const nextUrl = new URL(location, url).toString();
          requestBuffer(nextUrl, maxBytes, redirectsRemaining - 1, options).then(resolve, reject);
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new Error(`Request failed with HTTP ${statusCode} for ${url}.`));
          return;
        }

        const contentLength = Number.parseInt(String(response.headers["content-length"] || "0"), 10);

        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
          response.resume();
          reject(new Error(`Downloaded image must be ${formatFileSize(maxBytes, options)} or smaller.`));
          return;
        }

        const chunks = [];
        let receivedBytes = 0;

        response.on("data", function handleChunk(chunk) {
          receivedBytes += chunk.length;

          if (receivedBytes > maxBytes) {
            request.destroy(new Error(`Downloaded image must be ${formatFileSize(maxBytes, options)} or smaller.`));
            return;
          }

          chunks.push(chunk);
        });

        response.on("end", function handleEnd() {
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] || "")
          });
        });
      }
    );

    request.on("timeout", function handleTimeout() {
      request.destroy(new Error(`Request timed out after ${options.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS} ms: ${url}`));
    });

    request.on("error", reject);
  });
}

function getImageExtensionFromResponse(contentType, imageUrl, options = {}) {
  const mimeExtension = getSupportedImageExtensionFromMimeType(contentType, options);

  if (mimeExtension) {
    return mimeExtension;
  }

  const pathExtension = getSupportedImageExtension(new URL(imageUrl).pathname, options);

  return pathExtension || "jpg";
}

function getSupportedImageExtensionFromMimeType(mimeType, options = {}) {
  const normalizedMimeType = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const mimeTypes = options.mimeTypes || {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml"
  };
  const extension = Object.keys(mimeTypes).find(function matchMimeType(candidateExtension) {
    return mimeTypes[candidateExtension] === normalizedMimeType;
  });

  return extension === "jpeg" ? "jpg" : extension;
}

function getSupportedImageExtension(filePath, options = {}) {
  if (typeof options.getSupportedImageExtension === "function") {
    return options.getSupportedImageExtension(filePath);
  }

  const extension = String(filePath || "").split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "svg"].includes(extension) ? extension : undefined;
}

function getMimeType(extension, options = {}) {
  if (typeof options.getMimeType === "function") {
    return options.getMimeType(extension);
  }

  const mimeTypes = options.mimeTypes || {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml"
  };

  return mimeTypes[extension] || "application/octet-stream";
}

function formatFileSize(bytes, options = {}) {
  if (typeof options.formatFileSize === "function") {
    return options.formatFileSize(bytes);
  }

  return `${bytes} bytes`;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

module.exports = {
  createRandomNekoImageFetcher,
  getImageExtensionFromResponse,
  getRandomNekoImageFromPayload,
  getRandomNekoImageUrl,
  requestBuffer,
  requestJson
};
