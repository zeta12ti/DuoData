// ==UserScript==
// @name        DuoData
// @author      zeta12ti
// @namespace   https://github.com/zeta12ti/DuoData
// @updateURL   https://github.com/zeta12ti/DuoData/raw/master/DuoData.user.js
// @description Adds some hidden data to Duolingo, including daily xp and total xp (on the top bar), fluency changes after a practice, and more.
// @include     https://*.duolingo.com/*
// @run-at      document-start
// @version     1.5.2
// @grant       none
// ==/UserScript==

var inverseFlags = {'OgUIe': 'hi', '_107sn': 'id', '_12U6e': 'ro', '_1ARRD': 'ar', '_1KtzC': 'vi', '_1PruQ': 'it', '_1S3hi': 'hu', '_1ct7y _2XSZu': 'medium-circle-flag', '_1eqxJ': 'ru', '_1fajz': 'nl-NL', '_1h0xh': 'da', '_1jO8h': 'cy', '_1q_MQ': 'tl', '_1tJJ2': 'tr', '_1uPQW': 'cs', '_1vhNM': 'ga', '_1zZsN': 'uk', '_200jU': 'no-BO', '_24xu4': 'gn', '_2DMfV': 'sv', '_2KQN3': 'fr', '_2N-Uj': 'ja', '_2TXAL': 'bn', '_2XSZu': '_circle-flag', '_2cR-E': 'en', '_2gNgd': 'zh-CN', '_2lkzc': 'ko', '_2oTcA': 'th', '_2tQo9': 'el', '_3AA1F': 'dk', '_3PU7E _2XSZu': 'small-circle-flag', '_3T1km': 'sw', '_3i5IF _2XSZu': 'micro-circle-flag', '_3uusw': 'pl', '_3viv6': '_flag', '_6mRM': 'tlh', '_PDrK': 'he', 'mc4rg': 'ca', 'oboa9': 'de', 'pWj0w': 'eo', 'pmGwL': 'pt', 'q_PD-': 'sn', 't-XH-': 'un', 'u5W-o': 'es', 'xi6jQ': 'zh'}
function getLanguageFromFlag (flagCode) {
  return inverseFlags[flagCode]
}

function getEpochSeconds () {
  return Math.floor(Date.now() / 1000)
}

function parseTimezoneOffset (timezoneOffset) {
  var offset
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

function getSecondsElapsedToday (timezoneOffset) {
  var nowTime = new Date()
  var seconds = 3600 * nowTime.getUTCHours() + 60 * (nowTime.getUTCMinutes() + parseTimezoneOffset(timezoneOffset)) + nowTime.getUTCSeconds()
  return (seconds + 86400) % 86400
}

function getXpToday (timezoneOffset, xpGains) {
  return getXpPastWeek(timezoneOffset, xpGains)[6]
}

function getXpPastWeek (timezoneOffset, xpGains) {
  var weeklyGains = [0, 0, 0, 0, 0, 0, 0]

  if (!xpGains) return weeklyGains

  for (var secondsToday = getSecondsElapsedToday(timezoneOffset), epochSeconds = getEpochSeconds(), i = 0; i < xpGains.length; i++) {
    var lastMidnight = epochSeconds - secondsToday + 86400
    var daysAgo = Math.floor((lastMidnight - xpGains[i].time) / 86400)
    if (daysAgo >= 0 && daysAgo <= 6) {
      weeklyGains[6 - daysAgo] += xpGains[i].xp
    }
  }
  return weeklyGains
}

// Gets the current actual xp for today
function getCurrentDailyXp () {
  var data = JSON.parse(window.localStorage['duo.state'])
  var timezoneOffset = data.user.timezoneOffset
  var xpGains = data.user.xpGains

  return getXpToday(timezoneOffset, xpGains)
}

// Adds daily xp to the streak indicator
function insertDailyXp (xp) {
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
function updateDailyXp (xp) {
  var xpElement = document.getElementById('daily-xp')
  xpElement.firstChild.textContent = ' : ' + xp + ' xp'
}

// Adds data to the course list to indicate languages
function addCourseData () {
  // we'll iterate over place that have a level indicator
  if (document.querySelectorAll('._1fA14:not(.xp-indicator)').length === 0) { return false }

  var courses = document.querySelectorAll('._1fA14:not(.xp-indicator)')
  var uiLanguage = window.duo.uiLanguage
  for (var i = 0, len = courses.length, bigFlag, littleFlag; i < len; i++) {
    if (typeof courses[i].parentNode.dataset.learning === 'undefined' || typeof courses[i].parentNode.dataset.from === 'undefined') {
      if (courses[i].parentNode.querySelectorAll('._2IJLr').length === 0) {
        bigFlag = courses[i].parentNode.querySelector('._3vx2Z')
        courses[i].parentNode.dataset.learning = getLanguageFromFlag(bigFlag.classList[0])
        courses[i].parentNode.dataset.from = uiLanguage
      } else {
        bigFlag = courses[i].parentNode.querySelector('._2IJLr')
        littleFlag = courses[i].parentNode.querySelector('._2c_Ro')
        courses[i].parentNode.dataset.learning = getLanguageFromFlag(bigFlag.classList[0])
        courses[i].parentNode.dataset.from = getLanguageFromFlag(littleFlag.classList[0])
      }
    }
  }
  return true
}

// Adds xp indicators for every course
function insertCourseXp () {
  if (addCourseData()) {
    var courses = document.querySelectorAll('._1fA14:not(.xp-indicator)')
    var duoStateCourses = JSON.parse(window.localStorage['duo.state']).courses
    var len = courses.length
    for (var i = 0, learningLanguage, fromLanguage, xp, xpElement, text; i < len; i++) {
      learningLanguage = courses[i].parentNode.dataset.learning
      fromLanguage = courses[i].parentNode.dataset.from
      try {
        xp = duoStateCourses['DUOLINGO_' + learningLanguage.toUpperCase() + '_' + fromLanguage.toUpperCase()].xp || 0
        if (courses[i].parentNode.querySelector('.xp-indicator') === null) {
          xpElement = document.createElement('span')

          text = document.createTextNode(' ' + xp + ' xp')
          xpElement.appendChild(text)
          xpElement.classList.add('xp-indicator')
          xpElement.classList.add('_1fA14')

          courses[i].parentNode.appendChild(xpElement)
        } else {
          xpElement = courses[i].parentNode.querySelector('.xp-indicator')
          xpElement.firstChild.textContent = ' ' + xp + ' xp'
        }
      } catch (e) {
        console.log(e)
        continue
      }
    }
  }
}

// Adds/updates everything
async function routine () {
  insertCourseXp()
  var dailyXp = getCurrentDailyXp()
  insertDailyXp(dailyXp)
}

// Run at document load...
if (document.readyState === 'complete') { routine() } else {
  window.addEventListener('load', routine)
}

// and every time an AJAX request completes
// The data is only updated after AJAX requests anyway
(function () {
  var origOpen = window.XMLHttpRequest.prototype.open
  window.XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', function () {
      routine()
    })
    origOpen.apply(this, arguments)
  }
})()
