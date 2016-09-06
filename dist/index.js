'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.makeBoundABar = exports.getClickedHref = exports.isSameOrigin = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // toAction:
// * prevent move: thunk and don't call
// * allow move to other part of site: return false
// * preload data: thunk, preload, dispatch

// toUrl:
// * e.g. localized urls for localized blogposts

// use constants to indicate views

var _history = require('history');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
	This code is adapted from the Page JS source code. Amazing work on handling all
	kinds of scenarios with hyperlinks, thanks!
*/

var isSameOrigin = exports.isSameOrigin = function isSameOrigin(origin) {
	var myOrigin = location.protocol + '//' + location.hostname;
	if (location.port) {
		myOrigin += ':' + location.port;
	}
	return origin === myOrigin;
};

// Return the clicked URL, or false if we shouldn't handle it
var getClickedHref = exports.getClickedHref = function getClickedHref(event) {
	// React already filters buttons so not checking for only-button-1

	// check for modifiers and preventDefault
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) {
		return false;
	}

	// ensure link
	var element = event.target;
	while (element && element.nodeName !== 'A') {
		element = element.parentNode;
	}

	// Ignore if tag has
	// 0. is not a link
	// 1. "download" attribute
	// 2. rel="external" attribute
	// 3. "target" attribute
	// 4. other target host
	if (!element || element.hasAttribute('download') || element.getAttribute('rel') === 'external' || element.target || !isSameOrigin(element.origin)) {
		return false;
	}

	return element.href.slice(element.origin.length);
};

var BoundABar = function () {
	function BoundABar(options) {
		var _this = this;

		_classCallCheck(this, BoundABar);

		var store = options.store;
		var fromLocation = options.fromLocation;
		var toLocation = options.toLocation;
		var logger = options.logger;

		if (!store || !fromLocation || !toLocation) {
			throw new Error("arguments");
		}
		this.log = logger;
		this.history = (0, _history.createHistory)();

		this.settingUrl = false;
		this.currentLocation = {};

		// Listen for changes to the current location.
		// The listener is called once immediately, use to initialize
		this.unlistenBefore = history.listenBefore(function (location) {
			_this.log && _this.log('listenBefore', location);
			if (!_this.settingUrl && location.action === 'PUSH') {
				var action = fromLocation(location);
				if (action !== false) {
					store.dispatch(action);
				}
				// Prevent URL update
				return false;
			}
			_this.settingUrl = false;
		});

		// Called on allowed changes and prev/next
		this.unlistenNav = history.listen(function (location) {
			_this.log && _this.log('listen', location.pathname);
			_this.currentLocation = location;
			// Ignore expected updates that would mean duplicate data
			if (!_this.settingUrl && location.action === 'POP') {
				// Moving through the browser history, pre-approved
				var action = fromLocation(location);
				if (action !== false) {
					store.dispatch(action);
				}
			}
			_this.settingUrl = false;
		});

		// store.dispatch(fromLocation(location))
		this.unlistenStore = store.subscribe(function () {
			var calcLoc = toLocation(store.getState());

			var newLoc = {};
			if (calcLoc.pathname) {
				newLoc.pathname = calcLoc.pathname;
			} else {
				newLoc.pathname = _this.currentLocation.pathname;
			}
			if (calcLoc.search) {
				newLoc.search = calcLoc.search;
			} else {
				newLoc.search = _this.currentLocation.search;
			}
			if (calcLoc.hash) {
				newLoc.hash = calcLoc.hash;
			} else {
				newLoc.hash = _this.currentLocation.hash;
			}

			var t = _this.currentLocation;
			if (!_this.settingUrl && (t.pathname !== newLoc.pathname || t.search !== newLoc.search || t.hash !== newLoc.hash)) {
				_this.log && _this.log("updateBar from", JSON.stringify(_this.currentLocation), ' to ', JSON.stringify(newLoc));
				_this.settingUrl = true;
				// TODO This probably needs to check the hash sameness too, to allow in-page navigation
				if (calcLoc.replace || t.pathname === newLoc.pathname) {
					history.replace(newLoc);
				} else {
					history.push(newLoc);
				}
			}
		});
	}

	_createClass(BoundABar, [{
		key: 'destroy',
		value: function destroy() {
			this.unlistenBefore();
			this.unlistenNav();
			this.unlistenStore();
		}

		// TODO Should this be an actionCreator?

	}, {
		key: 'go',
		value: function go(n) {
			return this.history.go(n);
		}
	}, {
		key: 'handleClick',
		value: function handleClick(event) {
			var href = getClickedHref(event);

			if (href) {
				event.preventDefault();
				this.store.dispatch(this.fromLocation({ pathname: href }));
			}
		}
	}]);

	return BoundABar;
}();

var makeBoundABar = exports.makeBoundABar = function makeBoundABar(options) {
	return new BoundABar(options);
};

exports.default = function (options) {
	var bar = makeBoundABar(options);
	var handleClick = bar.handleClick.bind(bar);
	handleClick.go = bar.go.bind(bar);
	handleClick.destroy = bar.destroy.bind(bar);
	return handleClick;
};