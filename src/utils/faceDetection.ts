import * as faceapi from "face-api.js/build/commonjs/index.js";

let modelsPromise: Promise<void> | null = null;

/** Load the shared detector once in the browser and reuse it for photo uploads. */
export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = faceapi.nets.tinyFaceDetector.loadFromUri("/models").catch((error) => {
      modelsPromise = null;
      console.error("Could not load face detection models:", error);
      throw new Error("Face detection is unavailable right now. Please try again in a moment.");
    });
  }
  return modelsPromise;
}

/** Return the detected face bounds in source-image coordinates, if present. */
export async function detectFace(image: HTMLImageElement) {
  await loadFaceModels();
  const result = await faceapi.detectSingleFace(
    image,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }),
  );
  return result?.box ?? null;
}
