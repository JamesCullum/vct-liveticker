
// Profile
if (Notification.permission == "granted") {
	initNotificationProfile().then(() => {})
} else if(!localStorage.getItem("disabled-notification-hint")) {
	$("body > .container").prepend(`<div class="alert alert-dismissible alert-info mb-4" id="notification-start-hint">
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
		console.log("updated subscription", subscription)
	}).catch(error => {
		alert("Subscription sync failed: "+error.message)
		
		if(error.message.indexOf("permission") != -1) {
			alert(JSON.stringify([msgToken.length, subscription]))
		}
	})
	
	subscriptionUpdateUI()
})

async function initNotificationProfile() {
	try {
		msgToken = await messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"})
	} catch(error) {
		console.error(error)
		$("body > .container").prepend(`<div class="alert alert-danger mb-4">
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
			const picker = $('*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]')
			//console.log("picker", '*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]', picker)
			if(!picker.length) continue
			
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

