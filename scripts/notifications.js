
// Profile
const supportsNotification = ('Notification' in window) && firebase.messaging.isSupported()

if(!supportsNotification) {
	var hideSubscribe = $('<style>.sub-right, .sub-bottom, .match-list-container .card-footer, #menu-profile { display: none !important; }</style>');
	$('body').addClass("no-push")
	
	if(!firebase.messaging.isSupported()) {
		if(!localStorage.getItem("fcm-not-supported")) {
			$(".body-container").prepend(`<div class="alert alert-dismissible alert-danger mb-4" id="notification-fcm-hint">
				<button type="button" class="btn-close" data-bs-dismiss="alert" id="notification-unsupported-hint" aria-label="Hide alert"></button>
				The device or browser you are using is not supported by the Google Cloud Messaging (or it's deactivated by default, like in the Brave browser).
				You will not be able to use push notifications, but can still access live updates.
			</div>`)
			
			$("#notification-fcm-hint").click(function(evt) {
				localStorage.setItem("fcm-not-supported", "1")
			})
		}
	} /*else if(!localStorage.getItem("ios-require-homescreen") && /iPad|iPhone|MacIntel/.test(navigator.platform)) {
		$(".body-container").prepend(`<div class="alert alert-dismissible alert-danger mb-4" id="notification-ios-hint">
			<button type="button" class="btn-close" data-bs-dismiss="alert" id="notification-unsupported-hint" aria-label="Hide alert"></button>
			Add <b>Liveticker for VCT</b> to your homescreen to enable push notifications for events and matches. 
			Tap <b>Share <svg class="icon icon-ios_share"><use xlink:href="#icon-ios_share"></use></svg></b> and then 
			<b>Add to Home Screen <svg class="icon icon-plus-square"><use xlink:href="#icon-plus-square"></use></svg></b> to enable.
		</div>`)
		
		$("#notification-ios-hint").click(function(evt) {
			localStorage.setItem("ios-require-homescreen", "1")
		})
	}*/ else if(!localStorage.getItem("disabled-unsupported-device")) {
		$(".body-container").prepend(`<div class="alert alert-dismissible alert-danger mb-4" id="notification-unsupported-start-hint">
			<button type="button" class="btn-close" data-bs-dismiss="alert" id="notification-unsupported-hint" aria-label="Hide alert"></button>
			The device or browser you are using does not support the <a href="https://caniuse.com/push-api" target="_blank" rel="noopener noreferrer">Web Push API</a>.
			Push notifications are not available, but you can still use this web application to stay up-to-date.
			Even though you won't get a notification, match information will automatically refresh and you can filter the regions and matches of your choice.
		</div>`)
		
		$("#notification-unsupported-hint").click(function(evt) {
			localStorage.setItem("disabled-unsupported-device", "1")
		})
	}
} else if (Notification.permission == "granted" && supportsNotification) {
	initNotificationProfile().then(() => {})
} else if(!localStorage.getItem("disabled-notification-hint")) {
	$(".body-container").prepend(`<div class="alert alert-dismissible alert-info mb-4" id="notification-start-hint">
		<button type="button" class="btn-close" data-bs-dismiss="alert" id="disabled-notification-hint" aria-label="Hide alert"></button>
		If you want to receive push notifications or live updates, please enable notifications.<br>
		<button type="button" class="btn btn-light enable-notifications" aria-label="Start receiving updates, enable notifications">Start receiving updates</button>
	</div>`)
	
	$("#disabled-notification-hint").click(function(evt) {
		localStorage.setItem("disabled-notification-hint", "1")
	})
}

$(".sign-in").click(async function(evt) {
	evt.preventDefault()
	await initNotificationProfile()
})
$("body").on("click", ".enable-notifications", function(evt) {
	evt.preventDefault()
	Notification.requestPermission(async function (permission) {
		if (permission === "granted") await initNotificationProfile()
	});
})

