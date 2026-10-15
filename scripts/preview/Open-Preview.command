#!/bin/bash
# Bona Fide website — LOCAL preview launcher (macOS: double-click).
# Serves the ./site folder on THIS computer only (127.0.0.1). Nothing is uploaded or published;
# no accounts, passwords or internet connection are used. Close this window (or press Control-C) to stop.
cd "$(dirname "$0")/site" || { echo "Cannot find the 'site' folder next to this file."; read -r -p "Press Return to close."; exit 1; }

PORT=8765
URL="http://127.0.0.1:${PORT}/"

if /usr/bin/nc -z 127.0.0.1 "$PORT" >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use. Close any other preview window first, then try again."
  read -r -p "Press Return to close."; exit 1
fi

# Pick a server already present on the Mac (first match wins).
if [ -x /usr/bin/python3 ] && /usr/bin/xcode-select -p >/dev/null 2>&1; then
  SERVER=(/usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1)
elif command -v python3 >/dev/null 2>&1 && [ "$(uname)" != "Darwin" ]; then
  SERVER=(python3 -m http.server "$PORT" --bind 127.0.0.1)
elif [ -x /usr/bin/ruby ]; then
  SERVER=(/usr/bin/ruby -run -e httpd . -b 127.0.0.1 -p "$PORT")
elif command -v node >/dev/null 2>&1; then
  SERVER=(node -e '
    const http=require("http"),fs=require("fs"),path=require("path");
    const T={".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json",".xml":"application/xml",".txt":"text/plain",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".webp":"image/webp",".ico":"image/x-icon",".pdf":"application/pdf",".woff":"font/woff",".woff2":"font/woff2"};
    http.createServer((q,r)=>{let p=path.normalize(decodeURIComponent(q.url.split("?")[0])).replace(/^(\.\.[\/\\])+/,"");
      let f=path.join(process.cwd(),p);
      if(fs.existsSync(f)&&fs.statSync(f).isDirectory()){if(!q.url.split("?")[0].endsWith("/")){r.writeHead(301,{Location:q.url.split("?")[0]+"/"});return r.end();}f=path.join(f,"index.html");}
      fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end("Not found");}r.writeHead(200,{"Content-Type":T[path.extname(f).toLowerCase()]||"application/octet-stream"});r.end(d);});
    }).listen('"$PORT"',"127.0.0.1");')
else
  echo "This Mac has no built-in web server tool available."
  echo "Please see READ-ME-FIRST.txt (section 'If the double-click does not work')."
  read -r -p "Press Return to close."; exit 1
fi

echo "Bona Fide website PREVIEW (local only, not the live site)."
echo "Opening ${URL} in your browser. Leave this window open while you look around."
echo "To stop: close this window."
( sleep 2; open "$URL" ) >/dev/null 2>&1 &
exec "${SERVER[@]}"
