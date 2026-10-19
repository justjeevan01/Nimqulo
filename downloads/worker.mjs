// Stream the signed EAS artifact without changing its bytes or signature.
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/Nimqulo-v1.apk") {
      return new Response("Not found", { status: 404 });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const headers = new Headers();
    for (const name of ["Range", "If-Range", "If-None-Match", "If-Modified-Since"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    let artifact;
    try {
      artifact = await fetch(env.APK_URL, { method: request.method, headers, redirect: "follow" });
    } catch {
      return new Response("Download temporarily unavailable", { status: 503 });
    }
    if (![200, 206, 304, 416].includes(artifact.status)) {
      await artifact.body?.cancel();
      return new Response("Download temporarily unavailable", { status: 503 });
    }
    const response = new Response(artifact.body, artifact);
    response.headers.set("Content-Disposition", 'attachment; filename="Nimqulo-v1.apk"');
    response.headers.set("Content-Type", "application/vnd.android.package-archive");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Cache-Control", "no-cache");
    return response;
  },
};
