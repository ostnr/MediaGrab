const downloadButton = '<div class="ProfileTweet-action tva_download_action"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton tva_js_download" type="button"><div class="IconContainer js-tooltip" data-original-title="Video Download"><span class="Icon Icon--medium tva_download_icon"></span><span class="u-hiddenVisually"></span></div></button></div>'
const progressPopup = '<div class="stream-item tva_ext_container tva_hide" aria-live="polite"><div class="tva_ext_spinner"><div class="tva_spinner"></div></div><div class="tva_ext_text_box"><p class="tva_ext_text">GIF Converting...</p></div></div>'
const downloadIcon = '<g xmlns="http://www.w3.org/2000/svg"><path d="M 21 15 L 20.98 18.51 C 20.98 19.89 19.86 21 18.48 21 L 5.5 21 C 4.11 21 3 19.88 3 18.5 L 3 15 L 5 15 L 5 18.5 C 5 18.78 5.22 19 5.5 19 L 18.48 19 C 18.76 19 18.98 18.78 18.98 18.5 L 19 15 L 21 15 Z M 12 16 L 17.7 10.3 L 16.29 8.88 L 13 12.18 L 13 2.59 L 11 2.59 L 11 12.18 L 7.7 8.88 L 6.29 10.3 L 12 16 Z" style=""/></g>'
const reactProgressPopup = '<div class="tva-react-spinner-wrapper"><div class="tva_spinner tva_spinner_old"></div><span class="css-901oao css-16my406 r-1qd0xha r-ad9z0x r-bcqeeo r-qvutc0">GIFing...</span></div>'

const modalCalss = 'div[aria-modal="true"]'

const targetNode = document.body
const config = { childList: true, subtree: true }

const callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                injectAdditionalDownloadButtons(node)
            })
        }
    }
}

const observer = new MutationObserver(callback)
observer.observe(targetNode, config)

$(document).on({
    mouseenter: function (e) {
        $(e.currentTarget).find('svg').prev().addClass('r-zv2cs0')
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-13gxpu9')
    },
    mouseleave: function (e) {
        $(e.currentTarget).find('svg').prev().removeClass('r-zv2cs0')
        $(e.currentTarget).find('svg').prev().parent().parent().addClass('r-111h2gw')
        $(e.currentTarget).find('svg').prev().parent().parent().removeClass('r-13gxpu9')
    }
}, ".tva-download-icon")

const CAPTURE_INTERVAL = 33
const PLAY_SPEED_RATE = 2.0

// Active GIF encoders keyed by source filename (content-script side; SW has no DOM).
let gifWorkerSpace = {}

let hideViewCount = false
browser.runtime.onMessage.addListener(handleBackgroundMessage)
browser.storage.sync.get({ hideViewCount: true }).then((items) => {
    hideViewCount = items.hideViewCount
})

function initialize() {
    $(".tweet").each(function () {
        injectDownloadButton(this)
    })
    $("body").append(progressPopup)
    $(".tva_ext_container").css("z-index", getMaximumZindex() + 1)
}

function injectAdditionalDownloadButtons(insertedElement) {
    const tweets = $(insertedElement).find('article')

    if (tweets.length) {
        tweets.each((index, element) => {
            analysisDom(element)
        })
    } else {
        analysisDom(insertedElement)
    }

    $(insertedElement).find('.AdaptiveMedia-video').each(function () {
        injectDownloadButton(this)
    })
}

function hasMedia(element) {
    const isImage = element.outerHTML.includes('pbs.twimg.com/media')
    const isVideo = $(element).html().includes('video')

    return isImage || isVideo
}

function analysisDom(content) {
    if (hideViewCount) {
        removeStatIcon(content)
    }

    if (hasMedia(content)) {
        injectReactDownloadButton(content)
    }
}

