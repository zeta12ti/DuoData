// ==UserScript==
// @name        DuoData
// @author      zeta12ti
// @namespace   https://github.com/zeta12ti/DuoData
// @updateURL   https://github.com/zeta12ti/DuoData/raw/master/DuoData.user.js
// @description Adds some hidden data to Duolingo, including daily xp and total xp (on the top bar), fluency changes after a practice, and more.
// @include     https://*.duolingo.com/*
// @run-at      document-start
// @version     1.3
// @grant       none
// ==/UserScript==


var inverse_flags = {"OgUIe": "hi", "_107sn": "id", "_12U6e": "ro", "_1ARRD": "ar", "_1KtzC": "vi", "_1PruQ": "it", "_1S3hi": "hu", "_1ct7y _2XSZu": "medium-circle-flag", "_1eqxJ": "ru", "_1fajz": "nl-NL", "_1h0xh": "da", "_1jO8h": "cy", "_1q_MQ": "tl", "_1tJJ2": "tr", "_1uPQW": "cs", "_1vhNM": "ga", "_1zZsN": "uk", "_200jU": "no-BO", "_24xu4": "gn", "_2DMfV": "sv", "_2KQN3": "fr", "_2N-Uj": "ja", "_2TXAL": "bn", "_2XSZu": "_circle-flag", "_2cR-E": "en", "_2gNgd": "zh-CN", "_2lkzc": "ko", "_2oTcA": "th", "_2tQo9": "el", "_3AA1F": "dk", "_3PU7E _2XSZu": "small-circle-flag", "_3T1km": "sw", "_3i5IF _2XSZu": "micro-circle-flag", "_3uusw": "pl", "_3viv6": "_flag", "_6mRM": "tlh", "_PDrK": "he", "mc4rg": "ca", "oboa9": "de", "pWj0w": "eo", "pmGwL": "pt", "q_PD-": "sn", "t-XH-": "un", "u5W-o": "es", "xi6jQ": "zh"}
function getLanguageFromFlag(flagCode) {
    return inverse_flags[flagCode]
}


function getEpochSeconds() {
    return Math.floor(Date.now() / 1000)
}


function parseTimezoneOffset(timezoneOffset) {
    var offset;
    try {
        offset = parseInt(timezoneOffset, 10)
    } catch (n) {
        console.log('Invalid timezoneOffset', {
            timezoneOffset: timezoneOffset
        })
        offset = 0
    }
    var sign = Math.sign(offset)
    offset = Math.abs(offset)
    var minutes = 60 * Math.floor(offset / 100) + (offset % 100)

    return sign * minutes
}


function getSecondsElapsedToday(timezoneOffset) {
    var nowTime = new Date()
    var seconds = 3600 * nowTime.getUTCHours() + 60 * (nowTime.getUTCMinutes() + parseTimezoneOffset(timezoneOffset)) + nowTime.getUTCSeconds()
    return (seconds + 86400) % 86400
}


function getXpToday(timezoneOffset, xpGains) {
    return getXpPastWeek(timezoneOffset, xpGains)[6]
}


function getXpPastWeek(timezoneOffset, xpGains) {
    var weeklyGains = [0,0,0,0,0,0,0]

    if (!xpGains) return n

    for (var secondsToday = getSecondsElapsedToday(timezoneOffset), epochSeconds = getEpochSeconds(), i = 0; i < xpGains.length; i++) {
        var s = xpGains[i]
        var lastMidnight = epochSeconds - secondsToday + 86400
        var daysAgo = Math.floor((lastMidnight - xpGains[i].time) / 86400)
        if (0 <= daysAgo && daysAgo <= 6) {
            weeklyGains[6 - daysAgo] += xpGains[i].xp
        }
    }
    return weeklyGains
}


