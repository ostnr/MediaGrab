let readableNameList = {}
const fileNameRegex = /([\w,\s-.]+\.[A-Za-z]{2,4}$)/

function chromeDownloadRenamer(item, suggest) {
    if (!item.byExtensionId || item.byExtensionId !== chrome.runtime.id) {
        return
    }

    if (!Object.keys(readableNameList).length) {
        return
    }

    let result = fileNameRegex.exec(item.filename)
    const filename = result[1]
    const suggestFilename = readableNameList[filename] || item.filename
    const replacedFilePath = item.filename.replace(fileNameRegex, suggestFilename)
    delete readableNameList[filename]

    suggest({ filename: replacedFilePath, conflictAction: "uniquify" })

    if (!Object.keys(readableNameList).length) {
        chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
    }
}

function processGifVideo({ url, readableFilename }) {
    browser.storage.sync.get({
        isConvertGIF: true,
        isSaveMP4: true,
    }).then((items) => {
        if (items.isConvertGIF) {
            convertGif(url, readableFilename)
        }

        if (items.isSaveMP4) {
            downloadMp4Video({ url, readableFilename })
        }
    })
}

const sortByBitrate = (a, b) => {
    const bitrateA = a.bitrate || 0;
    const bitrateB = b.bitrate || 0;

    return bitrateB - bitrateA;
}

function getMaximumBitrate(videoSources) {
    videoSources.sort(sortByBitrate)
    return videoSources[0]['url']
}

function refineImageSourceParams(src) {
    const url = new URL(src);
    const searchParams = new URLSearchParams(url);
    searchParams.set('name', 'orig')
    url.search = searchParams

    return url.toString()
}

function extractMedias(tweets) {
    const mediaMap = {};

    tweets.forEach(tweet => {
        const mediaArr = tweet?.legacy?.extended_entities?.media;
        if (!mediaArr) return;

        const screenName = tweet.core?.user_results?.result?.core?.screen_name || 'unknown';
        const tweetId = tweet.legacy.id_str;

        mediaMap[tweetId] = mediaArr.map((media, index) => ({
            ...media,
            readableFilename: mediaArr.length === 1
                ? `${screenName}-${tweetId}`
                : `${screenName}-${tweetId}-${index + 1}`,
            tweetId,
            referencedBy: tweet.referencedBy
        }));
    });

    const medias = Object.values(mediaMap).flat().map(media => {
        let url, type;
        if (media.type === 'photo') {
            type = 'image';
            url = refineImageSourceParams(media.media_url_https);
        } else if (media.type === 'video') {
            type = 'video';
            url = getMaximumBitrate(media.video_info.variants);
        } else if (media.type === 'animated_gif') {
            type = 'gif';
            url = getMaximumBitrate(media.video_info.variants);
        } else {
            return null;
        }
        return {
            type,
            url,
            mediaKey: media.media_key,
            readableFilename: media.readableFilename,
            tweetId: media.tweetId,
            referencedBy: media.referencedBy
        };
    }).filter(Boolean);

    return medias;
}

function fileExtension(url) {
    const splited = url.split('.')
    return splited[splited.length - 1].split('?')[0]
}

function downloadMp4Video({ url, readableFilename }) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false
    }).then((items) => {
        let options = {
            url: url,
            saveAs: items.spcificPathName
        }

        if (items.readableName) {
            options.filename = readableFilename + '.' + fileExtension(url)
        }

        browser.downloads.download(options)
    })
}

function downloadImage({ url, readableFilename }) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false
    }).then((items) => {
        const uploadedImageQuery = /https:\/\/pbs.twimg.com\/media\/(.*)?\?.*/g
        const fileNameRegex = /([^/\\&\?]+)(\.\w{2,4})(?=([\?&].*$|$))/

        const nameMatches = uploadedImageQuery.exec(url)
        const filenameMatches = fileNameRegex.exec(url)

        let options = {
            url: url,
            saveAs: items.spcificPathName
        }

        let filename = 'no_title'
        const format = filenameMatches[2] || ".jpg"

        if (nameMatches.length) {
            filename = nameMatches[1]
        }

        if (!!items.readableName) {
            if (!!chrome.downloads.onDeterminingFilename) {
                readableNameList[`${filename}`] = `${readableFilename}${format} `

                if (!!chrome.downloads.onDeterminingFilename && !isRenamerActivated()) {
                    chrome.downloads.onDeterminingFilename.addListener(chromeDownloadRenamer)
                }
            }
            filename = readableFilename
        }

        if (filenameMatches.length) {
            options.filename = `${filename}${format}`
        }

        browser.downloads.download(options)
            .then((_downloadItem) => {
                if (!!chrome.downloads.onDeterminingFilename) {
                    if (!Object.keys(readableNameList).length) {
                        chrome.downloads.onDeterminingFilename.removeListener(chromeDownloadRenamer)
                    }
                }
            })
    })
}

function isRenamerActivated() {
    return chrome.downloads.onDeterminingFilename.hasListener(chromeDownloadRenamer)
}
