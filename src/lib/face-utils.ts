// ============================================================
// ValorePro — Face Recognition Utilities
// ============================================================
// Client-side face detection and comparison using face-api.js
// Models loaded on demand from /public/models/
// ============================================================

import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
    if (modelsLoaded) return;

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
}

export async function extractDescriptor(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<Float32Array | null> {
    const detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection?.descriptor ?? null;
}

export function compareFaces(
    stored: number[],
    live: Float32Array,
    threshold = 0.5,
): { match: boolean; distance: number } {
    const storedArr = new Float32Array(stored);
    const distance = faceapi.euclideanDistance(storedArr, live);
    return { match: distance < threshold, distance };
}

export function descriptorToArray(descriptor: Float32Array): number[] {
    return Array.from(descriptor);
}
