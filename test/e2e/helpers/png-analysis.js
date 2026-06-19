const assert = require("node:assert/strict");
const fs = require("fs");
const zlib = require("zlib");

function decodePng(filePath) {
    const input = fs.readFileSync(filePath);
    const signature = input.subarray(0, 8).toString("hex");

    assert.equal(signature, "89504e470d0a1a0a", `Expected PNG image at ${filePath}`);

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks = [];

    while (offset < input.length) {
        const length = input.readUInt32BE(offset);
        const type = input.subarray(offset + 4, offset + 8).toString("ascii");
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        const chunkData = input.subarray(dataStart, dataEnd);

        if (type === "IHDR") {
            width = chunkData.readUInt32BE(0);
            height = chunkData.readUInt32BE(4);
            bitDepth = chunkData[8];
            colorType = chunkData[9];
        } else if (type === "IDAT") {
            idatChunks.push(chunkData);
        } else if (type === "IEND") {
            break;
        }

        offset = dataEnd + 4;
    }

    assert.equal(bitDepth, 8, "PNG parser supports 8-bit screenshots.");
    assert.ok(colorType === 2 || colorType === 6, `PNG parser supports RGB/RGBA screenshots, got color type ${colorType}.`);

    const channels = colorType === 6 ? 4 : 3;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const stride = width * channels;
    const pixels = Buffer.alloc(width * height * channels);
    let inputOffset = 0;

    for (let y = 0; y < height; y++) {
        const filter = inflated[inputOffset];
        inputOffset += 1;
        const rowOffset = y * stride;
        const previousRowOffset = (y - 1) * stride;

        for (let x = 0; x < stride; x++) {
            const raw = inflated[inputOffset];
            inputOffset += 1;

            const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
            const up = y > 0 ? pixels[previousRowOffset + x] : 0;
            const upLeft = y > 0 && x >= channels ? pixels[previousRowOffset + x - channels] : 0;

            pixels[rowOffset + x] = (raw + getPngFilterValue(filter, left, up, upLeft)) & 0xff;
        }
    }

    return { width, height, channels, data: pixels };
}

function comparePngFiles(beforePath, afterPath, options = {}) {
    const beforePng = decodePng(beforePath);
    const afterPng = decodePng(afterPath);
    const width = Math.min(beforePng.width, afterPng.width);
    const height = Math.min(beforePng.height, afterPng.height);
    const threshold = options.threshold === undefined ? 6 : options.threshold;
    let changedPixels = 0;
    let totalDifference = 0;
    let maxDifference = 0;
    let sampleCount = 0;

    assert.ok(width > 0 && height > 0, "Expected screenshots to have a comparable visible area.");

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const beforePixel = getPngPixel(beforePng, x, y);
            const afterPixel = getPngPixel(afterPng, x, y);
            const difference = (
                Math.abs(beforePixel.red - afterPixel.red)
                + Math.abs(beforePixel.green - afterPixel.green)
                + Math.abs(beforePixel.blue - afterPixel.blue)
            ) / 3;

            totalDifference += difference;
            maxDifference = Math.max(maxDifference, difference);
            sampleCount += 1;

            if (difference > threshold) {
                changedPixels += 1;
            }
        }
    }

    const meanDifference = sampleCount > 0 ? totalDifference / sampleCount : 0;
    const changedRatio = sampleCount > 0 ? changedPixels / sampleCount : 0;
    const dimensionChanged = beforePng.width !== afterPng.width || beforePng.height !== afterPng.height;

    return {
        beforePath,
        afterPath,
        beforeWidth: beforePng.width,
        beforeHeight: beforePng.height,
        afterWidth: afterPng.width,
        afterHeight: afterPng.height,
        comparedWidth: width,
        comparedHeight: height,
        sampleCount,
        meanDifference,
        maxDifference,
        changedRatio,
        dimensionChanged,
        hasVisualChange: dimensionChanged
            || (meanDifference >= (options.minMeanDifference || 0.35)
                && maxDifference >= (options.minMaxDifference || 8)
                && changedRatio >= (options.minChangedRatio || 0.002))
    };
}

function assertPngVisualChange(label, beforePath, afterPath, options = {}) {
    const analysis = comparePngFiles(beforePath, afterPath, options);

    assert.equal(
        analysis.hasVisualChange,
        true,
        `Expected visual change for ${label}. Analysis: ${JSON.stringify(analysis)}`
    );

    return analysis;
}

function getPngPixelRatio(filePath, predicate) {
    const png = decodePng(filePath);
    let matched = 0;
    const total = png.width * png.height;

    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const pixel = getPngPixel(png, x, y);

            if (predicate(pixel)) {
                matched += 1;
            }
        }
    }

    return {
        filePath,
        width: png.width,
        height: png.height,
        matched,
        total,
        ratio: total > 0 ? matched / total : 0
    };
}

function assertPngPixelRatio(label, filePath, predicate, minRatio) {
    const analysis = getPngPixelRatio(filePath, predicate);

    assert.ok(
        analysis.ratio >= minRatio,
        `Expected ${label} pixel ratio >= ${minRatio}. Analysis: ${JSON.stringify(analysis)}`
    );

    return analysis;
}

function getPngLuminanceRange(filePath) {
    const png = decodePng(filePath);
    let minLuminance = Number.POSITIVE_INFINITY;
    let maxLuminance = Number.NEGATIVE_INFINITY;
    const total = png.width * png.height;

    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const pixel = getPngPixel(png, x, y);
            const luminance = (0.2126 * pixel.red) + (0.7152 * pixel.green) + (0.0722 * pixel.blue);

            minLuminance = Math.min(minLuminance, luminance);
            maxLuminance = Math.max(maxLuminance, luminance);
        }
    }

    return {
        filePath,
        width: png.width,
        height: png.height,
        total,
        minLuminance,
        maxLuminance,
        luminanceRange: maxLuminance - minLuminance
    };
}

function assertPngHasContrast(label, filePath, minLuminanceRange) {
    const analysis = getPngLuminanceRange(filePath);

    assert.ok(
        analysis.luminanceRange >= minLuminanceRange,
        `Expected ${label} luminance range >= ${minLuminanceRange}. Analysis: ${JSON.stringify(analysis)}`
    );

    return analysis;
}

function getPngPixel(png, x, y) {
    const offset = (y * png.width + x) * png.channels;

    return {
        red: png.data[offset],
        green: png.data[offset + 1],
        blue: png.data[offset + 2],
        alpha: png.channels === 4 ? png.data[offset + 3] : 255
    };
}

function getPngFilterValue(filter, left, up, upLeft) {
    switch (filter) {
        case 0:
            return 0;
        case 1:
            return left;
        case 2:
            return up;
        case 3:
            return Math.floor((left + up) / 2);
        case 4:
            return paethPredictor(left, up, upLeft);
        default:
            throw new Error(`Unsupported PNG filter type: ${filter}`);
    }
}

function paethPredictor(left, up, upLeft) {
    const estimate = left + up - upLeft;
    const leftDistance = Math.abs(estimate - left);
    const upDistance = Math.abs(estimate - up);
    const upLeftDistance = Math.abs(estimate - upLeft);

    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
        return left;
    }

    if (upDistance <= upLeftDistance) {
        return up;
    }

    return upLeft;
}

module.exports = {
    assertPngHasContrast,
    assertPngPixelRatio,
    assertPngVisualChange,
    comparePngFiles,
    decodePng,
    getPngPixelRatio
};
