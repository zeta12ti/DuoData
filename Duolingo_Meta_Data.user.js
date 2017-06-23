// ==UserScript==
// @name        Duolingo Meta Data
// @namespace   https://www.github.com/zeta12ti/Duolingo-Course-Hider
// @description Adds some hidden data to Duolingo, including daily xp and total xp (on the top bar), fluency changes after a practice, and more.
// @include     https://*.duolingo.com/*
// @run-at      document-start
// @version     1
// @grant       none
// ==/UserScript==



// Fun fact: all this was painfully extracted from Duolingo's source code.
// This is essentially the exact code used for drawing the graph of xp gains.
var getEpochSeconds = function () {
    return Math.floor(Date.now() / 1000)
    }

var parseTimezoneOffset = function (timezoneOffset) {
    var offset;
    try {
        offset = parseInt(timezoneOffset, 10) / 100
    } catch (n) {
        console.log('Invalid timezoneOffset', {
            timezoneOffset: timezoneOffset
        })
        offset = 0
    }
    return offset
}

var getSecondsElapsedToday = function (timezoneOffset) {
    var nowTime = new Date()
    var seconds = 3600 * (nowTime.getUTCHours() + parseTimezoneOffset(timezoneOffset)) + 60 * nowTime.getUTCMinutes() + nowTime.getUTCSeconds()
    return (seconds + 86400) % 86400
}

var getXpToday = function (timezoneOffset, xpGains) {
    return getXpPastWeek(timezoneOffset, xpGains)[6]
}

var getXpPastWeek = function (timezoneOffset, xpGains) {
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
var getCurrentTotalXp = function() {
    var data = JSON.parse(localStorage['duo.state'])
    if (!data) {
        return 0
    }
    var fromLanguage = data.user.fromLanguage
    var learningLanguage = data.user.learningLanguage
    return data.courses[learningLanguage + '<' + fromLanguage].xp
}


// Gets the current actual xp for today
var getCurrentDailyXp = function() {
    var data = JSON.parse(localStorage['duo.state'])
    var timezoneOffset = data.user.timezoneOffset
    var xpGains = data.user.xpGains

    return getXpToday(timezoneOffset, xpGains)
}
    
// Adds total xp to the dropdown menu
var insertTotalXp = function(xp) {
    if (document.querySelectorAll('._1oVFS').length == 0) {
        return
    }
    if (document.getElementById('total-xp') !== null) {
        return updateTotalXp(xp)
    }

    var xpElement = document.createElement('span')
    
    var text = document.createTextNode(' ' + xp + ' xp')
    xpElement.appendChild(text)
    xpElement.id = 'total-xp'
    xpElement.classList.add('_1fA14')

    document.querySelector('._1oVFS').appendChild(xpElement)
}


// Updates an existing total xp indicator
var updateTotalXp = function(xp) {
    var xpElement = document.getElementById('total-xp')
    xpElement.firstChild.textContent = ' ' + xp + ' xp'
}


// Adds daily xp to the streak indicator
var insertDailyXp = function(xp) {
    if (document.querySelectorAll('._2nE-k').length == 0) {
        return
    }
    if (document.getElementById('daily-xp') !== null) {
        return updateDailyXp(xp)
    }

    var xpElement = document.createElement('span')

    var text = document.createTextNode(': ' + xp + ' xp')
    xpElement.appendChild(text)
    xpElement.id = 'daily-xp'

    document.querySelector('._2nE-k').appendChild(xpElement)
}

// Updates an existing daily xp indicator
var updateDailyXp = function(xp) {
    var xpElement = document.getElementById('daily-xp')
    xpElement.firstChild.textContent = ': ' + xp + ' xp'
}


var routine = function() {
    var totalXp = getCurrentTotalXp()
    var dailyXp = getCurrentDailyXp()
    insertTotalXp(totalXp)
    insertDailyXp(dailyXp)
}


// Run at document load and every time an AJAX request completes
// The data is only updated after AJAX requests
if (document.readyState === 'complete') { routine() }
else {
    window.addEventListener('load', routine)
}


(function() {
    var origOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            routine()
        });
        origOpen.apply(this, arguments)
    };
})()
