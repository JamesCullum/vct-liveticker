
// Profile
if (Notification.permission == "granted") {
	initNotificationProfile().then(() => {})
} else if(!localStorage.getItem("disabled-notification-hint")) {
	$("body > .container").prepend(`<div class="alert alert-dismissible alert-info mb-4" id="notification-start-hint">
		<button type="button" class="btn-close" data-bs-dismiss="alert" id="disabled-notification-hint"></button>
		If you want to receive push notifications or live updates, please enable notifications.<br>
		<button type="button" class="btn btn-light" id="enable-notifications">Start receiving updates</button>
	</div>`)
	
	$("#disabled-notification-hint").click(function(evt) {
		localStorage.setItem("disabled-notification-hint", "1")
	})
	
	$("#enable-notifications").click(function(evt) {
		evt.preventDefault()
		Notification.requestPermission(async function (permission) {
			if (permission === "granted") await initNotificationProfile()
		});
	})
}
$(".sign-in").click(async function(evt) {
	evt.preventDefault()
	await initNotificationProfile()
})

window.msgToken = false
window.subscription = {events: [], matches: []}
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
	subscription._updated = new Date()
	
	ownSubRef.set(subscription).then(() => {
		console.log("updated subscription", subscription)
	})
	subscriptionUpdateUI()
})

async function initNotificationProfile() {
	msgToken = await messaging.getToken({vapidKey: "BHsrbLQQiNSDUQzw6EgeO-45Arty5Pct9lDQWevJpsL2bzts_o0BZL7MmZt7lDcoFjd2mSumps5UByzBaboPCxU"})
	ownSubRef = db.collection("push_subscribers").doc(msgToken)
	console.log("token", msgToken)
	
	$("#notification-start-hint").remove()
	$("#menu-profile").html(`<a class="nav-link" href="/subscriptions">Manage Subscriptions</a>`)
	
	// Check current subscriptions
	const querySnapshot = await ownSubRef.get()
	if(!querySnapshot.exists) {
		console.log("doesnt exist yet");
		return false
	}
	subscription = querySnapshot.data()
	console.log("Subscriptions: ", subscription)
	
	subscriptionUpdateUI()
}

function subscriptionUpdateUI() {
	$(".notification-subscribe").removeClass("d-none")
	$(".notification-unsubscribe").addClass("d-none")
	
	for(const [category, labelList] of Object.entries(subscription)) {
		if(!Array.isArray(labelList)) continue
		
		for(const subLabel of labelList) {
			const picker = $('*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]')
			//console.log("picker", '*[data-subscription-type="'+category+'"][data-subscription-label="'+subLabel+'"]', picker)
			if(!picker.length) continue
			
			$(".notification-subscribe", picker).addClass("d-none")
			$(".notification-unsubscribe", picker).removeClass("d-none")
		}
	}
}

// https://stackoverflow.com/a/5767357/1424378
function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}