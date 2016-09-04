# redux-addressbar

[![npm version](https://badge.fury.io/js/redux-addressbar.svg)](http://badge.fury.io/js/redux-addressbar)
<!--
[![travis build information](https://api.travis-ci.org/wmertens/redux-addressbar.svg)](https://travis-ci.org/wmertens/redux-addressbar)
[![Coverage Status](https://coveralls.io/repos/wmertens/redux-addressbar/badge.svg?branch=master)](https://coveralls.io/r/wmertens/redux-addressbar?branch=master)
-->

Treat the address bar as just another input, and render your app only from Redux store state.

## Rationale

A bound input has a set `value` and a change is cancelled and triggers `onChange()`. This handler then results in a new store state and a new (or the same) value. Likewise, a URL change is cancelled and converted to action. Then, the store state is converted to the address bar URL.

Don't worry about transition hooks and special route link elements, or mapping params to store state in your components. Everything is just Redux.

All you need to specify is a *location-to-action* function and a *state-to-location* function (`fromLocation()`, `toLocation()`). All the code that knows about URLs is in these functions, and you are completely free in how a store state maps to a URL. You could do URLs that change according to the app language, compressed URLs that map several parameters to a short string etc.

If are in a message pane and want to show the next message, simply increase your messageId via an action, like you are used to. The URL gets the new messageId via the store state, not via a special transition call.

If you want to perform actions on route transitions (like preloading data), make `fromLocation()` return a thunk (via `redux-thunk`) and do asynchronous actions etc as desired. Change the URL before and/or after the asynchronous code completes.

To create an in-app URL, simply pass the target state to `toLocation()`.

All links are automatically intercepted and handled via a click handler you put on your root component. This means that you can hard-code `<a href="/home">Home</a>` and it will be handled in-app and not by reloading the page.

## TODO

* Clear out console.logs
* nicer API, use context and a provider? As a second option?
* figure out what to do with hash navigation
* fancy repo
* server rendering
	* No need for full history, just fromLocation/toLocation with url parsing
	* some way to indicate needing a 301 redirect
* allow toLocation to go back instead of push, or maybe mark a location as temporary, to be backed out if next location is the parent location/always?
* allow toAction to return false if not own url
* toAction(location, isHistorical)
* provider element that context and adds onClick to child??? won't work on HoCs => allow configuring div?
* dev check recursion on settingUrl; toAction should never return null/undef
* different history types?

## How to get started

TODO examples for fromLocation and toLocation

0. `npm install --save redux-addressbar`
1. Create `fromLocation(location)` and `toLocation(state)`
2. Put the click handler on your root DOM component
	```jsx
	import addressbar from 'redux-addressbar';
	const handleClick = addressbar({ store, fromLoc, toLoc });
	const App = (props) => (
		<div onClick={handleClick}>
			…
		</div>
	);
	```
3. If you need to destroy the handler (e.g. hot reload), you can call `handleClick.destroy()`
4. If you need to navigate back in browser history, you can use `handleClick.go(n)` where n (optional) is the number of entries to go back

## Questions?

File an [issue](https://github.com/wmertens/redux-addressbar/issues) and I'll try to answer you.
