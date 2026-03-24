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
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
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

export interface FaceAngle {
    yaw: number;   // left/right rotation (-1 = left, 0 = center, 1 = right)
    pitch: number; // up/down rotation (-1 = up, 0 = center, 1 = down)
}

export async function detectFaceWithLandmarks(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<{ descriptor: Float32Array; angle: FaceAngle } | null> {
    const detection = await faceapi
        .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) return null;

    const landmarks = detection.landmarks;
    const nose = landmarks.getNose();
    const jawline = landmarks.getJawOutline();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate yaw (left/right) — compare nose tip X to face center X
    const faceLeft = jawline[0].x;
    const faceRight = jawline[jawline.length - 1].x;
    const faceWidth = faceRight - faceLeft;
    const faceCenterX = (faceLeft + faceRight) / 2;
    const noseTipX = nose[nose.length - 1].x;
    const yaw = (noseTipX - faceCenterX) / (faceWidth / 2);

    // Calculate pitch (up/down) — compare nose tip Y to eye center Y and jaw center Y
    const eyeCenterY = (leftEye[0].y + rightEye[0].y) / 2;
    const jawCenterY = jawline[Math.floor(jawline.length / 2)].y;
    const faceHeight = jawCenterY - eyeCenterY;
    const noseTipY = nose[nose.length - 1].y;
    const expectedNoseY = eyeCenterY + faceHeight * 0.55;
    const pitch = (noseTipY - expectedNoseY) / (faceHeight * 0.45);

    return {
        descriptor: detection.descriptor,
        angle: {
            yaw: Math.max(-1, Math.min(1, yaw)),
            pitch: Math.max(-1, Math.min(1, pitch)),
        },
    };
}