// The action bar is the role="group" that holds the reply/retweet/like buttons.
// Picking it by testid is far more robust than relying on "the last group", which
// breaks on quoted tweets, cards and other nested groups.
function findActionBar(scope) {
    const groups = $(scope).find('div[role="group"]')
    const actionTestids = 'button[data-testid="reply"], button[data-testid="retweet"], button[data-testid="unretweet"], button[data-testid="like"], button[data-testid="unlike"], button[data-testid="bookmark"]'

    for (const groupElement of groups.toArray()) {
        const group = $(groupElement)
        if (group.find(actionTestids).length) {
            return group
        }
    }
    return $()
}

// Prefer a non-disabled action item as the clone source. When comments are
// disabled, the reply button (usually first) is greyed out via X's CSS; cloning
// it made our download button look disabled even though it still worked.
function pickTemplateItem(group) {
    const items = group.children('div')
    if (!items.length) {
        return $()
    }

    // Only neutral (inactive) states — unlike/unretweet carry red/green accent
    // colors that would make the download icon look "active".
    const preferredTestids = ['like', 'retweet', 'bookmark']
    for (const testid of preferredTestids) {
        const button = group.find(`button[data-testid="${testid}"]`).get(0)
        if (!button) {
            continue
        }
        const item = items.filter((_i, el) => el.contains(button)).first()
        if (item.length) {
            return item
        }
    }

    // Fall back to the first item whose button is not disabled.
    for (const el of items.toArray()) {
        const button = el.querySelector('button')
        if (!button) {
            continue
        }
        if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
            continue
        }
        return $(el)
    }

    return items.first()
}

// Build our download button by cloning a real X action item, so we inherit X's
// exact markup and CSS classes instead of hardcoding class names that rot on every
// redesign. The original (template) is never mutated, which keeps the neighbouring
// buttons (reply/retweet/like/share) intact.
function buildDownloadButton(templateItem, tweetSelector) {
    const download = templateItem.clone()
    download.addClass('tva-download-icon')

    // drop any like/retweet counters carried over from the template
    download.find('span').remove()

    const button = download.find('button')
    // Strip disabled state thoroughly (attrs alone are not enough for some clones).
    button.removeAttr('aria-disabled').removeAttr('disabled').removeAttr('tabindex')
    button.prop('disabled', false)
    button.attr('data-testid', 'download').attr('aria-label', 'Media Download')
    download.children('div:first-child').attr('aria-label', 'Media Download')
        .removeAttr('aria-disabled')

    const svg = download.find('svg').first()
    svg.attr('viewBox', '0 0 24 24').html(downloadIcon)

    // pass the selector as jQuery event data (read back as event.data)
    download.click(tweetSelector, downloadMediaObject)

    return download
}

function injectActionBarDownloadButton(scope, tweetSelector, markerClass) {
    const group = findActionBar(scope)
    if (!group.length || group.find('.tva-download-icon').length) {
        return
    }

    const template = pickTemplateItem(group)
    if (!template.length) {
        return
    }

    const download = buildDownloadButton(template, tweetSelector)
    if (markerClass) {
        download.addClass(markerClass)
    }

    // Anchor our button right before the Share item so the order is identical
    // for photos and videos. Inserting before "the last div" is unreliable: on
    // video posts X renders an extra/non-div item in the bar, which pushed the
    // last div back to bookmark and made our button land in a different spot.
    const allItems = group.children()
    const shareItem = allItems.filter((_i, el) => {
        if (el.querySelector('button[data-testid="share"]')) {
            return true
        }
        // case-insensitive aria-label match in plain JS: jQuery/Sizzle throws on
        // the CSS `i` flag (e.g. [aria-label*="Share" i]), which would break the
        // whole injection and remove the button entirely.
        return Array.from(el.querySelectorAll('button')).some(button => {
            const label = (button.getAttribute('aria-label') || '').toLowerCase()
            return label.includes('share') || label.includes('teilen')
        })
    }).first()
    const anchor = shareItem.length ? shareItem : allItems.last()
    anchor.before(download)
}

