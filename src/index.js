// toAction:
// * prevent move: thunk and don't call
// * allow move to other part of site: return false
// * preload data: thunk, preload, dispatch

// toUrl:
// * e.g. localized urls for localized blogposts

// use constants to indicate views

import {createHistory} from 'history'

/*
	This code is adapted from the Page JS source code. Amazing work on handling all
	kinds of scenarios with hyperlinks, thanks!
*/

const isSameOrigin = origin => {
	let myOrigin = `${location.protocol}//${location.hostname}`
	if (location.port) {
		myOrigin += `:${location.port}`
	}
	return (origin === myOrigin)
}

const getClickedHref = event => {
	// React already filters buttons so not checking for only-button-1

	// check for modifiers
	if (event.metaKey || event.ctrlKey || event.shiftKey) {
		return false
	}
	if (event.defaultPrevented) {
		return false
	}

	// ensure link
	let element = event.target
	while (element && element.nodeName !== 'A') {
		element = element.parentNode
	}
	if (!element || element.nodeName !== 'A') {
		return false
	}

	// Ignore if tag has
	// 1. "download" attribute
	// 2. rel="external" attribute
	if (element.hasAttribute('download') || element.getAttribute('rel') === 'external') {
		return false
	}

	// check target
	if (element.target) {
		return false
	}

	// x-origin
	if (!isSameOrigin(element.origin)) {
		return false
	}

	return element.href.slice(element.origin.length)
}

class BoundUrl {

	constructor(options) {
		const {store, fromLoc, toLoc} = options
		if (!store || !fromLoc || !toLoc) {
			throw new Error("arguments")
		}
		const history = createHistory()

		this.settingUrl = false
		this.currentLocation = {}

		// Listen for changes to the current location.
		// The listener is called once immediately, use to initialize
		const unlisten1 = history.listenBefore(location => {
			console.log('listenBefore', location)
			if (!this.settingUrl && location.action === 'PUSH') {
				const action = fromLoc(location)
				if (action !== false) {
					store.dispatch(action)
				}
				// Prevent URL update
				return false
			}
			this.settingUrl = false
		})

		// Called on allowed changes and prev/next
		const unlisten2 = history.listen(location => {
			console.log('listen', location.pathname)
			this.currentLocation = location
			// Ignore expected updates that would mean duplicate data
			if (!this.settingUrl && location.action === 'POP') {
				// Moving through the browser history, pre-approved
				const action = fromLoc(location)
				if (action !== false) {
					store.dispatch(action)
				}
			}
			this.settingUrl = false
		})

		// store.dispatch(fromLoc(location))
		const unlisten3 = store.subscribe(() => {
			const calcLoc = toLoc(store.getState())

			const newLoc = {}
			if (calcLoc.pathname) {
				newLoc.pathname = calcLoc.pathname
			} else {
				newLoc.pathname = this.currentLocation.pathname
			}
			if (calcLoc.search) {
				newLoc.search = calcLoc.search
			} else {
				newLoc.search = this.currentLocation.search
			}
			if (calcLoc.hash) {
				newLoc.hash = calcLoc.hash
			} else {
				newLoc.hash = this.currentLocation.hash
			}

			const t = this.currentLocation
			if (!this.settingUrl && (
				t.pathname !== newLoc.pathname ||
				t.search !== newLoc.search ||
				t.hash !== newLoc.hash
			)) {
				console.log("updateBar from", JSON.stringify(this.currentLocation), ' to ', JSON.stringify(newLoc))
				this.settingUrl = true
				if (calcLoc.replace || t.pathname === newLoc.pathname) {
					history.replace(newLoc)
				} else {
					history.push(newLoc)
				}
			}
		})

		// Should this be an actionCreator?
		this.go = n => history.go(n)

		this.interceptClicks = event => {
			const href = getClickedHref(event)

			if (href) {
				event.preventDefault()
				store.dispatch(fromLoc({pathname: href}))
			}
		}
		this.cleanup = () => {
			unlisten1()
			unlisten2()
			unlisten3()
		}
	}

}

export const makeBoundUrl = options => new BoundUrl(options)
export default makeBoundUrl
