// Sends a video file straight to Cloudinary in pieces, with the one-time
// signature our server handed out (POST /courses/:id/lessons/:lessonId/video-upload).
// Cloudinary's chunked upload: every piece carries the same signed fields, an
// X-Unique-Upload-Id and its Content-Range; the last answer describes the asset.

export interface IUploadTicket {
  url: string;
  apiKey: string;
  publicId: string;
  timestamp: number;
  type: string;
  signature: string;
  maxBytes: number;
  chunkBytes: number;
}

export type SendPiece = (
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onProgress: (sentBytes: number) => void
) => Promise<{ status: number; body: any }>;

// The byte ranges [start, end) the file is sent in.
export const pieces = (size: number, chunk: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let start = 0; start < size; start += chunk) out.push([start, Math.min(size, start + chunk)]);
  return out;
};

export const uploadVideoInPieces = async (
  file: Blob,
  ticket: IUploadTicket,
  send: SendPiece,
  onProgress: (fraction: number) => void = () => {}
): Promise<{ publicId: string }> => {
  if (file.size > ticket.maxBytes) {
    throw new Error(`The video is larger than ${Math.round(ticket.maxBytes / 1024 / 1024)} MB`);
  }
  const uploadId = `${ticket.publicId.split("/").pop()}-${ticket.timestamp}`;
  let last: any = null;
  for (const [start, end] of pieces(file.size, ticket.chunkBytes)) {
    const form = new FormData();
    form.append("file", file.slice(start, end));
    form.append("api_key", ticket.apiKey);
    form.append("timestamp", String(ticket.timestamp));
    form.append("public_id", ticket.publicId);
    form.append("type", ticket.type);
    form.append("signature", ticket.signature);
    const res = await send(
      ticket.url,
      form,
      { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      (sent) => onProgress(Math.min(1, (start + sent) / file.size))
    );
    if (res.status < 200 || res.status >= 300) {
      throw new Error(res.body?.error?.message || `The upload stopped (error ${res.status}). Try again.`);
    }
    last = res.body;
  }
  onProgress(1);
  return { publicId: last?.public_id || ticket.publicId };
};

// The browser's real sender, with upload progress (fetch can't report it).
export const xhrSend: SendPiece = (url, form, headers, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.send(form);
  });
