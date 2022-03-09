
// Profile
const supportsNotification = ('Notification' in window)

if(!supportsNotification) {
	var hideSubscribe = $('<style>.sub-right, .sub-bottom, .match-list-container .card-footer, #menu-profile { display: none !important; }</style>');
	$('html > head').append(hideSubscribe)
	
	if(!localStorage.getItem("disabled-unsupported-device")) {
		$(".body-container").prepend(`<div class="alert alert-dismissible alert-danger mb-4" id="notification-unsupported-start-hint">
			<button type="button" class="btn-close" data-bs-dismiss="alert" id="notification-unsupported-hint"></button>
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
		<button type="button" class="btn-close" data-bs-dismiss="alert" id="disabled-notification-hint"></button>
		If you want to receive push notifications or live updates, please enable notifications.<br>
		<button type="button" class="btn btn-light enable-notifications">Start receiving updates</button>
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
window.subscription = {events: [], matches: [], mocked: true}
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

async function initNotificationProfile() {
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
	const querySnapshot = await ownSubRef.get()
	if(!querySnapshot.exists) {
		console.log("doesnt exist yet");
		delete subscription.mocked
		return false
	}
	subscription = querySnapshot.data()
	subscription._updated = subscription._updated.toDate()
	console.log("Subscriptions: ", subscription)
	
	subscriptionUpdateUI()
}

function syncNewSubscriptions() {
	subscription._updated = new Date()
	subscription._synced = false
	
	console.log("Subscription to sync", subscription)
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