function injectReactModalDownloadButton(modal) {
    injectActionBarDownloadButton(modal, modalCalss, 'tva-modal-download-icon')
}

function removeStatIcon(content) {
    const tweet = $(content).closest('article')
    const iconsGroups = tweet.find('div[role="group"]')
    const dateStatLabel = tweet.find('div.css-1dbjc4n.r-1d09ksm.r-1471scf.r-18u37iz.r-1wbh5a2')

    for (const groupElement of iconsGroups) {
        const group = $(groupElement)
        const statIcon = group.find('path[d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"]')
        statIcon.parents('div.css-1dbjc4n.r-18u37iz.r-1h0z5md').remove()
    }

    if (dateStatLabel.length > 0) {
        dateStatLabel.children('div.r-1q142lx.r-s1qlax').remove()
        dateStatLabel.children('div.r-1nao33i').remove()
    }
}

function injectReactDownloadButton(target) {
    var tweet = $(target).closest('article')

    if (!tweet.length) {
        const modal = $(target).closest(modalCalss)
        injectReactModalDownloadButton(modal)
        return
    }

    injectActionBarDownloadButton(tweet, 'article')
}

function injectDownloadButton(target) {
    var tweet = $(target).closest('.tweet')
    if (!isVideoExist(tweet)) {
        return
    }

    if (isVideoDownloadButton(tweet)) {
        return
    }

    var favIcon = $(tweet).find('div.ProfileTweet-action--favorite')[0]
    $(favIcon).after(downloadButton)
    $(favIcon).siblings(".tva_download_action").find('button.tva_js_download').click('.tweet', downloadMediaObject)
}

async function downloadMediaObject(event) {

    event.stopPropagation()
    event.preventDefault()

    const tweetSelector = event.data

    const tweet = $(event.currentTarget).closest(tweetSelector)

    const sessionData = JSON.parse(sessionStorage.getItem('MediaGrab') || '[]');

    const mainTweetId = extractMainTweetId(tweet);

    // When a post quotes another post that also has media, the quoted media is
    // tagged with `referencedBy === mainTweetId`.
    const { downloadQuotedMedia } = await browser.storage.sync.get({ downloadQuotedMedia: false });

    const ownMedia = sessionData.filter(media => media.tweetId === mainTweetId);
    const quotedMedia = sessionData.filter(media => media.referencedBy === mainTweetId);

    // The "downloadQuotedMedia" option only governs grabbing the quoted media *in
    // addition to* the post's own media. When the post has no media of its own (a
    // pure quote-tweet), the quoted media is the only thing to download, so we
    // always include it — otherwise the button would silently do nothing.
    const includeQuoted = downloadQuotedMedia || ownMedia.length === 0;
    const relatedMedia = includeQuoted ? [...ownMedia, ...quotedMedia] : ownMedia;

    //guard against duplicate entries that may still have accumulated in session storage so
    //a single click never downloads the same media more than once
    const sent = new Set();
    relatedMedia.forEach(media => {
        const key = media.mediaKey || media.url;
        if (sent.has(key)) {
            return;
        }
        sent.add(key);
        browser.runtime.sendMessage(media);
    });
}

function extractMainTweetId(articleElem) {
    var domElem = articleElem instanceof jQuery ? articleElem.get(0) : articleElem;
    if (!domElem) return null;
  
    var links = domElem.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      if (link.querySelector('time')) {
        const match = link.href.match(/status\/(\d+)/);
        if (match) return match[1];
      }
    }
    return null;
  }
  
function handleBackgroundMessage(request) {
    if (request.type === 'CONVERT_GIF') {
        convertGifFromBuffer(request)
        return
    }

    if (request.type === 'UPDATE_SESSION_DATA') {
        const currentData = JSON.parse(sessionStorage.getItem('MediaGrab') || '[]')
        const mergedArray = [...currentData, ...request.data]
        sessionStorage.setItem('MediaGrab', JSON.stringify(mergedArray))
        return
    }

    if (request.hideSpinner !== undefined) {
        toggleReactProgressPopup(request)
    }
}

