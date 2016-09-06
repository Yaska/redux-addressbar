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

export const isSameOrigin = origin => {
	let myOrigin = `${location.protocol}//${location.hostname}`
	if (location.port) {
		myOrigin += `:${location.port}`
	}
	return (origin === myOrigin)
}

// Return the clicked URL, or false if we shouldn't handle it
export const getClickedHref = event => {
	// React already filters buttons so not checking for only-button-1

	// check for modifiers and preventDefault
	if (
		event.metaKey || event.ctrlKey || event.shiftKey ||
		event.defaultPrevented
	) {
		return false
	}

	// ensure link
	let element = event.target
	while (element && element.nodeName !== 'A') {
		element = element.parentNode
	}

	// Ignore if tag has
	// 0. is not a link
	// 1. "download" attribute
	// 2. rel="external" attribute
	// 3. "target" attribute
	// 4. other target host
	if (
		!element ||
		element.hasAttribute('download') ||
		element.getAttribute('rel') === 'external' ||
		element.target ||
		!isSameOrigin(element.origin)
	) {
		return false
	}

	return element.href.slice(element.origin.length)
}

class BoundABar {

	constructor(options) {
		const {store, fromLocation, toLocation, logger} = options
		if (!store || !fromLocation || !toLocation) {
			throw new Error("arguments")
		}
		this.log = logger
		this.history = createHistory()

		this.settingUrl = false
		this.currentLocation = {}

		// Listen for changes to the current location.
		// The listener is called once immediately, use to initialize
		this.unlistenBefore = history.listenBefore(location => {
			this.log && this.log('listenBefore', location)
			if (!this.settingUrl && location.action === 'PUSH') {
				const action = fromLocation(location)
				if (action !== false) {
					store.dispatch(action)
				}
				// Prevent URL update
				return false
			}
			this.settingUrl = false
		})

		// Called on allowed changes and prev/next
		this.unlistenNav = history.listen(location => {
			this.log && this.log('listen', location.pathname)
			this.currentLocation = location
			// Ignore expected updates that would mean duplicate data
			if (!this.settingUrl && location.action === 'POP') {
				// Moving through the browser history, pre-approved
				const action = fromLocation(location)
				if (action !== false) {
					store.dispatch(action)
				}
			}
			this.settingUrl = false
		})

		// store.dispatch(fromLocation(location))
		this.unlistenStore = store.subscribe(() => {
			const calcLoc = toLocation(store.getState())

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
				this.log && this.log("updateBar from", JSON.stringify(this.currentLocation), ' to ', JSON.stringify(newLoc))
				this.settingUrl = true
				// TODO This probably needs to check the hash sameness too, to allow in-page navigation
				if (calcLoc.replace || t.pathname === newLoc.pathname) {
					history.replace(newLoc)
				} else {
					history.push(newLoc)
				}
			}
		})
	}

	destroy() {
		this.unlistenBefore()
		this.unlistenNav()
		this.unlistenStore()
	}

	// TODO Should this be an actionCreator?
	go(n) {
		return this.history.go(n)
	}

	handleClick(event) {
		const href = getClickedHref(event)

		if (href) {
			event.preventDefault()
			this.store.dispatch(this.fromLocation({pathname: href}))
		}
	}

}

export const makeBoundABar = options => new BoundABar(options)

export default options => {
	const bar = makeBoundABar(options)
	const handleClick = bar.handleClick.bind(bar)
	handleClick.go = bar.go.bind(bar)
	handleClick.destroy = bar.destroy.bind(bar)
	return handleClick
}
