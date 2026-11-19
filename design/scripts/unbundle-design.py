# 디자인 번들 HTML(design/v2/Tutor App Design.html) 안에 압축돼 든 파일을 꺼낸다.
# 쓰는 법 (PowerShell): py -I design/scripts/unbundle-design.py "design/v2/Tutor App Design.html" <꺼낼 폴더>
# 결과: <uuid>.woff2/.js 파일들 + template.html(13개 화면 HTML). 꺼낸 폴더는 저장소에 넣지 않는다(임시 폴더 권장).
# 번들 구조: <script type="__bundler/manifest"> = {uuid: {mime, compressed, data(base64)}}, <script type="__bundler/template"> = 화면 HTML(JSON 문자열)
import sys, re, json, base64, gzip, os

EXT = {'font/woff2': '.woff2', 'text/html': '.html', 'text/css': '.css', 'application/javascript': '.js',
       'text/javascript': '.js', 'image/svg+xml': '.svg', 'image/png': '.png'}

def main(src, out):
    page = open(src, encoding='utf-8').read()
    os.makedirs(out, exist_ok=True)
    manifest = json.loads(re.search(r'<script type="__bundler/manifest"[^>]*>(.*?)</script>', page, re.S).group(1))
    for uid, entry in manifest.items():
        data = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            data = gzip.decompress(data)
        open(os.path.join(out, uid + EXT.get(entry['mime'], '.bin')), 'wb').write(data)
    template = json.loads(re.search(r'<script type="__bundler/template"[^>]*>(.*?)</script>', page, re.S).group(1))
    open(os.path.join(out, 'template.html'), 'w', encoding='utf-8').write(template)
    print('꺼낸 파일', len(manifest), '개 + template.html')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
