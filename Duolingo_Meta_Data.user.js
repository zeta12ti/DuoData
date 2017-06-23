// ==UserScript==
// @name        Duolingo Meta Data
// @namespace   https://www.github.com/zeta12ti/Duolingo-Course-Hider
// @description Adds some hidden data to Duolingo, including daily xp and total xp (on the top bar), fluency changes after a practice, and more.
// @include     https://*.duolingo.com/*
// @run-at      document-start
// @version     1
// @grant       none
// ==/UserScript==


(function () {
    var origOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            var XHREvent = new CustomEvent("XHR-loaded")
            if (this.responseURL == 'https://www.duolingo.com/2017-06-08/sessions') {
                XHREvent.response = this.response
                document.dispatchEvent(XHREvent)
            }
            if (this.responseURL.startsWith('https://www.duolingo.com/2017-06-08/users/')) {
                XHREvent.response = this.response
                document.dispatchEvent(XHREvent)
            }
        })
        origOpen.apply(this, arguments)
    }
})()
