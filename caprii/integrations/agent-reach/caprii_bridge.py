"""Caprii adapter to pinned Agent Reach public backends; no CLI/setup/session import."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
# Ignore user-installed Python modules and user-specific yt-dlp configuration.
from agent_reach import __version__
from agent_reach.runtime.result import classify
from agent_reach.utils.url import normalize_public_http_url, host_matches


def execute(request):
    operation = request.get('operation')
    if operation == 'status':
        import yt_dlp
        return {'version': __version__, 'mode': 'public-only', 'yt_dlp': yt_dlp.version.__version__,
                'capabilities': ['read', 'search', 'youtube_info', 'youtube_subtitles'],
                'account_import': False, 'paid_transcription': False}
    timeout = 35
    channel = request.get('channel', 'web')
    if channel not in ('web', 'youtube'):
        raise ValueError('Only web and youtube public channels are enabled')
    if channel == 'youtube':
        from agent_reach.channels import youtube
        runtime = os.environ.get('CAPRII_NODE_RUNTIME')
        # Fixed arguments, no user config/cookies/plugins, no fallback to account sessions.
        def argv(*args):
            fixed = ['--ignore-config', '--no-playlist', '--no-cache-dir', '--no-warnings', '--no-plugin-dirs']
            if runtime:
                fixed += ['--js-runtimes', 'node:' + runtime]
            return [sys.executable, '-I', '-B', '-X', 'utf8', '-m', 'yt_dlp', *fixed, *args]
        youtube._ytdlp_argv = argv
        backend = youtube.YouTubeChannel()
    else:
        from agent_reach.channels.web import WebChannel
        backend = WebChannel()
    if operation == 'search':
        query = request.get('query')
        if not isinstance(query, str) or not query.strip() or len(query) > 500:
            raise ValueError('Invalid search query')
        limit = request.get('limit', 5)
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 5:
            raise ValueError('Search limit must be 1..5')
        items = (backend._ytdlp_search(query=query, limit=limit, timeout=timeout) if channel == 'youtube'
                 else backend._exa_search(query=query, limit=limit, timeout=timeout))
    else:
        url = normalize_public_http_url(request.get('url', ''))
        if channel == 'youtube' and not host_matches(url, 'youtube.com', 'youtu.be'):
            raise ValueError('YouTube URL required')
        if operation == 'read':
            items = (backend._ytdlp_read(target=url, timeout=timeout) if channel == 'youtube'
                     else backend._jina_read(target=url, timeout=timeout))
        elif operation == 'subtitles' and channel == 'youtube':
            items = backend._ytdlp_subtitle(target=url, lang='th,en,en-orig', timeout=timeout)
        else:
            raise ValueError('Unsupported operation')
    # Bound tool context; source text is evidence, never system instructions.
    result = []
    remaining = 24000
    truncated = False
    for item in items[:5]:
        clean = {}
        for key, maximum in [('title', 500), ('url', 4000), ('author', 500), ('published_at', 100), ('text', 12000)]:
            raw = item.get(key)
            if raw is None:
                clean[key] = None
                continue
            raw = str(raw)
            keep = min(maximum, remaining)
            clean[key] = raw[:keep]
            remaining -= len(clean[key])
            truncated = truncated or len(raw) > keep
        result.append(clean)
    return {'channel': channel, 'operation': operation, 'items': result, 'truncated': truncated,
            'evidence': 'subtitles' if operation == 'subtitles' else 'metadata' if channel == 'youtube' else 'public_web',
            'note': 'YouTube metadata is not evidence that the video was watched. No audio/video transcription was performed.'}


def main():
    try:
        request = json.loads(sys.stdin.read(16001))
        result = execute(request)
        response = {'ok': True, 'result': result}
    except Exception as exc:
        err = classify(exc)
        response = {'ok': False, 'error': {'code': err.code, 'message': err.message}}
    print(json.dumps(response, ensure_ascii=False))


if __name__ == '__main__':
    main()