// Notification & Subscription
window.msgToken = false
window.subscription = {events: [], matches: [], mocked: true, _updated: 0}
window.ownSubRef = false
$("body").on("click", ".notification-subscribe, .notification-unsubscribe", async function(evt) {
	if(!msgToken) {
		await initNotificationProfile() // test if this works if we just wait
	}
	
	const notifWrapper = $(this).closest("[data-subscription-type][data-subscription-label]")
	const category = notifWrapper.attr("data-subscription-type")
	let label = notifWrapper.attr("data-subscription-label")
	
	if(category == "matches") label = parseInt(label)
	console.log("un/subscribe", category, label)
	
	if(!(category in subscription)) subscription[category] = []
	
	if(subscription[category].includes(label)) {
		// Unsub
		subscription[category] = removeItemOnce(subscription[category], label)
	} else {
		// Sub
		subscription[category].push(label)
	}

	syncNewSubscriptions().then(() => {
		console.log("updated subscription successfully")
	}).catch(error => {
		alert("Subscription sync failed: "+error.message)
	})
	
	subscriptionUpdateUI()
})

async function initNotificationProfile(onlyFromServer) {
	try {
		msgToken = await messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"})
	} catch(error) {
		console.error(error)
		$(".body-container").prepend(`<div class="alert alert-danger mb-4">
			Firebase failed to connect to the messaging API.<br>
			This can be caused by missing notification permissions, network connectivity issues, browser incompatibility or an adblocker.
			<br><br>
			<b>Error Message:</b> `+error.message+`
		</div>`)
		return
	}
	ownSubRef = db.collection("push_subscribers").doc(msgToken)
	console.log("token", msgToken)
	
	$("#notification-start-hint").remove()
	$("#menu-profile").html(`<a class="nav-link" href="/subscriptions">Manage Subscriptions</a>`)
	
	// Check current subscriptions
	const loadSubscription = localStorage.getItem(msgToken)
	if(loadSubscription === null || onlyFromServer === false) {
		const querySnapshot = await ownSubRef.get()
		if(!querySnapshot.exists) {
			console.log("doesnt exist yet")
			delete subscription.mocked
			subscription._updated = new Date()
			
			localStorage.setItem(msgToken, JSON.stringify(subscription))
			return false
		}
		
		subscription = querySnapshot.data()
		subscription._updated = subscription._updated.toDate()
	} else {
		subscription = JSON.parse(loadSubscription)
		subscription._updated = new Date(subscription._updated)
	}
	console.log("Subscriptions: ", subscription)
	
	subscriptionUpdateUI()
}

function syncNewSubscriptions() {
	subscription._updated = new Date()
	subscription._synced = false
	
	console.log("Subscription to sync", subscription)
	localStorage.setItem(msgToken, JSON.stringify(subscription))
	return ownSubRef.set(subscription)
}

function subscriptionUpdateUI() {
	if("mocked" in subscription) return false
	
	$(".notification-subscribe").removeClass("d-none")
	$(".notification-unsubscribe").addClass("d-none")
	
	let modified = false
	for(const [category, labelList] of Object.entries(subscription)) {
		if(!Array.isArray(labelList)) continue
		
		for(const subLabel of labelList) {
			let picker = $('div[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]')
			if(!picker.length) continue
			if(category == "events") picker = $(".event-title-bar, .sub-bottom", picker) // make sure we dont select match items
			
			modified = true
			$(".notification-subscribe", picker).addClass("d-none")
			$(".notification-unsubscribe", picker).removeClass("d-none")
		}
	}
	
	return modified
}

function subscriptionUpdateUIWait(resolve, reject, i) {
	if(typeof reject != 'function') reject = (str) => console.error(str)
	if(Notification.permission != "granted" && typeof i == 'undefined') return reject("No permission")
	
	if(typeof i == 'undefined') i = 5
	if(i !== false && i <= 0) return reject("Timeout on subscriptionUpdateUIWait")
	
	if("mocked" in subscription) {
		return setTimeout(() => {
			subscriptionUpdateUIWait(resolve, reject, i !== false ? i-1 : false)
		}, 500)
	}
	
	subscriptionUpdateUI()
	resolve()
}