// Gets the actual total xp for the current course.
function getCurrentTotalXp() {
    var data = JSON.parse(localStorage['duo.state'])
    if (!data) {
        return 0
    }
    var fromLanguage = data.user.fromLanguage
    var learningLanguage = data.user.learningLanguage
    return data.courses[learningLanguage + '<' + fromLanguage].xp
}


// Gets the current actual xp for today
function getCurrentDailyXp() {
    var data = JSON.parse(localStorage['duo.state'])
    var timezoneOffset = data.user.timezoneOffset
    var xpGains = data.user.xpGains

    return getXpToday(timezoneOffset, xpGains)
}


// Adds daily xp to the streak indicator
function insertDailyXp(xp) {
    if (document.querySelectorAll('._2nE-k').length === 0) {
        return
    }
    if (document.getElementById('daily-xp') !== null) {
        return updateDailyXp(xp)
    }

    var xpElement = document.createElement('span')

    var text = document.createTextNode(' : ' + xp + ' xp')
    xpElement.appendChild(text)
    xpElement.id = 'daily-xp'

    document.querySelector('._2nE-k').appendChild(xpElement)
}


// Updates an existing daily xp indicator
function updateDailyXp(xp) {
    var xpElement = document.getElementById('daily-xp')
    xpElement.firstChild.textContent = ' : ' + xp + ' xp'
}


// Adds data to the course list to indicate languages
function addCourseData() {
    if (document.querySelectorAll('._2kNgI').length === 0) {return false}

    var courses = document.querySelectorAll('._2kNgI')
    var fromLanguage = duo.uiLanguage
    len = courses.length
    for (var i=0, bigFlag, littleFlag; i<len; i++) {
        if (courses[i].querySelectorAll('._2IJLr').length === 0) {
            bigFlag = courses[i].querySelector('._3vx2Z')
            courses[i].setAttribute('data-learning', getLanguageFromFlag(bigFlag.classList[0]))
            courses[i].setAttribute('data-from', fromLanguage)
        }
        else {
            bigFlag = courses[i].querySelector('._2IJLr')
            littleFlag = courses[i].querySelector('._2c_Ro')
            courses[i].setAttribute('data-learning', getLanguageFromFlag(bigFlag.classList[0]))
            courses[i].setAttribute('data-from', getLanguageFromFlag(littleFlag.classList[0]))
        }
    }
    return true
}


// Adds xp indicators for every course
function insertCourseXp() {
    if (addCourseData()) {
        var courses = document.querySelectorAll('._2kNgI')
        var duoStateCourses = JSON.parse(localStorage['duo.state']).courses
        len = courses.length
        for (var i=0, learningLanguage, fromLanguage, xp, xpElement, text; i<len; i++) {
            learningLanguage = courses[i].getAttribute('data-learning')
            fromLanguage = courses[i].getAttribute('data-from')
            try {
                xp = duoStateCourses[learningLanguage + '<' + fromLanguage].xp
                if (document.getElementById(learningLanguage + '-' + fromLanguage + '-xp') === null) {
                    xpElement = document.createElement('span')

                    text = document.createTextNode(' ' + xp + ' xp')
                    xpElement.appendChild(text)
                    xpElement.id = learningLanguage + '-' + fromLanguage + '-xp'
                    xpElement.classList.add('_1fA14')

                    courses[i].appendChild(xpElement)
                }
                else {
                    xpElement = document.getElementById(learningLanguage + '-' + fromLanguage + '-xp')
                    xpElement.firstChild.textContent = ' ' + xp + ' xp'
                }
            }
            catch(e) {
                continue
            }
        }
    }
}


// Adds/updates everything
async function routine() {
    insertCourseXp()
    var dailyXp = getCurrentDailyXp()
    insertDailyXp(dailyXp)
}


// Run at document load...
if (document.readyState === 'complete') { routine() }
else {
    window.addEventListener('load', routine)
}


// and every time an AJAX request completes
// The data is only updated after AJAX requests anyway
(function() {
    var origOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            routine()
        });
        origOpen.apply(this, arguments)
    };
})()
