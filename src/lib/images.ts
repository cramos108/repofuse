export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      return await bitmapToJpeg(bitmap, 1600, 0.82)
    } finally {
      bitmap.close()
    }
  } catch {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.")
    if (file.size > 4_000_000) {
      throw new Error("That photo is too large to store on this device.")
    }
    return file
  }
}

export async function blobToJpegDataUrl(
  blob: Blob,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    try {
      const jpeg = await bitmapToJpeg(bitmap, 900, 0.72)
      const width = Math.min(900, bitmap.width)
      const height = Math.round(bitmap.height * (width / bitmap.width))
      const dataUrl = await blobToDataUrl(jpeg)
      return { dataUrl, width, height }
    } finally {
      bitmap.close()
    }
  } catch {
    return null
  }
}

async function bitmapToJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not read that photo.")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
  if (!blob) throw new Error("Could not read that photo.")
  return blob
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
  if (!match?.[1]) throw new Error("A condition photo was not a JPEG.")
  const binary = atob(match[1].replace(/\s/g, ""))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: "image/jpeg" })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
