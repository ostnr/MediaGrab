//anonymous function injected directly into the page, to allow proper interceptions
(async function () {


    //get original twitter fetch and XHR methods
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    //overriding fetch and XML requests
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        tryInterceptResponse(args[0], response.clone());
        return response;
    };

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return originalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
            if (this.responseType !== '' && this.responseType !== 'text') return;
            try {
                const responseText = this.responseText;
                tryInterceptRawResponse(this._url, responseText);
            } catch (e) {
                console.warn('[inject.js] XHR parse error', e);
            }
        });
        return originalXHRSend.apply(this, args);
    };

    //intercepting Fetch API requests
    async function tryInterceptResponse(url, response) {
        if (!url.includes('/i/api/graphql/')) return;

        try {
            const text = await response.text();
            //split for XML parsing
            tryInterceptRawResponse(url, text);
        } catch (e) {
            console.warn('[inject.js] fetch parse error', e);
        }
    }

    //for XHR requests (such as /i/api/1.1/jot/client_event.json )
    function tryInterceptRawResponse(url, text) {
        if (!url.includes('/i/api/graphql/') && !url.includes('/TweetDetail')) return;

        //everything else is essentially the same as before
        try {
            const jsonResponse = JSON.parse(text);

            const parents = findAllParents(jsonResponse, ['media_url_https', 'video_info']);

            if (parents.length > 0) {
                const medias = extractMedias(parents);
                const existing = JSON.parse(sessionStorage.getItem('MediaGrab') || '[]');

                const updated = deduplicateMedia(existing, medias)
                sessionStorage.setItem('MediaGrab', JSON.stringify(updated));

            }
        } catch (e) {
            console.warn('[inject.js] JSON parse error', e);
        }
    }

    //avoiding duplicates in session storage during multiple intercepted calls (reopening the same media)
    function deduplicateMedia(existing, incoming) {

        //Twitter serves the same media across several responses (timeline, TweetDetail,
        //modal) with slightly different variant urls (e.g. different ?tag=). Deduplicating
        //on the resolved url therefore lets the same clip slip in multiple times, which made
        //a single download produce several files (some pointing at a stale/lower quality
        //variant). media_key is stable across all responses, so use it as the primary key
        //and only fall back to the url when it is missing.
        const keyOf = m => m.mediaKey || m.url || m.video?.variants?.[0]?.url;

        //newest occurrence wins so the freshest variant url replaces any stale one
        const byKey = new Map();
        for (const m of existing) byKey.set(keyOf(m), m);
        for (const m of incoming) byKey.set(keyOf(m), m);

        return [...byKey.values()];
    }


    function findAllParents(obj, targetKeys, depth = 4) {
        const results = [];
        const seen = new WeakSet();

        function _traverse(currentObj, path = []) {
            if (!currentObj || seen.has(currentObj)) return;
            seen.add(currentObj);

            const entries = Array.isArray(currentObj)
                ? currentObj.entries()
                : Object.entries(currentObj);

            for (const [key, value] of entries) {
                if (targetKeys.includes(key)) {
                    const ancestor = path[path.length - depth];

                    if (path.length >= depth + 3) {
                        const resultParent = path[path.length - depth - 3];
                        const quotedStatusParent = path[path.length - depth - 2];

                        if (quotedStatusParent?.quoted_status_result && resultParent?.result) {
                            const legacyIdStr = resultParent.result.legacy?.id_str;
                            if (legacyIdStr && ancestor) {
                                ancestor.referencedBy = legacyIdStr;
                            }
                        }
                    }

                    if (ancestor) {
                        results.push(ancestor);
                    }
                }

                if (value && typeof value === 'object') {
                    _traverse(value, [...path, currentObj]);
                }
            }
        }

        _traverse(obj);
        return [...new Set(results)];
    }
})();