// Service workers cannot use <video>/<canvas>, so the SW fetches the MP4 bytes and
// the content script encodes them to an animated GIF here.
function convertGifFromBuffer({ buffer, filename, readableFilename }) {
    let blobUrl
    try {
        const blob = new Blob([buffer], { type: 'video/mp4' })
        blobUrl = URL.createObjectURL(blob)
        const worker = createGifWorker(filename, readableFilename, blobUrl)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        const video = document.createElement('video')

        video.src = blobUrl
        video.muted = true
        video.playsInline = true
        video.playbackRate = PLAY_SPEED_RATE
        video.preload = 'auto'

        video.onerror = () => {
            failGifConversion(filename, 'video element failed to load')
        }

        video.addEventListener('canplaythrough', () => {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            captureGifVideo(filename, context, video, worker)
        }, { once: true })
    } catch (error) {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
        }
        failGifConversion(filename, error)
    }
}

function createGifWorker(filename, readableFilename, blobUrl) {
    const worker = new Worker(browser.runtime.getURL('gif_converter.js'))
    gifWorkerSpace[filename] = { worker, blobUrl }

    worker.onmessage = (event) => {
        browser.runtime.sendMessage({
            type: 'GIF_CONVERTED',
            data: event.data,
            filename,
            readableFilename,
        }).catch(() => {})

        cleanupGifWorker(filename)
    }

    worker.onerror = (event) => {
        failGifConversion(filename, event.message || 'worker error')
    }

    return worker
}

function failGifConversion(filename, error) {
    cleanupGifWorker(filename)
    browser.runtime.sendMessage({
        type: 'GIF_CONVERT_FAILED',
        error: String(error),
    }).catch(() => {})
}

function cleanupGifWorker(filename) {
    const entry = gifWorkerSpace[filename]
    if (!entry) {
        return
    }
    entry.worker.terminate()
    if (entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl)
    }
    delete gifWorkerSpace[filename]
}

async function captureGifVideo(filename, context, video, worker) {
    worker.postMessage({
        delay: CAPTURE_INTERVAL * PLAY_SPEED_RATE,
        w: video.videoWidth,
        h: video.videoHeight,
    })

    try {
        await video.play()
        while (!video.ended) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
            const imageData = context.getImageData(0, 0, video.videoWidth, video.videoHeight)
            worker.postMessage({ frame: imageData })
            await sleep(CAPTURE_INTERVAL)
        }
        worker.postMessage({})
    } catch (error) {
        failGifConversion(filename, error)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function toggleReactProgressPopup(request) {
    if (!$(".tweet").length) {
        let spinner = $('.tva-react-spinner-wrapper')
        if (request.hideSpinner) {
            if (spinner.length) {
                spinner.remove()
            }
        } else {
            if (!spinner.length) {
                $('.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1pi2tsx.r-1777fci h2:first-child ').append($(reactProgressPopup))
            }
        }
    } else {
        if (request.hideSpinner) {
            $(".tva_ext_container").addClass("tva_hide")
        } else {
            $(".tva_ext_container").removeClass("tva_hide")
        }
    }
}

function getMaximumZindex() {
    function intOrNaN(x) {
        return /^\d+$/.test(x) ? +x : NaN
    }

    let maxZ = 0
    $('div').each((element, index) => {
        try {
            var indexCurrent = intOrNaN($(element).css("z-index"))
            if (indexCurrent > maxZ) {
                maxZ = indexCurrent
            }
        } catch {

        }
    })
    return maxZ
}

function isVideoExist(target) {
    return $(target).find('.AdaptiveMedia-video')[0]
}

function isVideoDownloadButton(target) {
    return $(target).find('button.tva_js_download')[0]
}

window.addEventListener('pageshow', function (event) {
    sessionStorage.removeItem('MediaGrab');
});