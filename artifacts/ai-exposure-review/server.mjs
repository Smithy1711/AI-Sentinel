import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const publicDir = resolve(rootDir, "dist", "public");
const indexPath = resolve(publicDir, "index.html");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

if (!existsSync(indexPath)) {
  throw new Error("Frontend build output not found. Run the web build before starting the server.");
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);
    const candidatePath = pathname === "/" ? indexPath : resolve(publicDir, `.${pathname}`);

    if (!candidatePath.startsWith(publicDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const filePath = await resolveFilePath(candidatePath);
    const servePath = filePath ?? indexPath;
    const extension = extname(servePath).toLowerCase();

    response.setHeader("Content-Type", contentTypes.get(extension) ?? "application/octet-stream");
    if (servePath !== indexPath) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      response.setHeader("Cache-Control", "no-cache");
    }

    createReadStream(servePath)
      .on("error", (error) => {
        response.writeHead(500);
        response.end("Internal Server Error");
        console.error(error);
      })
      .pipe(response);
  } catch (error) {
    response.writeHead(500);
    response.end("Internal Server Error");
    console.error(error);
  }
}).listen(port, host, () => {
  console.log(`AI Exposure Review web listening on http://${host}:${port}`);
});

async function resolveFilePath(candidatePath) {
  const normalizedPath = normalize(candidatePath);

  try {
    const info = await stat(normalizedPath);

    if (info.isDirectory()) {
      const nestedIndexPath = join(normalizedPath, "index.html");
      const nestedInfo = await stat(nestedIndexPath);

      return nestedInfo.isFile() ? nestedIndexPath : null;
    }

    return info.isFile() ? normalizedPath : null;
  } catch {
    return null;
  }
}
